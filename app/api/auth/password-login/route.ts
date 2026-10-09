import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password || email.length > 254 || password.length > 200) {
      return NextResponse.json({ error: "Enter your admin email and password." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { businesses: { select: { role: true } } },
    });
    const hasAdminAccess = user?.businesses.some((membership) =>
      membership.role === "OWNER" || membership.role === "ADMIN"
    );

    if (!user || !hasAdminAccess || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "The email or password is incorrect, or this account does not have password sign-in enabled." }, { status: 401 });
    }

    await createSession(user.id);
    console.info("[AUTH][password-login] Admin signed in", { userId: user.id });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("[AUTH][password-login] Failed", error);
    return NextResponse.json({ error: "We could not sign in. Please try again." }, { status: 500 });
  }
}
