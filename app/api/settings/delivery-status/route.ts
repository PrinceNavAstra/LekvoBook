import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const membership = await prisma.businessUser.findFirst({ where: { userId: user.id } });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Owner or admin access required." }, { status: 403 });
  }
  const deliveries = await prisma.notificationDelivery.findMany({
    where: { businessId: membership.businessId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, channel: true, recipient: true, status: true, errorCode: true, errorMessage: true, createdAt: true }
  });
  return NextResponse.json({ deliveries });
}
