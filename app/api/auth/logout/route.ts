import { auth } from "@/lib/better-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signOutRequest = new Request(new URL("/api/auth/sign-out", request.url), {
    method: "POST",
    headers: request.headers,
  });
  return auth.handler(signOutRequest);
}
