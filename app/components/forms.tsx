"use client";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { post, useApi } from "@/lib/api";
import { money, todayInput } from "@/lib/format";
import type { Party, Product } from "@/lib/types";
import { useToast } from "./ui";

/** Shared submit handling: busy state, inline error, toast on success. */
function useSubmit(onDone: () => void, successMessage: string) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, message?: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast(message ?? successMessage);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="alert" role="alert">
      <AlertCircle size={18} style={{ flex: "none", marginTop: 1 }} />
      <div>{message}</div>
    </div>
  );
}

/* ── Ledger entry ─────────────────────────────────────────── */
export type EntryKind = "CREDIT" | "PAYMENT" | "SALE" | "PURCHASE";
export type PartyKind = "customer" | "supplier";

const CUSTOMER_KINDS: { value: EntryKind; label: string; tone: string }[] = [
  { value: "CREDIT", label: "Give credit", tone: "tone-due" },
  { value: "PAYMENT", label: "Receive payment", tone: "tone-ok" },
  { value: "SALE", label: "Sale", tone: "tone-due" },
];
const SUPPLIER_KINDS: { value: EntryKind; label: string; tone: string }[] = [
  { value: "PURCHASE", label: "Purchase", tone: "tone-due" },
  { value: "PAYMENT", label: "Payment made", tone: "tone-ok" },
];

