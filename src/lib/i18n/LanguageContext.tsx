"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Lang, Dictionary } from "./translations";
import { translations } from "./translations";

export type { Lang } from "./translations";

type LangContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
};

const LangContext = createContext<LangContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t: Dictionary = translations[lang];

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}