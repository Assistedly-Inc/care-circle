// Secrets are injected at runtime via Bitwarden (environment variables).
// No .env file is loaded in production. Development can still use a local .env
// if the developer runs `dotenvx` or similar, but the code never reads a file.

export const config = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '', // 32‑byte base64 string
  twilioSid: process.env.TWILIO_SID || '',
  twilioToken: process.env.TWILIO_TOKEN || '',
  twilioFrom: process.env.TWILIO_FROM || '',
  webPushPublicKey: process.env.WEB_PUSH_PUBLIC_KEY || '',
  webPushPrivateKey: process.env.WEB_PUSH_PRIVATE_KEY || '',
};
