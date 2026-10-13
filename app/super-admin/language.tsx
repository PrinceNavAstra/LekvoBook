"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

export type AdminLanguage = "en" | "gu" | "hi";
const copy: Record<AdminLanguage, Record<string, string>> = {
  en: {
    brand: "LekvoBook · Super Admin", overview: "Overview", emailSetup: "Email Setup", whatsappSetup: "WhatsApp Setup",
    platformAdministration: "Platform administration", dashboard: "Super Admin Dashboard",
    dashboardIntro: "Manage platform-wide communication services here. These settings are separate from each company’s own communication settings.",
    authSystemMail: "AUTHENTICATION & SYSTEM MAIL", emailDesc: "Configure SMTP or Resend for platform verification, sign-in and password recovery emails.",
    openEmail: "Open email settings →", metaIntegration: "META PLATFORM INTEGRATION",
    whatsappDesc: "Manage platform Meta credentials, webhook verification and test messaging.", openWhatsApp: "Open WhatsApp settings →",
    security: "Security: this area is available only to signed-in email addresses listed in the server-side SUPER_ADMIN_EMAILS environment variable. API endpoints also enforce the same allowlist.",
    communications: "Super Admin · Communications", commsIntro: "Platform-wide authentication email and Meta app configuration. Company owners cannot view or edit platform email credentials.",
    loading: "Loading configuration…", emailAccount: "Platform Email Account", emailHelp: "Used for sign-in OTPs, email verification and platform system messages.",
    enableEmail: "Enable platform email", provider: "Provider", fromAddress: "From address (verified sender)", replyTo: "Reply-to address (optional)",
    resendKey: "Resend API key", smtpHost: "SMTP host", smtpPort: "SMTP port", smtpUser: "SMTP username", smtpPassword: "SMTP password / app password",
    tls: "Use implicit TLS (usually port 465)", smtpHelp: "SMTP is used for platform sign-in OTP, email verification and password-reset messages. Use your provider’s app password where required. Port 465 normally uses implicit TLS; port 587 normally uses STARTTLS.",
    authenticate: "Authenticate", authenticating: "Authenticating…", saving: "Saving…", save: "Save", saveAll: "Save all settings",
    authHelp: "Authenticate checks the mail account using the details above without sending anything or saving. Press Save to keep them.",
    testTo: "Send test email to", sendTest: "Send test email", sending: "Sending…", testSavedHelp: "The test uses the saved settings, so press Save first.",
    whatsappAccount: "WhatsApp Account", whatsappAccountHelp: "Meta WhatsApp Cloud API account configuration.", activateWhatsApp: "Activate outgoing WhatsApp",
    accountName: "Account Name", phoneId: "Phone ID", appId: "App ID", businessId: "Business ID (WABA ID)", accessToken: "Access Token",
    graphUrl: "Graph API base URL", graphVersion: "Graph API Version", webhookToken: "Webhook Verify Token (create a long random value)",
    appSecret: "Meta App Secret (used to verify webhook signatures)", defaultIncoming: "Default incoming account", defaultOutgoing: "Default outgoing account",
    readReceipts: "Allow automatic read receipts where supported", testRecipient: "Test recipient (E.164, e.g. +15551234567)",
    testCredentials: "Test credentials", sendTemplate: "Send test template", whatsappHelp: "Credential test checks the token and Phone ID against Meta Graph API. Sending a WhatsApp message is a separate test and requires a recipient, permissions and an approved template where required.",
    accessRestricted: "Access is restricted by the server-side SUPER_ADMIN_EMAILS environment variable. Set it to a comma-separated allowlist of platform administrator emails.",
    savedSecurely: "Configuration saved securely.", couldNotSave: "Could not save", authFailed: "Authentication failed", testFailed: "Test email failed",
    emailOn: "Saved. Platform email is on.", emailOff: "Saved. Platform email is still switched off — enable platform email to send sign-in codes.",
    enterEmail: "Enter a valid test recipient email.", requestFailed: "Request failed.", configSaved: "Saved.",
    resend: "Resend API", smtp: "SMTP", optional: "Optional"
  },
  gu: {
    brand: "LekvoBook · સુપર એડમિન", overview: "ઝાંખી", emailSetup: "ઇમેઇલ સેટઅપ", whatsappSetup: "વોટ્સએપ સેટઅપ",
    platformAdministration: "પ્લેટફોર્મ સંચાલન", dashboard: "સુપર એડમિન ડેશબોર્ડ",
    dashboardIntro: "અહીંથી સમગ્ર પ્લેટફોર્મની સંચાર સેવાઓ સંચાલિત કરો. આ સેટિંગ્સ દરેક કંપનીની પોતાની સંચાર સેટિંગ્સથી અલગ છે.",
    authSystemMail: "પ્રમાણીકરણ અને સિસ્ટમ ઇમેઇલ", emailDesc: "પ્લેટફોર્મ ચકાસણી, સાઇન-ઇન અને પાસવર્ડ પુનઃપ્રાપ્તિ ઇમેઇલ માટે SMTP અથવા Resend ગોઠવો.",
    openEmail: "ઇમેઇલ સેટિંગ્સ ખોલો →", metaIntegration: "મેટા પ્લેટફોર્મ ઇન્ટિગ્રેશન",
    whatsappDesc: "પ્લેટફોર્મના Meta ઓળખપત્રો, વેબહૂક ચકાસણી અને પરીક્ષણ સંદેશાઓ સંચાલિત કરો.", openWhatsApp: "વોટ્સએપ સેટિંગ્સ ખોલો →",
    security: "સુરક્ષા: આ વિભાગમાં ફક્ત સર્વર પરના SUPER_ADMIN_EMAILS પરવાનગી યાદીમાં સામેલ ઇમેઇલથી સાઇન-ઇન કરેલા વપરાશકર્તાને પ્રવેશ મળે છે. API પણ આ જ ચકાસણી કરે છે.",
    communications: "સુપર એડમિન · સંચાર", commsIntro: "સમગ્ર પ્લેટફોર્મના પ્રમાણીકરણ ઇમેઇલ અને Meta એપની ગોઠવણી. કંપનીના માલિકો પ્લેટફોર્મ ઇમેઇલના ગુપ્ત ઓળખપત્રો જોઈ કે બદલી શકતા નથી.",
    loading: "ગોઠવણી લોડ થઈ રહી છે…", emailAccount: "પ્લેટફોર્મ ઇમેઇલ એકાઉન્ટ", emailHelp: "સાઇન-ઇન OTP, ઇમેઇલ ચકાસણી અને પ્લેટફોર્મ સંદેશાઓ માટે વપરાય છે.",
    enableEmail: "પ્લેટફોર્મ ઇમેઇલ સક્રિય કરો", provider: "પ્રદાતા", fromAddress: "મોકલનારનું સરનામું (ચકાસેલું)", replyTo: "જવાબ માટેનું સરનામું (વૈકલ્પિક)",
    resendKey: "Resend API કી", smtpHost: "SMTP હોસ્ટ", smtpPort: "SMTP પોર્ટ", smtpUser: "SMTP વપરાશકર્તા નામ", smtpPassword: "SMTP પાસવર્ડ / એપ પાસવર્ડ",
    tls: "Implicit TLS વાપરો (સામાન્ય રીતે પોર્ટ 465)", smtpHelp: "SMTP નો ઉપયોગ સાઇન-ઇન OTP, ઇમેઇલ ચકાસણી અને પાસવર્ડ રીસેટ માટે થાય છે. જરૂરી હોય ત્યારે પ્રદાતાનો એપ પાસવર્ડ વાપરો. પોર્ટ 465 સામાન્ય રીતે implicit TLS અને પોર્ટ 587 STARTTLS વાપરે છે.",
    authenticate: "પ્રમાણિત કરો", authenticating: "પ્રમાણિત થઈ રહ્યું છે…", saving: "સાચવી રહ્યું છે…", save: "સાચવો", saveAll: "બધી સેટિંગ્સ સાચવો",
    authHelp: "પ્રમાણિત કરો બટન ઉપરની વિગતો વડે ઇમેઇલ એકાઉન્ટ તપાસે છે; કોઈ ઇમેઇલ મોકલતું કે સેટિંગ્સ સાચવતું નથી. વિગતો સાચવવા સાચવો દબાવો.",
    testTo: "પરીક્ષણ ઇમેઇલ મોકલવાનું સરનામું", sendTest: "પરીક્ષણ ઇમેઇલ મોકલો", sending: "મોકલી રહ્યું છે…", testSavedHelp: "પરીક્ષણ સાચવેલી સેટિંગ્સથી થાય છે, તેથી પહેલાં સાચવો.",
    whatsappAccount: "વોટ્સએપ એકાઉન્ટ", whatsappAccountHelp: "Meta WhatsApp Cloud API એકાઉન્ટની ગોઠવણી.", activateWhatsApp: "આઉટગોઇંગ વોટ્સએપ સક્રિય કરો",
    accountName: "એકાઉન્ટનું નામ", phoneId: "ફોન ID", appId: "એપ ID", businessId: "બિઝનેસ ID (WABA ID)", accessToken: "ઍક્સેસ ટોકન",
    graphUrl: "Graph API બેઝ URL", graphVersion: "Graph API આવૃત્તિ", webhookToken: "વેબહૂક ચકાસણી ટોકન (લાંબું રૅન્ડમ મૂલ્ય બનાવો)",
    appSecret: "Meta એપ સિક્રેટ (વેબહૂક સહી ચકાસવા માટે)", defaultIncoming: "ડિફૉલ્ટ ઇનકમિંગ એકાઉન્ટ", defaultOutgoing: "ડિફૉલ્ટ આઉટગોઇંગ એકાઉન્ટ",
    readReceipts: "સુવિધા ઉપલબ્ધ હોય ત્યાં આપમેળે વાંચ્યાની પહોંચ મંજૂર કરો", testRecipient: "પરીક્ષણ માટેનો નંબર (દેશના કોડ સાથે, ઉદા. +15551234567)",
    testCredentials: "ઓળખપત્રો ચકાસો", sendTemplate: "પરીક્ષણ ટેમ્પલેટ મોકલો", whatsappHelp: "ઓળખપત્ર પરીક્ષણ Meta Graph API પર ટોકન અને ફોન ID તપાસે છે. વોટ્સએપ સંદેશ મોકલવા અલગ પરીક્ષણ, પ્રાપ્તકર્તા, પરવાનગીઓ અને જરૂરી હોય ત્યાં મંજૂર ટેમ્પલેટ જોઈએ.",
    accessRestricted: "પ્રવેશ સર્વરના SUPER_ADMIN_EMAILS પર્યાવરણ ચલ દ્વારા નિયંત્રિત છે. તેમાં પ્લેટફોર્મ એડમિનના ઇમેઇલ સરનામાં અલ્પવિરામથી અલગ કરીને ઉમેરો.",
    savedSecurely: "ગોઠવણી સુરક્ષિત રીતે સાચવાઈ.", couldNotSave: "સાચવી શકાયું નહીં", authFailed: "પ્રમાણીકરણ નિષ્ફળ", testFailed: "પરીક્ષણ ઇમેઇલ નિષ્ફળ",
    emailOn: "સાચવ્યું. પ્લેટફોર્મ ઇમેઇલ ચાલુ છે.", emailOff: "સાચવ્યું. પ્લેટફોર્મ ઇમેઇલ બંધ છે — સાઇન-ઇન કોડ મોકલવા તેને સક્રિય કરો.",
    enterEmail: "પરીક્ષણ માટે માન્ય ઇમેઇલ સરનામું દાખલ કરો.", requestFailed: "વિનંતી નિષ્ફળ.", configSaved: "સાચવાયું.",
    resend: "Resend API", smtp: "SMTP", optional: "વૈકલ્પિક"
  },
  hi: {
    brand: "LekvoBook · सुपर एडमिन", overview: "अवलोकन", emailSetup: "ईमेल सेटअप", whatsappSetup: "व्हाट्सऐप सेटअप",
    platformAdministration: "प्लेटफ़ॉर्म प्रबंधन", dashboard: "सुपर एडमिन डैशबोर्ड",
    dashboardIntro: "यहाँ से पूरे प्लेटफ़ॉर्म की संचार सेवाएँ प्रबंधित करें। ये सेटिंग्स हर कंपनी की अपनी संचार सेटिंग्स से अलग हैं।",
    authSystemMail: "प्रमाणीकरण और सिस्टम ईमेल", emailDesc: "प्लेटफ़ॉर्म सत्यापन, साइन-इन और पासवर्ड रिकवरी ईमेल के लिए SMTP या Resend कॉन्फ़िगर करें।",
    openEmail: "ईमेल सेटिंग्स खोलें →", metaIntegration: "मेटा प्लेटफ़ॉर्म इंटीग्रेशन",
    whatsappDesc: "प्लेटफ़ॉर्म के Meta क्रेडेंशियल, वेबहुक सत्यापन और परीक्षण संदेश प्रबंधित करें।", openWhatsApp: "व्हाट्सऐप सेटिंग्स खोलें →",
    security: "सुरक्षा: इस भाग तक केवल वही साइन-इन ईमेल पहुँच सकते हैं जो सर्वर के SUPER_ADMIN_EMAILS allowlist में हैं। API भी इसी अनुमति की जाँच करती है।",
    communications: "सुपर एडमिन · संचार", commsIntro: "पूरे प्लेटफ़ॉर्म के प्रमाणीकरण ईमेल और Meta ऐप की सेटिंग्स। कंपनी मालिक प्लेटफ़ॉर्म ईमेल के गोपनीय क्रेडेंशियल नहीं देख या बदल सकते।",
    loading: "कॉन्फ़िगरेशन लोड हो रहा है…", emailAccount: "प्लेटफ़ॉर्म ईमेल खाता", emailHelp: "साइन-इन OTP, ईमेल सत्यापन और प्लेटफ़ॉर्म संदेशों के लिए उपयोग होता है।",
    enableEmail: "प्लेटफ़ॉर्म ईमेल चालू करें", provider: "प्रदाता", fromAddress: "भेजने वाले का पता (सत्यापित)", replyTo: "जवाब का पता (वैकल्पिक)",
    resendKey: "Resend API कुंजी", smtpHost: "SMTP होस्ट", smtpPort: "SMTP पोर्ट", smtpUser: "SMTP उपयोगकर्ता नाम", smtpPassword: "SMTP पासवर्ड / ऐप पासवर्ड",
    tls: "Implicit TLS उपयोग करें (आमतौर पर पोर्ट 465)", smtpHelp: "SMTP का उपयोग साइन-इन OTP, ईमेल सत्यापन और पासवर्ड रीसेट के लिए होता है। ज़रूरत पड़ने पर प्रदाता का ऐप पासवर्ड उपयोग करें। पोर्ट 465 आमतौर पर implicit TLS और पोर्ट 587 STARTTLS उपयोग करता है।",
    authenticate: "प्रमाणित करें", authenticating: "प्रमाणीकरण हो रहा है…", saving: "सेव हो रहा है…", save: "सेव करें", saveAll: "सभी सेटिंग्स सेव करें",
    authHelp: "प्रमाणित करें ऊपर दी गई जानकारी से ईमेल खाते की जाँच करता है; यह कोई ईमेल नहीं भेजता और सेटिंग्स सेव नहीं करता। जानकारी रखने के लिए सेव करें दबाएँ।",
    testTo: "परीक्षण ईमेल भेजने का पता", sendTest: "परीक्षण ईमेल भेजें", sending: "भेज रहे हैं…", testSavedHelp: "परीक्षण सेव की गई सेटिंग्स से होता है, इसलिए पहले सेव करें।",
    whatsappAccount: "व्हाट्सऐप खाता", whatsappAccountHelp: "Meta WhatsApp Cloud API खाते का कॉन्फ़िगरेशन।", activateWhatsApp: "आउटगोइंग व्हाट्सऐप चालू करें",
    accountName: "खाते का नाम", phoneId: "फ़ोन ID", appId: "ऐप ID", businessId: "बिज़नेस ID (WABA ID)", accessToken: "एक्सेस टोकन",
    graphUrl: "Graph API बेस URL", graphVersion: "Graph API संस्करण", webhookToken: "वेबहुक सत्यापन टोकन (लंबा रैंडम मान बनाएँ)",
    appSecret: "Meta ऐप सीक्रेट (वेबहुक हस्ताक्षर सत्यापित करने के लिए)", defaultIncoming: "डिफ़ॉल्ट इनकमिंग खाता", defaultOutgoing: "डिफ़ॉल्ट आउटगोइंग खाता",
    readReceipts: "जहाँ उपलब्ध हो वहाँ स्वचालित पढ़े जाने की रसीद की अनुमति दें", testRecipient: "परीक्षण प्राप्तकर्ता (देश कोड सहित, जैसे +15551234567)",
    testCredentials: "क्रेडेंशियल जाँचें", sendTemplate: "परीक्षण टेम्पलेट भेजें", whatsappHelp: "क्रेडेंशियल परीक्षण Meta Graph API पर टोकन और फ़ोन ID जाँचता है। WhatsApp संदेश भेजने के लिए अलग परीक्षण, प्राप्तकर्ता, अनुमतियाँ और जहाँ आवश्यक हो स्वीकृत टेम्पलेट चाहिए।",
    accessRestricted: "पहुँच सर्वर के SUPER_ADMIN_EMAILS पर्यावरण चर से नियंत्रित है। इसमें प्लेटफ़ॉर्म एडमिन के ईमेल पते कॉमा से अलग करके जोड़ें।",
    savedSecurely: "कॉन्फ़िगरेशन सुरक्षित रूप से सेव हुआ।", couldNotSave: "सेव नहीं हो सका", authFailed: "प्रमाणीकरण विफल", testFailed: "परीक्षण ईमेल विफल",
    emailOn: "सेव हुआ। प्लेटफ़ॉर्म ईमेल चालू है।", emailOff: "सेव हुआ। प्लेटफ़ॉर्म ईमेल अभी बंद है — साइन-इन कोड भेजने के लिए इसे चालू करें।",
    enterEmail: "परीक्षण के लिए मान्य ईमेल पता दर्ज करें।", requestFailed: "अनुरोध विफल।", configSaved: "सेव हुआ।",
    resend: "Resend API", smtp: "SMTP", optional: "वैकल्पिक"
  }
};

