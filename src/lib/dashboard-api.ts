import type { DashboardChartPoint } from "@/components/dashboard/chart-config";

export interface DashboardActivity {
  id: string;
  user_id: string;
  user_name: string;
  user_role?: string;
  action: string;
  action_label: string;
  description: string;
  created_at: string;
}

export interface LowStockItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minimumStock: number;
}

export interface OwnerDashboardData {
  role: "Owner";
  stats: {
    salesToday: number;
    profitToday: number;
    cashToday: number;
    qrisToday: number;
    totalProducts: number;
    totalSuppliers: number;
    totalCashiers: number;
    totalDebt: number;
  };
  charts: {
    sales: DashboardChartPoint[];
    profit: DashboardChartPoint[];
    purchase: DashboardChartPoint[];
  };
  lowStock: LowStockItem[];
  activities: DashboardActivity[];
}

export interface KasirDashboardData {
  role: "Kasir";
  stats: {
    salesToday: number;
    countToday: number;
  };
  activities: DashboardActivity[];
}

export function formatActivityAction(action: string): string {
  switch (action) {
    case "login":
      return "Login";
    case "logout":
      return "Logout";
    case "productAdd":
      return "Menambah produk baru";
    case "productEdit":
      return "Mengubah data produk";
    case "productDeactivate":
      return "Menonaktifkan produk";
    case "supplierAdd":
      return "Menambah supplier baru";
    case "purchase":
    case "purchaseCreate":
      return "Mencatat pembelian";
    case "purchaseUpdate":
      return "Mengubah pembelian";
    case "purchaseDelete":
      return "Menghapus pembelian";
    case "sale":
    case "saleCreate":
      return "Menyelesaikan transaksi";
    case "qrisConfirm":
      return "Mengonfirmasi QRIS";
    case "debtAdd":
      return "Mencatat hutang";
    case "debtPayment":
      return "Menerima pembayaran hutang";
    case "stockAdjustment":
      return "Menyesuaikan stok";
    case "cashierAdd":
    case "kasirCreate":
      return "Menambah kasir";
    case "cashierEdit":
    case "kasirUpdate":
      return "Mengubah kasir";
    case "cashierDeactivate":
    case "kasirDeactivate":
      return "Menonaktifkan kasir";
    case "storeInfoChange":
      return "Mengubah informasi toko";
    case "profileChange":
    case "profileUpdate":
      return "Mengubah profil";
    case "saleCancel":
      return "Membatalkan transaksi";
    default:
      return action;
  }
}
