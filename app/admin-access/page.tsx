"use client";

import { useState } from "react";

type Mode = "setup" | "login";

export default function AdminAccessPage() {
  const [mode, setMode] = useState<Mode>("setup");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const endpoint = mode === "setup" ? "/api/auth/bootstrap" : "/api/auth/password-login";
      const payload = mode === "setup"
        ? { bootstrapSecret, name, email, businessName, password }
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
              <label htmlFor="bootstrap-secret">One-time setup key</label>
              <input id="bootstrap-secret" className="input" type="password" autoComplete="off" value={bootstrapSecret} onChange={(e) => setBootstrapSecret(e.target.value)} required />
              <span className="hint">Keep this key private. It is not your account password.</span>
            </div>
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
          <input id="admin-password" className="input" type="password" autoComplete={mode === "setup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === "setup" ? 12 : 1} maxLength={200} required />
          {mode === "setup" && <span className="hint">Use at least 12 characters. Store it in a password manager.</span>}
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
