"use client";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { moneyCompact } from "@/lib/format";

/* ── Toasts ───────────────────────────────────────────────── */
type ToastKind = "ok" | "error";
const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; kind: ToastKind }[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, kind: ToastKind = "ok") => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, message, kind }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind === "error" ? "toast-error" : ""}`}>
            {t.kind === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ── Sheet: bottom sheet on phones, dialog on larger screens ─ */
export function Sheet({
  title,
  subtitle,
  onClose,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));

    // Focus the first form field if there is one, otherwise the first control.
    const first = ref.current?.querySelector<HTMLElement>("input, select, textarea") ?? focusable()[0];
    first?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`sheet ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="btn btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

/* ── Small pieces ─────────────────────────────────────────── */
export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="alert" role="alert">
      <AlertCircle size={20} style={{ flex: "none", marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <b>This page could not load</b>
        {message}
      </div>
      <button className="btn btn-sm" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%" }: { h?: number; w?: number | string }) {
  return <div className="skeleton" style={{ height: h, width: w }} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div className="row" key={i}>
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
          <div className="row-main" style={{ display: "grid", gap: 8 }}>
            <Skeleton h={14} w="55%" />
            <Skeleton h={12} w="35%" />
          </div>
          <Skeleton h={16} w={70} />
        </div>
      ))}
    </div>
  );
}

const STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Draft", tone: "" },
  SENT: { label: "Sent", tone: "badge-warn" },
  PARTIALLY_PAID: { label: "Part paid", tone: "badge-warn" },
  PAID: { label: "Paid", tone: "badge-ok" },
  OVERDUE: { label: "Overdue", tone: "badge-due" },
  CANCELLED: { label: "Cancelled", tone: "" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: "" };
  return <span className={`badge ${s.tone}`}>{s.label}</span>;
}

/* ── Seven-day sales and expense chart ────────────────────── */
export function BarChart({ data }: { data: { label: string; sales: number; expense: number }[] }) {
  const W = 560;
  const H = 220;
  const pad = { l: 46, r: 8, t: 10, b: 28 };
  const max = Math.max(...data.flatMap((d) => [d.sales, d.expense]), 1);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const ticks = [0, top / 2, top];
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const slot = innerW / data.length;
  const barW = Math.min(18, slot / 3);
  const y = (v: number) => pad.t + innerH - (v / top) * innerH;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sales and expenses for the last seven days">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end">
              {t === 0 ? "0" : moneyCompact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          return (
            <g key={i}>
              <rect className="bar-sales" x={cx - barW - 1} y={y(d.sales)} width={barW} height={Math.max(innerH - (y(d.sales) - pad.t), 0)} rx={4}>
                <title>{`${d.label}: sales ${moneyCompact(d.sales)}`}</title>
              </rect>
              <rect className="bar-expense" x={cx + 1} y={y(d.expense)} width={barW} height={Math.max(innerH - (y(d.expense) - pad.t), 0)} rx={4}>
                <title>{`${d.label}: expenses ${moneyCompact(d.expense)}`}</title>
              </rect>
              <text x={cx} y={H - 8} textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
