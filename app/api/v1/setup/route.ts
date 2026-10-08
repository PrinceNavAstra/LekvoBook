import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json();
    const businessName = String(body.businessName || "").trim();
    if (!businessName) return NextResponse.json({ error: "Business name is required." }, { status: 400 });

    const existing = await prisma.businessUser.findFirst({ where: { userId: user.id } });
    if (existing) return NextResponse.json({ error: "Business setup is already complete." }, { status: 409 });

    const business = await prisma.business.create({
      data: {
        name: businessName,
        phone: user.mobile,
        email: user.email,
        businessType: String(body.businessType || "").trim() || null,
        gstNumber: String(body.gstNumber || "").trim() || null,
        address: String(body.address || "").trim() || null,
        city: String(body.city || "").trim() || null,
        state: String(body.state || "").trim() || null,
        pincode: String(body.pincode || "").trim() || null,
        users: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    return NextResponse.json({ ok: true, business });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete setup." }, { status: 500 });
  }
}
