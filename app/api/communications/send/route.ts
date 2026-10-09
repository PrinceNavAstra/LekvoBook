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
  if (!membership) return NextResponse.json({ error: "Business membership required." }, { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const channel = String(body.channel || "").toLowerCase();
  const to = String(body.to || "").trim();
  const message = String(body.message || "").trim();
  const subject = String(body.subject || "Message from your business").trim();
  if (!["email", "whatsapp"].includes(channel) || !to || !message || message.length > 4000) {
    return NextResponse.json({ error: "Provide a supported channel, recipient and message (maximum 4000 characters)." }, { status: 400 });
  }

  const row = await prisma.notificationProvider.findFirst({
    where: { businessId: membership.businessId, channel },
  });
  if (!row?.enabled) return NextResponse.json({ error: `${channel} is not enabled for this company.` }, { status: 400 });
  const config: any = row.config || {};
  const provider = String(row.provider || config.provider || "").toLowerCase();

  try {
    if (channel === "email") {
      try {
        await deliverEmail(config, { to, subject, text: message });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Company email delivery failed.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    } else if (channel === "whatsapp") {
      if (!["meta", "whatsapp cloud api", "whatsapp-cloud-api"].includes(provider)) {
        return NextResponse.json({ error: "Company WhatsApp provider must be Meta WhatsApp Cloud API." }, { status: 400 });
      }
      const token = config.token ? decryptSecret(String(config.token)) : "";
      const phoneId = String(config.sender || "").trim();
      if (!token || !phoneId) return NextResponse.json({ error: "WhatsApp Phone Number ID and access token are required." }, { status: 400 });
      const version = String(config.version || "v23.0").trim();
      if (!/^v\d+\.0$/.test(version)) return NextResponse.json({ error: "Invalid Graph API version." }, { status: 400 });
      const recipient = to.replace(/[^0-9]/g, "");
      if (!/^\d{8,15}$/.test(recipient)) return NextResponse.json({ error: "WhatsApp recipient must include country code." }, { status: 400 });
      const payload = body.templateName
        ? { messaging_product: "whatsapp", to: recipient, type: "template", template: {
            name: String(body.templateName).trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 100),
            language: { code: String(body.templateLanguage || "en_US").slice(0, 20) },
            ...(Array.isArray(body.templateComponents) ? { components: body.templateComponents } : {})
          } }
        : { messaging_product: "whatsapp", to: recipient, type: "text", text: { body: message, preview_url: false } };
      if (payload.type === "template" && !(payload as any).template.name) return NextResponse.json({ error: "Provide a valid approved template name." }, { status: 400 });
      const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneId)}/messages`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) return NextResponse.json({ error: "Meta rejected the message. Outside the customer-service window, use an approved template." }, { status: 502 });

    }
    return NextResponse.json({ ok: true, message: "Message accepted by the provider." });
  } catch {
    return NextResponse.json({ error: "Could not reach the messaging provider. Check its configuration and try again." }, { status: 502 });
  }
}
