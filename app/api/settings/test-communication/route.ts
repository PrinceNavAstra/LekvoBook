import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/secrets";
import { deliverEmail } from "@/lib/email-delivery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const membership = await prisma.businessUser.findFirst({ where: { userId: user.id }, include: { business: true } });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Owner or admin access required." }, { status: 403 });
  }
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const action = String(body.action || "");
  const to = String(body.to || "").trim();
  if (!["test-email", "test-whatsapp", "test-whatsapp-message"].includes(action)) {
    return NextResponse.json({ error: "Unsupported test action." }, { status: 400 });
  }
  const channel = action === "test-email" ? "email" : "whatsapp";
  const row = await prisma.notificationProvider.findFirst({ where: { businessId: membership.businessId, channel } });
  if (!row?.enabled) return NextResponse.json({ error: `Enable and save company ${channel} settings first.` }, { status: 400 });
  const config = (row.config || {}) as Record<string, any>;
  const provider = String(row.provider || config.provider || "").toLowerCase();

  if (action === "test-email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Enter a valid test recipient email." }, { status: 400 });
    try {
      await deliverEmail(config, { to, subject: "LekvoBook company email test", text: `This test email was sent using ${membership.business.name}'s own email configuration.` });
      return NextResponse.json({ ok: true, message: "Test email accepted by the configured company provider." });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Company email test failed." }, { status: 502 });
    }
  }

  if (!["meta", "whatsapp cloud api", "whatsapp-cloud-api"].includes(provider)) {
    return NextResponse.json({ error: "Company WhatsApp provider must be Meta WhatsApp Cloud API." }, { status: 400 });
  }
  const token = config.token ? decryptSecret(String(config.token)) : "";
  const phoneId = String(config.sender || "").trim();
  const version = String(config.version || "v23.0").trim();
  if (!token || !phoneId) return NextResponse.json({ error: "Save the WhatsApp Phone Number ID and access token first." }, { status: 400 });
  const base = `https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}`;
  if (action === "test-whatsapp") {
    let response: Response;
    try {
      response = await fetch(base, { method: "GET", redirect: "error", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${token}` } });
    } catch { return NextResponse.json({ error: "Could not reach Meta Graph API." }, { status: 502 }); }
    if (!response.ok) return NextResponse.json({ error: "Meta rejected the token or Phone Number ID. Check token permissions and API version." }, { status: 502 });
    return NextResponse.json({ ok: true, message: "Meta accepted the token and Phone Number ID lookup." });
  }

  const recipient = to.replace(/[^0-9]/g, "");
  if (!/^\d{8,15}$/.test(recipient)) return NextResponse.json({ error: "Enter a recipient number including country code." }, { status: 400 });
  let response: Response;
  try {
    response = await fetch(`${base}/messages`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: recipient, type: "template", template: { name: "hello_world", language: { code: "en_US" } } })
    });
  } catch { return NextResponse.json({ error: "Could not reach Meta Graph API." }, { status: 502 }); }
  if (!response.ok) return NextResponse.json({ error: "Meta rejected the test template. Check recipient eligibility, token permissions, phone registration and template availability." }, { status: 502 });
  return NextResponse.json({ ok: true, message: "Meta accepted the test template message." });
}
