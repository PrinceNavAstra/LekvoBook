// Interface strings for the languages the app supports. Add a key to every language when adding one.

export type Language = "en" | "gu" | "hi";

export const translations: Record<Language, Record<string, string>> = {
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
