"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Home as HomeIcon,
  LayoutDashboard,
  MoreHorizontal,
  Moon,
  Package,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Sun,
  Truck,
  UserCircle2,
  Users,
  WalletCards,
} from "lucide-react";
import { api, SIGNED_OUT_EVENT, useApi } from "@/lib/api";
import { translations, type Language } from "@/lib/i18n";
import type { Dashboard, Party, Product } from "@/lib/types";
import { DashboardView } from "./components/dashboard";
import { EntryForm, ExpenseForm, InvoiceForm, PartyForm, ProductForm, StockForm } from "./components/forms";
import type { EntryKind, PartyKind } from "./components/forms";
import { LedgerView, PartiesView, PartyProfile } from "./components/parties";
import { ExpensesView, InventoryView, InvoicesView, ReportsView, SettingsView } from "./components/business";
import { ListSkeleton, Sheet, ToastProvider } from "./components/ui";
import { AuthGate, ProfileSheet as AccountSheet, SetupScreen, type SessionBusiness, type SessionUser } from "./components/auth";

const TABS = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Ledger", icon: BookOpen },
  { name: "Customers", icon: Users },
  { name: "Suppliers", icon: Truck },
  { name: "Invoices", icon: Receipt },
  { name: "Inventory", icon: Package },
  { name: "Expenses", icon: WalletCards },
  { name: "Reports", icon: BarChart3 },
  { name: "Settings", icon: Settings },
] as const;
type TabName = (typeof TABS)[number]["name"];

const MORE_TABS: TabName[] = ["Customers", "Suppliers", "Invoices", "Inventory", "Expenses", "Settings"];

type SheetState =
  | { type: "add" }
  | { type: "more" }
  | { type: "profile-me" }
  | { type: "entry"; kind: EntryKind; party: PartyKind; partyId?: string; back?: { kind: PartyKind; id: string } }
  | { type: "party"; kind: PartyKind }
  | { type: "profile"; kind: PartyKind; id: string }
  | { type: "product" }
  | { type: "stock"; product: Product }
  | { type: "expense" }
  | { type: "invoice" };

const ENTRY_TITLE = (kind: EntryKind, party: PartyKind) =>
  kind === "CREDIT" ? "Give credit" : kind === "SALE" ? "Record a sale" : kind === "PURCHASE" ? "Record a purchase" : party === "customer" ? "Receive payment" : "Payment made";

type Session = { user: SessionUser; business: SessionBusiness | null };

export default function Home() {
  return (
    <ToastProvider>
      <Root />
    </ToastProvider>
  );
}

/** Decides what to show: loading, sign-in, first-time business setup or the app itself. */
function Root() {
  const [state, setState] = useState<"loading" | "login" | "setup" | "app">("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [language, setLanguageState] = useState<Language>("en");

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem("lekvo_language", next);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const s = await api<{ user: SessionUser; business: SessionBusiness | null }>("/api/auth/session");
      setSession({ user: s.user, business: s.business });
      if (s.user.preferredLanguage in translations) setLanguageState(s.user.preferredLanguage as Language);
      setState(s.business ? "app" : "setup");
    } catch {
      setSession(null);
      setState("login");
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lekvo_language");
      if (saved && saved in translations) setLanguageState(saved as Language);
    } catch {}
    load();
    const onSignedOut = () => {
      setSession(null);
      setState("login");
    };
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  }, [load]);

  if (state === "loading") {
    return (
      <main className="auth-page" aria-busy="true">
        <div className="auth-card" style={{ justifyItems: "center", textAlign: "center" }}>
          <div className="brand-mark">
            <BookOpen size={20} />
          </div>
          <p className="tone-muted">Opening your workspace…</p>
        </div>
      </main>
    );
  }
  if (state === "login") return <AuthGate language={language} setLanguage={setLanguage} onDone={load} />;
  if (state === "setup" && session) return <SetupScreen language={language} setLanguage={setLanguage} userName={session.user.name} onDone={load} />;
  if (!session) return null;

  return <App session={session} language={language} setLanguage={setLanguage} refreshSession={load} onSignedOut={() => { setSession(null); setState("login"); }} />;
}

