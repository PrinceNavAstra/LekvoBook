"use client";
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, CheckCircle2, ChevronDown, Search, X } from "lucide-react";
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

/* ── Select: a themed dropdown that looks the same on every device ── */
export type SelectOption = { value: string; label: string; hint?: string; disabled?: boolean };

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled,
  ariaLabel,
  searchable,
  compact,
  emptyText = "Nothing to choose from",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** Show a search box. Defaults to on when there are more than 7 options. */
  searchable?: boolean;
  compact?: boolean;
  emptyText?: string;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number } | null>(null);

  const showSearch = searchable ?? options.length > 7;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const selected = options.find((o) => o.value === value);

  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const below = vh - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    const max = Math.max(160, Math.min(320, up ? above : below));
    const width = Math.max(r.width, 180);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setBox(up ? { left, width, bottom: vh - r.top + 6, max } : { left, width, top: r.bottom + 6, max });
  }, []);

  const openList = () => {
    if (disabled) return;
    setQuery("");
    const i = options.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : Math.max(0, options.findIndex((o) => !o.disabled)));
    place();
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus({ preventScroll: true });
  };
  const choose = (o: SelectOption | undefined) => {
    if (!o || o.disabled) return;
    onChange(o.value);
    close();
  };

  useLayoutEffect(() => {
    if (!open) return;
    if (showSearch) popup.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, showSearch]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (popup.current?.contains(t) || trigger.current?.contains(t)) return;
      setOpen(false);
    };
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  const step = (dir: 1 | -1) => {
    if (!shown.length) return;
    let i = active;
    for (let n = 0; n < shown.length; n++) {
      i = (i + dir + shown.length) % shown.length;
      if (!shown[i].disabled) break;
    }
    setActive(i);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.nativeEvent.stopPropagation(); // do not also close the dialog behind
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, shown.length - 1));
    } else if (e.key === "Enter" || (e.key === " " && !showSearch)) {
      e.preventDefault();
      choose(shown[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        className={`dd ${compact ? "dd-compact" : ""}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        data-empty={selected ? undefined : "true"}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKey}
      >
        <span className="dd-value">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={18} className="dd-chev" aria-hidden="true" />
      </button>
      {open &&
        box &&
        createPortal(
          <div
            ref={popup}
            className="dd-pop"
            style={{ left: box.left, width: box.width, top: box.top, bottom: box.bottom, maxHeight: box.max }}
            onKeyDown={onKey}
          >
            {showSearch && (
              <div className="dd-search">
                <Search size={16} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  placeholder="Search"
                  aria-label="Search options"
                  autoComplete="off"
                />
              </div>
            )}
            <div ref={listRef} id={listId} role="listbox" className="dd-list" aria-label={ariaLabel}>
              {shown.length ? (
                shown.map((o, i) => (
                  <div
                    key={o.value}
                    role="option"
                    aria-selected={o.value === value}
                    aria-disabled={o.disabled || undefined}
                    data-active={i === active}
                    className="dd-opt"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(o)}
                  >
                    <span className="dd-opt-main">
                      <span className="dd-opt-label">{o.label}</span>
                      {o.hint && <span className="dd-opt-hint">{o.hint}</span>}
                    </span>
                    {o.value === value && <Check size={17} aria-hidden="true" />}
                  </div>
                ))
              ) : (
                <div className="dd-none">{emptyText}</div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
