"use client";

import { useState } from "react";

type Mode = "setup" | "login";

export default function AdminAccessPage() {
  const [mode, setMode] = useState<Mode>("setup");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generatePassword() {
    // Generate locally with the Web Crypto API; the password is never sent to a generator service.
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
    const values = new Uint8Array(24);
    crypto.getRandomValues(values);
    const generated = Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
    setPassword(generated);
    setShowPassword(true);
    setPasswordNotice("A strong password was generated on this device. Save it in your password manager before continuing.");
    setError(null);
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setPasswordNotice("Password copied. Store it securely and clear your clipboard when finished.");
    } catch {
      setPasswordNotice("Clipboard access is unavailable. Select the visible password and copy it manually.");
      setShowPassword(true);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const endpoint = mode === "setup" ? "/api/auth/bootstrap" : "/api/auth/password-login";
      const payload = mode === "setup"
        ? { name, email, businessName, password }
        : { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "We could not complete the request.");
      }

      window.location.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not complete the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card auth-wide" onSubmit={submit}>
        <div className="auth-top">
          <a className="brand" href="/" style={{ padding: 0, textDecoration: "none" }}>
            <span className="brand-mark">L</span>
            <span className="brand-name">Lekvo Book</span>
          </a>
          <span className="badge">Owner access</span>
        </div>

        <div>
          <h1 className="auth-title">
            {mode === "setup" ? "Set up the first Owner" : "Owner / Admin sign in"}
          </h1>
          <p className="tone-muted" style={{ marginTop: 6 }}>
            {mode === "setup"
              ? "Create your Owner account without email OTP. This setup works only while an Owner has not been configured."
              : "Use the password you set up for your Owner or Admin account. Regular users can continue using OTP sign-in."}
          </p>
        </div>

        <div className="seg" role="group" aria-label="Admin access mode">
          <button type="button" aria-pressed={mode === "setup"} onClick={() => { setMode("setup"); setError(null); }}>
            First-time setup
          </button>
          <button type="button" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(null); }}>
            Password sign in
          </button>
        </div>

        {mode === "setup" && (
          <>
            <div className="field">
              <label htmlFor="admin-name">Your full name</label>
              <input id="admin-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required />
            </div>
            <div className="field">
              <label htmlFor="business-name">Business name</label>
              <input id="business-name" className="input" autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} minLength={2} maxLength={150} required />
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="admin-email">Email address</label>
          <input id="admin-email" className="input" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" className="input" type={showPassword ? "text" : "password"} autoComplete={mode === "setup" ? "new-password" : "current-password"} value={password} onChange={(e) => { setPassword(e.target.value); setPasswordNotice(null); }} minLength={mode === "setup" ? 12 : 1} maxLength={200} required />
          {mode === "setup" && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <button className="btn" type="button" onClick={generatePassword}>Generate strong password</button>
                <button className="btn" type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide password" : "Show password"}</button>
                <button className="btn" type="button" onClick={copyPassword} disabled={!password}>Copy password</button>
              </div>
              <span className="hint">Use at least 12 characters. Generated passwords use your browser’s cryptographic random generator and are not sent to a third-party service.</span>
            </>
          )}
          {passwordNotice && <div className="hint" role="status" aria-live="polite">{passwordNotice}</div>}
        </div>

        {error && <div className="alert" role="alert">{error}</div>}

        <button className="btn btn-primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "setup"
              ? "Create Owner account"
              : "Sign in"}
        </button>

        <p className="hint" style={{ textAlign: "center" }}>
          <a href="/" style={{ color: "var(--brand-ink)", fontWeight: 650 }}>Back to email / mobile OTP sign in</a>
        </p>
      </form>
    </main>
  );
}
