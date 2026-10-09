import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/secrets";

const CHANNEL_KEYS = ["notification.email", "notification.whatsapp"] as const;
const DEFAULT_PROVIDER_BY_CHANNEL = {
  email: "resend",
  whatsapp: "meta",
} as const;
const MASK = "••••••••";

async function owner() {
  const user = await getCurrentUser();
  if (!user) return null;
  const membership = await prisma.businessUser.findFirst({
    where: { userId: user.id },
    include: { business: true },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) return null;
  return { user, membership };
}

function maskConfig(value: unknown) {
  const config = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    ...config,
    token: config.token ? MASK : "",
    apiKey: config.apiKey ? MASK : "",
    apiSecret: config.apiSecret ? MASK : "",
    smtpPassword: config.smtpPassword ? MASK : "",
  };
}

export async function GET() {
  const access = await owner();
  if (!access) return NextResponse.json({ error: "Owner or admin access required." }, { status: 401 });

  // General preferences remain separate from platform-wide provider credentials.
  const [generalRow, providers] = await Promise.all([
    prisma.applicationSetting.findUnique({ where: { key: "general" } }),
    prisma.notificationProvider.findMany({ where: { businessId: access.membership.businessId } }),
  ]);

  const settings: Record<string, unknown> = { general: generalRow?.value ?? { currency: "INR", timezone: "Asia/Kolkata", dateFormat: "DD MMM YYYY" } };
  for (const key of CHANNEL_KEYS) {
    const channel = key.replace("notification.", "");
    const row = providers.find((item) => item.channel.toLowerCase() === channel);
    const config = (row?.config ?? {}) as Record<string, unknown>;
    settings[key] = maskConfig({ ...config, provider: row?.provider ?? config.provider, enabled: row?.enabled ?? false });
  }
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const access = await owner();
  if (!access) return NextResponse.json({ error: "Owner or admin access required." }, { status: 401 });

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
  }

  // Reject unexpected keys rather than accidentally letting company users change
  // platform-wide settings such as the system OTP sender.
  const allowed = new Set(["general", ...CHANNEL_KEYS]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    return NextResponse.json({ error: "Unsupported settings field." }, { status: 400 });
  }

  if (body.general !== undefined) {
    if (!body.general || typeof body.general !== "object" || Array.isArray(body.general)) {
      return NextResponse.json({ error: "Invalid general settings." }, { status: 400 });
    }
    await prisma.applicationSetting.upsert({
      where: { key: "general" },
      update: { value: body.general, updatedById: access.user.id },
      create: { key: "general", value: body.general, updatedById: access.user.id },
    });
  }

  for (const key of CHANNEL_KEYS) {
    if (body[key] === undefined) continue;
    const input = body[key];
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json({ error: "Invalid communication settings." }, { status: 400 });
    }

    const channel = key.replace("notification.", "");
    const existing = await prisma.notificationProvider.findFirst({
      where: { businessId: access.membership.businessId, channel },
    });
    const old = (existing?.config ?? {}) as Record<string, unknown>;
    const config: Record<string, unknown> = { ...input };
    for (const field of ["token", "apiKey", "apiSecret", "smtpPassword"]) {
      const incoming = config[field];
      if (incoming === MASK) config[field] = old[field] ?? "";
      else if (typeof incoming === "string" && incoming.trim()) config[field] = encryptSecret(incoming.trim());
      else config[field] = "";
    }
    // Provider-specific fields are saved with this business only; credentials
    // are never read from or written to the global ApplicationSetting table.
    delete config.enabled;
    const provider = String(input.provider ?? DEFAULT_PROVIDER_BY_CHANNEL[channel as keyof typeof DEFAULT_PROVIDER_BY_CHANNEL] ?? "").trim().toLowerCase();
    const enabled = input.enabled === true;
    if (enabled && channel === "email") {
      const sender = String(config.sender || "").trim();
      if (!sender) return NextResponse.json({ error: "Enter a verified sender address before enabling company email." }, { status: 400 });
      if (provider === "resend" && !(config.apiKey || config.token)) {
        return NextResponse.json({ error: "Resend requires an API key before enabling company email." }, { status: 400 });
      }
      if (provider === "smtp") {
        const port = Number(config.smtpPort || 587);
        if (!config.smtpHost || !Number.isInteger(port) || port < 1 || port > 65535 || !config.smtpUser || !config.smtpPassword) {
          return NextResponse.json({ error: "SMTP requires host, valid port, username and app password before enabling company email." }, { status: 400 });
        }
      }
      if (!["smtp", "resend"].includes(provider)) return NextResponse.json({ error: "Choose SMTP or Resend for company email." }, { status: 400 });
    }
    if (enabled && channel === "whatsapp") {
      if (!["meta", "whatsapp cloud api", "whatsapp-cloud-api"].includes(provider)) {
        return NextResponse.json({ error: "Choose Meta WhatsApp Cloud API as the WhatsApp provider." }, { status: 400 });
      }
      if (!String(config.sender || "").trim() || !String(config.wabaId || "").trim() || !(config.token || old.token)) {
        return NextResponse.json({ error: "WhatsApp Phone Number ID, WABA ID and access token are required." }, { status: 400 });
      }
    }

    if (existing) {
      await prisma.notificationProvider.update({
        where: { id: existing.id },
        data: { provider, config: config as any, enabled },
      });
    } else {
      await prisma.notificationProvider.create({
        data: { businessId: access.membership.businessId, channel, provider, config: config as any, enabled },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
