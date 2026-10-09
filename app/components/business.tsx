"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Mail, MessageCircle, MessageSquare, Moon, Package, Plus, Receipt, Search, Sun, WalletCards } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { money, moneyCompact, shortDate } from "@/lib/format";
import type { Expense, Invoice, Product, Report } from "@/lib/types";
import { EXPENSE_CATEGORIES } from "./forms";
import { Empty, ErrorState, ListSkeleton, StatusBadge, useToast } from "./ui";

const withVersion = (url: string, version: number) => `${url}?v=${version}`;

/* ── Invoices ─────────────────────────────────────────────── */
const INVOICE_FILTERS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PAID", label: "Paid" },
];

export function InvoicesView({ version, onAdd }: { version: number; onAdd: () => void }) {
  const { data, error, loading, reload } = useApi<Invoice[]>(withVersion("/api/v1/invoices", version));
  const [status, setStatus] = useState("");
  const shown = (data ?? []).filter((i) => !status || i.status === status);
  const open = (data ?? []).filter((i) => ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(i.status)).reduce((s, i) => s + i.total, 0);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Invoice status">
          {INVOICE_FILTERS.map((f) => (
            <button key={f.value} className="chip" aria-pressed={status === f.value} onClick={() => setStatus(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <Plus size={18} /> New invoice
        </button>
      </div>

      <section className="card">
        {data && data.length > 0 && (
          <div className="card-head" style={{ paddingBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontFamily: "var(--font-body)", fontWeight: 650, color: "var(--muted)" }}>Waiting to be paid</h3>
              <p className="num" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, marginTop: 2, color: "var(--ink)" }}>
                {money(open)}
              </p>
            </div>
          </div>
        )}
        {loading && !data ? (
          <ListSkeleton rows={4} />
        ) : shown.length ? (
          <div className="list">
            {shown.map((i) => (
              <div className="row" key={i.id}>
                <div className="avatar">
                  <FileText size={20} />
                </div>
                <div className="row-main">
                  <div className="row-title">
                    {i.number} · {i.customerName}
                  </div>
                  <div className="row-sub">
                    {i.itemCount} item{i.itemCount === 1 ? "" : "s"} · {i.dueDate ? `Due ${shortDate(i.dueDate)}` : `Created ${shortDate(i.createdAt)}`}
                  </div>
                </div>
                <div className="row-end" style={{ display: "grid", justifyItems: "end", gap: 4 }}>
                  <span className="amount num">{money(i.total)}</span>
                  <StatusBadge status={i.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon={<Receipt size={24} />}
            title={status ? "No invoices with this status" : "No invoices yet"}
            text={status ? "Choose another status to see more." : "Create an invoice and it will be added to your customer's ledger."}
            action={
              !status ? (
                <button className="btn btn-primary" onClick={onAdd}>
                  <Plus size={18} /> New invoice
                </button>
              ) : undefined
            }
          />
        )}
      </section>
    </>
  );
}

/* ── Inventory ────────────────────────────────────────────── */
export function InventoryView({ version, onAdd, onStock }: { version: number; onAdd: () => void; onStock: (p: Product) => void }) {
  const { data, error, loading, reload } = useApi<Product[]>(withVersion("/api/v1/products", version));
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((p) => !term || p.name.toLowerCase().includes(term) || (p.sku ?? "").toLowerCase().includes(term));
  }, [data, q]);
  const stockValue = (data ?? []).reduce((s, p) => s + Math.max(p.stock, 0) * p.purchasePrice, 0);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Search size={18} />
          <input className="input" type="search" placeholder="Search products or SKU" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <Plus size={18} /> Add product
        </button>
      </div>

      <section className="card">
        {data && data.length > 0 && (
          <div className="card-head" style={{ paddingBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontFamily: "var(--font-body)", fontWeight: 650, color: "var(--muted)" }}>Stock value at purchase price</h3>
              <p className="num" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, marginTop: 2 }}>
                {money(stockValue)}
              </p>
            </div>
          </div>
        )}
        {loading && !data ? (
          <ListSkeleton rows={5} />
        ) : shown.length ? (
          <div className="list">
            {shown.map((p) => (
              <button className="row" key={p.id} onClick={() => onStock(p)} aria-label={`${p.name}: update stock`}>
                <div className="avatar" style={p.low ? { background: "var(--warn-soft)", color: "var(--warn)" } : undefined}>
                  <Package size={20} />
                </div>
                <div className="row-main">
                  <div className="row-title">{p.name}</div>
                  <div className="row-sub">
                    {[p.sku, p.category].filter(Boolean).join(" · ") || `Sells at ${money(p.sellingPrice)}`}
                  </div>
                </div>
                <div className="row-end" style={{ display: "grid", justifyItems: "end", gap: 4 }}>
                  <span className="amount num">
                    {p.stock} {p.unit}
                  </span>
                  <span className={`badge ${p.low ? "badge-warn" : "badge-ok"}`}>{p.low ? "Low stock" : "In stock"}</span>
                </div>
              </button>
            ))}
          </div>
        ) : data && data.length === 0 ? (
          <Empty
            icon={<Package size={24} />}
            title="No products yet"
            text="Add what you sell. Stock goes up and down with every purchase, sale and return you record."
            action={
              <button className="btn btn-primary" onClick={onAdd}>
                <Plus size={18} /> Add product
              </button>
            }
          />
        ) : (
          <Empty icon={<Search size={24} />} title="No matches" text="Try a different name or SKU." />
        )}
      </section>
    </>
  );
}

/* ── Expenses ─────────────────────────────────────────────── */
const METHOD: Record<string, string> = { CASH: "Cash", UPI: "UPI", BANK_TRANSFER: "Bank transfer", CARD: "Card", GATEWAY: "Online" };

export function ExpensesView({ version, onAdd }: { version: number; onAdd: () => void }) {
  const { data, error, loading, reload } = useApi<Expense[]>(withVersion("/api/v1/expenses", version));
  const [category, setCategory] = useState("");
  const shown = (data ?? []).filter((e) => !category || e.category === category);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = (data ?? []).filter((e) => new Date(e.date) >= monthStart).reduce((s, e) => s + e.amount, 0);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Expense category">
          <button className="chip" aria-pressed={category === ""} onClick={() => setCategory("")}>
            All
          </button>
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <Plus size={18} /> Add expense
        </button>
      </div>

      <section className="card">
        {data && data.length > 0 && (
          <div className="card-head" style={{ paddingBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontFamily: "var(--font-body)", fontWeight: 650, color: "var(--muted)" }}>Spent this month</h3>
              <p className="num" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, marginTop: 2 }}>
                {money(thisMonth)}
              </p>
            </div>
          </div>
        )}
        {loading && !data ? (
          <ListSkeleton rows={5} />
        ) : shown.length ? (
          <div className="list">
            {shown.map((e) => (
              <div className="row" key={e.id}>
                <div className="avatar" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                  <WalletCards size={20} />
                </div>
                <div className="row-main">
                  <div className="row-title">{e.category}</div>
                  <div className="row-sub">
                    {shortDate(e.date)} · {METHOD[e.paymentMethod] ?? e.paymentMethod}
                    {e.notes ? ` · ${e.notes}` : ""}
                  </div>
                </div>
                <div className="row-end amount num">{money(e.amount)}</div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon={<WalletCards size={24} />}
            title={category ? `No ${category.toLowerCase()} expenses` : "No expenses yet"}
            text={category ? "Choose another category to see more." : "Record rent, salaries, bills and other costs to see your real profit."}
            action={
              !category ? (
                <button className="btn btn-primary" onClick={onAdd}>
                  <Plus size={18} /> Add expense
                </button>
              ) : undefined
            }
          />
        )}
      </section>
    </>
  );
}

/* ── Reports ──────────────────────────────────────────────── */
function reportCsv(r: Report) {
  const head = ["Month", "Sales", "Purchases", "Expenses", "Received", "Paid"];
  const rows = r.months.map((m) => [m.label, m.sales, m.purchases, m.expenses, m.received, m.paid]);
  return [head, ...rows].map((row) => row.join(",")).join("\n");
}

export function ReportsView({ version }: { version: number }) {
  const { data, error, loading, reload } = useApi<Report>(withVersion("/api/v1/reports", version));

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data || loading) {
    return (
      <div className="card" aria-busy="true">
        <ListSkeleton rows={6} />
      </div>
    );
  }

  const t = data.totals;
  const topCategory = data.expenseByCategory[0]?.amount || 1;
  const download = () => {
    const blob = new Blob([reportCsv(data)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lekvo-book-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="toolbar">
        <p className="tone-muted">Last 6 months, including this one.</p>
        <button className="btn" onClick={download}>
          <Download size={18} /> Download CSV
        </button>
      </div>

      <section className="kpis" aria-label="Totals">
        <div className="card kpi">
          <div className="kpi-label">Sales</div>
          <div className="kpi-value num">{money(t.sales)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Purchases</div>
          <div className="kpi-value num">{money(t.purchases)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Expenses</div>
          <div className="kpi-value num">{money(t.expenses)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">{t.profit >= 0 ? "Profit" : "Loss"}</div>
          <div className={`kpi-value num ${t.profit >= 0 ? "tone-ok" : "tone-due"}`}>{money(Math.abs(t.profit))}</div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Month by month</h3>
            <p>
              Cash in {moneyCompact(t.cashIn)} · cash out {moneyCompact(t.cashOut)}
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="rep-table num">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Sales</th>
                <th scope="col">Purchases</th>
                <th scope="col">Expenses</th>
                <th scope="col">Received</th>
                <th scope="col">Paid</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.key}>
                  <th scope="row" style={{ fontWeight: 650 }}>
                    {m.label}
                  </th>
                  <td>{money(m.sales)}</td>
                  <td>{money(m.purchases)}</td>
                  <td>{money(m.expenses)}</td>
                  <td>{money(m.received)}</td>
                  <td>{money(m.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="cols cols-even">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Where the money went</h3>
              <p>Expenses by category</p>
            </div>
          </div>
          {data.expenseByCategory.length ? (
            <div className="list">
              {data.expenseByCategory.map((c) => (
                <div className="row" key={c.category} style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span className="row-title">{c.category}</span>
                    <span className="amount num">{money(c.amount)}</span>
                  </div>
                  <div className="meter" aria-hidden="true">
                    <span style={{ width: `${Math.max((c.amount / topCategory) * 100, 3)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={<WalletCards size={24} />} title="No expenses recorded" text="Add expenses to see where your money goes." />
          )}
        </section>

        <div className="cols">
          <section className="card">
            <div className="card-head">
              <div>
                <h3>Customers who owe you</h3>
                <p>Largest balances first</p>
              </div>
            </div>
            {data.receivables.length ? (
              <div className="list">
                {data.receivables.map((r) => (
                  <div className="row" key={r.id}>
                    <div className="row-main">
                      <div className="row-title">{r.name}</div>
                    </div>
                    <span className="amount num tone-ok">{money(r.balance)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={<Receipt size={24} />} title="Nobody owes you" text="Customer balances will be listed here." />
            )}
          </section>
          <section className="card">
            <div className="card-head">
              <div>
                <h3>Suppliers you owe</h3>
                <p>Largest balances first</p>
              </div>
            </div>
            {data.payables.length ? (
              <div className="list">
                {data.payables.map((r) => (
                  <div className="row" key={r.id}>
                    <div className="row-main">
                      <div className="row-title">{r.name}</div>
                    </div>
                    <span className="amount num tone-due">{money(r.balance)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={<Receipt size={24} />} title="You owe nobody" text="Supplier balances will be listed here." />
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/* ── Settings ─────────────────────────────────────────────── */
type ChannelSettings = { enabled?: boolean; provider?: string; endpoint?: string; token?: string; apiKey?: string; apiSecret?: string; sender?: string };
type GeneralSettings = { currency?: string; timezone?: string; dateFormat?: string };
type AllSettings = Record<string, ChannelSettings & GeneralSettings>;

const CHANNELS = [
  { key: "notification.email", name: "Email", icon: <Mail size={20} />, text: "Sends invoices, statements and account updates to customers", sender: "From address" },
  { key: "notification.sms", name: "SMS", icon: <MessageSquare size={20} />, text: "Sends payment reminders and account updates by SMS", sender: "Sender ID" },
  { key: "notification.whatsapp", name: "WhatsApp", icon: <MessageCircle size={20} />, text: "Sends payment reminders and invoices to customers or suppliers", sender: "Phone number ID" },
];

export function SettingsView({ businessName, dark, onToggleTheme }: { businessName: string; dark: boolean; onToggleTheme: () => void }) {
  const toast = useToast();
  const [settings, setSettings] = useState<AllSettings>({ general: { currency: "INR", timezone: "Asia/Kolkata", dateFormat: "DD MMM YYYY" } });
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ settings: AllSettings }>("/api/settings")
      .then((r) => {
        setSettings((s) => ({ ...s, ...r.settings }));
        setAllowed(true);
      })
      .catch(() => setAllowed(false));
  }, []);

  const update = (key: string, field: string, value: unknown) => setSettings((s) => ({ ...s, [key]: { ...(s[key] ?? {}), [field]: value } }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
      toast("Settings saved");
      const fresh = await api<{ settings: AllSettings }>("/api/settings");
      setSettings((s) => ({ ...s, ...fresh.settings }));
      setOpen(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not save your settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cols cols-even">
      <div className="cols" style={{ minWidth: 0 }}>
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Business</h3>
              <p>The workspace you are looking at</p>
            </div>
          </div>
          <div className="setting">
            <div className="avatar">{businessName.slice(0, 1).toUpperCase()}</div>
            <div className="row-main">
              <div className="row-title">{businessName}</div>
              <div className="row-sub">Edit details from your profile</div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>Appearance</h3>
              <p>Easier on the eyes at night</p>
            </div>
          </div>
          <div className="setting">
            <div className="avatar" style={{ background: "var(--raised)", color: "var(--ink)" }}>
              {dark ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div className="row-main">
              <div className="row-title">Dark mode</div>
              <div className="row-sub">{dark ? "On" : "Off"}</div>
            </div>
            <button className="btn btn-sm" role="switch" aria-checked={dark} onClick={onToggleTheme}>
              {dark ? "Turn off" : "Turn on"}
            </button>
          </div>
        </section>

        {allowed && (
          <section className="card">
            <div className="card-head">
              <div>
                <h3>General</h3>
                <p>Defaults for the whole application</p>
              </div>
            </div>
            <div className="form" style={{ padding: "4px 18px 18px" }}>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="g-cur">Currency</label>
                  <select id="g-cur" className="select" value={settings.general?.currency ?? "INR"} onChange={(e) => update("general", "currency", e.target.value)}>
                    {["INR", "USD", "EUR"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="g-date">Date format</label>
                  <select id="g-date" className="select" value={settings.general?.dateFormat ?? "DD MMM YYYY"} onChange={(e) => update("general", "dateFormat", e.target.value)}>
                    {["DD MMM YYYY", "DD/MM/YYYY", "MM/DD/YYYY"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="g-tz">Time zone</label>
                <input id="g-tz" className="input" value={settings.general?.timezone ?? ""} onChange={(e) => update("general", "timezone", e.target.value)} />
              </div>
            </div>
          </section>
        )}
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>Company communications</h3>
            <p>Configure how this company contacts its customers and suppliers</p>
          </div>
        </div>

        {allowed === false && (
          <div style={{ padding: "4px 18px 18px" }}>
            <div className="alert alert-note" role="note">
              <div>
                <b>Only owners and admins can change these</b>
                Only company owners and admins can change these settings. Until a provider is configured, customer reminders can still be opened in WhatsApp where supported.
              </div>
            </div>
          </div>
        )}

        {allowed &&
          CHANNELS.map((c) => {
            const v = settings[c.key] ?? {};
            const isOpen = open === c.key;
            return (
              <div key={c.key} style={{ borderTop: "1px solid var(--line)" }}>
                <div className="setting" style={{ borderTop: 0 }}>
                  <div className="avatar" style={{ background: "var(--raised)", color: v.enabled ? "var(--brand-ink)" : "var(--muted)" }}>
                    {c.icon}
                  </div>
                  <div className="row-main">
                    <div className="row-title">{c.name}</div>
                    <div className="row-sub">{c.text}</div>
                  </div>
                  <span className={`badge ${v.enabled ? "badge-ok" : ""}`}>{v.enabled ? "On" : "Off"}</span>
                  <button className="btn btn-sm" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.key)}>
                    {isOpen ? "Close" : "Set up"}
                  </button>
                </div>
                {isOpen && (
                  <div className="form" style={{ padding: "0 18px 18px" }}>
                    <label className="check">
                      <input type="checkbox" checked={!!v.enabled} onChange={(e) => update(c.key, "enabled", e.target.checked)} />
                      <span>Send {c.name.toLowerCase()} messages</span>
                    </label>
                    <div className="form-row">
                      <div className="field">
                        <label htmlFor={`${c.key}-p`}>Provider</label>
                        <input id={`${c.key}-p`} className="input" value={v.provider ?? ""} onChange={(e) => update(c.key, "provider", e.target.value)} />
                      </div>
                      <div className="field">
                        <label htmlFor={`${c.key}-s`}>{c.sender}</label>
                        <input id={`${c.key}-s`} className="input" value={v.sender ?? ""} onChange={(e) => update(c.key, "sender", e.target.value)} />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`${c.key}-e`}>{c.key === "notification.email" || c.key === "notification.sms" ? "API endpoint (managed automatically)" : "API endpoint"}</label>
                      <input id={`${c.key}-e`} className="input" type="url" inputMode="url" value={v.endpoint ?? ""} onChange={(e) => update(c.key, "endpoint", e.target.value)} placeholder="https://" disabled={c.key === "notification.email" || c.key === "notification.sms"} />
                    </div>
                    {c.key === "notification.email" && (
                      <span className="hint">These credentials are for company-to-customer/supplier email only. LekvoBook sign-in OTP and platform system email are configured separately by the Super Admin.</span>
                    )}
                    {c.key === "notification.sms" && (
                      <span className="hint">Use credentials issued by your SMS provider. These settings apply only to this company’s customer/supplier messages.</span>
                    )}
                    <div className="field">
                      <label htmlFor={`${c.key}-t`}>API token</label>
                      <input id={`${c.key}-t`} className="input" type="password" autoComplete="off" value={v.token ?? ""} onChange={(e) => update(c.key, "token", e.target.value)} />
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label htmlFor={`${c.key}-k`}>API key</label>
                        <input id={`${c.key}-k`} className="input" type="password" autoComplete="off" value={v.apiKey ?? ""} onChange={(e) => update(c.key, "apiKey", e.target.value)} />
                      </div>
                      <div className="field">
                        <label htmlFor={`${c.key}-x`}>API secret</label>
                        <input id={`${c.key}-x`} className="input" type="password" autoComplete="off" value={v.apiSecret ?? ""} onChange={(e) => update(c.key, "apiSecret", e.target.value)} />
                      </div>
                    </div>
                    <span className="hint">Credentials are encrypted before storage. Saved values are masked in the interface. These settings are private to this company.</span>
                  </div>
                )}
              </div>
            );
          })}

        {allowed && (
          <div style={{ padding: 18, borderTop: "1px solid var(--line)", display: "grid", gap: 12 }}>
            {error && (
              <div className="alert" role="alert">
                <div>{error}</div>
              </div>
            )}
            <button className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
