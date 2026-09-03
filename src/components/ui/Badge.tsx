"use client";

type Variant = "primary" | "success" | "warning" | "danger" | "muted";

interface BadgeProps {
  children: string;
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-green-700",
  warning: "bg-warning/10 text-amber-700",
  danger: "bg-danger/10 text-red-700",
  muted: "bg-zinc-500/10 text-muted",
};

export function Badge({ children, variant = "muted" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}