import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, getCurrentUser, hashOtp } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier = String(body.identifier || "").trim();
    const channel = body.channel === "mobile" ? "mobile" : "email";
    const identifier = channel === "mobile" ? rawIdentifier.replace(/[\s()-]/g, "") : rawIdentifier.toLowerCase();
    const code = String(body.code || "").trim();
    const purpose = ["SIGNUP", "LOGIN", "CHANGE_EMAIL", "CHANGE_MOBILE"].includes(body.purpose) ? body.purpose : "LOGIN";
    if (!identifier || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter the 6-digit OTP." }, { status: 400 });

    const challenge = await prisma.otpChallenge.findFirst({
      where: { identifier, purpose, verifiedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge) return NextResponse.json({ error: "OTP expired or invalid. Request a new OTP." }, { status: 400 });
    if (challenge.attempts >= 5) return NextResponse.json({ error: "Too many attempts. Request a new OTP." }, { status: 429 });

    if ((await hashOtp(code)) !== challenge.codeHash) {
      await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: "Incorrect OTP." }, { status: 400 });
    }

    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { verifiedAt: new Date() } });

    if (purpose === "CHANGE_EMAIL" || purpose === "CHANGE_MOBILE") {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
      if (purpose === "CHANGE_EMAIL") {
        await prisma.user.update({ where: { id: user.id }, data: { email: identifier, emailVerifiedAt: new Date() } });
      } else {
        await prisma.user.update({ where: { id: user.id }, data: { mobile: identifier, mobileVerifiedAt: new Date() } });
      }
      return NextResponse.json({ ok: true });
    }

    let user = await prisma.user.findFirst({
      where: channel === "mobile" ? { mobile: identifier } : { email: identifier },
    });
    if (purpose === "SIGNUP") {
      if (user) return NextResponse.json({ error: "An account already exists. Please log in." }, { status: 409 });
      const name = String(body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Name is required for signup." }, { status: 400 });
      user = await prisma.user.create({
        data: {
          name, email: channel === "email" ? identifier : String(body.email || "").trim().toLowerCase(),
          mobile: channel === "mobile" ? identifier : String(body.mobile || "").trim().replace(/[\s()-]/g, ""),
          preferredLanguage: ["en","gu","hi"].includes(body.language) ? body.language : "en",
          ...(channel === "email" ? { emailVerifiedAt: new Date() } : { mobileVerifiedAt: new Date() }),
        },
      });
    } else if (!user) {
      return NextResponse.json({ error: "No account found for this contact. Please sign up." }, { status: 404 });
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify OTP." }, { status: 500 });
  }
}
