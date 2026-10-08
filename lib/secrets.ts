import crypto from "node:crypto";

function key() {
  return crypto.createHash("sha256").update(process.env.LEKVO_ENCRYPTION_KEY || process.env.DATABASE_URL || "lekvobook-change-me").digest();
}
export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `enc:${iv.toString("base64") }:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}
export function decryptSecret(value: string) {
  if (!value?.startsWith("enc:")) return value;
  const [,ivB64,tagB64,dataB64] = value.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64,"base64"));
  decipher.setAuthTag(Buffer.from(tagB64,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64,"base64")),decipher.final()]).toString("utf8");
}
