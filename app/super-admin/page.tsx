"use client";

import Link from "next/link";
import { useSuperAdminLanguage } from "./language";

const PALETTE = [
  { name: "Brand / header", hex: "#123941" },
  { name: "Positive · You got", hex: "#1B8A5A" },
  { name: "Negative · You gave", hex: "#CD3034" },
  { name: "Page background", hex: "#FBFBFA" },
  { name: "Soft panel", hex: "#ECF7FE" },
  { name: "Line", hex: "#DCE8E9" },
];

export default function SuperAdminHomePage() {
  const { t } = useSuperAdminLanguage();
  return (
    <main className="sa-main">
      <p className="sa-eyebrow">{t("platformAdministration")}</p>
      <h1 className="sa-title">{t("dashboard")}</h1>
      <p className="sa-lead">{t("dashboardIntro")}</p>
      <div className="sa-grid">
        <Link href="/super-admin/communications#platform-email" className="sa-card">
          <div className="sa-kicker">{t("authSystemMail")}</div>
          <h2>{t("emailSetup")}</h2>
          <p>{t("emailDesc")}</p>
          <p className="sa-go">{t("openEmail")}</p>
        </Link>
        <Link href="/super-admin/communications#whatsapp-setup" className="sa-card alt">
          <div className="sa-kicker">{t("metaIntegration")}</div>
          <h2>{t("whatsappSetup")}</h2>
          <p>{t("whatsappDesc")}</p>
          <p className="sa-go">{t("openWhatsApp")}</p>
        </Link>
      </div>
      <div className="sa-palette" aria-label="Colour palette">
        {PALETTE.map((c) => (
          <div className="sa-swatch" key={c.hex}>
            <i style={{ background: c.hex }} />
            <b>{c.name}</b>
            <span>{c.hex}</span>
          </div>
        ))}
      </div>
      <p className="sa-note">{t("security")}</p>
    </main>
  );
}
