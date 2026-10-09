import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/better-auth";

export const runtime = "nodejs";

function copyCookies(source: Headers, destination: Headers) {
  const headersWithGetSetCookie = source as Headers & { getSetCookie?: () => string[] };
  const cookies = headersWithGetSetCookie.getSetCookie?.() ?? [source.get("set-cookie") ?? ""].filter(Boolean);
  for (const cookie of cookies) destination.append("set-cookie", cookie);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password || email.length > 254 || password.length > 200) {
      return NextResponse.json({ error: "Enter your Owner/Admin email and password." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { businesses: { select: { role: true } } },
    });
    const hasAdminAccess = user?.businesses.some(({ role }) => role === "OWNER" || role === "ADMIN");

    // Keep account/role failures indistinguishable to callers.
    if (!user || !hasAdminAccess) {
      return NextResponse.json({ error: "The email or password is incorrect, or password sign-in is not enabled for this account." }, { status: 401 });
    }

    const signedIn = await auth.api.signInEmail({
      body: { email, password },
      headers: request.headers,
      returnHeaders: true,
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
    copyCookies(signedIn.headers, response.headers);
    console.info("[AUTH][password-login] Owner/Admin signed in", { userId: user.id });
    return response;
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
    if (status !== 401) {
      console.error("[AUTH][password-login] Failed", {
        code: error && typeof error === "object" && "code" in error ? error.code : "unknown",
      });
    }
    return NextResponse.json({
      error: status === 401
        ? "The email or password is incorrect, or password sign-in is not enabled for this account."
        : "We could not sign in. Please try again.",
    }, { status: status === 401 ? 401 : 500 });
  }
}
