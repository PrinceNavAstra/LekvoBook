"use client";

import Link from "next/link";
import { useSuperAdminLanguage } from "./language";

const cardStyle = {
  display: "block",
  border: "1px solid #dce6e8",
  borderRadius: 16,
  background: "#fff",
  padding: 22,
  color: "#123941",
  textDecoration: "none",
  minHeight: 150,
} as const;

export default function SuperAdminHomePage() {
  const { t } = useSuperAdminLanguage();
  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px 56px" }}>
      <p style={{ margin: "0 0 8px", color: "#CD3034", fontWeight: 750, letterSpacing: ".04em", textTransform: "uppercase", fontSize: 12 }}>{t("platformAdministration")}</p>
      <h1 style={{ margin: "0 0 10px", color: "#123941", fontSize: "clamp(28px, 4vw, 38px)" }}>{t("dashboard")}</h1>
      <p style={{ maxWidth: 720, lineHeight: 1.7, color: "#53676b", marginBottom: 28 }}>
        {t("dashboardIntro")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
        <Link href="/super-admin/communications#platform-email" style={cardStyle}>
          <div style={{ fontSize: 13, color: "#587078", marginBottom: 12 }}>{t("authSystemMail")}</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>{t("emailSetup")}</h2>
          <p style={{ margin: 0, color: "#53676b", lineHeight: 1.65 }}>{t("emailDesc")}</p>
          <p style={{ margin: "18px 0 0", color: "#123941", fontWeight: 750 }}>{t("openEmail")}</p>
        </Link>
        <Link href="/super-admin/communications#whatsapp-setup" style={cardStyle}>
          <div style={{ fontSize: 13, color: "#587078", marginBottom: 12 }}>{t("metaIntegration")}</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>{t("whatsappSetup")}</h2>
          <p style={{ margin: 0, color: "#53676b", lineHeight: 1.65 }}>{t("whatsappDesc")}</p>
          <p style={{ margin: "18px 0 0", color: "#123941", fontWeight: 750 }}>{t("openWhatsApp")}</p>
        </Link>
      </div>
      <p style={{ marginTop: 22, color: "#65777b", fontSize: 13, lineHeight: 1.6 }}>
        {t("security")}
      </p>
    </main>
  );
}
