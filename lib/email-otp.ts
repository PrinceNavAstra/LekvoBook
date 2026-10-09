import { prisma } from "@/lib/prisma";
import { deliverEmail } from "@/lib/email-delivery";

type OtpType = "sign-in" | "change-email" | "email-verification" | "forget-password";

export async function sendOtpEmail(input: { email: string; otp: string; type: OtpType }) {
  if (!/^\d{8}$/.test(input.otp)) throw new Error("Unable to deliver the verification code.");

  const setting = await prisma.applicationSetting.findUnique({ where: { key: "platform.communication" } });
  const config = (setting?.value || {}) as Record<string, unknown>;
  if (!config.emailEnabled) throw new Error("Platform email delivery is not configured. Contact the Super Admin.");

  const subject =
    input.type === "sign-in" ? "Your LekvoBook sign-in code" :
    input.type === "email-verification" ? "Verify your LekvoBook email" :
    input.type === "change-email" ? "Confirm your LekvoBook email change" :
    "Reset your LekvoBook password";

  const text = `Your LekvoBook verification code is ${input.otp}. It expires in 5 minutes. If you did not request this, you can ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.5"><h2>LekvoBook verification</h2><p>Use this one-time code to continue:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${input.otp}</p><p>This code expires in 5 minutes. Never share it with anyone.</p><p style="color:#64748b;font-size:12px">If you did not request this email, you can safely ignore it.</p></body></html>`;
  try {
    await deliverEmail(config, { to: input.email, subject, text, html });
  } catch {
    throw new Error("The platform email service could not deliver the message. Check the Super Admin email configuration.");
  }
}
