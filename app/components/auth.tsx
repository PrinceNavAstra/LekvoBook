"use client";
import { useState } from "react";
import { AlertCircle, BookOpen, Check, LogOut } from "lucide-react";
import { api, post } from "@/lib/api";
import { translations, type Language } from "@/lib/i18n";
import { Sheet, useToast } from "./ui";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  preferredLanguage: string;
  emailVerifiedAt: string | null;
  mobileVerifiedAt: string | null;
};
export type SessionBusiness = {
  id: string;
  name: string;
  businessType?: string | null;
  gstNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "gu", label: "ગુજરાતી" },
  { value: "hi", label: "हिन्दी" },
];

const AUTH_COPY: Record<Language, Record<string, string>> = {
  en: { login: "Sign in", signup: "Create account", name: "Full name", email: "Email address", mobile: "Mobile number", otp: "6-digit code", send: "Send code", verify: "Verify code", help: "We send a one-time code. No password to remember." },
  gu: { login: "લૉગિન", signup: "ખાતું બનાવો", name: "પૂરું નામ", email: "ઇમેઇલ સરનામું", mobile: "મોબાઇલ નંબર", otp: "6 અંકનો કોડ", send: "કોડ મોકલો", verify: "કોડ ચકાસો", help: "અમે એક વખતનો કોડ મોકલીએ છીએ. પાસવર્ડ યાદ રાખવાની જરૂર નથી." },
  hi: { login: "लॉगिन", signup: "खाता बनाएँ", name: "पूरा नाम", email: "ईमेल पता", mobile: "मोबाइल नंबर", otp: "6 अंकों का कोड", send: "कोड भेजें", verify: "कोड सत्यापित करें", help: "हम एक बार का कोड भेजते हैं। पासवर्ड याद रखने की ज़रूरत नहीं।" },
};

function Brand() {
  return (
    <div className="brand" style={{ padding: 0 }}>
      <div className="brand-mark">
        <BookOpen size={20} />
      </div>
      <span className="brand-name">Lekvo Book</span>
    </div>
  );
}

