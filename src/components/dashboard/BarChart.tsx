"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  ResponsiveContainer,
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { DashboardChartPoint } from "./chart-config";

interface BarChartProps {
  data: DashboardChartPoint[];
  color?: string;
  height?: number;
  unit?: string;
  animationDuration?: number;
}

const TAILWIND_COLOR_MAP: Record<string, string> = {
  "bg-primary": "#0f766e",
  "bg-success": "#16a34a",
  "bg-amber-500": "#f59e0b",
  "bg-warning": "#d97706",
  "bg-blue-600": "#2563eb",
  "bg-rose-600": "#e11d48",
};

function resolveColor(color: string): string {
  if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl")) {
    return color;
  }
  return TAILWIND_COLOR_MAP[color] ?? "#0f766e";
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: DashboardChartPoint & { formattedAmount?: string };
  }>;
  unit?: string;
}

function CustomTooltip({ active, payload, unit = "jt" }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const dataPoint = item.payload;
    const val = typeof item.value === "number" ? item.value : 0;

    return (
      <div className="rounded-lg border border-line bg-white px-2.5 py-1.5 shadow-sm text-xs pointer-events-none">
        <p className="font-semibold text-foreground">{dataPoint?.day || dataPoint?.label}</p>
        <p className="text-muted text-[11px] tabular-nums mt-0.5">
          {val > 0 ? `${val.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ${unit}` : "0"}
        </p>
      </div>
    );
  }
  return null;
}

const emptySubscribe = () => () => {};

export function BarChart({
  data,
  color = "bg-primary",
  height = 160,
  unit = "jt",
  animationDuration = 800,
}: BarChartProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const fillColor = resolveColor(color);

  // Normalisasi data agar kompatibel baik saat menerima day maupun label
  const formattedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((d, index) => ({
      ...d,
      day: d.day || d.label || `H${index + 1}`,
      value: typeof d.value === "number" ? d.value : 0,
    }));
  }, [data]);

  // Hindari masalah SSR hydration pada ResponsiveContainer
  if (!isMounted) {
    return (
      <div
        className="w-full flex items-end justify-between px-2 bg-transparent"
        style={{ height }}
        aria-hidden="true"
      />
    );
  }

  const maxValue = Math.max(...formattedData.map((d) => d.value), 0);
  const domainMax = maxValue > 0 ? maxValue * 1.15 : 1;

  return (
    <div className="w-full select-none" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBar
          data={formattedData}
          margin={{ top: 12, right: 6, left: 6, bottom: 0 }}
        >
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
            dy={4}
          />
          <YAxis hide domain={[0, domainMax]} />
          <Tooltip
            content={<CustomTooltip unit={unit} />}
            cursor={{ fill: "rgba(15, 23, 42, 0.04)", radius: 4 }}
          />
          <Bar
            dataKey="value"
            fill={fillColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
            isAnimationActive={true}
            animationDuration={animationDuration}
            animationEasing="ease-in-out"
          />
        </RechartsBar>
      </ResponsiveContainer>
    </div>
  );
}