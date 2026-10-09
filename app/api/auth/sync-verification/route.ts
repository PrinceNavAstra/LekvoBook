import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/better-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !session.user.emailVerified) {
    return NextResponse.json({ error: "A verified sign-in is required." }, { status: 401 });
  }

  let preferredLanguage = "en";
  try {
    const body = await request.json();
    if (["en", "gu", "hi"].includes(body?.preferredLanguage)) {
      preferredLanguage = body.preferredLanguage;
    }
  } catch {
    // Language is optional; verification sync can still complete.
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      emailVerifiedAt: new Date(),
      preferredLanguage,
    },
  });

  return NextResponse.json({ ok: true });
}
