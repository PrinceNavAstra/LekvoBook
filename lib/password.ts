import crypto from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [scheme, salt, digestHex] = String(storedHash || "").split("$");
  if (scheme !== "scrypt" || !salt || !digestHex || !/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(digestHex)) {
    return false;
  }

  try {
    const expected = Buffer.from(digestHex, "hex");
    const actual = crypto.scryptSync(password, salt, KEY_LENGTH);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
