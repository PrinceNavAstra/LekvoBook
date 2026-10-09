import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secrets";

export const runtime = "nodejs";

// Meta verifies a webhook by sending hub.mode, hub.verify_token and hub.challenge.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token") || "";
  const challenge = url.searchParams.get("hub.challenge") || "";
  const row = await prisma.applicationSetting.findUnique({ where: { key: "platform.communication" } });
  const config: any = row?.value || {};
  const expected = config.webhookVerifyToken ? decryptSecret(String(config.webhookVerifyToken)) : "";
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

// Event ingestion is intentionally not used to trigger actions yet. Verify the endpoint
// and keep event content out of logs until app-secret signature validation is configured.
export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256") || "";
  const rawBody = await request.text();
  const appSecret = config.whatsappAppSecret ? decryptSecret(String(config.whatsappAppSecret)) : "";
  if (!appSecret || !signature.startsWith("sha256=")) {
    return NextResponse.json({ error: "Webhook signature validation is not configured." }, { status: 401 });
  }
  const expectedSignature = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }
  return NextResponse.json({ received: true });
}
