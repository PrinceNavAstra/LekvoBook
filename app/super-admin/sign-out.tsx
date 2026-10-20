"use client";

export function SignOutButton({ email }: { email: string }) {
  async function out() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch {}
    window.location.replace("/super-admin");
  }
  return (
    <button type="button" className="sa-out" onClick={() => void out()} title={email}>
      Sign out
    </button>
  );
}
