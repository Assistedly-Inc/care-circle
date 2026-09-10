import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Register a new coordinator (staff user).
 * Body: { email, password, name }
 */
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'User already exists' });
  const hash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { email, passwordHash: hash, name },
  });
  const token = jwt.sign({ sub: user.id, role: 'COORDINATOR', email: user.email }, config.jwtSecret, { expiresIn: '1h' });
  res.json({ token });
});

/**
 * Login – returns JWT.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  // Determine role – if user is coordinator of any case, default to COORDINATOR, else FAMILY
  const role = (await prisma.case.findFirst({ where: { coordinatorId: user.id } })) ? 'COORDINATOR' : 'FAMILY';
  const token = jwt.sign({ sub: user.id, role, email: user.email }, config.jwtSecret, { expiresIn: '1h' });
  res.json({ token });
});

/**
 * Invite a family member to a case.
 * Body: { caseId, email, role (FAMILY|CAREGIVER) }
 * Only coordinator of the case can invite.
 */
router.post('/invite', async (req: AuthRequest, res) => {
  const { caseId, email, role } = req.body;
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  // Verify coordinator ownership
  const theCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!theCase) return res.status(404).json({ error: 'Case not found' });
  if (theCase.coordinatorId !== req.user.id) return res.status(403).json({ error: 'Only coordinator can invite' });
  // Create invitation JWT (valid 7 days)
  const inviteToken = jwt.sign({ caseId, email, role }, config.jwtSecret, { expiresIn: '7d' });
  // In a real system we would email the token; here we just return it.
  res.json({ inviteToken });
});

/**
 * Accept an invitation – creates a new user linked to the case.
 * Body: { inviteToken, password, name }
 */
router.post('/accept-invite', async (req, res) => {
  const { inviteToken, password, name } = req.body;
  if (!inviteToken || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  let payload: any;
  try {
    payload = jwt.verify(inviteToken, config.jwtSecret) as { caseId: string; email: string; role: string };
  } catch (e) {
    return res.status(400).json({ error: 'Invalid or expired invitation token' });
  }
  // Ensure email not already used
  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) return res.status(409).json({ error: 'User already exists' });
  const hash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { email: payload.email, passwordHash: hash, name },
  });
  // Link to case via CaseMember
  await prisma.caseMember.create({
    data: { caseId: payload.caseId, userId: user.id, role: payload.role },
  });
  const token = jwt.sign({ sub: user.id, role: payload.role, email: user.email }, config.jwtSecret, { expiresIn: '1h' });
  res.json({ token });
});

export default router;
