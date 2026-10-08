"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Users, Truck, Receipt, Package, WalletCards, BarChart3,
  Settings, Plus, ArrowUpRight, ArrowDownLeft, Search, Globe2, UserCircle2
} from "lucide-react";

type Language = "en" | "gu" | "hi";

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: "Dashboard", ledger: "Ledger", customers: "Customers", suppliers: "Suppliers",
    invoices: "Invoices", inventory: "Inventory", expenses: "Expenses", reports: "Reports",
    settings: "Settings", language: "Language", profile: "Profile", save: "Save", cancel: "Cancel",
    addTransaction: "Add transaction", receivable: "Receivable", payable: "Payable",
    todaySales: "Today's sales", todayExpense: "Today's expense", recentTransactions: "Recent transactions",
    latestActivity: "Your latest ledger activity", viewLedger: "View ledger →", quickActions: "Quick actions",
    commonTasks: "Common business tasks", recordCredit: "Record credit", creditHelp: "Add money due from a customer",
    receivePayment: "Receive payment", paymentHelp: "Reduce an outstanding balance", createInvoice: "Create invoice",
    invoiceHelp: "Generate a professional invoice", goodMorning: "Good morning",
    keepBooks: "Keep your books moving.", noTransactions: "No transactions yet. Add your first credit or payment.",
    firstSetup: "Set up your Lekvo Book", setupHelp: "Tell us about you and your business. You can update these details later.",
    personDetails: "Your details", businessDetails: "Business details", fullName: "Full name",
    email: "Email address", mobile: "Mobile number", businessName: "Business name",
    businessType: "Business type", gst: "GST number", address: "Business address",
    city: "City", state: "State", pincode: "PIN code", continue: "Continue",
    finish: "Finish setup", required: "Required", languageSaved: "Language saved",
    chooseLanguage: "Choose your language", selectLanguage: "Your default language is English."
  },
  gu: {
    dashboard: "ડેશબોર્ડ", ledger: "ખાતાવહી", customers: "ગ્રાહકો", suppliers: "સપ્લાયર્સ",
    invoices: "બિલ / ઇન્વૉઇસ", inventory: "ઇન્વેન્ટરી", expenses: "ખર્ચ", reports: "અહેવાલો",
    settings: "સેટિંગ્સ", language: "ભાષા", profile: "પ્રોફાઇલ", save: "સાચવો", cancel: "રદ કરો",
    addTransaction: "વ્યવહાર ઉમેરો", receivable: "લેવાની રકમ", payable: "ચૂકવવાની રકમ",
    todaySales: "આજનું વેચાણ", todayExpense: "આજનો ખર્ચ", recentTransactions: "તાજેતરના વ્યવહારો",
    latestActivity: "તમારી તાજેતરની ખાતાવહી પ્રવૃત્તિ", viewLedger: "ખાતાવહી જુઓ →", quickActions: "ઝડપી ક્રિયાઓ",
    commonTasks: "સામાન્ય વ્યવસાયિક કાર્યો", recordCredit: "ઉધાર નોંધો", creditHelp: "ગ્રાહક પાસેથી લેવાની રકમ ઉમેરો",
    receivePayment: "ચુકવણી મેળવો", paymentHelp: "બાકી રકમ ઘટાડો", createInvoice: "બિલ બનાવો",
    invoiceHelp: "વ્યાવસાયિક બિલ બનાવો", goodMorning: "સુપ્રભાત",
    keepBooks: "તમારી ખાતાવહી વ્યવસ્થિત રાખો.", noTransactions: "હજુ કોઈ વ્યવહાર નથી. પહેલો ઉધાર અથવા ચુકવણી ઉમેરો.",
    firstSetup: "તમારું Lekvo Book સેટ કરો", setupHelp: "તમારા અને તમારા વ્યવસાય વિશે માહિતી આપો. તમે પછીથી બદલી શકો છો.",
    personDetails: "તમારી વિગતો", businessDetails: "વ્યવસાયની વિગતો", fullName: "પૂરું નામ",
    email: "ઇમેઇલ સરનામું", mobile: "મોબાઇલ નંબર", businessName: "વ્યવસાયનું નામ",
    businessType: "વ્યવસાયનો પ્રકાર", gst: "GST નંબર", address: "વ્યવસાયનું સરનામું",
    city: "શહેર", state: "રાજ્ય", pincode: "પિન કોડ", continue: "આગળ વધો",
    finish: "સેટઅપ પૂર્ણ કરો", required: "ફરજિયાત", languageSaved: "ભાષા સાચવાઈ",
    chooseLanguage: "તમારી ભાષા પસંદ કરો", selectLanguage: "તમારી ડિફોલ્ટ ભાષા અંગ્રેજી છે."
  },
  hi: {
    dashboard: "डैशबोर्ड", ledger: "बहीखाता", customers: "ग्राहक", suppliers: "आपूर्तिकर्ता",
    invoices: "चालान / बिल", inventory: "इन्वेंटरी", expenses: "खर्च", reports: "रिपोर्ट",
    settings: "सेटिंग्स", language: "भाषा", profile: "प्रोफ़ाइल", save: "सेव करें", cancel: "रद्द करें",
    addTransaction: "लेन-देन जोड़ें", receivable: "प्राप्त करने की राशि", payable: "देय राशि",
    todaySales: "आज की बिक्री", todayExpense: "आज का खर्च", recentTransactions: "हाल के लेन-देन",
    latestActivity: "आपकी हाल की बहीखाता गतिविधि", viewLedger: "बहीखाता देखें →", quickActions: "त्वरित कार्य",
    commonTasks: "सामान्य व्यावसायिक कार्य", recordCredit: "उधार दर्ज करें", creditHelp: "ग्राहक से प्राप्त होने वाली राशि जोड़ें",
    receivePayment: "भुगतान प्राप्त करें", paymentHelp: "बकाया राशि कम करें", createInvoice: "चालान बनाएँ",
    invoiceHelp: "पेशेवर चालान बनाएँ", goodMorning: "सुप्रभात",
    keepBooks: "अपना बहीखाता व्यवस्थित रखें।", noTransactions: "अभी कोई लेन-देन नहीं है। पहला उधार या भुगतान जोड़ें।",
    firstSetup: "अपना Lekvo Book सेट करें", setupHelp: "अपने और अपने व्यवसाय के बारे में जानकारी दें। आप इन्हें बाद में बदल सकते हैं।",
    personDetails: "आपकी जानकारी", businessDetails: "व्यवसाय की जानकारी", fullName: "पूरा नाम",
    email: "ईमेल पता", mobile: "मोबाइल नंबर", businessName: "व्यवसाय का नाम",
    businessType: "व्यवसाय का प्रकार", gst: "GST नंबर", address: "व्यवसाय का पता",
    city: "शहर", state: "राज्य", pincode: "पिन कोड", continue: "आगे बढ़ें",
    finish: "सेटअप पूरा करें", required: "आवश्यक", languageSaved: "भाषा सेव हो गई",
    chooseLanguage: "अपनी भाषा चुनें", selectLanguage: "आपकी डिफ़ॉल्ट भाषा अंग्रेज़ी है।"
  }
};

