"use client";

import { type TextareaHTMLAttributes } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <textarea
        className={`px-3.5 py-2.5 rounded-lg border bg-white text-sm text-foreground
          placeholder:text-muted/60 outline-none transition-colors resize-y
          focus:border-primary focus:ring-2 focus:ring-primary/10
          ${error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-line"}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
