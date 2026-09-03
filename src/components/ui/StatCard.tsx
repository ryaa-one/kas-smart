"use client";

import { type ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  bgColor?: string;
  iconColor?: string;
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  bgColor = "bg-primary/10",
  iconColor = "text-primary",
}: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-line p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0 ${iconColor}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">{label}</p>
        <p className="text-lg sm:text-xl font-bold text-foreground truncate">
          {typeof value === "number" ? value.toLocaleString("id-ID") : value}
        </p>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium mt-0.5 ${
              trend.positive ? "text-success" : "text-danger"
            }`}
          >
            <svg
              className={`w-3 h-3 ${trend.positive ? "" : "rotate-180"}`}
              viewBox="0 0 12 12"
              fill="none"
            >
              <path d="M6 2L10 6H2L6 2Z" fill="currentColor" />
            </svg>
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}