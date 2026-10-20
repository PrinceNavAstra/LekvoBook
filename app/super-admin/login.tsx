"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ResetPassword } from "../components/reset-password";
import { SuperAdminLanguageSelect, useSuperAdminLanguage } from "./language";

type Mode = "otp" | "password" | "setup";
const FORGOT: Record<string, string> = { en: "Forgot password?", gu: "પાસવર્ડ ભૂલી ગયા?", hi: "पासवर्ड भूल गए?" };

const COPY: Record<string, Record<string, string>> = {
  en: {
    title: "Super Admin sign in", intro: "Sign in with a one-time code sent to your email, or with your Owner password.",
    otp: "Email OTP", password: "Password", setup: "First-time setup", email: "Email address", sendCode: "Send code", sending: "Sending…",
    code: "8-digit code", verify: "Verify and sign in", verifying: "Verifying…", codeSent: "Code sent. Enter the 8-digit code from your email (valid for 5 minutes).",
    resend: "Send a new code", change: "Use a different email", pw: "Password", signIn: "Sign in", wait: "Please wait…",
    name: "Your full name", business: "Business name", create: "Create Owner account", generate: "Generate strong password", show: "Show", hide: "Hide", copy: "Copy",
    notAllowed: "is signed in but is not on the Super Admin list. Ask the server owner to add this email to SUPER_ADMIN_EMAILS, or sign in with another account.",
    signOut: "Sign out", back: "Back to the app", badEmail: "Enter a valid email address.", badCode: "Enter the 8-digit code.",
    noMail: "The code could not be sent. If platform email is not set up yet, use Password sign-in or add EMAIL_FROM with RESEND_API_KEY / SMTP settings in Vercel.",
    notConfigured: "SUPER_ADMIN_EMAILS is not set on the server, so no one can open this area yet.", setupHelp: "Creates the first Owner without email OTP. Works only until an Owner exists.",
  },
  gu: {
    title: "સુપર એડમિન સાઇન ઇન", intro: "તમારા ઇમેઇલ પર મોકલેલા વન-ટાઇમ કોડથી અથવા Owner પાસવર્ડથી સાઇન ઇન કરો.",
    otp: "ઇમેઇલ OTP", password: "પાસવર્ડ", setup: "પ્રથમ વખત સેટઅપ", email: "ઇમેઇલ સરનામું", sendCode: "કોડ મોકલો", sending: "મોકલી રહ્યા છીએ…",
    code: "8-અંકનો કોડ", verify: "ચકાસો અને સાઇન ઇન કરો", verifying: "ચકાસી રહ્યા છીએ…", codeSent: "કોડ મોકલ્યો. ઇમેઇલમાંથી 8-અંકનો કોડ દાખલ કરો (5 મિનિટ માન્ય).",
    resend: "નવો કોડ મોકલો", change: "બીજું ઇમેઇલ વાપરો", pw: "પાસવર્ડ", signIn: "સાઇન ઇન", wait: "કૃપા કરીને રાહ જુઓ…",
    name: "તમારું પૂરું નામ", business: "વ્યવસાયનું નામ", create: "Owner એકાઉન્ટ બનાવો", generate: "મજબૂત પાસવર્ડ બનાવો", show: "બતાવો", hide: "છુપાવો", copy: "કૉપિ",
    notAllowed: "સાઇન ઇન છે પરંતુ સુપર એડમિન યાદીમાં નથી. સર્વર માલિકને SUPER_ADMIN_EMAILS માં આ ઇમેઇલ ઉમેરવા કહો અથવા બીજા એકાઉન્ટથી સાઇન ઇન કરો.",
    signOut: "સાઇન આઉટ", back: "એપ પર પાછા જાઓ", badEmail: "માન્ય ઇમેઇલ સરનામું દાખલ કરો.", badCode: "8-અંકનો કોડ દાખલ કરો.",
    noMail: "કોડ મોકલી શકાયો નહીં. જો પ્લેટફોર્મ ઇમેઇલ સેટ ન હોય તો પાસવર્ડથી સાઇન ઇન કરો અથવા Vercel માં EMAIL_FROM સાથે RESEND_API_KEY / SMTP ઉમેરો.",
    notConfigured: "સર્વર પર SUPER_ADMIN_EMAILS સેટ નથી, તેથી હજી કોઈ આ વિભાગ ખોલી શકતું નથી.", setupHelp: "ઇમેઇલ OTP વિના પ્રથમ Owner બનાવે છે. Owner બને ત્યાં સુધી જ કામ કરે છે.",
  },
  hi: {
    title: "सुपर एडमिन साइन इन", intro: "अपने ईमेल पर भेजे गए वन-टाइम कोड या Owner पासवर्ड से साइन इन करें।",
    otp: "ईमेल OTP", password: "पासवर्ड", setup: "पहली बार सेटअप", email: "ईमेल पता", sendCode: "कोड भेजें", sending: "भेज रहे हैं…",
    code: "8 अंकों का कोड", verify: "सत्यापित करें और साइन इन करें", verifying: "सत्यापित हो रहा है…", codeSent: "कोड भेजा गया। ईमेल से 8 अंकों का कोड दर्ज करें (5 मिनट मान्य)।",
    resend: "नया कोड भेजें", change: "दूसरा ईमेल उपयोग करें", pw: "पासवर्ड", signIn: "साइन इन", wait: "कृपया प्रतीक्षा करें…",
    name: "आपका पूरा नाम", business: "व्यवसाय का नाम", create: "Owner खाता बनाएं", generate: "मजबूत पासवर्ड बनाएं", show: "दिखाएं", hide: "छुपाएं", copy: "कॉपी",
    notAllowed: "साइन इन है लेकिन सुपर एडमिन सूची में नहीं है। सर्वर मालिक से SUPER_ADMIN_EMAILS में यह ईमेल जोड़ने को कहें या दूसरे खाते से साइन इन करें।",
    signOut: "साइन आउट", back: "ऐप पर वापस जाएं", badEmail: "मान्य ईमेल पता दर्ज करें।", badCode: "8 अंकों का कोड दर्ज करें।",
    noMail: "कोड नहीं भेजा जा सका। यदि प्लेटफ़ॉर्म ईमेल सेट नहीं है तो पासवर्ड से साइन इन करें या Vercel में EMAIL_FROM के साथ RESEND_API_KEY / SMTP जोड़ें।",
    notConfigured: "सर्वर पर SUPER_ADMIN_EMAILS सेट नहीं है, इसलिए अभी कोई यह क्षेत्र नहीं खोल सकता।", setupHelp: "ईमेल OTP के बिना पहला Owner बनाता है। केवल तब तक काम करता है जब तक Owner न बना हो।",
  },
};

