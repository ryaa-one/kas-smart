"use client";

import { useLang, type Lang } from "@/lib/i18n/LanguageContext";

const OPTIONS: { key: Lang; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const activeIndex = OPTIONS.findIndex((o) => o.key === lang);

  return (
    <button
      onClick={() => setLang(lang === "id" ? "en" : "id")}
      className="relative flex h-8 w-[76px] rounded-full bg-primary/10 border border-primary/20 p-1 cursor-pointer select-none"
      role="switch"
      aria-checked={lang === "en"}
      aria-label={lang === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
    >
      {/* sliding knob — proporsional terhadap segmen (50% dikurangi padding track) */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map((o) => (
        <span
          key={o.key}
          className={`relative z-10 flex flex-1 items-center justify-center text-[11px] font-semibold tracking-wide transition-colors duration-300 ${
            o.key === lang ? "text-white" : "text-primary"
          }`}
        >
          {o.label}
        </span>
      ))}
    </button>
  );
}
