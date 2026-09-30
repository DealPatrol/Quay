/**
 * License key generation (D).
 *
 * Format: XXXX-XXXX-XXXX-XXXX, unambiguous alphanumeric
 * (no 0/O, 1/I/L). Cryptographically random. One key per unit of a product
 * with `requiresLicense: true`, minted once in finalizeOrder (idempotent).
 */
import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function makeLicenseKey(): string {
  const bytes = crypto.randomBytes(16);
  let s = "";
  for (let i = 0; i < 16; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}
