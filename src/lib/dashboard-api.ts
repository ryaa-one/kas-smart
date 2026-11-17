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

const ACTIVITY_ACTION_LABELS: Record<string, { id: string; en: string }> = {
  login: { id: "Login", en: "Login" },
  logout: { id: "Logout", en: "Logout" },
  loginFailed: { id: "Gagal login", en: "Failed login" },
  productAdd: { id: "Menambah produk baru", en: "Added a product" },
  productEdit: { id: "Mengubah data produk", en: "Updated a product" },
  productDeactivate: { id: "Menonaktifkan produk", en: "Deactivated a product" },
  productDelete: { id: "Menghapus produk", en: "Deleted a product" },
  categoryAdd: { id: "Menambah kategori", en: "Added a category" },
  categoryCreate: { id: "Menambah kategori", en: "Added a category" },
  categoryEdit: { id: "Mengubah kategori", en: "Updated a category" },
  categoryUpdate: { id: "Mengubah kategori", en: "Updated a category" },
  categoryDelete: { id: "Menghapus kategori", en: "Deleted a category" },
  supplierAdd: { id: "Menambah supplier baru", en: "Added a supplier" },
  supplierCreate: { id: "Menambah supplier baru", en: "Added a supplier" },
  supplierUpdate: { id: "Mengubah supplier", en: "Updated a supplier" },
  supplierDelete: { id: "Menghapus supplier", en: "Deleted a supplier" },
  customerAdd: { id: "Menambah pelanggan", en: "Added a customer" },
  customerCreate: { id: "Menambah pelanggan", en: "Added a customer" },
  customerUpdate: { id: "Mengubah pelanggan", en: "Updated a customer" },
  customerEdit: { id: "Mengubah pelanggan", en: "Updated a customer" },
  customerDelete: { id: "Menghapus pelanggan", en: "Deleted a customer" },
  purchase: { id: "Mencatat pembelian", en: "Recorded a purchase" },
  purchaseCreate: { id: "Mencatat pembelian", en: "Recorded a purchase" },
  purchaseUpdate: { id: "Mengubah pembelian", en: "Updated a purchase" },
  purchaseDelete: { id: "Menghapus pembelian", en: "Deleted a purchase" },
  sale: { id: "Menyelesaikan transaksi", en: "Completed a sale" },
  saleCreate: { id: "Menyelesaikan transaksi", en: "Completed a sale" },
  saleCancel: { id: "Membatalkan transaksi", en: "Cancelled a sale" },
  qrisConfirm: { id: "Mengonfirmasi QRIS", en: "Confirmed QRIS payment" },
  debtAdd: { id: "Mencatat hutang", en: "Recorded customer debt" },
  debtEdit: { id: "Mengubah data hutang", en: "Updated a debt record" },
  debtDelete: { id: "Menghapus data hutang", en: "Deleted a debt record" },
  debtPayment: { id: "Menerima pembayaran hutang", en: "Recorded a debt payment" },
  stockAdjustment: { id: "Menyesuaikan stok", en: "Adjusted stock" },
  cashierAdd: { id: "Menambah kasir", en: "Added a cashier" },
  kasirCreate: { id: "Menambah kasir", en: "Added a cashier" },
  cashierEdit: { id: "Mengubah kasir", en: "Updated a cashier" },
  kasirUpdate: { id: "Mengubah kasir", en: "Updated a cashier" },
  cashierDeactivate: { id: "Menonaktifkan kasir", en: "Deactivated a cashier" },
  kasirDeactivate: { id: "Menonaktifkan kasir", en: "Deactivated a cashier" },
  cashierActivate: { id: "Mengaktifkan kasir", en: "Reactivated a cashier" },
  storeInfoChange: { id: "Mengubah informasi toko", en: "Updated store information" },
  profileChange: { id: "Mengubah profil", en: "Updated profile" },
  profileUpdate: { id: "Mengubah profil", en: "Updated profile" },
};

export function formatActivityAction(action: string, lang: "id" | "en" = "id"): string {
  const entry = ACTIVITY_ACTION_LABELS[action];
  if (!entry) return action;
  return lang === "en" ? entry.en : entry.id;
}
