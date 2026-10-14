"use client";
import { useEffect, useState } from "react";
import { Select } from "@/app/components/ui";
import { useSuperAdminLanguage } from "../language";

type Config = Record<string, string | boolean>;
const MASK = "••••••••";
const defaults: Config = {
  emailEnabled: false, emailProvider: "resend", emailFrom: "", emailReplyTo: "", emailApiKey: "",
  emailSmtpHost: "", emailSmtpPort: "587", emailSmtpSecure: false, emailSmtpUser: "", emailSmtpPassword: "",
  whatsappEnabled: false, whatsappAccountName: "", whatsappPhoneId: "", whatsappAppId: "", whatsappBusinessId: "",
  whatsappToken: "", whatsappUrl: "https://graph.facebook.com", whatsappVersion: "v26.0",
  webhookVerifyToken: "", whatsappAppSecret: "", whatsappDefaultIncoming: false, whatsappDefaultOutgoing: false, whatsappAutoReadReceipt: true
};
export default function SuperAdminCommunicationsPage() {
  const { t } = useSuperAdminLanguage();
  const [config, setConfig] = useState<Config>(defaults);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [status, setStatus] = useState<{ source: "admin" | "env" | null; savedAt: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testWhatsAppTo, setTestWhatsAppTo] = useState("");
  // Result of the last mail action, shown inside the mail card so it is seen next to the buttons.
  const [mail, setMail] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [mailBusy, setMailBusy] = useState<"" | "save" | "verify" | "test">("");

  useEffect(() => {
    fetch("/api/super-admin/config", { signal: AbortSignal.timeout(15000) }).then(async r => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) setDenied(true);
        throw new Error(data.error || (r.status >= 500 ? "The server could not load the settings. Check the database connection and try again." : "Super Admin access required."));
      }
      setConfig({ ...defaults, ...data.config });
      setStatus(data.mailStatus ?? null);
    }).catch(e => setError(e?.name === "TimeoutError" ? "Loading took too long. Check the database connection and reload." : e.message || "Unable to load configuration."))
      .finally(() => setLoading(false));
  }, []);
  function set(key: string, value: string | boolean) { setConfig(old => ({ ...old, [key]: value })); }
  async function request(path: string, method: string, body: any) {
    const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed.");
    return data;
  }
  async function save() {
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await request("/api/super-admin/config", "PUT", config);
      setConfig(old => ({ ...old, ...data.config }));
      setNotice(t("savedSecurely"));
    } catch(e: any) { setError(e.message || "Could not save settings."); }
    finally { setBusy(false); }
  }
  const EMAIL_FIELDS = ["emailEnabled", "emailProvider", "emailFrom", "emailReplyTo", "emailApiKey", "emailSmtpHost", "emailSmtpPort", "emailSmtpSecure", "emailSmtpUser", "emailSmtpPassword"];
  async function mailAction(kind: "save" | "verify" | "test") {
    setMailBusy(kind); setMail(null); setError(""); setNotice("");
    try {
      if (kind === "save") {
        const data = await request("/api/super-admin/config", "PUT", config);
        setConfig(old => ({ ...old, ...data.config }));
        // Read it back so "Saved" means it is really in the database and sign-in codes can use it.
        const check = await fetch("/api/super-admin/config", { cache: "no-store" }).then(r => r.json()).catch(() => null);
        setStatus(check?.mailStatus ?? null);
        setMail({ kind: "ok", text: check?.mailStatus?.source ? t("emailOn") : t("emailOff") });
      } else if (kind === "verify") {
        const draft = Object.fromEntries(EMAIL_FIELDS.map(k => [k, config[k]]));
        const data = await request("/api/super-admin/config", "POST", { action: "verify-email", config: draft });
        setMail({ kind: "ok", text: `${t("authenticate")}: ${data.message}` });
      } else {
        const data = await request("/api/super-admin/config", "POST", { action: "test-email", to: testEmail });
        setMail({ kind: "ok", text: data.message });
      }
    } catch (e: any) {
      const label = kind === "save" ? t("couldNotSave") : kind === "verify" ? t("authFailed") : t("testFailed");
      setMail({ kind: "error", text: `${label}: ${e.message || t("requestFailed")}` });
    } finally { setMailBusy(""); }
  }
  async function test(action: string, to?: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await request("/api/super-admin/config", "POST", { action, to });
      setNotice(data.message);
    } catch(e: any) { setError(e.message || "Test failed."); }
    finally { setBusy(false); }
  }
  const input = (label: string, key: string, type = "text", placeholder = "") => <label className="field"><span>{label}</span><input className="input" type={type} value={String(config[key] ?? "")} placeholder={placeholder} autoComplete={type === "password" ? "new-password" : "off"} onChange={e => set(key, e.target.value)} /></label>;
  const check = (label: string, key: string) => <label className="check"><input type="checkbox" checked={Boolean(config[key])} onChange={e => set(key, e.target.checked)} /><span>{label}</span></label>;
  if (loading) return <main className="container"><section className="card"><div className="card-head"><h2>{t("communications")}</h2></div><p>{t("loading")}</p></section></main>;
  if (denied) return <main className="container" style={{ maxWidth: 640, margin: "48px auto", padding: 20 }}><section className="card"><div className="card-head"><div><h2>{t("communications")}</h2></div></div><div style={{ padding: "0 18px 18px", display: "grid", gap: 14 }}><div className="alert" role="alert">{error}</div><div><a className="btn btn-primary" href="/">Go to sign in</a></div></div></section></main>;
  return <main className="container" style={{ maxWidth: 1120, margin: "32px auto", padding: 20 }}>
    <header style={{ marginBottom: 20 }}><h1>{t("communications")}</h1><p>{t("commsIntro")}</p></header>
    {error && <div className="alert" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
    {notice && <div className="alert alert-note" role="status" style={{ marginBottom: 16 }}>{notice}</div>}
    <section id="platform-email" className="card" style={{ marginBottom: 20 }}>
      <div className="card-head"><div><h2>{t("emailAccount")}</h2><p>{t("emailHelp")}</p></div></div>
      <div className="form" style={{ padding: 18 }}>
        {check(t("enableEmail"), "emailEnabled")}
        <div className="form-row">
          <div className="field"><label>{t("provider")}</label><Select value={String(config.emailProvider)} onChange={v => set("emailProvider", v)} options={[{ value: "resend", label: t("resend") }, { value: "smtp", label: t("smtp") }]} /></div>
          {input(t("fromAddress"), "emailFrom", "text", "LekvoBook <no-reply@example.com>")}
        </div>
        {input(t("replyTo"), "emailReplyTo", "email", "support@example.com")}
        {String(config.emailProvider) === "resend" ? input(t("resendKey"), "emailApiKey", "password", MASK) : <><div className="form-row">{input(t("smtpHost"), "emailSmtpHost", "text", "smtp.example.com")}{input(t("smtpPort"), "emailSmtpPort", "number", "587")}</div><div className="form-row">{input(t("smtpUser"), "emailSmtpUser")}{input(t("smtpPassword"), "emailSmtpPassword", "password", MASK)}</div>{check(t("tls"), "emailSmtpSecure")}<p className="hint">{t("smtpHelp")}</p></>}
        <div className={status?.source ? "alert alert-note" : "alert"} role="status">
          {status?.source === "admin" && "Sign-in codes are ON: they are sent from the mail account saved here."}
          {status?.source === "env" && "Sign-in codes are ON: they are sent using the EMAIL_FROM / RESEND_API_KEY / SMTP_* settings in Vercel. Saving and enabling an account here will replace them."}
          {!status?.source && (status?.savedAt
            ? "Sign-in codes are OFF: a mail account is saved but “Enable platform email” is not ticked. Tick it and press Save."
            : "Sign-in codes are OFF: no mail account has been saved yet. Fill in the details, tick “Enable platform email”, press Authenticate, then Save.")}
        </div>
        {mail && <div className={mail.kind === "ok" ? "alert alert-note" : "alert"} role={mail.kind === "ok" ? "status" : "alert"}>{mail.text}</div>}
        <div className="mail-actions">
          <button type="button" className="btn" disabled={!!mailBusy} onClick={() => mailAction("verify")}>{mailBusy === "verify" ? t("authenticating") : t("authenticate")}</button>
          <button type="button" className="btn btn-primary" disabled={!!mailBusy} onClick={() => mailAction("save")}>{mailBusy === "save" ? t("saving") : t("save")}</button>
        </div>
        <p className="hint">{t("authHelp")}</p>
        <div className="form-row" style={{ alignItems: "end" }}><div className="field"><label>{t("testTo")}</label><input className="input" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@example.com" /></div><button type="button" className="btn" disabled={!!mailBusy || !testEmail} onClick={() => mailAction("test")}>{mailBusy === "test" ? t("sending") : t("sendTest")}</button></div>
        <p className="hint">{t("testSavedHelp")}</p>
      </div>
    </section>
    <section id="whatsapp-setup" className="card">
      <div className="card-head"><div><h2>{t("whatsappAccount")}</h2><p>{t("whatsappAccountHelp")}</p></div></div>
      <div className="form" style={{ padding: 18 }}>
        {check(t("activateWhatsApp"), "whatsappEnabled")}
        <div className="form-row">{input(t("accountName"), "whatsappAccountName", "text", "Main WhatsApp account")}{input(t("phoneId"), "whatsappPhoneId", "text", "Meta phone number ID")}</div>
        <div className="form-row">{input(t("appId"), "whatsappAppId")}{input(t("businessId"), "whatsappBusinessId")}</div>
        {input(t("accessToken"), "whatsappToken", "password", MASK)}
        <div className="form-row">{input(t("graphUrl"), "whatsappUrl", "url", "https://graph.facebook.com")}{input(t("graphVersion"), "whatsappVersion", "text", "v26.0")}</div>
        {input(t("webhookToken"), "webhookVerifyToken", "password", MASK)}
        {input(t("appSecret"), "whatsappAppSecret", "password", MASK)}
        <p className="hint">Configure this callback URL in the Meta Developer Dashboard: https://lekvobook.vercel.app/api/webhooks/whatsapp. Subscribe the Meta app to the WhatsApp Business Account (WABA) so message status events reach LekvoBook. The verify token and App Secret are platform-level Meta app credentials; each company’s Phone Number ID and access token remain company-specific.</p>
        {check(t("defaultIncoming"), "whatsappDefaultIncoming")}
        {check(t("defaultOutgoing"), "whatsappDefaultOutgoing")}
        {check(t("readReceipts"), "whatsappAutoReadReceipt")}
        <div className="form-row" style={{ alignItems: "end" }}><div className="field"><label>{t("testRecipient")}</label><input className="input" value={testWhatsAppTo} onChange={e => setTestWhatsAppTo(e.target.value)} placeholder="+..." /></div><button className="btn" disabled={busy} onClick={() => test("test-whatsapp")}>{t("testCredentials")}</button><button className="btn" disabled={busy || !testWhatsAppTo} onClick={() => test("test-whatsapp-message", testWhatsAppTo)}>{t("sendTemplate")}</button></div>
        <p className="hint">Credential test checks the token and {t("phoneId")} against Meta Graph API. Sending an actual WhatsApp message is a separate test and requires a recipient, permissions, and an approved template where required.</p>
      </div>
    </section>
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? t("saving") : t("saveAll")}</button></div>
    <p className="hint" style={{ marginTop: 18 }}>{t("accessRestricted")}</p>
  </main>;
}
