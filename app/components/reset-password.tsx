"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const COPY: Record<string, Record<string, string>> = {
  en: {
    title: "Reset password", intro: "We'll email an 8-digit code. Use it to set a new password.", email: "Email address", send: "Send code", sending: "Sending…",
    code: "8-digit code", newPw: "New password (min. 12 characters)", confirm: "Confirm new password", save: "Set new password", saving: "Saving…",
    sent: "Code sent. It is valid for 5 minutes.", resend: "Send a new code", back: "Back to sign in", generate: "Generate strong password", show: "Show", hide: "Hide",
    badEmail: "Enter a valid email address.", badCode: "Enter the 8-digit code.", short: "Use at least 12 characters.", mismatch: "The two passwords do not match.",
    failed: "Could not complete the request.", mailHelp: "If no email arrives, platform email may not be set up yet. Ask the Super Admin.",
    doneOtp: "Password updated. Sign in with your new password or an email code.",
  },
  gu: {
    title: "પાસવર્ડ રીસેટ કરો", intro: "અમે 8-અંકનો કોડ ઇમેઇલ કરીશું. નવો પાસવર્ડ સેટ કરવા તેનો ઉપયોગ કરો.", email: "ઇમેઇલ સરનામું", send: "કોડ મોકલો", sending: "મોકલી રહ્યા છીએ…",
    code: "8-અંકનો કોડ", newPw: "નવો પાસવર્ડ (ઓછામાં ઓછા 12 અક્ષર)", confirm: "નવો પાસવર્ડ ફરી લખો", save: "નવો પાસવર્ડ સેટ કરો", saving: "સાચવી રહ્યા છીએ…",
    sent: "કોડ મોકલ્યો. 5 મિનિટ માન્ય.", resend: "નવો કોડ મોકલો", back: "સાઇન ઇન પર પાછા જાઓ", generate: "મજબૂત પાસવર્ડ બનાવો", show: "બતાવો", hide: "છુપાવો",
    badEmail: "માન્ય ઇમેઇલ સરનામું દાખલ કરો.", badCode: "8-અંકનો કોડ દાખલ કરો.", short: "ઓછામાં ઓછા 12 અક્ષર વાપરો.", mismatch: "બંને પાસવર્ડ મેળ ખાતા નથી.",
    failed: "વિનંતી પૂર્ણ થઈ શકી નથી.", mailHelp: "ઇમેઇલ ન આવે તો પ્લેટફોર્મ ઇમેઇલ હજી સેટ ન હોઈ શકે. સુપર એડમિનને પૂછો.",
    doneOtp: "પાસવર્ડ અપડેટ થયો. નવા પાસવર્ડ અથવા ઇમેઇલ કોડથી સાઇન ઇન કરો.",
  },
  hi: {
    title: "पासवर्ड रीसेट करें", intro: "हम 8 अंकों का कोड ईमेल करेंगे। नया पासवर्ड सेट करने के लिए उसका उपयोग करें।", email: "ईमेल पता", send: "कोड भेजें", sending: "भेज रहे हैं…",
    code: "8 अंकों का कोड", newPw: "नया पासवर्ड (कम से कम 12 अक्षर)", confirm: "नया पासवर्ड दोबारा लिखें", save: "नया पासवर्ड सेट करें", saving: "सहेज रहे हैं…",
    sent: "कोड भेजा गया। 5 मिनट मान्य।", resend: "नया कोड भेजें", back: "साइन इन पर वापस जाएं", generate: "मजबूत पासवर्ड बनाएं", show: "दिखाएं", hide: "छुपाएं",
    badEmail: "मान्य ईमेल पता दर्ज करें।", badCode: "8 अंकों का कोड दर्ज करें।", short: "कम से कम 12 अक्षर उपयोग करें।", mismatch: "दोनों पासवर्ड मेल नहीं खाते।",
    failed: "अनुरोध पूरा नहीं हो सका।", mailHelp: "ईमेल न आए तो प्लेटफ़ॉर्म ईमेल अभी सेट नहीं हो सकता। सुपर एडमिन से पूछें।",
    doneOtp: "पासवर्ड अपडेट हुआ। नए पासवर्ड या ईमेल कोड से साइन इन करें।",
  },
};

