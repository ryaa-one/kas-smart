"use client";

import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = "", padding = true }: CardProps) {
  return (
    <div
      className={`bg-card rounded-xl border border-line shadow-sm ${
        padding ? "p-4 sm:p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}