export function EntryForm({
  kind: initialKind,
  partyKind: initialParty,
  partyId: initialPartyId,
  onDone,
}: {
  kind: EntryKind;
  partyKind: PartyKind;
  partyId?: string;
  onDone: () => void;
}) {
  const [partyKind, setPartyKind] = useState<PartyKind>(initialParty);
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [partyId, setPartyId] = useState(initialPartyId ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [notes, setNotes] = useState("");
  const parties = useApi<Party[]>(partyKind === "customer" ? "/api/v1/customers" : "/api/v1/suppliers");
  const { busy, error, run } = useSubmit(onDone, "Entry saved");

  const kinds = partyKind === "customer" ? CUSTOMER_KINDS : SUPPLIER_KINDS;
  // Hide the previous list while the other party type is loading so the wrong names never flash.
  const list = parties.loading ? [] : parties.data ?? [];

  const switchParty = (next: PartyKind) => {
    setPartyKind(next);
    setPartyId("");
    setKind(next === "customer" ? "CREDIT" : "PURCHASE");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(() =>
      post("/api/v1/transactions", {
        type: kind,
        amount: Number(amount),
        date,
        notes,
        ...(partyKind === "customer" ? { customerId: partyId } : { supplierId: partyId }),
      }),
    );
  };

  return (
    <form className="form" onSubmit={submit}>
      {!initialPartyId && (
        <div className="seg" role="group" aria-label="Who is this entry for">
          <button type="button" aria-pressed={partyKind === "customer"} onClick={() => switchParty("customer")}>
            Customer
          </button>
          <button type="button" aria-pressed={partyKind === "supplier"} onClick={() => switchParty("supplier")}>
            Supplier
          </button>
        </div>
      )}

      <div className="seg" style={{ ["--cols" as string]: kinds.length }} role="group" aria-label="Entry type">
        {kinds.map((k) => (
          <button key={k.value} type="button" className={k.tone} aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>
            {k.label}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="entry-amount">Amount</label>
        <div className="money-wrap">
          <input
            id="entry-amount"
            className="input input-money num"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="entry-party">{partyKind === "customer" ? "Customer" : "Supplier"}</label>
        <select id="entry-party" className="select" value={partyId} onChange={(e) => setPartyId(e.target.value)} required>
          <option value="" disabled>
            {parties.loading ? "Loading…" : list.length ? `Choose a ${partyKind}` : `No ${partyKind}s yet`}
          </option>
          {list.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.balance ? `  ·  ${money(Math.abs(p.balance))} ${p.balance > 0 ? "due" : "advance"}` : ""}
            </option>
          ))}
        </select>
        {!parties.loading && !list.length && <span className="hint">Add a {partyKind} first, then record entries for them.</span>}
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="entry-date">Date</label>
          <input id="entry-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="entry-notes">Note (optional)</label>
          <input id="entry-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Bill no. 214" />
        </div>
      </div>

      <FormError message={error} />
      <button className="btn btn-primary" disabled={busy || !partyId || !Number(amount)}>
        {busy ? "Saving…" : "Save entry"}
      </button>
    </form>
  );
}

/* ── Customer / supplier ──────────────────────────────────── */
export function PartyForm({ kind, onDone }: { kind: PartyKind; onDone: () => void }) {
  const [f, setF] = useState({ name: "", mobile: "", openingBalance: "", email: "", address: "", gstNumber: "", creditLimit: "", notes: "" });
  const { busy, error, run } = useSubmit(onDone, kind === "customer" ? "Customer saved" : "Supplier saved");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const label = kind === "customer" ? "customer" : "supplier";

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => post(kind === "customer" ? "/api/v1/customers" : "/api/v1/suppliers", f));
      }}
    >
      <div className="field">
        <label htmlFor="p-name">Name</label>
        <input id="p-name" className="input" value={f.name} onChange={set("name")} placeholder={kind === "customer" ? "e.g. ABC Traders" : "e.g. Sharma Wholesale"} autoComplete="off" required />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="p-mobile">Mobile number</label>
          <input id="p-mobile" className="input" type="tel" inputMode="tel" value={f.mobile} onChange={set("mobile")} placeholder="+91" />
        </div>
        <div className="field">
          <label htmlFor="p-open">Opening balance</label>
          <input id="p-open" className="input num" type="number" inputMode="decimal" step="any" value={f.openingBalance} onChange={set("openingBalance")} placeholder="0" />
          <span className="hint">{kind === "customer" ? "What they already owe you." : "What you already owe them."}</span>
        </div>
      </div>

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 650, minHeight: 32 }}>More details</summary>
        <div className="form" style={{ marginTop: 14 }}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="p-email">Email</label>
              <input id="p-email" className="input" type="email" value={f.email} onChange={set("email")} />
            </div>
            <div className="field">
              <label htmlFor="p-gst">GST number</label>
              <input id="p-gst" className="input" value={f.gstNumber} onChange={set("gstNumber")} />
            </div>
          </div>
          {kind === "customer" && (
            <div className="field">
              <label htmlFor="p-limit">Credit limit</label>
              <input id="p-limit" className="input num" type="number" inputMode="decimal" value={f.creditLimit} onChange={set("creditLimit")} />
            </div>
          )}
          <div className="field">
            <label htmlFor="p-address">Address</label>
            <input id="p-address" className="input" value={f.address} onChange={set("address")} />
          </div>
          <div className="field">
            <label htmlFor="p-notes">Notes</label>
            <textarea id="p-notes" className="textarea" value={f.notes} onChange={set("notes")} />
          </div>
        </div>
      </details>

      <FormError message={error} />
      <button className="btn btn-primary" disabled={busy || !f.name.trim()}>
        {busy ? "Saving…" : `Save ${label}`}
      </button>
    </form>
  );
}

