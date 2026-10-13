"use client";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, BookOpen, Download, MessageCircle, Phone, Plus, Search, Truck, Users } from "lucide-react";
import { useApi } from "@/lib/api";
import { initials, longDate, money } from "@/lib/format";
import type { Party, Txn } from "@/lib/types";
import type { EntryKind, PartyKind } from "./forms";
import { Empty, ErrorState, ListSkeleton, useToast } from "./ui";
import { entrySide, LedgerPaper } from "./ledger";

/** Adds a changing query param so a refresh in the parent re-fetches the list. */
const withVersion = (url: string, version: number) => `${url}${url.includes("?") ? "&" : "?"}v=${version}`;

/* ── Customers and suppliers list ─────────────────────────── */
export function PartiesView({
  kind,
  version,
  onAdd,
  onOpen,
}: {
  kind: PartyKind;
  version: number;
  onAdd: () => void;
  onOpen: (party: Party) => void;
}) {
  const url = kind === "customer" ? "/api/v1/customers" : "/api/v1/suppliers";
  const { data, error, loading, reload } = useApi<Party[]>(withVersion(url, version));
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "due" | "clear">("all");

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (filter === "due" && p.balance <= 0) return false;
      if (filter === "clear" && p.balance !== 0) return false;
      return !term || p.name.toLowerCase().includes(term) || (p.mobile ?? "").includes(term);
    });
  }, [data, q, filter]);

  const outstanding = (data ?? []).filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const noun = kind === "customer" ? "customer" : "supplier";
  // Khatabook colours: red = you will get (they owe you), green = you will give (you owe them).
  const dueLabel = kind === "customer" ? "You will get" : "You will give";
  const dueTone = kind === "customer" ? "tone-get" : "tone-give";

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Search size={18} />
          <input className="input" type="search" placeholder={`Search ${noun}s by name or number`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${noun}s`} />
        </div>
        <button className="btn btn-primary fab" onClick={onAdd}>
          <Plus size={18} /> Add {noun}
        </button>
      </div>

      <div className="chips" role="group" aria-label="Filter">
        <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          All{data ? ` (${data.length})` : ""}
        </button>
        <button className="chip" aria-pressed={filter === "due"} onClick={() => setFilter("due")}>
          {kind === "customer" ? "Owe you" : "You owe"}
        </button>
        <button className="chip" aria-pressed={filter === "clear"} onClick={() => setFilter("clear")}>
          Settled
        </button>
      </div>

      <section className="card">
        {data && data.length > 0 && (
          <div className="list-summary">
            <span>{dueLabel}</span>
            <b className={`num ${dueTone}`}>{money(outstanding)}</b>
          </div>
        )}
        {loading && !data ? (
          <ListSkeleton rows={5} />
        ) : shown.length ? (
          <div className="list">
            {shown.map((p) => (
              <button className="row" key={p.id} onClick={() => onOpen(p)}>
                <div className="avatar">{initials(p.name)}</div>
                <div className="row-main">
                  <div className="row-title">{p.name}</div>
                  <div className="row-sub">{p.mobile ?? "No mobile number"}</div>
                </div>
                <div className="row-end">
                  <div className={`amount num ${p.balance > 0 ? dueTone : p.balance < 0 ? (kind === "customer" ? "tone-give" : "tone-get") : "tone-muted"}`}>
                    {p.balance === 0 ? "Settled" : money(Math.abs(p.balance))}
                  </div>
                  {p.balance !== 0 && (
                    <div className="row-sub">{p.balance > 0 ? dueLabel : kind === "customer" ? "Advance" : "Advance paid"}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : data && data.length === 0 ? (
          <Empty
            icon={kind === "customer" ? <Users size={24} /> : <Truck size={24} />}
            title={`No ${noun}s yet`}
            text={kind === "customer" ? "Add the people you sell to on credit. Their balance updates with every entry." : "Add the people you buy from, to track what you owe them."}
            action={
              <button className="btn btn-primary" onClick={onAdd}>
                <Plus size={18} /> Add {noun}
              </button>
            }
          />
        ) : (
          <Empty icon={<Search size={24} />} title="No matches" text="Try a different name or clear the filter." />
        )}
      </section>
    </>
  );
}

/* ── Profile sheet content ────────────────────────────────── */
function whatsappLink(mobile: string, text: string) {
  const digits = mobile.replace(/\D/g, "");
  const full = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

function statementCsv(name: string, txns: Txn[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [...txns].reverse().map((t) => [new Date(t.transactionDate).toISOString().slice(0, 10), t.type, t.notes ?? "", t.direction === "CREDIT" ? t.amount : "", t.direction === "DEBIT" ? t.amount : ""]);
  return [["Date", "Type", "Notes", "Raised", "Settled"], ...rows].map((r) => r.map((c) => esc(String(c))).join(",")).join("\n");
}

export function PartyProfile({
  kind,
  party,
  version,
  onEntry,
}: {
  kind: PartyKind;
  party: Party;
  version: number;
  onEntry: (entry: EntryKind, partyId: string) => void;
}) {
  const toast = useToast();
  const query = kind === "customer" ? `customerId=${party.id}` : `supplierId=${party.id}`;
  const { data, error, loading, reload } = useApi<Txn[]>(withVersion(`/api/v1/transactions?${query}`, version));
  const owed = party.balance > 0;
  const customer = kind === "customer";

  const download = () => {
    const blob = new Blob([statementCsv(party.name, data ?? [])], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${party.name.replace(/\s+/g, "-").toLowerCase()}-statement.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Statement downloaded");
  };

  const reminder = `Hello ${party.name}, this is a reminder that ${money(party.balance)} is pending. Thank you.`;

  return (
    <div>
      <div className="profile-head">
        <div className="avatar avatar-lg">{initials(party.name)}</div>
        <div style={{ minWidth: 0 }}>
          {party.mobile ? (
            <a href={`tel:${party.mobile}`} className="row-sub" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)" }}>
              <Phone size={14} /> {party.mobile}
            </a>
          ) : (
            <span className="row-sub">No mobile number</span>
          )}
          {party.address && <div className="row-sub">{party.address}</div>}
        </div>
      </div>

      <div className={`profile-balance ${party.balance === 0 ? "is-clear" : owed === customer ? "is-get" : "is-give"}`}>
        <div>
          <div className="figure-label">{party.balance === 0 ? "All settled" : owed ? (customer ? "You will get" : "You will give") : customer ? "You will give (advance)" : "Advance paid"}</div>
          {customer && !!party.creditLimit && <div className="figure-note">Credit limit {money(party.creditLimit)}</div>}
        </div>
        <div className="figure-value num">{money(Math.abs(party.balance))}</div>
      </div>

      <div className="profile-tools">
        {customer && owed && party.mobile && (
          <a className="btn btn-soft btn-sm" href={whatsappLink(party.mobile, reminder)} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> Send reminder
          </a>
        )}
        <button className="btn btn-sm" onClick={download} disabled={!data?.length}>
          <Download size={16} /> Statement
        </button>
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <ListSkeleton rows={3} />
      ) : data?.length ? (
        <LedgerPaper
          txns={data}
          opening={party.openingBalance}
          footer={{ label: party.balance === 0 ? "Balance" : owed ? (customer ? "You will get" : "You will give") : "Advance", value: money(Math.abs(party.balance)), tone: owed ? (customer ? "tone-get" : "tone-give") : undefined }}
        />
      ) : (
        <div className="card">
          <Empty icon={<BookOpen size={24} />} title="No entries yet" text={`Entries you record for ${party.name} will appear here.`} />
        </div>
      )}

      <p className="row-sub profile-foot">
        Added {longDate(party.createdAt ?? new Date())}
        {party.openingBalance ? ` · Opening balance ${money(party.openingBalance)}` : ""}
      </p>

      {/* Khatabook-style action bar: red for what you gave, green for what you got. */}
      <div className="entry-bar">
        {customer ? (
          <>
            <button className="btn-gave" onClick={() => onEntry("CREDIT", party.id)}>
              <ArrowUpRight size={18} /> You gave
            </button>
            <button className="btn-got" onClick={() => onEntry("PAYMENT", party.id)}>
              <ArrowDownLeft size={18} /> You got
            </button>
          </>
        ) : (
          <>
            <button className="btn-gave" onClick={() => onEntry("PAYMENT", party.id)}>
              <ArrowUpRight size={18} /> You gave
            </button>
            <button className="btn-got" onClick={() => onEntry("PURCHASE", party.id)}>
              <ArrowDownLeft size={18} /> You got
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Full ledger ──────────────────────────────────────────── */
const LEDGER_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "gave", label: "You gave" },
  { value: "got", label: "You got" },
];

export function LedgerView({ version, onAdd }: { version: number; onAdd: () => void }) {
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useApi<Txn[]>(withVersion("/api/v1/transactions", version));

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      if (type && entrySide(t) !== type) return false;
      return !term || (t.customer?.name ?? t.supplier?.name ?? "").toLowerCase().includes(term) || (t.notes ?? "").toLowerCase().includes(term);
    });
  }, [data, q, type]);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Search size={18} />
          <input className="input" type="search" placeholder="Search by name or note" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entries" />
        </div>
        <button className="btn btn-primary fab" onClick={onAdd}>
          <Plus size={18} /> Add entry
        </button>
      </div>
      <div className="chips" role="group" aria-label="Entry type">
        {LEDGER_FILTERS.map((f) => (
          <button key={f.value} className="chip" aria-pressed={type === f.value} onClick={() => setType(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      {loading && !data ? (
        <div className="card">
          <ListSkeleton rows={6} />
        </div>
      ) : shown.length ? (
        <LedgerPaper txns={shown} showParty />
      ) : (
        <div className="card">
          <Empty
            icon={<BookOpen size={24} />}
            title={q || type ? "No matching entries" : "Your ledger is empty"}
            text={q || type ? "Try a different search or filter." : "Every entry you record is kept here, in order."}
            action={
              !q && !type ? (
                <button className="btn btn-primary" onClick={onAdd}>
                  <Plus size={18} /> Add first entry
                </button>
              ) : undefined
            }
          />
        </div>
      )}
    </>
  );
}