function Notice({ tone = "error", children }: { tone?: "error" | "note"; children: React.ReactNode }) {
  return (
    <div className={`alert ${tone === "note" ? "alert-note" : ""}`} role={tone === "error" ? "alert" : "status"}>
      <AlertCircle size={18} style={{ flex: "none", marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

function LanguageSelect({ value, onChange, label = "Language" }: { value: Language; onChange: (l: Language) => void; label?: string }) {
  return (
    <select className="select" style={{ width: "auto", minHeight: 40 }} aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Language)}>
      {LANGUAGES.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

/* ── Sign in / create account ─────────────────────────────── */
export function AuthGate({ language, setLanguage, onDone }: { language: Language; setLanguage: (l: Language) => void; onDone: () => void }) {
  const w = AUTH_COPY[language];
  const [signup, setSignup] = useState(false);
  const [channel, setChannel] = useState<"email" | "mobile">("email");
  const [second, setSecond] = useState(false); // signup: verifying the other contact
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const active: "email" | "mobile" = second ? (channel === "email" ? "mobile" : "email") : channel;
  const identifier = active === "email" ? email : mobile;
  const purpose = second ? (active === "mobile" ? "CHANGE_MOBILE" : "CHANGE_EMAIL") : signup ? "SIGNUP" : "LOGIN";

  const reset = (toSignup: boolean) => {
    setSignup(toSignup);
    setSent(false);
    setCode("");
    setError(null);
    setInfo(null);
    setDevCode(null);
  };

  async function send() {
    setError(null);
    setInfo(null);
    if (signup && !second && !name.trim()) return setError("Enter your name.");
    if (signup && !second && (!email.trim() || !mobile.trim())) return setError("Enter both your email and mobile number. We verify each one.");
    if (!identifier.trim()) return setError(active === "email" ? "Enter your email address." : "Enter your mobile number.");
    setBusy(true);
    try {
      const res = await post<{ devCode?: string }>("/api/auth/request-otp", { identifier, channel: active, purpose });
      setSent(true);
      setDevCode(res.devCode ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      await post("/api/auth/verify-otp", { identifier, code, channel: active, purpose, name, language, email, mobile });
      if (signup && !second) {
        setSecond(true);
        setSent(false);
        setCode("");
        setDevCode(null);
        setInfo(`${active === "email" ? "Email" : "Mobile number"} verified. Now verify your ${active === "email" ? "mobile number" : "email"}.`);
        return;
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form
        className="auth-card"
        onSubmit={(e) => {
          e.preventDefault();
          sent ? verify() : send();
        }}
      >
        <div className="auth-top">
          <Brand />
          <LanguageSelect value={language} onChange={setLanguage} />
        </div>

        <div>
          <h1 className="auth-title">{second ? "Verify your second contact" : signup ? w.signup : w.login}</h1>
          <p className="tone-muted" style={{ marginTop: 6 }}>
            {w.help}
          </p>
        </div>

        {!second && (
          <div className="seg" role="group" aria-label="Sign in or create account">
            <button type="button" aria-pressed={!signup} onClick={() => reset(false)}>
              {w.login}
            </button>
            <button type="button" aria-pressed={signup} onClick={() => reset(true)}>
              {w.signup}
            </button>
          </div>
        )}

        {signup && !second && (
          <div className="field">
            <label htmlFor="a-name">{w.name}</label>
            <input id="a-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
        )}

        {signup && !second ? (
          <>
            <div className="field">
              <label htmlFor="a-email">{w.email}</label>
              <input id="a-email" className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} />
            </div>
            <div className="field">
              <label htmlFor="a-mobile">{w.mobile}</label>
              <input id="a-mobile" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={sent} />
            </div>
            <div className="field">
              <span className="label">Send the first code to</span>
              <div className="seg" role="group" aria-label="First code goes to">
                <button type="button" aria-pressed={channel === "email"} disabled={sent} onClick={() => setChannel("email")}>
                  Email
                </button>
                <button type="button" aria-pressed={channel === "mobile"} disabled={sent} onClick={() => setChannel("mobile")}>
                  Mobile
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {!second && (
              <div className="seg" role="group" aria-label="Where to send the code">
                <button type="button" aria-pressed={channel === "email"} disabled={sent} onClick={() => setChannel("email")}>
                  Email
                </button>
                <button type="button" aria-pressed={channel === "mobile"} disabled={sent} onClick={() => setChannel("mobile")}>
                  Mobile
                </button>
              </div>
            )}
            <div className="field">
              <label htmlFor="a-id">{active === "email" ? w.email : w.mobile}</label>
              <input
                id="a-id"
                className="input"
                type={active === "email" ? "email" : "tel"}
                inputMode={active === "email" ? "email" : "tel"}
                autoComplete={active === "email" ? "email" : "tel"}
                value={identifier}
                onChange={(e) => (active === "email" ? setEmail(e.target.value) : setMobile(e.target.value))}
                disabled={sent}
              />
            </div>
          </>
        )}

        {sent && (
          <div className="field">
            <label htmlFor="a-code">{w.otp}</label>
            <input id="a-code" className="input num otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
            <span className="hint">Sent to {identifier}. It expires in 10 minutes.</span>
          </div>
        )}

        {devCode && <Notice tone="note">Development mode: your code is {devCode}.</Notice>}
        {info && !error && <Notice tone="note">{info}</Notice>}
        {error && <Notice>{error}</Notice>}

        <button className="btn btn-primary" disabled={busy || (sent && code.length !== 6)}>
          {busy ? "Please wait…" : sent ? w.verify : w.send}
        </button>
        {sent && (
          <button type="button" className="btn-link" onClick={() => { setSent(false); setCode(""); setError(null); }}>
            Use a different {active === "email" ? "email" : "number"}
          </button>
        )}
        <p className="hint" style={{ textAlign: "center", marginTop: 12 }}>
          Trouble signing in because OTP delivery is unavailable?{" "}
          <a href="/admin-access" style={{ color: "var(--brand-ink)", fontWeight: 650 }}>
            Set up the first Owner or sign in with an admin password
          </a>
        </p>
      </form>
    </main>
  );
}

/* ── First-time business setup ────────────────────────────── */
export function SetupScreen({ language, setLanguage, userName, onDone }: { language: Language; setLanguage: (l: Language) => void; userName: string; onDone: () => void }) {
  const t = translations[language];
  const [f, setF] = useState({ businessName: "", businessType: "", gstNumber: "", address: "", city: "", state: "", pincode: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await post("/api/v1/setup", f);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your business.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card auth-wide" onSubmit={submit}>
        <div className="auth-top">
          <Brand />
          <LanguageSelect value={language} onChange={setLanguage} />
        </div>
        <div>
          <h1 className="auth-title">{t.firstSetup}</h1>
          <p className="tone-muted" style={{ marginTop: 6 }}>
            {userName ? `Welcome, ${userName.split(" ")[0]}. ` : ""}
            {t.setupHelp}
          </p>
        </div>

        <div className="field">
          <label htmlFor="s-name">{t.businessName}</label>
          <input id="s-name" className="input" value={f.businessName} onChange={set("businessName")} autoComplete="organization" required />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="s-type">{t.businessType}</label>
            <input id="s-type" className="input" value={f.businessType} onChange={set("businessType")} placeholder="Trading, services, manufacturing…" />
          </div>
          <div className="field">
            <label htmlFor="s-gst">{t.gst}</label>
            <input id="s-gst" className="input" value={f.gstNumber} onChange={set("gstNumber")} placeholder="Optional" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="s-addr">{t.address}</label>
          <input id="s-addr" className="input" value={f.address} onChange={set("address")} autoComplete="street-address" />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="s-city">{t.city}</label>
            <input id="s-city" className="input" value={f.city} onChange={set("city")} autoComplete="address-level2" />
          </div>
          <div className="field">
            <label htmlFor="s-state">{t.state}</label>
            <input id="s-state" className="input" value={f.state} onChange={set("state")} autoComplete="address-level1" />
          </div>
        </div>
        <div className="field" style={{ maxWidth: 240 }}>
          <label htmlFor="s-pin">{t.pincode}</label>
          <input id="s-pin" className="input num" inputMode="numeric" value={f.pincode} onChange={set("pincode")} autoComplete="postal-code" />
        </div>

        {error && <Notice>{error}</Notice>}
        <button className="btn btn-primary" disabled={busy || !f.businessName.trim()}>
          {busy ? "Saving…" : t.finish}
        </button>
        <p className="hint" style={{ fontSize: 12.5, color: "var(--muted)" }}>
          You can change any of this later from your profile.
        </p>
      </form>
    </main>
  );
}

/* ── Profile sheet ────────────────────────────────────────── */
export function ProfileSheet({
  user,
  business,
  language,
  onLanguage,
  onSaved,
  onSignedOut,
  onClose,
}: {
  user: SessionUser;
  business: SessionBusiness | null;
  language: Language;
  onLanguage: (l: Language) => void;
  onSaved: () => void;
  onSignedOut: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [lang, setLang] = useState<Language>(language);
  const [b, setB] = useState({
    businessName: business?.name ?? "",
    businessType: business?.businessType ?? "",
    gstNumber: business?.gstNumber ?? "",
    address: business?.address ?? "",
    city: business?.city ?? "",
    state: business?.state ?? "",
    pincode: business?.pincode ?? "",
  });
  const setBiz = (k: keyof typeof b) => (e: React.ChangeEvent<HTMLInputElement>) => setB({ ...b, [k]: e.target.value });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Changing email or mobile is its own mini-flow with a one-time code.
  const [field, setField] = useState<"email" | "mobile" | null>(null);
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactBusy, setContactBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/profile", { method: "PATCH", body: JSON.stringify({ name, preferredLanguage: lang, ...b }) });
      onLanguage(lang);
      toast("Profile saved");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  async function sendContactCode() {
    setContactError(null);
    setContactBusy(true);
    try {
      const res = await post<{ ok: boolean; purpose: string }>("/api/auth/change-contact", { field, value });
      await post("/api/auth/request-otp", { identifier: value, channel: field, purpose: res.purpose });
      setSent(true);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "We could not send the code.");
    } finally {
      setContactBusy(false);
    }
  }

  async function verifyContact() {
    setContactError(null);
    setContactBusy(true);
    try {
      await post("/api/auth/verify-otp", { identifier: value, code, channel: field, purpose: field === "mobile" ? "CHANGE_MOBILE" : "CHANGE_EMAIL" });
      toast(field === "mobile" ? "Mobile number updated" : "Email updated");
      onSaved();
      setField(null);
      setSent(false);
      setCode("");
      setValue("");
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "That code did not work.");
    } finally {
      setContactBusy(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    onSignedOut();
  }

  const verified = (at: string | null) => (at ? <span className="badge badge-ok"><Check size={13} /> Verified</span> : <span className="badge badge-warn">Not verified</span>);

  return (
    <Sheet title="Profile" subtitle={user.email} wide onClose={onClose}>
      <form className="form" onSubmit={save}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="pf-name">Full name</label>
            <input id="pf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="pf-lang">Language</label>
            <select id="pf-lang" className="select" value={lang} onChange={(e) => setLang(e.target.value as Language)}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {business && (
          <fieldset className="fieldset">
            <legend>Business details</legend>
            <div className="form-row">
              <div className="field">
                <label htmlFor="pf-bn">Business name</label>
                <input id="pf-bn" className="input" value={b.businessName} onChange={setBiz("businessName")} required />
              </div>
              <div className="field">
                <label htmlFor="pf-bt">Business type</label>
                <input id="pf-bt" className="input" value={b.businessType} onChange={setBiz("businessType")} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="pf-gst">GST number</label>
                <input id="pf-gst" className="input" value={b.gstNumber} onChange={setBiz("gstNumber")} />
              </div>
              <div className="field">
                <label htmlFor="pf-pin">PIN code</label>
                <input id="pf-pin" className="input num" inputMode="numeric" value={b.pincode} onChange={setBiz("pincode")} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pf-addr">Address</label>
              <input id="pf-addr" className="input" value={b.address} onChange={setBiz("address")} />
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="pf-city">City</label>
                <input id="pf-city" className="input" value={b.city} onChange={setBiz("city")} />
              </div>
              <div className="field">
                <label htmlFor="pf-state">State</label>
                <input id="pf-state" className="input" value={b.state} onChange={setBiz("state")} />
              </div>
            </div>
          </fieldset>
        )}

        {error && <Notice>{error}</Notice>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div>
            <h3>Sign-in details</h3>
            <p>Change these with a one-time code</p>
          </div>
        </div>
        {(
          [
            ["email", "Email", user.email, user.emailVerifiedAt],
            ["mobile", "Mobile number", user.mobile ?? "Not added", user.mobileVerifiedAt],
          ] as const
        ).map(([key, label, current, at]) => (
          <div className="setting" key={key}>
            <div className="row-main">
              <div className="row-sub">{label}</div>
              <div className="row-title">{current}</div>
            </div>
            {verified(at)}
            <button className="btn btn-sm" onClick={() => { setField(key); setValue(""); setSent(false); setCode(""); setContactError(null); }}>
              Change
            </button>
          </div>
        ))}

        {field && (
          <div className="form" style={{ padding: "4px 18px 18px" }}>
            <div className="field">
              <label htmlFor="pf-new">{field === "email" ? "New email address" : "New mobile number"}</label>
              <input id="pf-new" className="input" type={field === "email" ? "email" : "tel"} value={value} onChange={(e) => setValue(e.target.value)} disabled={sent} />
            </div>
            {sent && (
              <div className="field">
                <label htmlFor="pf-code">6-digit code</label>
                <input id="pf-code" className="input num otp" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
              </div>
            )}
            {contactError && <Notice>{contactError}</Notice>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" disabled={contactBusy || !value || (sent && code.length !== 6)} onClick={sent ? verifyContact : sendContactCode}>
                {contactBusy ? "Please wait…" : sent ? "Verify code" : "Send code"}
              </button>
              <button className="btn" onClick={() => setField(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <button className="btn btn-due" style={{ marginTop: 20, width: "100%" }} onClick={logout}>
        <LogOut size={18} /> Log out
      </button>
    </Sheet>
  );
}
