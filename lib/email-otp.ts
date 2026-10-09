import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secrets";

type OtpType = "sign-in" | "email-verification" | "forget-password";

export async function sendOtpEmail(input: { email: string; otp: string; type: OtpType }) {
  if (!/^\d{8}$/.test(input.otp)) {
    throw new Error("Unable to deliver the verification code.");
  }

  const setting = await prisma.applicationSetting.findUnique({
    where: { key: "notification.email" },
  });
  const config = (setting?.value || {}) as Record<string, unknown>;
  const provider = String(config.provider || "").trim().toLowerCase();
  const from = String(config.sender || "").trim();
  const rawKey = String(config.apiKey || config.token || "");
  const apiKey = rawKey ? decryptSecret(rawKey) : "";

  if (!config.enabled || provider !== "resend" || !from || !apiKey) {
    throw new Error("Email OTP delivery is not configured. Ask the Owner to configure Resend in Settings → Communications.");
  }

  const subject =
    input.type === "sign-in"
      ? "Your LekvoBook sign-in code"
      : input.type === "email-verification"
        ? "Verify your LekvoBook email"
        : "Reset your LekvoBook password";

  const text = `Your LekvoBook verification code is ${input.otp}. It expires in 5 minutes. If you did not request this, you can ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.5"><h2>LekvoBook verification</h2><p>Use this one-time code to continue:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${input.otp}</p><p>This code expires in 5 minutes. Never share it with anyone.</p><p style="color:#64748b;font-size:12px">If you did not request this email, you can safely ignore it.</p></body></html>`;

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        subject,
        text,
        html,
      }),
    });
  } catch {
    throw new Error("The email service could not be reached. Check the Resend configuration.");
  }

  if (!response.ok) {
    // Do not log or return the provider response; it can include account data.
    throw new Error("The email service rejected the message. Check the API key and verified sender address.");
  }
}
