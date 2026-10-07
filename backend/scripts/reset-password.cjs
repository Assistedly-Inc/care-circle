// scripts/reset-password.cjs
// Usage: node scripts/reset-password.cjs <email> <password> [name]
// Creates the user if missing; sets an argon2id hash (or resets an existing one).
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node scripts/reset-password.cjs <email> <password> [name]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase().trim() },
      update: { passwordHash },
      create: { email: email.toLowerCase().trim(), passwordHash, name: name || email.split('@')[0] },
    });
    console.log('OK: argon2id password set for', user.email, '(id ' + user.id + ')');
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
main();
