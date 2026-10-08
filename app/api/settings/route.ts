import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/secrets";

async function owner() {
  const user = await getCurrentUser();
  if (!user) return null;
  const membership = await prisma.businessUser.findFirst({ where:{userId:user.id}, include:{business:true} });
  if (!membership || !["OWNER","ADMIN"].includes(membership.role)) return null;
  return { user, membership };
}

export async function GET() {
  const access = await owner();
  if (!access) return NextResponse.json({ error:"Owner or admin access required." }, {status:401});
  const rows = await prisma.applicationSetting.findMany();
  const settings: Record<string, any> = {};
  for (const row of rows) {
    const value: any = row.value;
    settings[row.key] = row.key.startsWith("notification.")
      ? { ...value, token: value?.token ? "••••••••" : "", apiKey: value?.apiKey ? "••••••••" : "", apiSecret: value?.apiSecret ? "••••••••" : "" }
      : value;
  }
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const access = await owner();
  if (!access) return NextResponse.json({ error:"Owner or admin access required." }, {status:401});
  const body = await request.json();
  const allowed = ["general","notification.email","notification.sms","notification.whatsapp"];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      const incoming: any = { ...body[key] };
      const existing = await prisma.applicationSetting.findUnique({ where: { key } });
      const old: any = existing?.value || {};
      for (const field of ["token", "apiKey", "apiSecret"]) {
        if (incoming[field] === "••••••••") incoming[field] = old[field];
        else if (incoming[field]) incoming[field] = encryptSecret(String(incoming[field]));
      }
      await prisma.applicationSetting.upsert({
        where:{key},
        update:{value:incoming,updatedById:access.user.id},
        create:{key,value:incoming,updatedById:access.user.id},
      });
    }
  }
  return NextResponse.json({ok:true});
}