/* ── Product ──────────────────────────────────────────────── */
export function ProductForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", sku: "", category: "", unit: "pcs", purchasePrice: "", sellingPrice: "", openingStock: "", lowStockThreshold: "" });
  const { busy, error, run } = useSubmit(onDone, "Product saved");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => post("/api/v1/products", f));
      }}
    >
      <div className="field">
        <label htmlFor="pr-name">Product name</label>
        <input id="pr-name" className="input" value={f.name} onChange={set("name")} placeholder="e.g. Copper wire 1.5mm" required />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="pr-sku">SKU (optional)</label>
          <input id="pr-sku" className="input" value={f.sku} onChange={set("sku")} />
        </div>
        <div className="field">
          <label htmlFor="pr-cat">Category (optional)</label>
          <input id="pr-cat" className="input" value={f.category} onChange={set("category")} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="pr-buy">Purchase price</label>
          <input id="pr-buy" className="input num" type="number" inputMode="decimal" step="any" value={f.purchasePrice} onChange={set("purchasePrice")} placeholder="₹ 0" />
        </div>
        <div className="field">
          <label htmlFor="pr-sell">Selling price</label>
          <input id="pr-sell" className="input num" type="number" inputMode="decimal" step="any" value={f.sellingPrice} onChange={set("sellingPrice")} placeholder="₹ 0" />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="pr-open">Opening stock</label>
          <input id="pr-open" className="input num" type="number" inputMode="decimal" step="any" value={f.openingStock} onChange={set("openingStock")} placeholder="0" />
        </div>
        <div className="field">
          <label htmlFor="pr-unit">Unit</label>
          <select id="pr-unit" className="select" value={f.unit} onChange={set("unit")}>
            {["pcs", "kg", "g", "litre", "metre", "box", "dozen"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="pr-low">Low-stock alert at</label>
        <input id="pr-low" className="input num" type="number" inputMode="decimal" value={f.lowStockThreshold} onChange={set("lowStockThreshold")} placeholder="0" />
        <span className="hint">You will see this product on the dashboard when stock falls to this number.</span>
      </div>
      <FormError message={error} />
      <button className="btn btn-primary" disabled={busy || !f.name.trim()}>
        {busy ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}

/* ── Stock movement ───────────────────────────────────────── */
export function StockForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const [type, setType] = useState<"PURCHASE" | "SALE" | "RETURN" | "ADJUSTMENT">("PURCHASE");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const { busy, error, run } = useSubmit(onDone, "Stock updated");

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => post("/api/v1/inventory", { productId: product.id, type, quantity: Number(quantity), notes }));
      }}
    >
      <div className="seg" style={{ ["--cols" as string]: 4 }} role="group" aria-label="Stock change type">
        {(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT"] as const).map((t) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>
            {t === "PURCHASE" ? "In" : t === "SALE" ? "Out" : t === "RETURN" ? "Return" : "Adjust"}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="st-qty">Quantity ({product.unit})</label>
        <input id="st-qty" className="input num" type="number" inputMode="decimal" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        <span className="hint">
          {type === "ADJUSTMENT" ? "Use a negative number to remove stock. " : ""}Now in stock: {product.stock} {product.unit}.
        </span>
      </div>
      <div className="field">
        <label htmlFor="st-notes">Note (optional)</label>
        <input id="st-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <FormError message={error} />
      <button className="btn btn-primary" disabled={busy || !Number(quantity)}>
        {busy ? "Saving…" : "Save stock change"}
      </button>
    </form>
  );
}

/* ── Expense ──────────────────────────────────────────────── */
export const EXPENSE_CATEGORIES = ["Rent", "Salary", "Electricity", "Transport", "Marketing", "Purchase", "Office", "Other"];

export function ExpenseForm({ onDone }: { onDone: () => void }) {
  const [category, setCategory] = useState("Rent");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const { busy, error, run } = useSubmit(onDone, "Expense saved");

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => post("/api/v1/expenses", { category, amount: Number(amount), date, paymentMethod, notes }));
      }}
    >
      <div className="field">
        <label htmlFor="ex-amount">Amount</label>
        <div className="money-wrap">
          <input id="ex-amount" className="input input-money num" type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <span className="label">Category</span>
        <div className="chips" role="group" aria-label="Expense category" style={{ flexWrap: "wrap" }}>
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="ex-date">Date</label>
          <input id="ex-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="ex-method">Paid by</label>
          <select id="ex-method" className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CARD">Card</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="ex-notes">Note (optional)</label>
        <input id="ex-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <FormError message={error} />
      <button className="btn btn-primary" disabled={busy || !Number(amount)}>
        {busy ? "Saving…" : "Save expense"}
      </button>
    </form>
  );
}

/* ── Invoice ──────────────────────────────────────────────── */
type Line = { description: string; quantity: string; unitPrice: string; taxRate: string };
const blankLine = (): Line => ({ description: "", quantity: "1", unitPrice: "", taxRate: "18" });

