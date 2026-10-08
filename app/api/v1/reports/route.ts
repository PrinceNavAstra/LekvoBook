import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, getCurrentBusiness, handleError } from "@/lib/business";
import { customersWithBalance, suppliersWithBalance } from "@/lib/balances";

export const dynamic = "force-dynamic";

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - 5);

    const [tx, expenses, customers, suppliers] = await Promise.all([
      prisma.ledgerTransaction.findMany({
        where: { businessId: business.id, transactionDate: { gte: start }, type: { in: ["SALE", "PURCHASE", "PAYMENT"] } },
        select: { type: true, amount: true, transactionDate: true, supplierId: true },
      }),
      prisma.expense.findMany({ where: { businessId: business.id, date: { gte: start } }, select: { amount: true, date: true, category: true } }),
      customersWithBalance(business.id),
      suppliersWithBalance(business.id),
    ]);

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      return { key: monthKey(d), label: d.toLocaleDateString("en-IN", { month: "short" }), sales: 0, purchases: 0, expenses: 0, received: 0, paid: 0 };
    });
    const byKey = new Map(months.map((m) => [m.key, m]));

    for (const t of tx) {
      const m = byKey.get(monthKey(t.transactionDate));
      if (!m) continue;
      const amount = Number(t.amount);
      if (t.type === "SALE") m.sales += amount;
      else if (t.type === "PURCHASE") m.purchases += amount;
      else if (t.type === "PAYMENT") (t.supplierId ? (m.paid += amount) : (m.received += amount));
    }

    const categories = new Map<string, number>();
    for (const e of expenses) {
      const m = byKey.get(monthKey(e.date));
      if (m) m.expenses += Number(e.amount);
      categories.set(e.category, (categories.get(e.category) ?? 0) + Number(e.amount));
    }

    const sum = (k: "sales" | "purchases" | "expenses" | "received" | "paid") => months.reduce((s, m) => s + m[k], 0);

    return NextResponse.json({
      months,
      totals: {
        sales: sum("sales"),
        purchases: sum("purchases"),
        expenses: sum("expenses"),
        profit: sum("sales") - sum("purchases") - sum("expenses"),
        cashIn: sum("received"),
        cashOut: sum("paid") + sum("expenses"),
      },
      expenseByCategory: Array.from(categories.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      receivables: customers.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 10).map((c) => ({ id: c.id, name: c.name, balance: c.balance })),
      payables: suppliers.filter((s) => s.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 10).map((s) => ({ id: s.id, name: s.name, balance: s.balance })),
    });
  } catch (e) {
    return handleError(e, "DATABASE_UNAVAILABLE", "We could not reach the database. Try again in a moment.", 503);
  }
}
