import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/better-auth";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

function matchesSecret(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function copyCookies(source: Headers, destination: Headers) {
  const headersWithGetSetCookie = source as Headers & { getSetCookie?: () => string[] };
  const cookies = headersWithGetSetCookie.getSetCookie?.() ?? [source.get("set-cookie") ?? ""].filter(Boolean);
  for (const cookie of cookies) destination.append("set-cookie", cookie);
}

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ error: "First-owner setup is disabled on this deployment." }, { status: 503 });
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

    // The transaction-scoped advisory lock prevents two bootstrap requests from both claiming the first-owner slot.
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(914832761)`;
      const existingUsers = await tx.user.count();
      if (existingUsers !== 0) return null;

      const user = await tx.user.create({
        data: {
          name,
          email,
          emailVerified: false,
          preferredLanguage: "en",
        },
      });

      await tx.account.create({
        data: {
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: hashPassword(password),
        },
      });

      const business = await tx.business.create({
        data: {
          name: businessName,
          email,
          users: { create: { userId: user.id, role: "OWNER" } },
        },
      });

      return { user, business };
    }, { isolationLevel: "Serializable" });

    if (!created) {
      return NextResponse.json({
        error: "First-owner setup is permanently locked because an account already exists. Use the normal sign-in page.",
      }, { status: 409 });
    }

    const signedIn = await auth.api.signInEmail({
      body: { email, password },
      headers: request.headers,
      returnHeaders: true,
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: created.user.id, name: created.user.name, email: created.user.email },
      business: { id: created.business.id, name: created.business.name },
    });
    copyCookies(signedIn.headers, response.headers);

    console.info("[AUTH][bootstrap] First Owner account created", {
      userId: created.user.id,
      businessId: created.business.id,
    });
    return response;
  } catch (error) {
    console.error("[AUTH][bootstrap] Failed", {
      code: error && typeof error === "object" && "code" in error ? error.code : "unknown",
    });
    return NextResponse.json({
      error: "We could not set up the first Owner account. Check the server logs and try again.",
    }, { status: 500 });
  }
}
