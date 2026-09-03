"use client";

import { useLang } from "@/lib/i18n/LanguageContext";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white shrink-0">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3h12v3H6z" fill="currentColor" stroke="none" />
          <path d="M5 6h14l1 5H4l1-5z" />
          <path d="M4 11h16v2H4z" />
          <path d="M6 13v7h12v-7" />
          <path d="M9 16h6" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-base font-bold text-foreground">{t.appName}</p>
          <p className="text-[11px] text-muted">Point of Sale</p>
        </div>
      )}
    </div>
  );
}