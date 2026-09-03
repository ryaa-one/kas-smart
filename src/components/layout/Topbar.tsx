"use client";

import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { t } = useLang();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-line">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5">
        <button
          className="lg:hidden text-muted hover:text-foreground"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md px-3 py-2 rounded-lg border border-line bg-zinc-50">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            placeholder={t.topbar.searchPlaceholder}
            className="bg-transparent text-sm outline-none placeholder:text-muted/60 w-full"
          />
        </div>

        <div className="flex-1 sm:hidden" />

        <div className="hidden md:flex items-center gap-2 text-sm text-muted px-3 py-1.5 rounded-lg border border-line">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span id="topbar-clock" className="tabular-nums">
            {new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <LanguageSwitcher />
        </div>

        <div
          className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0"
          title={user?.name}
        >
          {(user?.name ?? "O").charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
