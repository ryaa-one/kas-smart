// Mock data sementara untuk frontend — akan diganti API/DB saat backend terhubung.
// Nama field mengikuti struktur ERD (SALES_TRANSACTIONS, PRODUCTS, SUPPLIERS,
// USERS, DEBT_RECORDS, ACTIVITY_LOGS).

export interface LowStockProduct {
  id: string;
  name: string;
  category: string;
  stock: number;
  minimumStock: number;
  unit: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  role: "Owner" | "Kasir";
  action: string;
  time: string;
  actorInitial: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export const mockStats = {
  salesToday: 12500000,
  profitToday: 3240000,
  totalProducts: 128,
  totalSuppliers: 14,
  totalCashiers: 4,
  totalDebt: 8750000,
};

export const mockLowStock: LowStockProduct[] = [
  { id: "P-001", name: "Beras Premium 5kg", category: "Beras", stock: 8, minimumStock: 10, unit: "pcs" },
  { id: "P-002", name: "Minyak Goreng 1L", category: "Minyak", stock: 6, minimumStock: 12, unit: "pcs" },
  { id: "P-003", name: "Gula Pasir 1kg", category: "Sembako", stock: 9, minimumStock: 15, unit: "pcs" },
  { id: "P-004", name: "Telur Ayam 1kg", category: "Sembako", stock: 4, minimumStock: 10, unit: "pcs" },
  { id: "P-005", name: "Kopi Sachet", category: "Minuman", stock: 12, minimumStock: 20, unit: "pcs" },
];

export const mockActivities: ActivityItem[] = [
  { id: "A-1", actor: "Siti", role: "Kasir", action: "sale", time: "10 menit lalu", actorInitial: "S" },
  { id: "A-2", actor: "Musthofa Arya", role: "Owner", action: "qrisConfirm", time: "32 menit lalu", actorInitial: "M" },
  { id: "A-3", actor: "Siti", role: "Kasir", action: "sale", time: "1 jam lalu", actorInitial: "S" },
  { id: "A-4", actor: "Musthofa Arya", role: "Owner", action: "productAdd", time: "2 jam lalu", actorInitial: "M" },
  { id: "A-5", actor: "Budi", role: "Kasir", action: "debtPayment", time: "3 jam lalu", actorInitial: "B" },
  { id: "A-6", actor: "Musthofa Arya", role: "Owner", action: "purchase", time: "5 jam lalu", actorInitial: "M" },
  { id: "A-7", actor: "Budi", role: "Kasir", action: "login", time: "Kemarin", actorInitial: "B" },
  { id: "A-8", actor: "Musthofa Arya", role: "Owner", action: "stockAdjustment", time: "Kemarin", actorInitial: "M" },
];

// Senin s/d Minggu (label diset dari i18n)
export const mockSalesChart: ChartPoint[] = [
  { label: "mon", value: 8.4 },
  { label: "tue", value: 9.1 },
  { label: "wed", value: 7.8 },
  { label: "thu", value: 10.2 },
  { label: "fri", value: 11.5 },
  { label: "sat", value: 12.5 },
  { label: "sun", value: 9.6 },
];

export const mockProfitChart: ChartPoint[] = [
  { label: "mon", value: 2.1 },
  { label: "tue", value: 2.4 },
  { label: "wed", value: 1.9 },
  { label: "thu", value: 2.8 },
  { label: "fri", value: 3.1 },
  { label: "sat", value: 3.24 },
  { label: "sun", value: 2.6 },
];

export const mockPurchaseChart: ChartPoint[] = [
  { label: "mon", value: 3.0 },
  { label: "tue", value: 0 },
  { label: "wed", value: 4.2 },
  { label: "thu", value: 0 },
  { label: "fri", value: 5.0 },
  { label: "sat", value: 0 },
  { label: "sun", value: 2.8 },
];
