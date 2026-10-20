import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SuperAdminLanguageProvider, SuperAdminLanguageSelect, useSuperAdminLanguage } from "./language";
import { SuperAdminLogin } from "./login";
import { SignOutButton } from "./sign-out";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const allowed = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = !!user && allowed.includes(String(user.email || "").toLowerCase());

  // The Super Admin area has its own sign-in (OTP / password) so admins never have to leave it.
  if (!isAdmin) {
    return (
      <SuperAdminLanguageProvider initialLanguage={String(user?.preferredLanguage || "en")}>
        <SuperAdminLogin signedInEmail={user?.email ?? null} configured={allowed.length > 0} />
      </SuperAdminLanguageProvider>
    );
  }

  return (
    <SuperAdminLanguageProvider initialLanguage={String(user.preferredLanguage || "en")}>
      <AdminShell email={String(user.email)}>{children}</AdminShell>
    </SuperAdminLanguageProvider>
  );
}

function AdminShell({ children, email }: { children: ReactNode; email: string }) {
  const { t } = useSuperAdminLanguage();
  return (
    <div className="sa-shell">
      <header className="sa-head">
        <div className="sa-head-in">
          <Link href="/super-admin" className="sa-brand">
            <span className="brand-mark">L</span>
            <span>{t("brand")}</span>
          </Link>
          <nav aria-label="Super Admin navigation" className="sa-nav">
            <Link href="/super-admin">{t("overview")}</Link>
            <Link href="/super-admin/communications#platform-email">{t("emailSetup")}</Link>
            <Link href="/super-admin/communications#whatsapp-setup">{t("whatsappSetup")}</Link>
            <SuperAdminLanguageSelect />
            <SignOutButton email={email} />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
