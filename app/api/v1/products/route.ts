import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, getCurrentBusiness, handleError } from "@/lib/business";
import { productsWithStock } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    return NextResponse.json(await productsWithStock(business.id));
  } catch (e) {
    return handleError(e, "DATABASE_UNAVAILABLE", "We could not reach the database. Try again in a moment.", 503);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return fail("NAME_REQUIRED", "Enter the product name.", 400);

    const business = await getCurrentBusiness();
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        name,
        sku: body.sku || null,
        category: body.category || null,
        unit: body.unit || "pcs",
        purchasePrice: Number(body.purchasePrice || 0),
        sellingPrice: Number(body.sellingPrice || 0),
        openingStock: Number(body.openingStock || 0),
        lowStockThreshold: Number(body.lowStockThreshold || 0),
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    return handleError(e, "PRODUCT_CREATE_FAILED", "The product could not be saved. Try again.", 500);
  }
}
