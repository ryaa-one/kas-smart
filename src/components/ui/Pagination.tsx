"use client";

import { useLang } from "@/lib/i18n/LanguageContext";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className = "",
}: PaginationProps) {
  const { t } = useLang();

  if (totalItems <= 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t border-line text-sm ${className}`}
    >
      {/* Kiri: info range dan opsi data per page */}
      <div className="flex flex-wrap items-center gap-3 text-muted text-xs sm:text-sm">
        <span>
          {t.common.showing} <strong className="text-foreground font-semibold">{from}–{to}</strong> {t.common.of}{" "}
          <strong className="text-foreground font-semibold">{totalItems}</strong> {t.common.data}
        </span>

        {onPageSizeChange && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-muted/60">•</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              aria-label={t.common.perPage}
              className="px-2 py-1 rounded-md border border-line bg-white text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / {t.common.page.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Kanan: Navigasi tombol halaman */}
      <div className="flex items-center gap-1">
        {/* Tombol Previous */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label={t.common.prev}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line bg-white text-xs font-medium text-foreground hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="hidden sm:inline">{t.common.prev}</span>
        </button>

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-muted select-none">
                ...
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  p === currentPage
                    ? "bg-primary text-white shadow-sm font-semibold"
                    : "border border-line bg-white text-foreground hover:bg-zinc-50 active:bg-zinc-100"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Tombol Next */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label={t.common.next}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-line bg-white text-xs font-medium text-foreground hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span className="hidden sm:inline">{t.common.next}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
