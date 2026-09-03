"use client";

import { type SelectHTMLAttributes } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

// Styling select mengikuti Input (border-line, focus ring primary, error danger).
export function Select({ label, error, className = "", children, ...props }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <select
        className={`px-3.5 py-2.5 rounded-lg border bg-white text-sm text-foreground
          outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10
          ${error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-line"}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
