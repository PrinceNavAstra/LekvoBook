import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, getCurrentBusiness, handleError } from "@/lib/business";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    const [invoices, customers] = await Promise.all([
      prisma.invoice.findMany({
        where: { businessId: business.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.customer.findMany({ where: { businessId: business.id }, select: { id: true, name: true } }),
    ]);
    const names = new Map(customers.map((c) => [c.id, c.name]));
    const now = Date.now();

    return NextResponse.json(
      invoices.map((i) => ({
        id: i.id,
        number: i.number,
        customerId: i.customerId,
        customerName: names.get(i.customerId) ?? "Unknown customer",
        // An unpaid invoice past its due date is shown as overdue without rewriting history.
        status: ["SENT", "PARTIALLY_PAID"].includes(i.status) && i.dueDate && i.dueDate.getTime() < now ? "OVERDUE" : i.status,
        subtotal: Number(i.subtotal),
        tax: Number(i.tax),
        discount: Number(i.discount),
        total: Number(i.total),
        dueDate: i.dueDate,
        createdAt: i.createdAt,
        itemCount: i.items.length,
      })),
    );
  } catch (e) {
    return handleError(e, "DATABASE_UNAVAILABLE", "We could not reach the database. Try again in a moment.", 503);
  }
}

type ItemInput = { description?: string; quantity?: number; unitPrice?: number; taxRate?: number };

/** Totals are always computed on the server from the line items. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const business = await getCurrentBusiness();

    const customer = await prisma.customer.findFirst({ where: { id: body.customerId, businessId: business.id } });
    if (!customer) return fail("CUSTOMER_NOT_FOUND", "Choose a customer for this invoice.", 400);

    const raw: ItemInput[] = Array.isArray(body.items) ? body.items : [];
    const items = raw
      .map((i) => ({
        description: String(i.description ?? "").trim(),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate || 0),
      }))
      .filter((i) => i.description && i.quantity > 0 && i.unitPrice >= 0);
    if (!items.length) return fail("ITEMS_REQUIRED", "Add at least one item with a quantity and price.", 400);

    const discount = Math.max(Number(body.discount || 0), 0);
    const lines = items.map((i) => {
      const net = i.quantity * i.unitPrice;
      return { ...i, total: net + (net * i.taxRate) / 100, net, tax: (net * i.taxRate) / 100 };
    });
    const subtotal = lines.reduce((s, l) => s + l.net, 0);
    const tax = lines.reduce((s, l) => s + l.tax, 0);
    const total = Math.max(subtotal + tax - discount, 0);

    const last = await prisma.invoice.findMany({ select: { number: true }, orderBy: { createdAt: "desc" }, take: 1 });
    const next = (Number(last[0]?.number.replace(/\D/g, "")) || 1000) + 1;

    const invoice = await prisma.invoice.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        number: `INV-${next}`,
        status: body.sendNow ? "SENT" : "DRAFT",
        subtotal,
        tax,
        discount,
        total,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        items: {
          create: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            total: l.total,
          })),
        },
      },
    });

    // Sending an invoice puts the amount on the customer's ledger as a sale.
    if (body.sendNow) {
      await prisma.ledgerTransaction.create({
        data: {
          businessId: business.id,
          customerId: customer.id,
          type: "SALE",
          amount: total,
          direction: "CREDIT",
          referenceNumber: invoice.number,
          notes: `Invoice ${invoice.number}`,
        },
      });
    }

    await prisma.auditLog.create({
      data: { businessId: business.id, action: "INVOICE_CREATED", resource: "Invoice", resourceId: invoice.id, metadata: { number: invoice.number, total } },
    });
    return NextResponse.json({ id: invoice.id, number: invoice.number, total }, { status: 201 });
  } catch (e) {
    return handleError(e, "INVOICE_CREATE_FAILED", "The invoice could not be saved. Try again.", 500);
  }
}
