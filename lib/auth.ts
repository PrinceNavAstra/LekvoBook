import crypto from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/better-auth";

export function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { businesses: { include: { business: true } } },
  });
}

export async function clearSession() {
  await auth.api.signOut({ headers: await headers() }).catch(() => null);
}

export async function hashOtp(code: string) {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("OTP hashing secret is not configured.");
  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}
