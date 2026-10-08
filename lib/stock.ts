import { prisma } from "@/lib/prisma";

/** Current stock = opening stock + sum of movement records. Never a hand-edited number. */
export async function productsWithStock(businessId: string) {
  const [products, sums] = await Promise.all([
    prisma.product.findMany({ where: { businessId }, orderBy: { name: "asc" } }),
    prisma.inventoryMovement.groupBy({
      by: ["productId"],
      where: { businessId },
      _sum: { quantity: true },
    }),
  ]);
  const moved = new Map<string, number>();
  for (const s of sums) moved.set(s.productId, Number(s._sum.quantity ?? 0));

  return products.map((p) => {
    const stock = Number(p.openingStock) + (moved.get(p.id) ?? 0);
    const threshold = Number(p.lowStockThreshold);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      unit: p.unit,
      purchasePrice: Number(p.purchasePrice),
      sellingPrice: Number(p.sellingPrice),
      lowStockThreshold: threshold,
      stock,
      low: stock <= threshold,
    };
  });
}
