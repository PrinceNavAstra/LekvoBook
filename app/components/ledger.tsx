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
 * A ruled, ledger-book style list of entries with a red margin line.
 * Entries that raise a balance sit in the first amount column, settlements in the second.
 */
export function LedgerPaper({
  txns,
  raiseLabel = "Billed",
  settleLabel = "Settled",
  showParty = false,
  footer,
}: {
  txns: Txn[];
  raiseLabel?: string;
  settleLabel?: string;
  showParty?: boolean;
  footer?: { label: string; value: string; tone?: string };
}) {
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
        <span>Date</span>
        <span>Details</span>
        <span className="only-wide">{raiseLabel}</span>
        <span className="only-wide">{settleLabel}</span>
      </div>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="paper-day">
            <span>{g.label}</span>
          </div>
          {g.items.map((t) => {
            const raise = t.direction === "CREDIT";
            const party = t.customer?.name ?? t.supplier?.name;
            return (
              <div className="entry" key={t.id}>
                <div className="entry-date num">{shortDate(t.transactionDate)}</div>
                <div className="entry-body">
                  <div className="entry-title">{showParty && party ? party : TYPE_LABEL[t.type]}</div>
                  <div className="entry-note">
                    {showParty ? TYPE_LABEL[t.type] : ""}
                    {showParty && t.notes ? " · " : ""}
                    {t.notes ?? ""}
                  </div>
                </div>
                <div className={`entry-amt raise num tone-due ${raise ? "" : "is-empty"}`}>{raise ? `+${money(t.amount)}` : ""}</div>
                <div className={`entry-amt settle num tone-ok ${raise ? "is-empty" : ""}`}>{raise ? "" : `−${money(t.amount)}`}</div>
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
