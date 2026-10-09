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

// Validate Meta's signature against the raw request body before accepting an event.
export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256") || "";
  const rawBody = await request.text();
  const row = await prisma.applicationSetting.findUnique({ where: { key: "platform.communication" } });
  const config: any = row?.value || {};
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
  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 }); }

  // Meta includes the sender's phone_number_id in each message/status change.
  // Resolve that ID to one company and update only that company's delivery rows.
  const providers = await prisma.notificationProvider.findMany({
    where: { channel: "whatsapp", enabled: true }
  });
  let processed = 0;
  for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      const value = change?.value;
      const phoneId = String(value?.metadata?.phone_number_id || "");
      if (!phoneId) continue;
      const provider = providers.find((item) => {
        const providerConfig = (item.config || {}) as Record<string, unknown>;
        return String(providerConfig.sender || "") === phoneId &&
          (!providerConfig.wabaId || String(providerConfig.wabaId) === String(entry.id || ""));
      });
      if (!provider) continue;
      for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
        const statusName = String(status.status || "").toLowerCase();
        if (!["sent", "delivered", "read", "failed"].includes(statusName) || !status.id) continue;
        const error = Array.isArray(status.errors) ? status.errors[0] : undefined;
        const result = await prisma.notificationDelivery.updateMany({
          where: {
            businessId: provider.businessId,
            channel: "whatsapp",
            providerMessageId: String(status.id)
          },
          data: {
            status: statusName,
            errorCode: error?.code != null ? String(error.code) : null,
            errorMessage: error?.title ? String(error.title).slice(0, 500) : null
          }
        });
        processed += result.count;
      }
    }
  }
  return NextResponse.json({ received: true, processed });
}
