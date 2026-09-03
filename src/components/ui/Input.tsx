"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        <input
          ref={ref}
          className={`px-3.5 py-2.5 rounded-lg border bg-white text-sm text-foreground
            placeholder:text-muted/60 outline-none transition-colors
            focus:border-primary focus:ring-2 focus:ring-primary/10
            ${error ? "border-danger focus:border-danger focus:ring-danger/20" : "border-line"}
            ${className}
          `}
          {...props}
        />
        {error && (
          <span className="text-xs text-danger">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";