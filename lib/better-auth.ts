import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendOtpEmail } from "@/lib/email-otp";

const productionURL = process.env.BETTER_AUTH_URL || "https://lekvobook.vercel.app";
const deploymentURL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
const isPreview = process.env.VERCEL_ENV === "preview";
const baseURL = isPreview && deploymentURL ? deploymentURL : productionURL;

const trustedOrigins = [
  "https://lekvobook.vercel.app",
  "https://lekvobook-prince679pro-4666s-projects.vercel.app",
  "https://lekvobook-git-main-prince679pro-4666s-projects.vercel.app",
  baseURL,
  deploymentURL,
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  appName: "LekvoBook",
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET || (
    process.env.NODE_ENV === "production"
      ? undefined
      : "local-development-only-secret-replace-for-production-32-chars-min"
  ),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [...new Set(trustedOrigins)],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 12,
    maxPasswordLength: 200,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: async (password) => hashPassword(password),
      verify: async ({ hash, password }) => verifyPassword(password, hash),
    },
  },
  user: {
    additionalFields: {
      mobile: {
        type: "string",
        required: false,
        input: false,
      },
      preferredLanguage: {
        type: "string",
        required: false,
        defaultValue: "en",
        input: true,
      },
    },
  },
  session: {
    expiresIn: 7 * 24 * 60 * 60,
    updateAge: 12 * 60 * 60,
    cookieCache: { enabled: false },
  },
  verification: {
    storeIdentifier: "hashed",
    storeInDatabase: true,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 30,
    customRules: {
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 5 },
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/email-otp/request-password-reset": { window: 60, max: 3 },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [
    emailOTP({
      otpLength: 8,
      expiresIn: 5 * 60,
      allowedAttempts: 3,
      resendStrategy: "rotate",
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail({ email, otp, type });
      },
    }),
  ],
});
