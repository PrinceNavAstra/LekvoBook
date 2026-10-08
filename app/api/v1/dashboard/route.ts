import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, getCurrentBusiness, handleError } from "@/lib/business";
import { customersWithBalance, suppliersWithBalance } from "@/lib/balances";
import { productsWithStock } from "@/lib/stock";

export const dynamic = "force-dynamic";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function GET() {
  try {
    const business = await getCurrentBusiness();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekStart = new Date(startOfToday);
    weekStart.setDate(weekStart.getDate() - 6);

    const [customers, suppliers, recent, weekTx, todayExpenses, weekExpenses, products] = await Promise.all([
      customersWithBalance(business.id),
      suppliersWithBalance(business.id),
      prisma.ledgerTransaction.findMany({
        where: { businessId: business.id },
        include: { customer: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
        orderBy: { transactionDate: "desc" },
        take: 8,
      }),
      prisma.ledgerTransaction.findMany({
        where: { businessId: business.id, type: "SALE", transactionDate: { gte: weekStart } },
        select: { amount: true, transactionDate: true },
      }),
      prisma.expense.aggregate({
        where: { businessId: business.id, date: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      prisma.expense.findMany({
        where: { businessId: business.id, date: { gte: weekStart } },
        select: { amount: true, date: true },
      }),
      productsWithStock(business.id),
    ]);

    const receivable = customers.filter((c) => c.balance > 0).reduce((s, c) => s + c.balance, 0);
    const payable = suppliers.filter((s) => s.balance > 0).reduce((s, x) => s + x.balance, 0);

    const sales = weekTx
      .filter((t) => t.transactionDate >= startOfToday)
      .reduce((s, t) => s + Number(t.amount), 0);

    // Seven-day series, oldest first, with zero-filled days so the chart never has gaps.
    const series = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return { key: dayKey(d), date: d.toISOString(), sales: 0, expense: 0 };
    });
    const byKey = new Map(series.map((p) => [p.key, p]));
    for (const t of weekTx) {
      const p = byKey.get(dayKey(t.transactionDate));
      if (p) p.sales += Number(t.amount);
    }
    for (const e of weekExpenses) {
      const p = byKey.get(dayKey(e.date));
      if (p) p.expense += Number(e.amount);
    }

    return NextResponse.json({
      business,
      receivable,
      payable,
      sales,
      expense: Number(todayExpenses._sum.amount ?? 0),
      series,
      pending: customers
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5)
        .map((c) => ({ id: c.id, name: c.name, mobile: c.mobile, balance: c.balance })),
      lowStock: products.filter((p) => p.low).slice(0, 5),
      counts: { customers: customers.length, suppliers: suppliers.length, products: products.length },
      transactions: recent.map((t) => ({ ...t, amount: Number(t.amount) })),
    });
  } catch (e) {
    return handleError(e, "DATABASE_UNAVAILABLE", "We could not reach the database. Check DATABASE_URL and try again.", 503);
  }
}
