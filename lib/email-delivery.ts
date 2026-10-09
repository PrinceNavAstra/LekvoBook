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

export async function deliverEmail(config: MailConfig, input: { to: string; subject: string; text: string; html?: string }) {
  const provider = value(config, "emailProvider", "provider").toLowerCase();
  const from = value(config, "emailFrom", "sender");
  const replyTo = value(config, "emailReplyTo", "replyTo");
  if (!from) throw new Error("Email sender address is required.");

  if (provider === "resend") {
    const rawKey = value(config, "emailApiKey", "apiKey", "token");
    const apiKey = rawKey ? decryptSecret(rawKey) : "";
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
    } catch {
      throw new Error("The email provider could not be reached.");
    }
    if (!response.ok) throw new Error("The email provider rejected the message. Check the API key and verified sender.");
    return;
  }

  if (provider !== "smtp") throw new Error("Choose SMTP or Resend as the email provider.");
  const host = value(config, "emailSmtpHost", "smtpHost");
  const rawPort = value(config, "emailSmtpPort", "smtpPort") || "587";
  const port = Number(rawPort);
  const user = value(config, "emailSmtpUser", "smtpUser");
  const rawPassword = value(config, "emailSmtpPassword", "smtpPassword");
  const password = rawPassword ? decryptSecret(rawPassword) : "";
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
    await transporter.sendMail({
      from, to: input.to, ...(replyTo ? { replyTo } : {}),
      subject: input.subject, text: input.text, ...(input.html ? { html: input.html } : {})
    });
  } catch {
    throw new Error("SMTP could not deliver the email. Check the host, port, TLS and credentials.");
  } finally {
    transporter.close();
  }
}
