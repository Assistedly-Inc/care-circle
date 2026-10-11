// src/api/auth.ts
import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Minimal in-memory rate limiter (per IP+email): 10 failures / 15 min
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
};
const recordFailure = (key: string): void => {
  const rec = attempts.get(key);
  if (rec) rec.count += 1;
};
const clearAttempts = (key: string): void => {
  attempts.delete(key);
};

router.get('/ping', (req, res) => res.json({ message: 'auth ok' }));

// POST /api/auth/login - argon2id credential check, signed JWT with 12h expiry
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!config.jwtSecret) {
      // Fail closed: never sign tokens with an empty/weak secret
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET is not set' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const key = (req.ip || 'unknown') + '|' + normalizedEmail;
    if (isRateLimited(key)) {
      return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    // Uniform 401 for unknown user / missing hash / wrong password (no user enumeration)
    if (!user || !user.passwordHash || !user.passwordHash.startsWith('$argon2')) {
      recordFailure(key);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      recordFailure(key);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    clearAttempts(key);
    const token = jwt.sign(
      { sub: user.id, role: 'USER', email: user.email },
      config.jwtSecret,
      { expiresIn: 43200, issuer: 'carecircle', audience: 'carecircle-api' }
    );
    return res.json({
      token,
      expiresIn: 43200,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me - token self-check for clients
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/passwordless/request - passwordless sign-in for an existing account.
// Dev mode returns the one-time token in the response so the client can complete
// sign-in immediately; with a mailer configured this would email a sign-in link instead.
router.post('/passwordless/request', async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!config.jwtSecret) {
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET is not set' });
    }
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return res.status(404).json({ error: 'No account found for that email' });
    const linkToken = jwt.sign(
      { sub: user.id, role: 'USER', email: user.email, purpose: 'passwordless' },
      config.jwtSecret,
      { expiresIn: 600, issuer: 'carecircle', audience: 'carecircle-api' }
    );
    return res.json({
      ok: true,
      token: linkToken,
      expiresIn: 600,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send sign-in link' });
  }
});

// POST /api/auth/passwordless/verify - exchange the one-time link token for a session token
router.post('/passwordless/verify', async (req, res) => {
  try {
    const { token } = req.body ?? {};
    if (typeof token !== 'string' || !token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const payload = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      email: string;
      role?: string;
      purpose?: string;
    };
    if (payload.purpose !== 'passwordless' || !payload.sub) {
      return res.status(400).json({ error: 'Invalid sign-in token' });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const sessionToken = jwt.sign(
      { sub: user.id, role: 'USER', email: user.email },
      config.jwtSecret,
      { expiresIn: 43200, issuer: 'carecircle', audience: 'carecircle-api' }
    );
    return res.json({
      token: sessionToken,
      expiresIn: 43200,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired sign-in token' });
  }
});

export default router;
