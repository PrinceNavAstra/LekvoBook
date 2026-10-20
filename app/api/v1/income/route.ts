import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, getCurrentBusiness, handleError } from "@/lib/business";

export const dynamic = "force-dynamic";

const METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CARD", "GATEWAY"] as const;
type Method = (typeof METHODS)[number];

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    const rows = await prisma.income.findMany({
      where: { businessId: business.id },
      orderBy: { date: "desc" },
      take: 300,
    });
    return NextResponse.json(rows.map((e) => ({ ...e, amount: Number(e.amount) })));
  } catch (e) {
    return handleError(e, "DATABASE_UNAVAILABLE", "We could not reach the database. Try again in a moment.", 503);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return fail("INVALID_AMOUNT", "Enter an amount greater than zero.", 400);
    const category = String(body.category ?? "").trim();
    if (!category) return fail("CATEGORY_REQUIRED", "Choose a category.", 400);

    const business = await getCurrentBusiness();
    const income = await prisma.income.create({
      data: {
        businessId: business.id,
        category,
        amount,
        paymentMethod: METHODS.includes(body.paymentMethod as Method) ? body.paymentMethod : "CASH",
        notes: body.notes || null,
        ...(body.date ? { date: new Date(body.date) } : {}),
      },
    });
    await prisma.auditLog.create({
      data: { businessId: business.id, action: "INCOME_CREATED", resource: "Income", resourceId: income.id, metadata: { amount, category } },
    });
    return NextResponse.json({ ...income, amount }, { status: 201 });
  } catch (e) {
    return handleError(e, "INCOME_CREATE_FAILED", "The income could not be saved. Try again.", 500);
  }
}
