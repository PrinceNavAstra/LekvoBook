import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

function matchesSecret(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ error: "First-owner setup is not enabled on this deployment." }, { status: 503 });
    }

    const body = await request.json();
    const suppliedSecret = String(body.bootstrapSecret || "");
    if (!matchesSecret(suppliedSecret, expectedSecret)) {
      return NextResponse.json({ error: "The setup key is invalid." }, { status: 403 });
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const businessName = String(body.businessName || "").trim();
    const password = String(body.password || "");

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Enter your full name (2–100 characters)." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (businessName.length < 2 || businessName.length > 150) {
      return NextResponse.json({ error: "Enter your business name (2–150 characters)." }, { status: 400 });
    }
    if (password.length < 12 || password.length > 200) {
      return NextResponse.json({ error: "Choose a password between 12 and 200 characters." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingOwner = await tx.businessUser.findFirst({
        where: { role: "OWNER" },
        select: { id: true },
      });
      if (existingOwner) return null;

      const passwordHash = hashPassword(password);
      const existingUser = await tx.user.findUnique({ where: { email } });
      const user = existingUser
        ? await tx.user.update({ where: { id: existingUser.id }, data: { name, passwordHash } })
        : await tx.user.create({ data: { name, email, passwordHash, preferredLanguage: "en" } });

      const business = await tx.business.create({
        data: {
          name: businessName,
          email,
          users: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });

      return { user, business };
    }, { isolationLevel: "Serializable" });

    if (!result) {
      return NextResponse.json({ error: "An Owner is already configured. Use the admin password sign-in instead." }, { status: 409 });
    }

    await createSession(result.user.id);
    console.info("[AUTH][bootstrap] First Owner account created", {
      userId: result.user.id,
      businessId: result.business.id,
      email: result.user.email,
    });

    return NextResponse.json({
      ok: true,
      user: { id: result.user.id, name: result.user.name, email: result.user.email },
      business: { id: result.business.id, name: result.business.name },
    });
  } catch (error) {
    console.error("[AUTH][bootstrap] Failed", error);
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return NextResponse.json({ error: "Another setup request was processed first. Try signing in." }, { status: 409 });
    }
    return NextResponse.json({ error: "We could not set up the first Owner account. Check the server logs and try again." }, { status: 500 });
  }
}
