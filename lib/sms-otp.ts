import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secrets";

export async function sendSmsOtp(input: { mobile: string; otp: string }) {
  if (!/^\d{6}$/.test(input.otp)) {
    throw new Error("Unable to deliver the verification code.");
  }

  const setting = await prisma.applicationSetting.findUnique({
    where: { key: "notification.sms" },
  });
  const config = (setting?.value || {}) as Record<string, unknown>;
  const provider = String(config.provider || "").trim().toLowerCase();
  const from = String(config.sender || "").trim();
  const rawSid = String(config.apiKey || "");
  const rawToken = String(config.apiSecret || config.token || "");
  const accountSid = rawSid ? decryptSecret(rawSid) : "";
  const authToken = rawToken ? decryptSecret(rawToken) : "";

  // Deliberately use a fixed provider URL instead of posting to an arbitrary configured endpoint.
  if (!config.enabled || provider !== "twilio" || !from || !accountSid || !authToken) {
    throw new Error("SMS delivery is not configured. Use email OTP or configure Twilio in Settings → Communications.");
  }
  if (!/^AC[a-f0-9]{32}$/i.test(accountSid)) {
    throw new Error("The Twilio Account SID is invalid.");
  }

  let response: Response;
  try {
    const body = new URLSearchParams({
      To: input.mobile,
      From: from,
      Body: \`Your LekvoBook verification code is \${input.otp}. It expires in 10 minutes. Never share this code.\`,
    });
    response = await fetch(\`https://api.twilio.com/2010-04-01/Accounts/\${accountSid}/Messages.json\`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: \`Basic \${Buffer.from(\`\${accountSid}:\${authToken}\`).toString("base64")}\`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch {
    throw new Error("The SMS service could not be reached. Check the Twilio configuration.");
  }

  if (!response.ok) {
    throw new Error("The SMS service rejected the message. Check the Twilio credentials and sender.");
  }
}
