import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({error:"Authentication required."},{status:401});
  const body = await request.json();
  const field = body.field === "mobile" ? "mobile" : "email";
  const value = String(body.value || "").trim().toLowerCase();
  if (!value) return NextResponse.json({error:"A new value is required."},{status:400});
  const duplicate = await prisma.user.findFirst({where:{[field]:value,NOT:{id:user.id}}});
  if (duplicate) return NextResponse.json({error:`That ${field} is already registered.`},{status:409});
  const purpose = field === "email" ? "CHANGE_EMAIL" : "CHANGE_MOBILE";
  return NextResponse.json({ok:true,purpose});
}
