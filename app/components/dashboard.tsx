"use client";
import { ArrowDownLeft, ArrowUpRight, BookOpen, PackageCheck, Plus, Users } from "lucide-react";
import { greeting, initials, longDate, money } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import type { EntryKind, PartyKind } from "./forms";
import { BarChart, Empty, ErrorState, Skeleton } from "./ui";
import { LedgerPaper } from "./ledger";

export function DashboardView({
  data,
  error,
  reload,
  onEntry,
  onOpenCustomer,
  go,
}: {
  data: Dashboard | null;
  error: string | null;
  reload: () => void;
  onEntry: (kind: EntryKind, party: PartyKind) => void;
  onOpenCustomer: (id: string) => void;
  go: (tab: string) => void;
}) {
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  if (!data) {
    return (
      <>
        <div className="card hero" aria-busy="true">
          <div style={{ display: "grid", gap: 10 }}>
            <Skeleton h={14} w={120} />
            <Skeleton h={30} w="70%" />
          </div>
          <div className="hero-figures">
            <Skeleton h={110} />
            <Skeleton h={110} />
          </div>
        </div>
        <div className="kpis">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} h={84} />
          ))}
        </div>
      </>
    );
  }

  const chart = data.series.map((p) => ({
    label: new Date(p.date).toLocaleDateString("en-IN", { weekday: "short" }),
    sales: p.sales,
    expense: p.expense,
  }));
  const hasChartData = data.series.some((p) => p.sales || p.expense);
  const fresh = !data.counts.customers && !data.transactions.length;

  return (
    <>
      <section className="card hero" aria-labelledby="hero-title">
        <div>
          <p className="hero-hello">
            {greeting()} · {longDate(new Date())}
          </p>
          <h2 id="hero-title" className="hero-title">
            {data.business.name}
          </h2>
          <div className="hero-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-due" onClick={() => onEntry("CREDIT", "customer")}>
              <ArrowUpRight size={18} /> Give credit
            </button>
            <button className="btn btn-primary" onClick={() => onEntry("PAYMENT", "customer")}>
              <ArrowDownLeft size={18} /> Receive payment
            </button>
          </div>
        </div>
        <div className="hero-figures">
          <div className="figure figure-in">
            <div className="figure-label">You will get</div>
            <div className="figure-value num">{money(data.receivable)}</div>
            <div className="figure-note">from customers</div>
          </div>
          <div className="figure figure-out">
            <div className="figure-label">You will give</div>
            <div className="figure-value num">{money(data.payable)}</div>
            <div className="figure-note">to suppliers</div>
          </div>
        </div>
      </section>

      {fresh && (
        <div className="alert alert-note" role="note">
          <BookOpen size={20} style={{ flex: "none", marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <b>Start your first ledger</b>
            Add a customer, then record what you gave or received. Your balance updates as you go.
          </div>
          <button className="btn btn-sm" onClick={() => go("Customers")}>
            Add customer
          </button>
        </div>
      )}

      <section className="kpis" aria-label="Today at a glance">
        <div className="card kpi">
          <div className="kpi-label">Today's sales</div>
          <div className="kpi-value num">{money(data.sales)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Today's expenses</div>
          <div className="kpi-value num">{money(data.expense)}</div>
        </div>
        <button className="card kpi" style={{ textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }} onClick={() => go("Customers")}>
          <div className="kpi-label">Customers</div>
          <div className="kpi-value num">{data.counts.customers}</div>
        </button>
        <button className="card kpi" style={{ textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }} onClick={() => go("Suppliers")}>
          <div className="kpi-label">Suppliers</div>
          <div className="kpi-value num">{data.counts.suppliers}</div>
        </button>
      </section>

      <div className="cols cols-2">
        <div className="cols" style={{ minWidth: 0 }}>
          <section className="card">
            <div className="card-head">
              <div>
                <h3>Sales and expenses</h3>
                <p>Last 7 days</p>
              </div>
            </div>
            {hasChartData ? (
              <>
                <div className="legend">
                  <span>
                    <i style={{ background: "var(--brand)" }} />
                    Sales
                  </span>
                  <span>
                    <i style={{ background: "var(--warn)" }} />
                    Expenses
                  </span>
                </div>
                <BarChart data={chart} />
              </>
            ) : (
              <Empty icon={<BookOpen size={24} />} title="No sales this week" text="Record a sale or expense and your week will show up here." />
            )}
          </section>

          <section aria-labelledby="recent-title">
            <div className="card-head" style={{ padding: "0 4px 10px" }}>
              <div>
                <h3 id="recent-title">Recent entries</h3>
                <p>Your latest ledger activity</p>
              </div>
              <button className="btn-link" onClick={() => go("Ledger")}>
                View all
              </button>
            </div>
            {data.transactions.length ? (
              <LedgerPaper txns={data.transactions} showParty />
            ) : (
              <div className="card">
                <Empty
                  icon={<BookOpen size={24} />}
                  title="No entries yet"
                  text="Give credit or receive a payment and it will be listed here."
                  action={
                    <button className="btn btn-primary" onClick={() => onEntry("CREDIT", "customer")}>
                      <Plus size={18} /> Add first entry
                    </button>
                  }
                />
              </div>
            )}
          </section>
        </div>

        <div className="cols" style={{ minWidth: 0 }}>
          <section className="card">
            <div className="card-head">
              <div>
                <h3>Pending payments</h3>
                <p>Customers who owe you the most</p>
              </div>
            </div>
            {data.pending.length ? (
              <div className="list">
                {data.pending.map((c) => (
                  <button className="row" key={c.id} onClick={() => onOpenCustomer(c.id)}>
                    <div className="avatar">{initials(c.name)}</div>
                    <div className="row-main">
                      <div className="row-title">{c.name}</div>
                      <div className="row-sub">{c.mobile ?? "No mobile number"}</div>
                    </div>
                    <div className="row-end amount num tone-due">{money(c.balance)}</div>
                  </button>
                ))}
              </div>
            ) : (
              <Empty icon={<Users size={24} />} title="Nothing pending" text="When a customer owes you money, they appear here so you can follow up." />
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h3>Low stock</h3>
                <p>Running out soon</p>
              </div>
              <button className="btn-link" onClick={() => go("Inventory")}>
                Inventory
              </button>
            </div>
            {data.lowStock.length ? (
              <div className="list">
                {data.lowStock.map((p) => (
                  <div className="row" key={p.id}>
                    <div className="avatar" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                      <PackageCheck size={20} />
                    </div>
                    <div className="row-main">
                      <div className="row-title">{p.name}</div>
                      <div className="row-sub">Alert at {p.lowStockThreshold}</div>
                    </div>
                    <span className="badge badge-warn num">
                      {p.stock} {p.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={<PackageCheck size={24} />} title="Stock looks fine" text="Products at or below their alert level will show up here." />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
