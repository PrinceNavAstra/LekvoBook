import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function getBusiness(userId: string) {
  const membership = await prisma.businessUser.findFirst({
    where: { userId },
    include: { business: true },
  });
  return membership?.business ?? null;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const business = await getBusiness(user.id);
    if (!business) return NextResponse.json({ error: "Business setup required." }, { status: 409 });

    const transactions = await prisma.ledgerTransaction.findMany({
      where: { businessId: business.id },
      include: { customer: true, supplier: true },
      orderBy: { transactionDate: "desc" },
      take: 8,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysTransactions = await prisma.ledgerTransaction.findMany({
      where: {
        businessId: business.id,
        transactionDate: { gte: today },
      },
    });

    let receivable = 0;
    let payable = 0;
    let sales = 0;
    let expense = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      if (transaction.direction === "CREDIT") receivable += amount;
      else payable += amount;
    }

    for (const transaction of todaysTransactions) {
      const amount = Number(transaction.amount);
      if (transaction.type === "SALE") sales += amount;
      if (transaction.type === "EXPENSE") expense += amount;
    }

    return NextResponse.json({
      business: { id: business.id, name: business.name },
      receivable,
      payable,
      sales,
      expense,
      transactions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Database unavailable",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
