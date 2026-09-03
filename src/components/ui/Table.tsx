"use client";

import { type ReactNode } from "react";

interface TableProps {
  head: ReactNode;
  children: ReactNode;
  empty?: string;
}

// Tabel bergaya Card: header zinc-50, baris hover, teks truncation di sel.
// Bungkus Card padding=false lalu px-4 sm:px-5 di dalamnya agar scroll-x mulus.
export function Table({ head, children, empty }: TableProps) {
  return (
    <>
      <div className="overflow-x-auto -mx-4 sm:-mx-5">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-line">
              {head}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>
      {empty && <p className="text-center text-sm text-muted py-10">{empty}</p>}
    </>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 sm:px-5 py-3 font-semibold whitespace-nowrap ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 sm:px-5 py-3 align-middle ${className}`}>{children}</td>;
}
