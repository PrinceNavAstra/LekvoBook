import { deliverEmail } from "@/lib/email-delivery";
import { getPlatformMail } from "@/lib/platform-mail";

type OtpType = "sign-in" | "change-email" | "email-verification" | "forget-password";

export async function sendOtpEmail(input: { email: string; otp: string; type: OtpType }) {
  if (!/^\d{8}$/.test(input.otp)) throw new Error("Unable to deliver the verification code.");

  const { config, source } = await getPlatformMail();
  if (!source) {
    console.error("[otp-email] no platform mail is set up: save and enable it on /super-admin/communications, or set EMAIL_FROM with RESEND_API_KEY or SMTP_* in Vercel.");
    throw new Error("Platform email delivery is not configured. Contact the Super Admin.");
  }

  const subject =
    input.type === "sign-in" ? "Your LekvoBook sign-in code" :
    input.type === "email-verification" ? "Verify your LekvoBook email" :
    input.type === "change-email" ? "Confirm your LekvoBook email change" :
    "Reset your LekvoBook password";

  const text = `Your LekvoBook verification code is ${input.otp}. It expires in 5 minutes. If you did not request this, you can ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.5"><h2>LekvoBook verification</h2><p>Use this one-time code to continue:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${input.otp}</p><p>This code expires in 5 minutes. Never share it with anyone.</p><p style="color:#64748b;font-size:12px">If you did not request this email, you can safely ignore it.</p></body></html>`;
  try {
    await deliverEmail(config, { to: input.email, subject, text, html });
  } catch (error) {
    // The real reason goes to the server log (Vercel > Logs); the visitor only sees a generic message.
    console.error("[otp-email] delivery failed:", error instanceof Error ? error.message : error);
    throw new Error("The platform email service could not deliver the message. Check the Super Admin email configuration.");
  }
}
