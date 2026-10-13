import nodemailer from "nodemailer";
import { decryptSecret } from "@/lib/secrets";

type MailConfig = Record<string, unknown>;

const value = (config: MailConfig, ...keys: string[]) => {
  for (const key of keys) {
    const item = config[key];
    if (typeof item === "string" && item.trim()) return item.trim();
  }
  return "";
};

/** Short, secret-free reason taken from the provider or mail server so admins can see what went wrong. */
function reason(error: unknown) {
  const e = error as { code?: unknown; response?: unknown; message?: unknown } | null;
  const text = String(e?.response || e?.message || "").replace(/\s+/g, " ").trim().slice(0, 220);
  return [typeof e?.code === "string" ? e.code : "", text].filter(Boolean).join(": ");
}

/** Decrypts a stored secret, with a clear message when the encryption key has changed since it was saved. */
function secret(raw: string) {
  if (!raw) return "";
  try {
    return decryptSecret(raw);
  } catch {
    throw new Error("The saved password or API key can no longer be decrypted (the encryption key changed). Enter it again and press Save.");
  }
}

export async function deliverEmail(config: MailConfig, input: { to: string; subject: string; text: string; html?: string }): Promise<string | null> {
  const provider = value(config, "emailProvider", "provider").toLowerCase();
  const from = value(config, "emailFrom", "sender");
  const replyTo = value(config, "emailReplyTo", "replyTo");
  if (!from) throw new Error("Email sender address is required.");

  if (provider === "resend") {
    const rawKey = value(config, "emailApiKey", "apiKey", "token");
    const apiKey = secret(rawKey);
    if (!apiKey) throw new Error("Email provider API key is missing.");
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to: [input.to], ...(replyTo ? { reply_to: replyTo } : {}),
          subject: input.subject, text: input.text, ...(input.html ? { html: input.html } : {})
        })
      });
    } catch (e) {
      throw new Error(`The email provider could not be reached. ${reason(e)}`.trim());
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(`Resend rejected the message (${response.status}): ${body?.message || "check the API key and that the From domain is verified in Resend."}`);
    }
    const result = await response.json().catch(() => null) as { id?: string } | null;
    return result?.id || null;
  }

  if (provider !== "smtp") throw new Error("Choose SMTP or Resend as the email provider.");
  const host = value(config, "emailSmtpHost", "smtpHost");
  const rawPort = value(config, "emailSmtpPort", "smtpPort") || "587";
  const port = Number(rawPort);
  const user = value(config, "emailSmtpUser", "smtpUser");
  const rawPassword = value(config, "emailSmtpPassword", "smtpPassword");
  const password = secret(rawPassword);
  const secureValue = config.emailSmtpSecure ?? config.smtpSecure;
  const secure = secureValue === true || String(secureValue).toLowerCase() === "true" || port === 465;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password) {
    throw new Error("SMTP host, valid port, username and password are required.");
  }

  const transporter = nodemailer.createTransport({
    host, port, secure, auth: { user, pass: password },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  try {
    const info = await transporter.sendMail({
      from, to: input.to, ...(replyTo ? { replyTo } : {}),
      subject: input.subject, text: input.text, ...(input.html ? { html: input.html } : {})
    });
    return typeof info.messageId === "string" ? info.messageId : null;
  } catch (e) {
    throw new Error(`SMTP could not deliver the email. ${reason(e)}`.trim());
  } finally {
    transporter.close();
  }
}


/**
 * Checks that the mail account can be signed in to, without sending anything.
 * SMTP: connects and authenticates. Resend: confirms the API key is accepted.
 */
export async function verifyEmailConnection(config: MailConfig): Promise<string> {
  const provider = value(config, "emailProvider", "provider").toLowerCase();

  if (provider === "resend") {
    const apiKey = secret(value(config, "emailApiKey", "apiKey", "token"));
    if (!apiKey) throw new Error("Enter the Resend API key first.");
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/domains", {
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    } catch (e) {
      throw new Error(`Could not reach Resend. ${reason(e)}`.trim());
    }
    const body = (await response.json().catch(() => null)) as { name?: string; message?: string } | null;
    if (response.ok) return "Resend accepted the API key.";
    // A sending-only key cannot list domains but is still valid for sending.
    if (response.status === 401 && body?.name === "restricted_api_key") return "Resend accepted the API key (sending-only key).";
    throw new Error(`Resend rejected the API key (${response.status}): ${body?.message || "check that it is correct and active."}`);
  }

  if (provider !== "smtp") throw new Error("Choose SMTP or Resend as the email provider.");
  const host = value(config, "emailSmtpHost", "smtpHost");
  const port = Number(value(config, "emailSmtpPort", "smtpPort") || "587");
  const user = value(config, "emailSmtpUser", "smtpUser");
  const password = secret(value(config, "emailSmtpPassword", "smtpPassword"));
  const secureValue = config.emailSmtpSecure ?? config.smtpSecure;
  const secure = secureValue === true || String(secureValue).toLowerCase() === "true" || port === 465;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password) {
    throw new Error("SMTP host, valid port, username and password are required.");
  }
  const transporter = nodemailer.createTransport({
    host, port, secure, auth: { user, pass: password },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  try {
    await transporter.verify();
    return `Signed in to ${host}:${port} as ${user}.`;
  } catch (e) {
    throw new Error(`Could not sign in to the mail server. ${reason(e)}`.trim());
  } finally {
    transporter.close();
  }
}
