import Link from "next/link";

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
  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px 56px" }}>
      <p style={{ margin: "0 0 8px", color: "#CD3034", fontWeight: 750, letterSpacing: ".04em", textTransform: "uppercase", fontSize: 12 }}>Platform administration</p>
      <h1 style={{ margin: "0 0 10px", color: "#123941", fontSize: "clamp(28px, 4vw, 38px)" }}>Super Admin Dashboard</h1>
      <p style={{ maxWidth: 720, lineHeight: 1.7, color: "#53676b", marginBottom: 28 }}>
        Manage platform-wide communication services here. These settings are separate from each company’s own communication settings.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
        <Link href="/super-admin/communications#platform-email" style={cardStyle}>
          <div style={{ fontSize: 13, color: "#587078", marginBottom: 12 }}>AUTHENTICATION & SYSTEM MAIL</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>Email Setup</h2>
          <p style={{ margin: 0, color: "#53676b", lineHeight: 1.65 }}>Configure SMTP or Resend for platform verification, sign-in and password recovery emails.</p>
          <p style={{ margin: "18px 0 0", color: "#123941", fontWeight: 750 }}>Open email settings →</p>
        </Link>
        <Link href="/super-admin/communications#whatsapp-setup" style={cardStyle}>
          <div style={{ fontSize: 13, color: "#587078", marginBottom: 12 }}>META PLATFORM INTEGRATION</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>WhatsApp Setup</h2>
          <p style={{ margin: 0, color: "#53676b", lineHeight: 1.65 }}>Manage platform Meta credentials, webhook verification and test messaging.</p>
          <p style={{ margin: "18px 0 0", color: "#123941", fontWeight: 750 }}>Open WhatsApp settings →</p>
        </Link>
      </div>
      <p style={{ marginTop: 22, color: "#65777b", fontSize: 13, lineHeight: 1.6 }}>
        Security: this area is available only to signed-in email addresses listed in the server-side <code>SUPER_ADMIN_EMAILS</code> environment variable. API endpoints also enforce the same allowlist.
      </p>
    </main>
  );
}
