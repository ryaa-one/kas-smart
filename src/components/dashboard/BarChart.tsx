"use client";

import { useLang } from "@/lib/i18n/LanguageContext";
import type { ChartPoint } from "@/lib/mock/dashboard";

interface BarChartProps {
  data: ChartPoint[];
  color?: string;
  height?: number;
}

export function BarChart({
  data,
  color = "bg-primary",
  height = 160,
}: BarChartProps) {
  const { t } = useLang();
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5 sm:gap-2 overflow-visible" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1 h-full justify-end overflow-visible"
        >
          <div className="relative w-full max-w-[28px] lg:max-w-[34px] flex justify-center overflow-visible">
            <div
              className={`w-full rounded-t-sm ${color} transition-all`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? "4px" : "0px", opacity: d.value > 0 ? 1 : 0.06 }}
            />
            <span className="absolute -top-3.5 text-[9px] text-muted tabular-nums leading-none whitespace-nowrap">
              {d.value > 0 ? `${Math.round(d.value)}jt` : ""}
            </span>
          </div>
          <span className="text-[9px] text-muted mt-auto">
            {t.dashboard.weekDays[i]}
          </span>
        </div>
      ))}
    </div>
  );
}