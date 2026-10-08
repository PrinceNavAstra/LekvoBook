import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, getContext, getCurrentBusiness, handleError } from "@/lib/business";

export const dynamic = "force-dynamic";

const TYPES = ["OPENING", "CREDIT", "PAYMENT", "SALE", "PURCHASE", "ADJUSTMENT"] as const;
type Type = (typeof TYPES)[number];

/** Direction is decided by the server so the client can never post a mismatched pair. */
function directionFor(type: Type, requested: unknown): "CREDIT" | "DEBIT" {
  if (type === "PAYMENT") return "DEBIT";
  if (type === "ADJUSTMENT") return requested === "DEBIT" ? "DEBIT" : "CREDIT";
  return "CREDIT";
}

export async function GET(req: NextRequest) {
  try {
    const business = await getCurrentBusiness();
    const params = req.nextUrl.searchParams;
    const type = params.get("type");
    const customerId = params.get("customerId");
    const supplierId = params.get("supplierId");
    const limit = Math.min(Number(params.get("limit")) || 200, 500);

    const rows = await prisma.ledgerTransaction.findMany({
      where: {
        businessId: business.id,
        ...(type && TYPES.includes(type as Type) ? { type: type as Type } : {}),
        ...(customerId ? { customerId } : {}),
        ...(supplierId ? { supplierId } : {}),
      },
      include: { customer: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
      orderBy: { transactionDate: "desc" },
      take: limit,
    });
    return NextResponse.json(rows.map((t) => ({ ...t, amount: Number(t.amount) })));
  } catch (e) {
    return handleError(e, "DATABASE_UNAVAILABLE", "We could not reach the database. Try again in a moment.", 503);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, business } = await getContext();

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail("INVALID_AMOUNT", "Enter an amount greater than zero.", 400);
    }
    if (!TYPES.includes(body.type)) {
      return fail("INVALID_TYPE", "Choose what kind of entry this is.", 400);
    }
    if (!body.customerId && !body.supplierId) {
      return fail("PARTY_REQUIRED", "Choose a customer or supplier for this entry.", 400);
    }

    if (body.customerId) {
      const found = await prisma.customer.findFirst({ where: { id: body.customerId, businessId: business.id } });
      if (!found) return fail("CUSTOMER_NOT_FOUND", "That customer could not be found.", 404);
    }
    if (body.supplierId) {
      const found = await prisma.supplier.findFirst({ where: { id: body.supplierId, businessId: business.id } });
      if (!found) return fail("SUPPLIER_NOT_FOUND", "That supplier could not be found.", 404);
    }

    const transaction = await prisma.ledgerTransaction.create({
      data: {
        businessId: business.id,
        customerId: body.customerId || null,
        supplierId: body.supplierId || null,
        type: body.type,
        amount,
        direction: directionFor(body.type, body.direction),
        createdById: user.id,
        referenceNumber: body.referenceNumber || null,
        notes: body.notes || null,
        ...(body.date ? { transactionDate: new Date(body.date) } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        businessId: business.id,
        userId: user.id,
        action: "TRANSACTION_CREATED",
        resource: "LedgerTransaction",
        resourceId: transaction.id,
        metadata: { type: body.type, amount },
      },
    });

    return NextResponse.json({ ...transaction, amount }, { status: 201 });
  } catch (e) {
    return handleError(e, "TRANSACTION_CREATE_FAILED", "The entry could not be saved. Try again.", 500);
  }
}
