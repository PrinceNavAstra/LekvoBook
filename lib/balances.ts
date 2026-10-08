import { prisma } from "@/lib/prisma";
import { toBalance } from "@/lib/business";

type Totals = Map<string, { credit: number; debit: number }>;

function fold(rows: { id: string | null; direction: "CREDIT" | "DEBIT"; amount: unknown }[]): Totals {
  const map: Totals = new Map();
  for (const row of rows) {
    if (!row.id) continue;
    const entry = map.get(row.id) ?? { credit: 0, debit: 0 };
    const sum = Number(row.amount ?? 0);
    if (row.direction === "CREDIT") entry.credit += sum;
    else entry.debit += sum;
    map.set(row.id, entry);
  }
  return map;
}

async function customerTotals(businessId: string): Promise<Totals> {
  const rows = await prisma.ledgerTransaction.groupBy({
    by: ["customerId", "direction"],
    where: { businessId, status: "posted", customerId: { not: null } },
    _sum: { amount: true },
  });
  return fold(rows.map((r) => ({ id: r.customerId, direction: r.direction, amount: r._sum.amount })));
}

async function supplierTotals(businessId: string): Promise<Totals> {
  const rows = await prisma.ledgerTransaction.groupBy({
    by: ["supplierId", "direction"],
    where: { businessId, status: "posted", supplierId: { not: null } },
    _sum: { amount: true },
  });
  return fold(rows.map((r) => ({ id: r.supplierId, direction: r.direction, amount: r._sum.amount })));
}

export async function customersWithBalance(businessId: string) {
  const [customers, totals] = await Promise.all([
    prisma.customer.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } }),
    customerTotals(businessId),
  ]);
  return customers.map((c) => {
    const t = totals.get(c.id);
    return {
      ...c,
      openingBalance: Number(c.openingBalance),
      creditLimit: Number(c.creditLimit),
      balance: toBalance(c.openingBalance, t?.credit, t?.debit),
    };
  });
}

export async function suppliersWithBalance(businessId: string) {
  const [suppliers, totals] = await Promise.all([
    prisma.supplier.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } }),
    supplierTotals(businessId),
  ]);
  return suppliers.map((s) => {
    const t = totals.get(s.id);
    return {
      ...s,
      openingBalance: Number(s.openingBalance),
      balance: toBalance(s.openingBalance, t?.credit, t?.debit),
    };
  });
}
