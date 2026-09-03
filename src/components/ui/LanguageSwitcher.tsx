"use client";

import { useLang, type Lang } from "@/lib/i18n/LanguageContext";

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  const toggle = () => {
    const next: Lang = lang === "id" ? "en" : "id";
    setLang(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        border border-line text-muted hover:border-primary hover:text-primary
        transition-colors cursor-pointer"
      aria-label={lang === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
    >
      {lang === "id" ? (
        <>
          <span className="w-4 h-3 flex items-center justify-center overflow-hidden rounded-[2px] bg-red-600 text-[7px] font-bold text-white leading-none pt-0.5">
            ID
          </span>
          <span>EN</span>
        </>
      ) : (
        <>
          <span className="w-4 h-3 flex items-center justify-center overflow-hidden rounded-[2px] bg-blue-800 text-[7px] font-bold text-white leading-none pt-0.5">
            EN
          </span>
          <span>ID</span>
        </>
      )}
    </button>
  );
}