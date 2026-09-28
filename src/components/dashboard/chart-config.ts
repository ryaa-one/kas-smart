/**
 * Konfigurasi dan tipe data chart KasSmart.
 *
 * Dirancang decouple dari mock store sehingga siap digunakan
 * langsung saat backend API diimplementasikan.
 */

export interface DashboardChartPoint {
  day: string; // Label hari, misal "Sen", "Sel", "Rab", dll.
  value: number; // Nilai numerik untuk grafik (dalam satuan juta / IDR)
  rawAmount?: number; // Nilai riil transaksi (opsional, untuk tooltip)
  label?: string; // Kompatibilitas alias untuk 'day'
}

export interface ChartConfig {
  color: string;
  unit: string;
  height: number;
  animationDuration: number;
}

export const DASHBOARD_CHARTS_CONFIG: Record<"sales" | "profit" | "purchase", ChartConfig> = {
  sales: {
    color: "#0f766e", // KasSmart Primary (Teal)
    unit: "jt",
    height: 160,
    animationDuration: 800,
  },
  profit: {
    color: "#16a34a", // KasSmart Success (Green)
    unit: "jt",
    height: 160,
    animationDuration: 800,
  },
  purchase: {
    color: "#f59e0b", // KasSmart Warning/Amber
    unit: "jt",
    height: 160,
    animationDuration: 800,
  },
};
