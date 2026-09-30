#!/usr/bin/env node
/**
 * Generate a bcrypt password hash for the Quay admin login.
 *
 *   node scripts/make-admin-hash.mjs "your-strong-password"
 *
 * Copy the printed hash into your env as ADMIN_PASSWORD_HASH
 * (Vercel → Settings → Environment Variables, or .env.local).
 * The password itself is never stored — only the hash.
 */
import bcrypt from "bcryptjs";

const pw = process.argv[2];
if (!pw || pw.length < 8) {
  console.error('Usage: node scripts/make-admin-hash.mjs "your-password"');
  console.error("The password must be at least 8 characters.");
  process.exit(1);
}

const hash = await bcrypt.hash(pw, 12);
console.log("\nAdd this to your environment:\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