/** Email-code password reset, shared by the main sign-in and the Super Admin sign-in. */
export function ResetPassword({
  language = "en", initialEmail = "", onBack, onSignedIn,
}: { language?: string; initialEmail?: string; onBack: () => void; onSignedIn: () => void }) {
  const c = (k: string) => COPY[language]?.[k] || COPY.en[k] || k;
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const clean = () => email.trim().toLowerCase();

  async function send() {
    setError(null); setInfo(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean())) return setError(c("badEmail"));
    setBusy(true);
    try {
      const res = await authClient.emailOtp.requestPasswordReset({ email: clean() });
      if (res.error) throw new Error(res.error.message || c("failed"));
      setSent(true); setInfo(c("sent"));
    } catch (e) {
      setError(`${e instanceof Error ? e.message : c("failed")} ${c("mailHelp")}`);
    } finally { setBusy(false); }
  }

  async function save() {
    setError(null);
    if (!/^\d{8}$/.test(code)) return setError(c("badCode"));
    if (pw.length < 12) return setError(c("short"));
    if (pw !== pw2) return setError(c("mismatch"));
    setBusy(true);
    try {
      const res = await authClient.emailOtp.resetPassword({ email: clean(), otp: code, password: pw });
      if (res.error) throw new Error(res.error.message || c("failed"));
      // Owners/Admins can use the password straight away; everyone else keeps signing in with an email code.
      const login = await fetch("/api/auth/password-login", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ email: clean(), password: pw }),
      }).catch(() => null);
      if (login?.ok) return onSignedIn();
      setSent(false); setCode(""); setPw(""); setPw2(""); setInfo(c("doneOtp"));
    } catch (e) {
      setError(e instanceof Error ? e.message : c("failed"));
    } finally { setBusy(false); }
  }

  function generate() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+";
    const v = new Uint8Array(24);
    crypto.getRandomValues(v);
    const p = Array.from(v, (x) => alphabet[x % alphabet.length]).join("");
    setPw(p); setPw2(p); setShow(true);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <h2 style={{ fontSize: 20 }}>{c("title")}</h2>
        <p className="tone-muted" style={{ marginTop: 4 }}>{c("intro")}</p>
      </div>
      <div className="field">
        <label htmlFor="rp-email">{c("email")}</label>
        <input id="rp-email" className="input" type="email" inputMode="email" autoComplete="username" value={email} disabled={sent}
          onChange={(e) => setEmail(e.target.value)} maxLength={254} />
      </div>
      {sent && (
        <>
          <div className="field">
            <label htmlFor="rp-code">{c("code")}</label>
            <input id="rp-code" className="input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} autoFocus
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} />
          </div>
          <div className="field">
            <label htmlFor="rp-pw">{c("newPw")}</label>
            <input id="rp-pw" className="input" type={show ? "text" : "password"} autoComplete="new-password" value={pw} maxLength={200} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="rp-pw2">{c("confirm")}</label>
            <input id="rp-pw2" className="input" type={show ? "text" : "password"} autoComplete="new-password" value={pw2} maxLength={200} onChange={(e) => setPw2(e.target.value)} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button type="button" className="btn" onClick={() => setShow((s) => !s)}>{show ? c("hide") : c("show")}</button>
              <button type="button" className="btn" onClick={generate}>{c("generate")}</button>
            </div>
          </div>
        </>
      )}
      {info && <div className="hint" role="status" aria-live="polite" style={{ color: "var(--ok)", fontWeight: 600 }}>{info}</div>}
      {error && <div className="alert" role="alert">{error}</div>}
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void (sent ? save() : send())}>
        {busy ? (sent ? c("saving") : c("sending")) : sent ? c("save") : c("send")}
      </button>
      {sent && <button type="button" className="btn" disabled={busy} onClick={() => void send()}>{c("resend")}</button>}
      <button type="button" className="btn" onClick={onBack}>{c("back")}</button>
    </div>
  );
}
