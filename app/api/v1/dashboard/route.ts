import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getBusiness() {
  let business = await prisma.business.findFirst();

  if (!business) {
    const user = await prisma.user.create({
      data: { name: "Lekvo Demo Owner", email: "owner@lekvo.local" },
    });

    business = await prisma.business.create({
      data: {
        name: "Astra Trading",
        phone: "+91 90000 00000",
        users: { create: { userId: user.id, role: "OWNER" } },
        customers: {
          create: { name: "ABC Traders", mobile: "+91 90000 11111" },
        },
      },
    });
  }

  return business;
}

export async function GET() {
  try {
    const business = await getBusiness();

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
