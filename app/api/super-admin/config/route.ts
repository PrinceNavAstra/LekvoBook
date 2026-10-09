import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decryptSecret, encryptSecret } from "@/lib/secrets";

export const runtime = "nodejs";
const MASK = "••••••••";
const KEY = "platform.communication";
const SECRET_FIELDS = ["emailApiKey", "emailSmtpPassword", "whatsappToken", "webhookVerifyToken"] as const;

async function admin() {
  const user = await getCurrentUser();
  const allowed = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!user || !allowed.includes(String(user.email || "").toLowerCase())) return null;
  return user;
}
function safe(value: any) {
  const result = { ...(value || {}) };
  for (const field of SECRET_FIELDS) {
    result[field] = result[field] ? MASK : "";
  }
  return result;
}
export async function GET() {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  const row = await prisma.applicationSetting.findUnique({ where: { key: KEY } });
  return NextResponse.json({ config: safe(row?.value) });
}
export async function PUT(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid config." }, { status: 400 });
  const currentRow = await prisma.applicationSetting.findUnique({ where: { key: KEY } });
  const current: any = currentRow?.value || {};
  const next: Record<string, any> = {};
  const allowed = [
    "emailEnabled", "emailProvider", "emailFrom", "emailReplyTo", "emailApiKey",
    "emailSmtpHost", "emailSmtpPort", "emailSmtpSecure", "emailSmtpUser", "emailSmtpPassword",
    "whatsappEnabled", "whatsappAccountName", "whatsappPhoneId", "whatsappAppId",
    "whatsappBusinessId", "whatsappToken", "whatsappUrl", "whatsappVersion",
    "webhookVerifyToken", "whatsappAppSecret", "whatsappDefaultIncoming", "whatsappDefaultOutgoing", "whatsappAutoReadReceipt"
  ];
  for (const field of allowed) {
    if (body[field] === undefined) continue;
    const value = body[field];
    if (SECRET_FIELDS.includes(field as any)) {
      if (value === MASK) next[field] = current[field] || "";
      else if (typeof value === "string" && value.trim()) next[field] = encryptSecret(value.trim());
      else next[field] = "";
    } else {
      next[field] = value;
    }
  }
  const merged = { ...current, ...next };
  // Email delivery implementation currently supports the Resend HTTPS API.
  if (merged.emailProvider === "resend" && merged.emailEnabled &&
      (!merged.emailFrom || !(merged.emailApiKey || current.emailApiKey))) {
    return NextResponse.json({ error: "Resend requires a sender address and API key before enabling email." }, { status: 400 });
  }
  if (merged.whatsappEnabled && (!merged.whatsappPhoneId || !(merged.whatsappToken || current.whatsappToken))) {
    return NextResponse.json({ error: "WhatsApp requires a Phone ID and access token before activation." }, { status: 400 });
  }
  await prisma.applicationSetting.upsert({
    where: { key: KEY },
    update: { value: merged, updatedById: user.id },
    create: { key: KEY, value: merged, updatedById: user.id },
  });
  return NextResponse.json({ ok: true, config: safe(merged) });
}
export async function POST(request: Request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const row = await prisma.applicationSetting.findUnique({ where: { key: KEY } });
  const config: any = row?.value || {};
  if (body.action === "test-email") {
    const to = String(body.to || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Enter a valid test recipient email." }, { status: 400 });
    const key = config.emailApiKey ? decryptSecret(config.emailApiKey) : "";
    if (!config.emailEnabled || String(config.emailProvider).toLowerCase() !== "resend" || !config.emailFrom || !key) {
      return NextResponse.json({ error: "Enable Resend and save a sender address and API key first." }, { status: 400 });
    }
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: config.emailFrom, to: [to], subject: "LekvoBook email configuration test", text: "Your LekvoBook platform email configuration is working." })
      });
    } catch { return NextResponse.json({ error: "Could not reach Resend. Check network and try again." }, { status: 502 }); }
    if (!response.ok) return NextResponse.json({ error: "Resend rejected the test email. Check the API key, sender verification and account limits." }, { status: 502 });
    return NextResponse.json({ ok: true, message: "Test email accepted by Resend." });
  }
  if (body.action === "test-whatsapp") {
    const phoneId = String(config.whatsappPhoneId || "").trim();
    const token = config.whatsappToken ? decryptSecret(config.whatsappToken) : "";
    const version = String(config.whatsappVersion || "v23.0").trim();
    if (!phoneId || !token) return NextResponse.json({ error: "Save the WhatsApp Phone ID and access token first." }, { status: 400 });
    const url = `https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}`;
    let response: Response;
    try {
      response = await fetch(url, { method: "GET", redirect: "error", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${token}` } });
    } catch { return NextResponse.json({ error: "Could not reach Meta Graph API." }, { status: 502 }); }
    if (!response.ok) return NextResponse.json({ error: "Meta rejected the credentials or Phone ID. Check token permissions and Graph API version." }, { status: 502 });
    return NextResponse.json({ ok: true, message: "Meta accepted the token and Phone ID lookup." });
  }
  if (body.action === "test-whatsapp-message") {
    const phoneId = String(config.whatsappPhoneId || "").trim();
    const token = config.whatsappToken ? decryptSecret(config.whatsappToken) : "";
    const version = String(config.whatsappVersion || "v23.0").trim();
    const to = String(body.to || "").replace(/[^0-9]/g, "");
    if (!/^\d{8,15}$/.test(to)) return NextResponse.json({ error: "Enter a valid recipient number with country code." }, { status: 400 });
    if (!phoneId || !token) return NextResponse.json({ error: "Save the WhatsApp Phone ID and access token first." }, { status: 400 });
    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}/messages`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: "hello_world", language: { code: "en_US" } }
        })
      });
    } catch { return NextResponse.json({ error: "Could not reach Meta Graph API." }, { status: 502 }); }
    if (!response.ok) return NextResponse.json({ error: "Meta rejected the test message. Check the recipient, token permissions, phone registration and template availability." }, { status: 502 });
    return NextResponse.json({ ok: true, message: "Meta accepted the WhatsApp test template message." });
  }
  return NextResponse.json({ error: "Unknown test action." }, { status: 400 });
}
