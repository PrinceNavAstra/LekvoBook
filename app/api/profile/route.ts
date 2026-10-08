import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ user: { id:user.id,name:user.name,email:user.email,mobile:user.mobile,preferredLanguage:user.preferredLanguage,emailVerifiedAt:user.emailVerifiedAt,mobileVerifiedAt:user.mobileVerifiedAt } });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json();
  const data: any = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (["en","gu","hi"].includes(body.preferredLanguage)) data.preferredLanguage = body.preferredLanguage;
  const updated = await prisma.user.update({ where:{id:user.id}, data });
  const membership = await prisma.businessUser.findFirst({ where:{userId:user.id} });
  let business = null;
  if (membership) {
    business = await prisma.business.update({
      where:{id:membership.businessId},
      data:{
        name: typeof body.businessName==="string" && body.businessName.trim()?body.businessName.trim():undefined,
        businessType: typeof body.businessType==="string"?body.businessType.trim():undefined,
        gstNumber: typeof body.gstNumber==="string"?body.gstNumber.trim():undefined,
        address: typeof body.address==="string"?body.address.trim():undefined,
        city: typeof body.city==="string"?body.city.trim():undefined,
        state: typeof body.state==="string"?body.state.trim():undefined,
        pincode: typeof body.pincode==="string"?body.pincode.trim():undefined,
      }
    });
  }
  return NextResponse.json({ user:{id:updated.id,name:updated.name,email:updated.email,mobile:updated.mobile,preferredLanguage:updated.preferredLanguage}, business });
}
