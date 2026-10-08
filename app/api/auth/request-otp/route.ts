import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashOtp, randomCode } from "@/lib/auth";
import { decryptSecret } from "@/lib/secrets";

async function sendNotification(channel: string, identifier: string, code: string, purpose: string) {
  const setting = await prisma.applicationSetting.findUnique({ where: { key: `notification.${channel}` } });
  const config = (setting?.value || {}) as any;
  if (!config.enabled || !config.endpoint) {
    if (process.env.NODE_ENV !== "production") return { delivered: true, devCode: code };
    return { delivered: false };
  }
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.token ? { Authorization: `Bearer ${decryptSecret(config.token)}` } : {}),
    },
    body: JSON.stringify({
      to: identifier,
      recipient: identifier,
      otp: code,
      message: `Your Lekvo Book verification code is ${code}. It expires in 10 minutes.`,
      purpose,
    }),
  });
  return { delivered: response.ok };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const channel = body.channel === "mobile" ? "mobile" : "email";
    const rawIdentifier = String(body.identifier || "").trim();
    const identifier = channel === "mobile" ? rawIdentifier.replace(/[\s()-]/g, "") : rawIdentifier.toLowerCase();
    const purpose = ["SIGNUP", "LOGIN", "CHANGE_EMAIL", "CHANGE_MOBILE"].includes(body.purpose) ? body.purpose : "LOGIN";
    if (!identifier) return NextResponse.json({ error: "Email or mobile number is required." }, { status: 400 });

    const code = randomCode();
    await prisma.otpChallenge.updateMany({
      where: { identifier, purpose, verifiedAt: null },
      data: { expiresAt: new Date() },
    });
    await prisma.otpChallenge.create({
      data: {
        identifier, channel, purpose, codeHash: await hashOtp(code),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const delivery = await sendNotification(channel === "mobile" ? "sms" : "email", identifier, code, purpose);
    if (!delivery.delivered) return NextResponse.json({ error: `The ${channel} OTP provider is not configured.` }, { status: 503 });
    return NextResponse.json({ ok: true, expiresIn: 600, ...(delivery.devCode ? { devCode: delivery.devCode } : {}) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send OTP." }, { status: 500 });
  }
}
