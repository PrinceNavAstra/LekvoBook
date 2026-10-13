"use client";
import { dayLabel, money, shortDate } from "@/lib/format";
import type { Txn } from "@/lib/types";

const TYPE_LABEL: Record<Txn["type"], string> = {
  OPENING: "Opening balance",
  CREDIT: "Credit given",
  PAYMENT: "Payment",
  SALE: "Sale",
  PURCHASE: "Purchase",
  ADJUSTMENT: "Adjustment",
};

/**
 * Which column an entry belongs in, the way Khatabook shows it:
 * "You gave" (red) is money or goods that left you, "You got" (green) is what came back to you.
 * Customers: credit and sales are given, payments are got. Suppliers: purchases are got, payments are given.
 */
export function entrySide(t: Pick<Txn, "direction" | "supplier">): "gave" | "got" {
  const raise = t.direction === "CREDIT";
  if (t.supplier) return raise ? "got" : "gave";
  return raise ? "gave" : "got";
}

/**
 * Ledger list with two amount columns: You gave (red) and You got (green).
 * When `opening` is given, each entry also shows the running balance after it.
 */
export function LedgerPaper({
  txns,
  showParty = false,
  footer,
  opening,
}: {
  txns: Txn[];
  showParty?: boolean;
  footer?: { label: string; value: string; tone?: string };
  /** Opening balance of the party; enables the running "Bal." under each entry. */
  opening?: number;
}) {
  // Entries arrive newest first. Walk from the oldest to give every row its balance.
  const balances = new Map<string, number>();
  if (opening !== undefined && txns.length < 200) {
    let bal = opening;
    for (let i = txns.length - 1; i >= 0; i--) {
      const t = txns[i];
      bal += t.direction === "CREDIT" ? t.amount : -t.amount;
      balances.set(t.id, bal);
    }
  }

  const groups: { label: string; items: Txn[] }[] = [];
  for (const t of txns) {
    const label = dayLabel(t.transactionDate);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(t);
    else groups.push({ label, items: [t] });
  }

  return (
    <div className="paper">
      <div className="paper-head" aria-hidden="true">
        <span>Entries</span>
        <span className="col-gave">You gave</span>
        <span className="col-got">You got</span>
      </div>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="paper-day">
            <span>{g.label}</span>
          </div>
          {g.items.map((t) => {
            const side = entrySide(t);
            const party = t.customer?.name ?? t.supplier?.name;
            const bal = balances.get(t.id);
            const detail = [showParty ? TYPE_LABEL[t.type] : null, t.notes].filter(Boolean).join(" · ");
            return (
              <div className="entry" key={t.id}>
                <div className="entry-body">
                  <div className="entry-title">{showParty && party ? party : TYPE_LABEL[t.type]}</div>
                  <div className="entry-note">
                    <span className="num">{shortDate(t.transactionDate)}</span>
                    {detail ? ` · ${detail}` : ""}
                  </div>
                  {bal !== undefined && <div className="entry-bal num">{bal < 0 ? `Adv. ${money(Math.abs(bal))}` : `Bal. ${money(bal)}`}</div>}
                </div>
                <div className="entry-amt col-gave num">{side === "gave" ? money(t.amount) : ""}</div>
                <div className="entry-amt col-got num">{side === "got" ? money(t.amount) : ""}</div>
              </div>
            );
          })}
        </div>
      ))}
      {footer && (
        <div className="paper-foot">
          <span>{footer.label}</span>
          <span className={`total num ${footer.tone ?? ""}`}>{footer.value}</span>
        </div>
      )}
    </div>
  );
}