function App({ session, language, setLanguage, refreshSession, onSignedOut }: { session: Session; language: Language; setLanguage: (l: Language) => void; refreshSession: () => void; onSignedOut: () => void }) {
  const t = translations[language];
  const label = (name: string) => t[name.toLowerCase()] ?? name;
  const [tab, setTab] = useState<TabName>("Dashboard");
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [version, setVersion] = useState(0);
  const [dark, setDark] = useState(false);

  // Keep the current page in the URL hash so a refresh or shared link lands on the same screen.
  useEffect(() => {
    const fromHash = decodeURIComponent(location.hash.slice(1)) as TabName;
    if (TABS.some((t) => t.name === fromHash)) setTab(fromHash);
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const go = useCallback((next: string) => {
    setTab(next as TabName);
    history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("lekvo-theme", next ? "dark" : "light");
    } catch {}
  };

  const dash = useApi<Dashboard>(`/api/v1/dashboard?v=${version}`);
  const refresh = () => setVersion((v) => v + 1);
  const close = () => setSheet(null);
  const saved = () => {
    refresh();
    close();
  };

  const openEntry = (kind: EntryKind, party: PartyKind = "customer") => setSheet({ type: "entry", kind, party });
  const addForTab = () => {
    if (tab === "Customers") setSheet({ type: "party", kind: "customer" });
    else if (tab === "Suppliers") setSheet({ type: "party", kind: "supplier" });
    else if (tab === "Invoices") setSheet({ type: "invoice" });
    else if (tab === "Inventory") setSheet({ type: "product" });
    else if (tab === "Expenses") setSheet({ type: "expense" });
    else openEntry("CREDIT");
  };

  const businessName = session.business?.name ?? dash.data?.business.name ?? "Your business";
  const initialsOf = session.user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "U";

  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>

      <aside className="sidebar" aria-label="Main">
        <div className="brand">
          <div className="brand-mark">
            <BookOpen size={20} />
          </div>
          <span className="brand-name">Lekvo Book</span>
        </div>
        <div className="workspace">
          <div style={{ minWidth: 0 }}>
            <div className="workspace-name">{businessName}</div>
            <small>Owner</small>
          </div>
        </div>
        <nav className="side-nav">
          {TABS.map(({ name, icon: Icon }) => (
            <button key={name} className="nav-item" aria-current={tab === name ? "page" : undefined} onClick={() => go(name)} title={label(name)} aria-label={label(name)}>
              <Icon size={20} />
              <span className="label">{label(name)}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <i className="dot" />
          <span>Saved to the cloud</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <div className="mobile-brand">
              <BookOpen size={18} />
            </div>
            <h1>{label(tab)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-icon" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button className="btn btn-icon" onClick={() => setSheet({ type: "profile-me" })} aria-label={t.profile} title={t.profile} style={{ fontWeight: 750 }}>
              {initialsOf || <UserCircle2 size={19} />}
            </button>
            <button className="btn btn-primary only-desktop" onClick={() => openEntry("CREDIT")}>
              <Plus size={18} /> Add entry
            </button>
          </div>
        </header>

        <main id="main" className="page" key={tab}>
          {tab === "Dashboard" && (
            <DashboardView
              data={dash.data}
              error={dash.error}
              reload={dash.reload}
              onEntry={openEntry}
              onOpenCustomer={(id) => setSheet({ type: "profile", kind: "customer", id })}
              go={go}
            />
          )}
          {tab === "Ledger" && <LedgerView version={version} onAdd={() => openEntry("CREDIT")} />}
          {tab === "Customers" && <PartiesView kind="customer" version={version} onAdd={addForTab} onOpen={(p) => setSheet({ type: "profile", kind: "customer", id: p.id })} />}
          {tab === "Suppliers" && <PartiesView kind="supplier" version={version} onAdd={addForTab} onOpen={(p) => setSheet({ type: "profile", kind: "supplier", id: p.id })} />}
          {tab === "Invoices" && <InvoicesView version={version} onAdd={addForTab} />}
          {tab === "Inventory" && <InventoryView version={version} onAdd={addForTab} onStock={(product) => setSheet({ type: "stock", product })} />}
          {tab === "Expenses" && <ExpensesView version={version} onAdd={addForTab} />}
          {tab === "Reports" && <ReportsView version={version} />}
          {tab === "Settings" && <SettingsView businessName={businessName} dark={dark} onToggleTheme={toggleTheme} />}
        </main>
      </div>

      {/* Phone navigation: Home, Ledger, +, Reports, More */}
      <nav className="bottom-nav" aria-label="Main">
        <div className="bottom-nav-inner">
          <button className="tab" aria-current={tab === "Dashboard" ? "page" : undefined} onClick={() => go("Dashboard")}>
            <HomeIcon size={22} />
            Home
          </button>
          <button className="tab" aria-current={tab === "Ledger" ? "page" : undefined} onClick={() => go("Ledger")}>
            <BookOpen size={22} />
            {label("Ledger")}
          </button>
          <button className="tab-add" onClick={() => setSheet({ type: "add" })} aria-label="Add new">
            <Plus size={28} />
          </button>
          <button className="tab" aria-current={tab === "Reports" ? "page" : undefined} onClick={() => go("Reports")}>
            <BarChart3 size={22} />
            {label("Reports")}
          </button>
          <button className="tab" aria-current={MORE_TABS.includes(tab) ? "page" : undefined} onClick={() => setSheet({ type: "more" })}>
            <MoreHorizontal size={22} />
            More
          </button>
        </div>
      </nav>

      {sheet?.type === "add" && (
        <Sheet title="Add new" subtitle="What would you like to record?" onClose={close}>
          <div className="quick-grid">
            <button className="quick" onClick={() => openEntry("CREDIT")}>
              <span className="quick-icon ic-due">
                <ArrowUpRight size={20} />
              </span>
              <b>Give credit</b>
              <span>Goods or money you gave</span>
            </button>
            <button className="quick" onClick={() => openEntry("PAYMENT")}>
              <span className="quick-icon ic-ok">
                <ArrowDownLeft size={20} />
              </span>
              <b>Receive payment</b>
              <span>Money you got back</span>
            </button>
            <button className="quick" onClick={() => openEntry("SALE")}>
              <span className="quick-icon ic-ok">
                <ShoppingCart size={20} />
              </span>
              <b>Sale</b>
              <span>Sold on credit</span>
            </button>
            <button className="quick" onClick={() => openEntry("PURCHASE", "supplier")}>
              <span className="quick-icon ic-warn">
                <Truck size={20} />
              </span>
              <b>Purchase</b>
              <span>Bought from a supplier</span>
            </button>
            <button className="quick" onClick={() => setSheet({ type: "expense" })}>
              <span className="quick-icon ic-warn">
                <WalletCards size={20} />
              </span>
              <b>Expense</b>
              <span>Rent, bills, salary</span>
            </button>
            <button className="quick" onClick={() => setSheet({ type: "invoice" })}>
              <span className="quick-icon ic-ink">
                <Receipt size={20} />
              </span>
              <b>Invoice</b>
              <span>Bill with GST</span>
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.type === "more" && (
        <Sheet title="More" onClose={close}>
          <div className="quick-grid">
            {TABS.filter((t) => MORE_TABS.includes(t.name)).map(({ name, icon: Icon }) => (
              <button
                key={name}
                className="quick"
                onClick={() => {
                  close();
                  go(name);
                }}
              >
                <span className="quick-icon ic-ink">
                  <Icon size={20} />
                </span>
                <b>{label(name)}</b>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet?.type === "entry" && (
        <Sheet title={ENTRY_TITLE(sheet.kind, sheet.party)} subtitle="Saved to your ledger" onClose={sheet.back ? () => setSheet({ type: "profile", ...sheet.back! }) : close}>
          <EntryForm
            kind={sheet.kind}
            partyKind={sheet.party}
            partyId={sheet.partyId}
            onDone={() => {
              refresh();
              setSheet(sheet.back ? { type: "profile", ...sheet.back } : null);
            }}
          />
        </Sheet>
      )}

      {sheet?.type === "profile-me" && (
        <AccountSheet
          user={session.user}
          business={session.business}
          language={language}
          onLanguage={setLanguage}
          onSaved={refreshSession}
          onSignedOut={onSignedOut}
          onClose={close}
        />
      )}

      {sheet?.type === "party" && (
        <Sheet title={sheet.kind === "customer" ? "New customer" : "New supplier"} onClose={close}>
          <PartyForm kind={sheet.kind} onDone={saved} />
        </Sheet>
      )}

      {sheet?.type === "profile" && (
        <ProfileSheet
          kind={sheet.kind}
          id={sheet.id}
          version={version}
          onClose={close}
          onEntry={(entry, partyId) => setSheet({ type: "entry", kind: entry, party: sheet.kind, partyId, back: { kind: sheet.kind, id: sheet.id } })}
        />
      )}

      {sheet?.type === "product" && (
        <Sheet title="New product" onClose={close}>
          <ProductForm onDone={saved} />
        </Sheet>
      )}

      {sheet?.type === "stock" && (
        <Sheet title={sheet.product.name} subtitle="Update stock" onClose={close}>
          <StockForm product={sheet.product} onDone={saved} />
        </Sheet>
      )}

      {sheet?.type === "expense" && (
        <Sheet title="New expense" onClose={close}>
          <ExpenseForm onDone={saved} />
        </Sheet>
      )}

      {sheet?.type === "invoice" && (
        <Sheet title="New invoice" subtitle="Totals are worked out for you" wide onClose={close}>
          <InvoiceForm onDone={saved} />
        </Sheet>
      )}
    </div>
  );
}

/** Looks up the freshest copy of a customer or supplier so balances stay correct after each entry. */
function ProfileSheet({
  kind,
  id,
  version,
  onClose,
  onEntry,
}: {
  kind: PartyKind;
  id: string;
  version: number;
  onClose: () => void;
  onEntry: (entry: EntryKind, partyId: string) => void;
}) {
  const { data } = useApi<Party[]>(`/api/v1/${kind === "customer" ? "customers" : "suppliers"}?v=${version}`);
  const party = data?.find((p) => p.id === id);

  return (
    <Sheet title={party?.name ?? (kind === "customer" ? "Customer" : "Supplier")} wide onClose={onClose}>
      {party ? <PartyProfile kind={kind} party={party} version={version} onEntry={onEntry} /> : <ListSkeleton rows={3} />}
    </Sheet>
  );
}
