import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const personName = String(body.personName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const mobile = String(body.mobile || "").trim();
    const language = ["en", "gu", "hi"].includes(body.language) ? body.language : "en";
    const businessName = String(body.businessName || "").trim();
    const businessType = String(body.businessType || "").trim();
    const gstNumber = String(body.gstNumber || "").trim() || null;
    const address = String(body.address || "").trim() || null;
    const city = String(body.city || "").trim() || null;
    const state = String(body.state || "").trim() || null;
    const pincode = String(body.pincode || "").trim() || null;

    if (!personName || !email || !mobile || !businessName) {
      return NextResponse.json(
        { error: "Person name, email, mobile and business name are required." },
        { status: 400 },
      );
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: personName,
          email,
          mobile,
          preferredLanguage: language,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: personName, mobile, preferredLanguage: language },
      });
    }

    const existingMembership = await prisma.businessUser.findFirst({
      where: { userId: user.id },
      include: { business: true },
    });

    if (existingMembership) {
      return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email, preferredLanguage: user.preferredLanguage },
        business: existingMembership.business,
        existing: true,
      });
    }

    const business = await prisma.business.create({
      data: {
        name: businessName,
        phone: mobile,
        email,
        businessType,
        gstNumber,
        address,
        city,
        state,
        pincode,
        users: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, preferredLanguage: user.preferredLanguage },
      business,
      existing: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete setup." },
      { status: 500 },
    );
  }
}
