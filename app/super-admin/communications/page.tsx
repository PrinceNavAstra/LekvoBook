"use client";
import { useEffect, useState } from "react";

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
  const [config, setConfig] = useState<Config>(defaults);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testWhatsAppTo, setTestWhatsAppTo] = useState("");

  useEffect(() => {
    fetch("/api/super-admin/config").then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Super Admin access required.");
      setConfig({ ...defaults, ...data.config });
    }).catch(e => setError(e.message || "Unable to load configuration."))
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
      setNotice("Configuration saved securely.");
    } catch(e: any) { setError(e.message || "Could not save settings."); }
    finally { setBusy(false); }
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
  if (loading) return <main className="container"><section className="card"><div className="card-head"><h2>Super Admin Communications</h2></div><p>Loading configuration…</p></section></main>;
  return <main className="container" style={{ maxWidth: 1120, margin: "32px auto", padding: 20 }}>
    <header style={{ marginBottom: 20 }}><h1>Super Admin · Communications</h1><p>Platform-wide authentication email and Meta app configuration. Company owners cannot view or edit platform email credentials.</p></header>
    {error && <div className="alert" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
    {notice && <div className="alert alert-note" role="status" style={{ marginBottom: 16 }}>{notice}</div>}
    <section className="card" style={{ marginBottom: 20 }}>
      <div className="card-head"><div><h2>Platform Email Account</h2><p>Used for sign-in OTPs, email verification and platform system messages.</p></div></div>
      <div className="form" style={{ padding: 18 }}>
        {check("Enable platform email", "emailEnabled")}
        <div className="form-row">
          <div className="field"><label>Provider</label><select className="select" value={String(config.emailProvider)} onChange={e => set("emailProvider", e.target.value)}><option value="resend">Resend API</option><option value="smtp">SMTP</option></select></div>
          {input("From address (verified sender)", "emailFrom", "text", "LekvoBook <no-reply@example.com>")}
        </div>
        {input("Reply-to address (optional)", "emailReplyTo", "email", "support@example.com")}
        {String(config.emailProvider) === "resend" ? input("Resend API key", "emailApiKey", "password", MASK) : <><div className="form-row">{input("SMTP host", "emailSmtpHost", "text", "smtp.example.com")}{input("SMTP port", "emailSmtpPort", "number", "587")}</div><div className="form-row">{input("SMTP username", "emailSmtpUser")}{input("SMTP password / app password", "emailSmtpPassword", "password", MASK)}</div>{check("Use implicit TLS (usually port 465)", "emailSmtpSecure")}<p className="hint">SMTP is used for platform sign-in OTP, email verification and password-reset messages. Use your provider’s app password where required. Port 465 normally uses implicit TLS; port 587 normally uses STARTTLS.</p></>}
        <div className="form-row" style={{ alignItems: "end" }}><div className="field"><label>Send test email to</label><input className="input" type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@example.com" /></div><button className="btn" disabled={busy || !testEmail} onClick={() => test("test-email", testEmail)}>Send test email</button></div>
      </div>
    </section>
    <section className="card">
      <div className="card-head"><div><h2>WhatsApp Account</h2><p>Meta WhatsApp Cloud API account configuration.</p></div></div>
      <div className="form" style={{ padding: 18 }}>
        {check("Activate outgoing WhatsApp", "whatsappEnabled")}
        <div className="form-row">{input("Account Name", "whatsappAccountName", "text", "Main WhatsApp account")}{input("Phone ID", "whatsappPhoneId", "text", "Meta phone number ID")}</div>
        <div className="form-row">{input("App ID", "whatsappAppId")}{input("Business ID (WABA ID)", "whatsappBusinessId")}</div>
        {input("Access Token", "whatsappToken", "password", MASK)}
        <div className="form-row">{input("Graph API base URL", "whatsappUrl", "url", "https://graph.facebook.com")}{input("Graph API Version", "whatsappVersion", "text", "v23.0")}</div>
        {input("Webhook Verify Token (create a long random value)", "webhookVerifyToken", "password", MASK)}
        {input("Meta App Secret (used to verify webhook signatures)", "whatsappAppSecret", "password", MASK)}
        {check("Default incoming account", "whatsappDefaultIncoming")}
        {check("Default outgoing account", "whatsappDefaultOutgoing")}
        {check("Allow automatic read receipts where supported", "whatsappAutoReadReceipt")}
        <div className="form-row" style={{ alignItems: "end" }}><div className="field"><label>Test recipient (E.164, e.g. +15551234567)</label><input className="input" value={testWhatsAppTo} onChange={e => setTestWhatsAppTo(e.target.value)} placeholder="+..." /></div><button className="btn" disabled={busy} onClick={() => test("test-whatsapp")}>Test credentials</button><button className="btn" disabled={busy || !testWhatsAppTo} onClick={() => test("test-whatsapp-message", testWhatsAppTo)}>Send test template</button></div>
        <p className="hint">Credential test checks the token and Phone ID against Meta Graph API. Sending an actual WhatsApp message is a separate test and requires a recipient, permissions, and an approved template where required.</p>
      </div>
    </section>
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save configuration"}</button></div>
    <p className="hint" style={{ marginTop: 18 }}>Access is restricted by the server-side SUPER_ADMIN_EMAILS environment variable. Set it to a comma-separated allowlist of platform administrator emails.</p>
  </main>;
}
