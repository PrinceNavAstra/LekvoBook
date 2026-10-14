import { prisma } from "@/lib/prisma";

export const PLATFORM_MAIL_KEY = "platform.communication";

export type PlatformMail = {
  config: Record<string, unknown>;
  /** "admin" = saved on the Super Admin page, "env" = Vercel environment variables, null = nothing usable. */
  source: "admin" | "env" | null;
  updatedAt: Date | null;
};

/** Mail settings taken from environment variables, so sign-in codes can work before the admin page is filled in. */
function fromEnv(): Record<string, unknown> | null {
  const e = process.env;
  const from = (e.EMAIL_FROM || "").trim();
  if (!from) return null;
  if ((e.RESEND_API_KEY || "").trim()) {
    return { emailEnabled: true, emailProvider: "resend", emailFrom: from, emailApiKey: e.RESEND_API_KEY!.trim() };
  }
  if ((e.SMTP_HOST || "").trim() && (e.SMTP_USER || "").trim() && (e.SMTP_PASSWORD || "").trim()) {
    return {
      emailEnabled: true,
      emailProvider: "smtp",
      emailFrom: from,
      emailSmtpHost: e.SMTP_HOST!.trim(),
      emailSmtpPort: (e.SMTP_PORT || "587").trim(),
      emailSmtpSecure: String(e.SMTP_SECURE || "").toLowerCase() === "true",
      emailSmtpUser: e.SMTP_USER!.trim(),
      emailSmtpPassword: e.SMTP_PASSWORD!,
    };
  }
  return null;
}

/** The mail account used for sign-in codes: the Super Admin page first, then environment variables. */
export async function getPlatformMail(): Promise<PlatformMail> {
  const row = await prisma.applicationSetting.findUnique({ where: { key: PLATFORM_MAIL_KEY } });
  const saved = (row?.value || {}) as Record<string, unknown>;
  if (saved.emailEnabled) return { config: saved, source: "admin", updatedAt: row?.updatedAt ?? null };
  const env = fromEnv();
  if (env) return { config: env, source: "env", updatedAt: null };
  return { config: saved, source: null, updatedAt: row?.updatedAt ?? null };
}
