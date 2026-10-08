import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** An error that already carries a user-friendly message and the HTTP status to return. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Resolves the signed-in user and the business they belong to.
 * Throws a 401 when signed out and a 409 when the user has not finished business setup,
 * so no route can ever read or write another business's data.
 */
export async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "AUTH_REQUIRED", "Please sign in to continue.");

  const membership = await prisma.businessUser.findFirst({
    where: { userId: user.id },
    include: { business: true },
    orderBy: { id: "asc" },
  });
  if (!membership) throw new ApiError(409, "BUSINESS_SETUP_REQUIRED", "Finish setting up your business to continue.");

  return { user, business: membership.business, role: membership.role };
}

export async function getCurrentBusiness() {
  return (await getContext()).business;
}

/** Balance = opening balance + credits - debits (same rule for customers and suppliers). */
export function toBalance(opening: unknown, credits: unknown, debits: unknown) {
  return Number(opening ?? 0) + Number(credits ?? 0) - Number(debits ?? 0);
}

export function fail(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

/** Known errors (sign-in, setup) keep their own message; anything else gets the route's fallback. */
export function handleError(error: unknown, code: string, message: string, status: number) {
  if (error instanceof ApiError) return fail(error.code, error.message, error.status);
  return fail(code, message, status);
}
