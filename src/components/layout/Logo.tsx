"use client";

import { useLang } from "@/lib/i18n/LanguageContext";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();

  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-kassmart.svg"
        alt="Logo KasSmart"
        className="w-9 h-9 shrink-0"
      />
      {!compact && (
        <div className="leading-tight">
          <p className="text-base font-bold text-foreground">{t.appName}</p>
          <p className="text-[11px] text-muted">Point of Sale</p>
        </div>
      )}
    </div>
  );
}