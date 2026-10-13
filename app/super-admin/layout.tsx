import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SuperAdminLanguageProvider, SuperAdminLanguageSelect, useSuperAdminLanguage } from "./language";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const allowed = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  // Keep platform controls hidden unless the signed-in account is explicitly allowlisted.
  if (!user || !allowed.includes(String(user.email || "").toLowerCase())) {
    redirect("/");
  }

  return (
    <SuperAdminLanguageProvider initialLanguage={String(user.preferredLanguage || "en")}>
      <AdminShell>{children}</AdminShell>
    </SuperAdminLanguageProvider>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useSuperAdminLanguage();
  return (
    <div style={{ minHeight: "100vh", background: "var(--background, #FBFBFA)", color: "var(--foreground, #123941)" }}>
      <header style={{ borderBottom: "1px solid #dce6e8", background: "#fff", padding: "14px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Link href="/super-admin" style={{ color: "#123941", textDecoration: "none", fontWeight: 800, fontSize: 18 }}>{t("brand")}</Link>
          <nav aria-label="Super Admin navigation" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link href="/super-admin" style={navStyle}>{t("overview")}</Link>
            <Link href="/super-admin/communications#platform-email" style={navStyle}>{t("emailSetup")}</Link>
            <Link href="/super-admin/communications#whatsapp-setup" style={navStyle}>{t("whatsappSetup")}</Link>
            <SuperAdminLanguageSelect />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

const navStyle = {
  color: "#123941",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 650,
  padding: "9px 12px",
  borderRadius: 9,
  background: "#ECF7FE",
} as const;
