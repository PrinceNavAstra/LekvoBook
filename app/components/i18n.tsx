"use client";
import { createContext, useContext, useEffect, useMemo } from "react";
import { setFormatLocale } from "@/lib/format";
import { translate, type Language } from "@/lib/i18n";

type Translate = (key: string, vars?: Record<string, string | number>) => string;
const Ctx = createContext<{ language: Language; t: Translate }>({ language: "en", t: (key, vars) => translate("en", key, vars) });

/** Makes the signed-in user's saved language available to every screen. */
export function LanguageProvider({ language, children }: { language: Language; children: React.ReactNode }) {
  const value = useMemo(() => ({ language, t: ((key, vars) => translate(language, key, vars)) as Translate }), [language]);
  useEffect(() => {
    setFormatLocale(language);
    document.documentElement.lang = language;
  }, [language]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx).t;
export const useLanguage = () => useContext(Ctx).language;
