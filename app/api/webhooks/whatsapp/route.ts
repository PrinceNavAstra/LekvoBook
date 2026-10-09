import { NextResponse } from "next/server";
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
export async function POST() {
  return NextResponse.json({ received: true });
}
