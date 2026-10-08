import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "lekvo_session";
const SESSION_DAYS = 30;

export function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashValue(token),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
    },
  });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400,
  });
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.authSession.findFirst({
    where: { tokenHash: hashValue(token), expiresAt: { gt: new Date() } },
    include: { user: { include: { businesses: { include: { business: true } } } } },
  });
  return session?.user ?? null;
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await prisma.authSession.deleteMany({ where: { tokenHash: hashValue(token) } });
  store.delete(COOKIE);
}

export async function hashOtp(code: string) {
  return hashValue(code);
}
