import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  const membership = user.businesses[0];
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id, name: user.name, email: user.email, mobile: user.mobile,
      preferredLanguage: user.preferredLanguage,
      emailVerifiedAt: user.emailVerifiedAt, mobileVerifiedAt: user.mobileVerifiedAt,
    },
    business: membership?.business ?? null,
  });
}
