import crypto from 'crypto';
import { config } from '../config/env';

/**
 * Simple AES‑256‑GCM encryption for PHI fields.
 * The ENCRYPTION_KEY env var must be a 32‑byte base64 string.
 */
const algorithm = 'aes-256-gcm';
const key = Buffer.from(config.encryptionKey, 'base64');
if (!key || key.length !== 32) {
  // In dev we fall back to a deterministic key – DO NOT use in production!
  console.warn('ENCRYPTION_KEY not set or invalid – using insecure fallback key');
}

export const encrypt = (plain: string): { iv: string; authTag: string; data: string } => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    data: encrypted.toString('base64'),
  };
};

export const decrypt = (payload: { iv: string; authTag: string; data: string }): string => {
  const { iv, authTag, data } = payload;
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};
