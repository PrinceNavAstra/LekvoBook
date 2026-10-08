import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, getCurrentBusiness, handleError } from "@/lib/business";

export const dynamic = "force-dynamic";

const TYPES = ["PURCHASE", "SALE", "RETURN", "ADJUSTMENT"] as const;
type Type = (typeof TYPES)[number];

/** Records a stock movement. Sales are stored as negative quantities, purchases and returns as positive. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const business = await getCurrentBusiness();

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity === 0) {
      return fail("INVALID_QUANTITY", "Enter a quantity other than zero.", 400);
    }
    if (!TYPES.includes(body.type)) return fail("INVALID_TYPE", "Choose a movement type.", 400);

    const product = await prisma.product.findFirst({ where: { id: body.productId, businessId: business.id } });
    if (!product) return fail("PRODUCT_NOT_FOUND", "That product could not be found.", 404);

    const type = body.type as Type;
    const magnitude = Math.abs(quantity);
    const signed = type === "SALE" ? -magnitude : type === "ADJUSTMENT" ? quantity : magnitude;

    const movement = await prisma.inventoryMovement.create({
      data: { businessId: business.id, productId: product.id, type, quantity: signed, notes: body.notes || null },
    });
    return NextResponse.json({ ...movement, quantity: signed }, { status: 201 });
  } catch (e) {
    return handleError(e, "MOVEMENT_CREATE_FAILED", "The stock change could not be saved. Try again.", 500);
  }
}