export function SuperAdminLogin({ signedInEmail, configured }: { signedInEmail?: string | null; configured: boolean }) {
  const { language } = useSuperAdminLanguage();
  const c = (key: string) => COPY[language]?.[key] || COPY.en[key] || key;

  const [mode, setMode] = useState<Mode>("otp");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  const done = () => window.location.replace("/super-admin");
  const clean = () => email.trim().toLowerCase();
  const validEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean());

  async function sendCode() {
    setError(null); setInfo(null);
    if (!validEmail()) return setError(c("badEmail"));
    setBusy(true);
    try {
      const res = await authClient.emailOtp.sendVerificationOtp({ email: clean(), type: "sign-in" });
      if (res.error) throw new Error(res.error.message || c("noMail"));
      setSent(true); setCode(""); setInfo(c("codeSent"));
    } catch (e) {
      setError(`${e instanceof Error && e.message ? e.message + " " : ""}${c("noMail")}`);
    } finally { setBusy(false); }
  }

  async function verifyCode() {
    setError(null);
    if (!/^\d{8}$/.test(code)) return setError(c("badCode"));
    setBusy(true);
    try {
      const res = await authClient.signIn.emailOtp({ email: clean(), otp: code, name: clean().split("@")[0] || "Admin" });
      if (res.error) throw new Error(res.error.message || "That code did not work.");
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code did not work.");
    } finally { setBusy(false); }
  }

  async function passwordSubmit() {
    setError(null);
    setBusy(true);
    try {
      const endpoint = mode === "setup" ? "/api/auth/bootstrap" : "/api/auth/password-login";
      const body = mode === "setup" ? { name, email: clean(), businessName: business, password } : { email: clean(), password };
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "We could not complete the request.");
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not complete the request.");
    } finally { setBusy(false); }
  }

  function generate() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+";
    const v = new Uint8Array(24);
    crypto.getRandomValues(v);
    setPassword(Array.from(v, (x) => alphabet[x % alphabet.length]).join(""));
    setShowPw(true);
  }

  async function signOut() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch {}
    window.location.replace("/super-admin");
  }

  if (forgot) {
    return (
      <main className="auth-page sa-login">
        <div className="auth-card">
          <div className="auth-top">
            <span className="brand" style={{ padding: 0 }}><span className="brand-mark">L</span><span className="brand-name">Lekvo Book</span></span>
            <SuperAdminLanguageSelect />
          </div>
          <ResetPassword language={language} initialEmail={email} onBack={() => setForgot(false)} onSignedIn={done} />
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page sa-login">
      <form
        className="auth-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (mode === "otp") void (sent ? verifyCode() : sendCode());
          else void passwordSubmit();
        }}
      >
        <div className="auth-top">
          <span className="brand" style={{ padding: 0 }}>
            <span className="brand-mark">L</span>
            <span className="brand-name">Lekvo Book</span>
          </span>
          <SuperAdminLanguageSelect />
        </div>

        <div>
          <span className="badge">Super Admin</span>
          <h1 className="auth-title" style={{ marginTop: 10 }}>{c("title")}</h1>
          <p className="tone-muted" style={{ marginTop: 6 }}>{c("intro")}</p>
        </div>

        {signedInEmail && (
          <div className="alert" role="alert">
            <strong>{signedInEmail}</strong> {c("notAllowed")}{" "}
            <button type="button" className="btn" onClick={() => void signOut()} style={{ marginTop: 8 }}>{c("signOut")}</button>
          </div>
        )}
        {!configured && <div className="alert" role="alert">{c("notConfigured")}</div>}

        <div className="seg" role="group" aria-label="Sign-in method">
          {(["otp", "password", "setup"] as Mode[]).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setError(null); setInfo(null); }}>{c(m)}</button>
          ))}
        </div>

        {mode === "setup" && (
          <>
            <p className="hint">{c("setupHelp")}</p>
            <div className="field"><label htmlFor="sa-name">{c("name")}</label>
              <input id="sa-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required /></div>
            <div className="field"><label htmlFor="sa-biz">{c("business")}</label>
              <input id="sa-biz" className="input" autoComplete="organization" value={business} onChange={(e) => setBusiness(e.target.value)} minLength={2} maxLength={150} required /></div>
          </>
        )}

        <div className="field">
          <label htmlFor="sa-email">{c("email")}</label>
          <input id="sa-email" className="input" type="email" inputMode="email" autoComplete="username" value={email} disabled={mode === "otp" && sent}
            onChange={(e) => setEmail(e.target.value)} maxLength={254} required />
        </div>

        {mode === "otp" && sent && (
          <div className="field">
            <label htmlFor="sa-code">{c("code")}</label>
            <input id="sa-code" className="input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} autoFocus
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} />
          </div>
        )}

        {mode !== "otp" && (
          <div className="field">
            <label htmlFor="sa-pw">{c("pw")}</label>
            <input id="sa-pw" className="input" type={showPw ? "text" : "password"} autoComplete={mode === "setup" ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === "setup" ? 12 : 1} maxLength={200} required />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <button type="button" className="btn" onClick={() => setShowPw((v) => !v)}>{showPw ? c("hide") : c("show")}</button>
              {mode === "setup" && <button type="button" className="btn" onClick={generate}>{c("generate")}</button>}
              {mode === "setup" && <button type="button" className="btn" disabled={!password} onClick={() => void navigator.clipboard?.writeText(password)}>{c("copy")}</button>}
            </div>
          </div>
        )}

        {info && <div className="hint" role="status" aria-live="polite" style={{ color: "var(--ok)", fontWeight: 600 }}>{info}</div>}
        {error && <div className="alert" role="alert">{error}</div>}

        <button className="btn btn-primary" disabled={busy}>
          {busy ? c("wait") : mode === "otp" ? (sent ? c("verify") : c("sendCode")) : mode === "setup" ? c("create") : c("signIn")}
        </button>

        {mode === "password" && (
          <button type="button" className="btn-link" onClick={() => setForgot(true)}>{FORGOT[language] ?? FORGOT.en}</button>
        )}

        {mode === "otp" && sent && (
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="btn" disabled={busy} onClick={() => void sendCode()}>{c("resend")}</button>
            <button type="button" className="btn" onClick={() => { setSent(false); setCode(""); setInfo(null); setError(null); }}>{c("change")}</button>
          </div>
        )}

        <p className="hint" style={{ textAlign: "center" }}>
          <a href="/" style={{ color: "var(--brand-ink)", fontWeight: 650 }}>{c("back")}</a>
        </p>
      </form>
    </main>
  );
}