const nav = [
  ["dashboard", BarChart3], ["ledger", BookOpen], ["customers", Users], ["suppliers", Truck],
  ["invoices", Receipt], ["inventory", Package], ["expenses", WalletCards],
  ["reports", BarChart3], ["settings", Settings]
];

const money = (n: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(n);

export default function Home() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [setup, setSetup] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [language, setLanguage] = useState<Language>("en");
  const [personName, setPersonName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("CREDIT");
  const [dark, setDark] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const t = useMemo(() => translations[language], [language]);

  useEffect(() => {
    const stored = localStorage.getItem("lekvo_language") as Language | null;
    const completed = localStorage.getItem("lekvo_setup_complete");
    if (stored && translations[stored]) setLanguage(stored);
    if (completed === "true") setSetup(false);
    fetch("/api/v1/dashboard").then(r => r.json()).then(setData).catch(() => setData({ offline: true }));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const selectLanguage = (value: Language) => {
    setLanguage(value);
    localStorage.setItem("lekvo_language", value);
  };

  const finishSetup = async () => {
    setError("");
    if (!personName || !email || !mobile || !businessName) {
      setError("Please complete all required fields.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/v1/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personName, email, mobile, language, businessName, businessType, gstNumber, address, city, state, pincode })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save setup.");
      localStorage.setItem("lekvo_setup_complete", "true");
      localStorage.setItem("lekvo_language", language);
      setSetup(false);
      setData(null);
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save setup.");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!name || !amount) return;
    await fetch("/api/v1/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: name, amount: Number(amount), type: kind, direction: kind === "PAYMENT" ? "DEBIT" : "CREDIT" })
    });
    setOpen(false); setName(""); setAmount(""); location.reload();
  };

  if (setup) {
    return <div className="setupPage">
      <div className="setupCard">
        <div className="setupBrand"><div className="logo">L</div><strong>Lekvo <span>Book</span></strong></div>
        <div className="setupProgress"><span className={setupStep >= 1 ? "on" : ""}/><span className={setupStep >= 2 ? "on" : ""}/></div>
        <p className="eyebrow">Welcome</p>
        <h1>{t.firstSetup}</h1>
        <p className="setupHelp">{t.setupHelp}</p>

        {setupStep === 1 ? <section className="setupSection">
          <div className="setupTitle"><UserCircle2/><div><h3>{t.personDetails}</h3><p>Account owner information</p></div></div>
          <label>{t.fullName} <em>*</em><input value={personName} onChange={e => setPersonName(e.target.value)} placeholder={t.fullName}/></label>
          <label>{t.email} <em>*</em><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@example.com"/></label>
          <label>{t.mobile} <em>*</em><input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 98765 43210"/></label>
          <div className="languagePicker"><Globe2/><div><b>{t.chooseLanguage}</b><span>{t.selectLanguage}</span></div><select value={language} onChange={e => selectLanguage(e.target.value as Language)}><option value="en">English</option><option value="gu">ગુજરાતી</option><option value="hi">हिन्दी</option></select></div>
          <button className="primary wide" onClick={() => { if (personName && email && mobile) { setSetupStep(2); setError(""); } else setError("Please complete all required fields."); }}>{t.continue}</button>
        </section> : <section className="setupSection">
          <div className="setupTitle"><BookOpen/><div><h3>{t.businessDetails}</h3><p>Basic details for your accounting workspace</p></div></div>
          <label>{t.businessName} <em>*</em><input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={t.businessName}/></label>
          <label>{t.businessType}<input value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="Trading, Services, Manufacturing..."/></label>
          <label>{t.gst}<input value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="Optional"/></label>
          <label>{t.address}<input value={address} onChange={e => setAddress(e.target.value)} placeholder={t.address}/></label>
          <div className="twoCols"><label>{t.city}<input value={city} onChange={e => setCity(e.target.value)} placeholder={t.city}/></label><label>{t.state}<input value={state} onChange={e => setState(e.target.value)} placeholder={t.state}/></label></div>
          <label>{t.pincode}<input value={pincode} onChange={e => setPincode(e.target.value)} placeholder={t.pincode}/></label>
          {error && <div className="formError">{error}</div>}
          <div className="setupActions"><button onClick={() => setSetupStep(1)}>{t.cancel}</button><button className="primary" disabled={saving} onClick={finishSetup}>{saving ? "Saving..." : t.finish}</button></div>
        </section>}
        {error && setupStep === 1 && <div className="formError">{error}</div>}
        <p className="setupNote">Email OTP and mobile OTP verification will be required for account activation.</p>
      </div>
    </div>;
  }

  return <div className="shell">
    <aside>
      <div className="brand"><div className="logo">L</div><div><b>Lekvo</b><span>Book</span></div></div>
      <div className="business">{data?.business?.name || "Your Business"} <small>Business</small></div>
      <nav>{nav.map(([key, Icon]: any) => <button className={tab === key ? "active" : ""} onClick={() => setTab(key)} key={key}><Icon size={18}/>{t[key]}</button>)}</nav>
      <div className="sideFoot">Cloud synced · Secure</div>
    </aside>
    <main>
      <header><div><p className="eyebrow">Workspace</p><h1>{t[tab]}</h1></div><div className="headerActions">
        <button className="iconBtn" aria-label="Search"><Search size={18}/></button>
        <button className="iconBtn themeBtn" aria-label="Toggle theme" onClick={() => setDark(v => !v)}>{dark ? "☀" : "☾"}</button>
        <button className="iconBtn" aria-label={t.profile} onClick={() => setProfileOpen(true)}><UserCircle2 size={19}/></button>
        <button className="primary" onClick={() => setOpen(true)}><Plus size={18}/>{t.addTransaction}</button>
        <div className="avatar">{personName ? personName.split(" ").map(x => x[0]).slice(0,2).join("") : "U"}</div>
      </div></header>
      {tab === "dashboard" ? <><section className="welcome"><div><p>{t.goodMorning}</p><h2>{t.keepBooks}</h2><span>Everything important for {data?.business?.name || "your business"}, in one place.</span></div><div className="date">Today · {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div></section>
        <section className="stats"><Card title={t.receivable} value={money(data?.receivable ?? 0)} tone="positive"/><Card title={t.payable} value={money(data?.payable ?? 0)} tone="negative"/><Card title={t.todaySales} value={money(data?.sales ?? 0)}/><Card title={t.todayExpense} value={money(data?.expense ?? 0)}/></section>
        <div className="grid"><section className="panel"><div className="panelHead"><div><h3>{t.recentTransactions}</h3><p>{t.latestActivity}</p></div><button className="textBtn" onClick={() => setTab("ledger")}>{t.viewLedger}</button></div>
          {data?.transactions?.length ? data.transactions.map((x:any) => <div className="row" key={x.id}><div className="rowIcon">{x.direction === "CREDIT" ? <ArrowUpRight/> : <ArrowDownLeft/>}</div><div className="grow"><b>{x.customer?.name || x.supplier?.name || "Account"}</b><span>{x.type} · {new Date(x.transactionDate).toLocaleDateString("en-IN")}</span></div><strong className={x.direction === "CREDIT" ? "credit" : "debit"}>{x.direction === "CREDIT" ? "+" : "-"}{money(Number(x.amount))}</strong></div>) : <div className="empty">{t.noTransactions}</div>}
        </section><section className="panel"><div className="panelHead"><div><h3>{t.quickActions}</h3><p>{t.commonTasks}</p></div></div><div className="actions">
          <button onClick={() => setOpen(true)}><Plus/><b>{t.recordCredit}</b><span>{t.creditHelp}</span></button><button onClick={() => setOpen(true)}><WalletCards/><b>{t.receivePayment}</b><span>{t.paymentHelp}</span></button><button><Receipt/><b>{t.createInvoice}</b><span>{t.invoiceHelp}</span></button>
        </div></section></div></> : <section className="panel placeholder"><h3>{t[tab]}</h3><p>This module is scaffolded in the Lekvo Book architecture and connects to the same cloud backend.</p><button className="primary" onClick={() => setOpen(true)}><Plus size={18}/>{t.addTransaction}</button></section>}

      {profileOpen && <div className="modalBack"><div className="modal"><p className="eyebrow">{t.profile}</p><h2>{t.language}</h2><div className="profileLanguages"><button className={language==="en"?"selected":""} onClick={() => selectLanguage("en")}>English</button><button className={language==="gu"?"selected":""} onClick={() => selectLanguage("gu")}>ગુજરાતી</button><button className={language==="hi"?"selected":""} onClick={() => selectLanguage("hi")}>हिन्दी</button></div><div className="modalActions"><button onClick={() => setProfileOpen(false)}>{t.cancel}</button><button className="primary" onClick={() => { setProfileOpen(false); location.reload(); }}>{t.save}</button></div></div></div>}

      {open && <div className="modalBack"><div className="modal"><div><p className="eyebrow">{t.ledger}</p><h2>Record transaction</h2></div><label>Customer ID<input value={name} onChange={e => setName(e.target.value)} placeholder="Paste customer ID"/></label><label>Amount<input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="₹ 0"/></label><label>Type<select value={kind} onChange={e => setKind(e.target.value)}><option value="CREDIT">Give Credit</option><option value="PAYMENT">Receive Payment</option></select></label><div className="modalActions"><button onClick={() => setOpen(false)}>{t.cancel}</button><button className="primary" onClick={submit}>{t.save}</button></div></div></div>}
    </main>
  </div>;
}

function Card({title,value,tone}:{title:string,value:string,tone?:string}) {
  return <div className="stat"><span>{title}</span><strong className={tone || ""}>{value}</strong><small>vs. previous period</small></div>;
}
