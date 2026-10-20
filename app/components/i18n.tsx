"use client";
import { createContext, useContext, useEffect, useMemo } from "react";
import { setFormatLocale } from "@/lib/format";
import { setCurrentLanguage, translate, translatePattern, type Language } from "@/lib/i18n";

type Translate = (key: string, vars?: Record<string, string | number>) => string;
const Ctx = createContext<{ language: Language; t: Translate }>({ language: "en", t: (key, vars) => translate("en", key, vars) });

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "NOSCRIPT"]);

/**
 * Translates everything on screen into the chosen language: every text node and the placeholder / title /
 * aria-label attributes whose exact English text is in the dictionaries. Re-runs as React updates the page.
 * Names, amounts and other data are never in the dictionaries, so they are left alone.
 */
function useScreenTranslation(language: Language) {
  useEffect(() => {
    const textApplied = new WeakMap<Node, { original: string; shown: string }>();
    const attrApplied = new WeakMap<Element, Record<string, { original: string; shown: string }>>();
    let frame = 0;
    let observer: MutationObserver | null = null;

    const swap = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return value;
      let out = translate(language, trimmed);
      if (out === trimmed) out = translatePattern(language, trimmed);
      return out === trimmed ? value : value.replace(trimmed, () => out);
    };

    function text(node: Text) {
      const rec = textApplied.get(node);
      // If React wrote new text, what is there now is the new English original.
      const original = rec && node.nodeValue === rec.shown ? rec.original : node.nodeValue ?? "";
      const shown = language === "en" ? original : swap(original);
      if (shown !== node.nodeValue) node.nodeValue = shown;
      textApplied.set(node, { original, shown });
    }

    function attrs(el: Element) {
      const rec = attrApplied.get(el) ?? {};
      for (const name of ATTRS) {
        const current = el.getAttribute(name);
        if (current === null) continue;
        const prev = rec[name];
        const original = prev && current === prev.shown ? prev.original : current;
        const shown = language === "en" ? original : swap(original);
        if (shown !== current) el.setAttribute(name, shown);
        rec[name] = { original, shown };
      }
      attrApplied.set(el, rec);
    }

    function run(root: Node) {
      if (root.nodeType === Node.TEXT_NODE) {
        if (root.parentElement && !SKIP.has(root.parentElement.tagName)) text(root as Text);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let n: Node | null = walker.currentNode;
      while (n) {
        if (n.nodeType === Node.TEXT_NODE) {
          if (n.parentElement && !SKIP.has(n.parentElement.tagName) && !n.parentElement.closest("[data-notranslate]")) text(n as Text);
        } else if (n.nodeType === Node.ELEMENT_NODE) attrs(n as Element);
        n = walker.nextNode();
      }
    }

    const pending = new Set<Node>();
    function flush() {
      frame = 0;
      observer?.disconnect();
      pending.forEach((node) => { if (node.isConnected) run(node); });
      pending.clear();
      observe();
    }
    function queue(node: Node) {
      pending.add(node);
      if (!frame) frame = requestAnimationFrame(flush);
    }
    function observe() {
      observer?.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    }

    observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "childList") r.addedNodes.forEach(queue);
        else queue(r.target);
      }
    });
    run(document.body);
    observe();
    return () => {
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      // Put the English originals back so the next language starts from a clean page.
      const restore = (root: Node) => {
        const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let n: Node | null = w.currentNode;
        while (n) {
          if (n.nodeType === Node.TEXT_NODE) {
            const rec = textApplied.get(n);
            if (rec && n.nodeValue === rec.shown) n.nodeValue = rec.original;
          } else if (n.nodeType === Node.ELEMENT_NODE) {
            const rec = attrApplied.get(n as Element);
            if (rec) for (const [name, v] of Object.entries(rec)) if ((n as Element).getAttribute(name) === v.shown) (n as Element).setAttribute(name, v.original);
          }
          n = w.nextNode();
        }
      };
      restore(document.body);
    };
  }, [language]);
}

/** Makes the chosen language apply to every screen, including text that is not wrapped in t(). */
export function LanguageProvider({ language, children }: { language: Language; children: React.ReactNode }) {
  setCurrentLanguage(language);
  const value = useMemo(() => ({ language, t: ((key, vars) => translate(language, key, vars)) as Translate }), [language]);
  useEffect(() => {
    setFormatLocale(language);
    document.documentElement.lang = language;
  }, [language]);
  useScreenTranslation(language);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx).t;
export const useLanguage = () => useContext(Ctx).language;
