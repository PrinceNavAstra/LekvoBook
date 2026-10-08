import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, getCurrentBusiness, handleError } from "@/lib/business";
import { suppliersWithBalance } from "@/lib/balances";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    return NextResponse.json(await suppliersWithBalance(business.id));
  } catch (e) {
    return handleError(e, "DATABASE_UNAVAILABLE", "We could not reach the database. Try again in a moment.", 503);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return fail("NAME_REQUIRED", "Enter the supplier's name.", 400);

    const business = await getCurrentBusiness();
    const supplier = await prisma.supplier.create({
      data: {
        businessId: business.id,
        name,
        mobile: body.mobile || null,
        email: body.email || null,
        address: body.address || null,
        gstNumber: body.gstNumber || null,
        openingBalance: Number(body.openingBalance || 0),
        notes: body.notes || null,
      },
    });
    await prisma.auditLog.create({
      data: { businessId: business.id, action: "SUPPLIER_CREATED", resource: "Supplier", resourceId: supplier.id },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (e) {
    return handleError(e, "SUPPLIER_CREATE_FAILED", "The supplier could not be saved. Try again.", 500);
  }
}
