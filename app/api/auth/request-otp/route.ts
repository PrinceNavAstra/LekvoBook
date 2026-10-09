import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashOtp, randomCode } from "@/lib/auth";
import { sendSmsOtp } from "@/lib/sms-otp";

export const runtime = "nodejs";

function normalizeMobile(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^\d{10}$/.test(compact)) return \`+91\${compact}\`;
  return compact;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please sign in with email OTP before verifying a mobile number." }, { status: 401 });

    const body = await request.json();
    const channel = body.channel === "mobile" ? "mobile" : "email";
    const purpose = String(body.purpose || "");
    if (channel !== "mobile" || purpose !== "CHANGE_MOBILE") {
      return NextResponse.json({ error: "Use email OTP to sign in. Mobile OTP is only used to verify a contact number after sign-in." }, { status: 400 });
    }

    const rawIdentifier = String(body.identifier || "");
    const identifier = normalizeMobile(rawIdentifier);
    if (!/^\+[1-9]\d{7,14}$/.test(identifier)) {
      return NextResponse.json({ error: "Enter a valid mobile number with country code, such as +919876543210." }, { status: 400 });
    }

    const duplicate = await prisma.user.findFirst({
      where: { mobile: identifier, NOT: { id: user.id } },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ error: "That mobile number is already registered." }, { status: 409 });

    const now = new Date();
    const last15Minutes = new Date(now.getTime() - 15 * 60 * 1000);
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [recent, daily] = await Promise.all([
      prisma.otpChallenge.count({ where: { identifier, purpose: "CHANGE_MOBILE", createdAt: { gte: last15Minutes } } }),
      prisma.otpChallenge.count({ where: { identifier, purpose: "CHANGE_MOBILE", createdAt: { gte: lastDay } } }),
    ]);
    if (recent >= 3 || daily >= 8) {
      return NextResponse.json({ error: "Too many codes requested for this number. Try again later." }, { status: 429 });
    }

    const code = randomCode();
    const challenge = await prisma.$transaction(async (tx) => {
      await tx.otpChallenge.updateMany({
        where: { identifier, purpose: "CHANGE_MOBILE", verifiedAt: null },
        data: { expiresAt: now },
      });
      return tx.otpChallenge.create({
        data: {
          identifier,
          channel: "mobile",
          purpose: "CHANGE_MOBILE",
          codeHash: await hashOtp(code),
          expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
        },
      });
    });

    try {
      await sendSmsOtp({ mobile: identifier, otp: code });
    } catch (error) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { expiresAt: new Date() },
      });
      return NextResponse.json({
        error: error instanceof Error ? error.message : "SMS delivery is not configured.",
      }, { status: 503 });
    }

    return NextResponse.json({ ok: true, expiresIn: 600 });
  } catch (error) {
    console.error("[OTP][mobile-contact] Request failed", {
      code: error && typeof error === "object" && "code" in error ? error.code : "unknown",
    });
    return NextResponse.json({ error: "Unable to send a mobile verification code." }, { status: 500 });
  }
}
