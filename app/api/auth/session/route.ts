import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession?.user?.id) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });

  const membership = user.businesses[0];
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      preferredLanguage: user.preferredLanguage,
      emailVerifiedAt: user.emailVerifiedAt ?? (authSession.user.emailVerified ? new Date().toISOString() : null),
      mobileVerifiedAt: user.mobileVerifiedAt,
    },
    business: membership?.business ?? null,
  });
}