export function InvoiceForm({ onDone }: { onDone: () => void }) {
  const customers = useApi<Party[]>("/api/v1/customers");
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [sendNow, setSendNow] = useState(true);
  const { busy, error, run } = useSubmit(onDone, "Invoice created");

  const update = (i: number, k: keyof Line, v: string) => setLines(lines.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

  const net = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const tax = lines.reduce((s, l) => s + ((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * (Number(l.taxRate) || 0)) / 100, 0);
  const off = Math.max(Number(discount) || 0, 0);
  const total = Math.max(net + tax - off, 0);
  const ready = customerId && lines.some((l) => l.description.trim() && Number(l.quantity) > 0 && Number(l.unitPrice) >= 0 && l.unitPrice !== "");

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            post("/api/v1/invoices", {
              customerId,
              dueDate: dueDate || null,
              discount: off,
              sendNow,
              items: lines.map((l) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), taxRate: Number(l.taxRate) })),
            }),
          sendNow ? "Invoice created" : "Draft saved",
        );
      }}
    >
      <div className="form-row">
        <div className="field">
          <label htmlFor="iv-cust">Customer</label>
          <select id="iv-cust" className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="" disabled>
              {customers.loading ? "Loading…" : customers.data?.length ? "Choose a customer" : "No customers yet"}
            </option>
            {customers.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="iv-due">Due date</label>
          <input id="iv-due" className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="invoice-lines">
        {lines.map((l, i) => (
          <div className="line" key={i}>
            <div className="field span-2">
              <label htmlFor={`iv-d-${i}`}>Item {lines.length > 1 ? i + 1 : ""}</label>
              <input id={`iv-d-${i}`} className="input" value={l.description} onChange={(e) => update(i, "description", e.target.value)} placeholder="What are you selling?" />
            </div>
            <div className="field">
              <label htmlFor={`iv-q-${i}`}>Quantity</label>
              <input id={`iv-q-${i}`} className="input num" type="number" inputMode="decimal" step="any" min="0" value={l.quantity} onChange={(e) => update(i, "quantity", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor={`iv-p-${i}`}>Price</label>
              <input id={`iv-p-${i}`} className="input num" type="number" inputMode="decimal" step="any" min="0" value={l.unitPrice} onChange={(e) => update(i, "unitPrice", e.target.value)} placeholder="₹ 0" />
            </div>
            <div className="field">
              <label htmlFor={`iv-t-${i}`}>GST %</label>
              <select id={`iv-t-${i}`} className="select" value={l.taxRate} onChange={(e) => update(i, "taxRate", e.target.value)}>
                {["0", "5", "12", "18", "28"].map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </div>
            {lines.length > 1 && (
              <div style={{ display: "flex", alignItems: "end" }}>
                <button type="button" className="btn btn-sm btn-due" onClick={() => setLines(lines.filter((_, idx) => idx !== i))}>
                  Remove item
                </button>
              </div>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-soft" onClick={() => setLines([...lines, blankLine()])}>
          Add another item
        </button>
      </div>

      <div className="field">
        <label htmlFor="iv-disc">Discount (₹)</label>
        <input id="iv-disc" className="input num" type="number" inputMode="decimal" min="0" step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
      </div>

      <div className="totals num" aria-live="polite">
        <div>
          <span>Subtotal</span>
          <span>{money(net, true)}</span>
        </div>
        <div>
          <span>GST</span>
          <span>{money(tax, true)}</span>
        </div>
        {off > 0 && (
          <div>
            <span>Discount</span>
            <span>-{money(off, true)}</span>
          </div>
        )}
        <div className="grand">
          <span>Total</span>
          <span>{money(total, true)}</span>
        </div>
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
        <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1 }} />
        <span>
          <b>Add to the customer's ledger now</b>
          <br />
          <span style={{ color: "var(--muted)" }}>Marks the invoice as sent and records the sale. Untick to keep it as a draft.</span>
        </span>
      </label>

      <FormError message={error} />
      <button className="btn btn-primary" disabled={busy || !ready}>
        {busy ? "Saving…" : sendNow ? "Create invoice" : "Save draft"}
      </button>
    </form>
  );
}
