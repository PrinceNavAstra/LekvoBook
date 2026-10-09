import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashOtp } from "@/lib/auth";

export const runtime = "nodejs";

function normalizeMobile(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^\d{10}$/.test(compact)) return \`+91\${compact}\`;
  return compact;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json();
    const channel = body.channel === "mobile" ? "mobile" : "email";
    const purpose = String(body.purpose || "");
    if (channel !== "mobile" || purpose !== "CHANGE_MOBILE") {
      return NextResponse.json({ error: "Email OTP sign-in is managed by Better Auth." }, { status: 400 });
    }

    const identifier = normalizeMobile(String(body.identifier || ""));
    const code = String(body.code || "").trim();
    if (!/^\+[1-9]\d{7,14}$/.test(identifier) || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter a valid mobile number and the 6-digit code." }, { status: 400 });
    }

    const challenge = await prisma.otpChallenge.findFirst({
      where: { identifier, purpose: "CHANGE_MOBILE", channel: "mobile", verifiedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) return NextResponse.json({ error: "OTP expired or invalid. Request a new code." }, { status: 400 });
    if (challenge.attempts >= 3) {
      return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
    }

    if ((await hashOtp(code)) !== challenge.codeHash) {
      const nextAttempts = challenge.attempts + 1;
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: {
          attempts: { increment: 1 },
          ...(nextAttempts >= 3 ? { expiresAt: new Date() } : {}),
        },
      });
      return NextResponse.json({
        error: nextAttempts >= 3 ? "Too many attempts. Request a new code." : "Incorrect verification code.",
      }, { status: nextAttempts >= 3 ? 429 : 400 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.otpChallenge.update({
          where: { id: challenge.id },
          data: { verifiedAt: new Date() },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { mobile: identifier, mobileVerifiedAt: new Date() },
        });
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        return NextResponse.json({ error: "That mobile number is already registered." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[OTP][mobile-contact] Verification failed", {
      code: error && typeof error === "object" && "code" in error ? error.code : "unknown",
    });
    return NextResponse.json({ error: "Unable to verify the mobile number." }, { status: 500 });
  }
}