type LanguageContextValue = { language: AdminLanguage; setLanguage: (language: AdminLanguage) => void; t: (key: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function SuperAdminLanguageProvider({ initialLanguage, children }: { initialLanguage: string; children: ReactNode }) {
  const [language, setLanguageState] = useState<AdminLanguage>(initialLanguage === "gu" || initialLanguage === "hi" ? initialLanguage : "en");
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  async function setLanguage(next: AdminLanguage) {
    setLanguageState(next);
    try { localStorage.setItem("lekvo_language", next); } catch {}
    try { await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferredLanguage: next }) }); } catch {}
  }
  const t = (key: string) => copy[language][key] || copy.en[key] || key;
  return <LanguageContext.Provider value={{ language: ready ? language : (initialLanguage === "gu" || initialLanguage === "hi" ? initialLanguage : "en"), setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useSuperAdminLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useSuperAdminLanguage must be used inside SuperAdminLanguageProvider");
  return context;
}

export function SuperAdminLanguageSelect() {
  const { language, setLanguage } = useSuperAdminLanguage();
  return <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#53676b" }}>
    <span>{language === "gu" ? "ભાષા" : language === "hi" ? "भाषा" : "Language"}</span>
    <select aria-label="Language / ભાષા / भाषा" value={language} onChange={event => void setLanguage(event.target.value as AdminLanguage)} style={{ border: "1px solid #dce6e8", borderRadius: 9, padding: "8px 10px", background: "#fff", color: "#123941" }}>
      <option value="en">English</option><option value="gu">ગુજરાતી</option><option value="hi">हिन्दी</option>
    </select>
  </label>;
}
