// Mock data sementara untuk halaman Owner (Pembelian, Hutang, Penyesuaian Stok,
// Riwayat Penjualan, Laporan, Log Aktivitas) — field mengikuti ERD:
// PURCHASES/PURCHASE_DETAILS, DEBT_RECORDS/DEBT_PAYMENTS, STOCK_ADJUSTMENTS(_DETAILS),
// SALES_TRANSACTIONS/SALE_DETAILS, ACTIVITY_LOGS, STORE_SETTINGS.

export interface PurchaseDetail {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_purchase_price: number;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  supplier_name: string;
  user_name: string;
  purchase_date: string;
  details: PurchaseDetail[];
}

export const purchaseTotal = (p: Purchase) =>
  p.details.reduce((s, d) => s + d.quantity * d.unit_purchase_price, 0);

export const mockPurchases: Purchase[] = [
  {
    id: "PO-001",
    supplier_id: "SUP-01",
    supplier_name: "CV Sumber Rejeki",
    user_name: "Musthofa Arya",
    purchase_date: "2026-08-28",
    details: [
      { product_id: "P-001", product_name: "Beras Premium 5kg", quantity: 50, unit_purchase_price: 62000 },
      { product_id: "P-009", product_name: "Beras Medium 5kg", quantity: 30, unit_purchase_price: 56000 },
    ],
  },
  {
    id: "PO-002",
    supplier_id: "SUP-02",
    supplier_name: "PT Grosir Makmur",
    user_name: "Musthofa Arya",
    purchase_date: "2026-08-30",
    details: [
      { product_id: "P-002", product_name: "Minyak Goreng 1L", quantity: 48, unit_purchase_price: 15500 },
      { product_id: "P-003", product_name: "Gula Pasir 1kg", quantity: 60, unit_purchase_price: 13000 },
    ],
  },
  {
    id: "PO-003",
    supplier_id: "SUP-03",
    supplier_name: "UD Berkah Amanah",
    user_name: "Musthofa Arya",
    purchase_date: "2026-09-01",
    details: [
      { product_id: "P-004", product_name: "Telur Ayam 1kg", quantity: 20, unit_purchase_price: 24000 },
    ],
  },
];

// ===== DEBT_RECORDS =====
export type DebtStatus = "Unpaid" | "Partial" | "Paid";

export interface DebtPayment {
  id: string;
  payment_date: string;
  amount: number;
  user_name: string;
  note: string;
}

export interface DebtRecord {
  id: string;
  sale_id: string;
  customer_id: string;
  customer_name: string;
  total_debt: number;
  remaining_debt: number;
  status: DebtStatus;
  created_at: string;
  payments: DebtPayment[];
}

export const mockDebts: DebtRecord[] = [
  {
    id: "DR-001",
    sale_id: "INV/20260829/007",
    customer_id: "C-001",
    customer_name: "Ibu Sari",
    total_debt: 148000,
    remaining_debt: 98000,
    status: "Partial",
    created_at: "2026-08-29",
    payments: [
      { id: "DP-001", payment_date: "2026-08-31", amount: 50000, user_name: "Musthofa Arya", note: "Bayar sebagian" },
    ],
  },
  {
    id: "DR-002",
    sale_id: "INV/20260830/011",
    customer_id: "C-002",
    customer_name: "Pak Budi Santoso",
    total_debt: 62000,
    remaining_debt: 62000,
    status: "Unpaid",
    created_at: "2026-08-30",
    payments: [],
  },
  {
    id: "DR-003",
    sale_id: "INV/20260825/005",
    customer_id: "C-003",
    customer_name: "Bu Ratna",
    total_debt: 86000,
    remaining_debt: 0,
    status: "Paid",
    created_at: "2026-08-25",
    payments: [
      { id: "DP-002", payment_date: "2026-08-27", amount: 40000, user_name: "Musthofa Arya", note: "" },
      { id: "DP-003", payment_date: "2026-08-28", amount: 46000, user_name: "Musthofa Arya", note: "Lunas" },
    ],
  },
];

// ===== STOCK_ADJUSTMENTS =====
export type AdjustmentReason = "stok_rusak" | "stok_hilang" | "stok_opname" | "lainnya";

export interface StockAdjustmentDetail {
  product_id: string;
  product_name: string;
  quantity_change: number; // selisih perubahan, bukan stok akhir (catatan PRD)
}

export interface StockAdjustment {
  id: string;
  user_name: string;
  adjustment_date: string;
  reason: AdjustmentReason;
  details: StockAdjustmentDetail[];
}

export const mockAdjustments: StockAdjustment[] = [
  {
    id: "SA-001",
    user_name: "Musthofa Arya",
    adjustment_date: "2026-08-27",
    reason: "stok_opname",
    details: [
      { product_id: "P-003", product_name: "Gula Pasir 1kg", quantity_change: -3 },
      { product_id: "P-007", product_name: "Mie Instan", quantity_change: 5 },
    ],
  },
  {
    id: "SA-002",
    user_name: "Musthofa Arya",
    adjustment_date: "2026-08-29",
    reason: "stok_rusak",
    details: [
      { product_id: "P-005", product_name: "Kopi Sachet", quantity_change: -6 },
    ],
  },
  {
    id: "SA-003",
    user_name: "Musthofa Arya",
    adjustment_date: "2026-09-01",
    reason: "stok_hilang",
    details: [
      { product_id: "P-008", product_name: "Air Mineral 600ml", quantity_change: -2 },
    ],
  },
];

// ===== SALES_TRANSACTIONS =====
export type SaleStatus = "draft" | "waiting_payment" | "paid" | "debt" | "cancelled";
export type PaymentMethod = "cash" | "qris" | "debt";

export interface SaleDetail {
  product_name: string;
  quantity: number;
  unit_selling_price: number;
}

export interface Sale {
  id: string;
  invoice_number: string;
  transaction_date: string;
  cashier_name: string;
  customer_name: string | null; // nullable: transaksi tunai/QRIS tanpa pelanggan
  payment_method: PaymentMethod;
  status: SaleStatus;
  total: number;
  details: SaleDetail[];
}

export const mockSales: Sale[] = [
  {
    id: "S-001", invoice_number: "INV/20260901/014", transaction_date: "2026-09-01T09:12:00",
    cashier_name: "Musthofa Arya", customer_name: null, payment_method: "cash", status: "paid", total: 73500,
    details: [
      { product_name: "Beras Premium 5kg", quantity: 1, unit_selling_price: 72000 },
      { product_name: "Garam Dapur 250g", quantity: 1, unit_selling_price: 3000 },
    ],
  },
  {
    id: "S-002", invoice_number: "INV/20260901/015", transaction_date: "2026-09-01T10:05:00",
    cashier_name: "Dina Kasir", customer_name: null, payment_method: "qris", status: "paid", total: 37000,
    details: [
      { product_name: "Minyak Goreng 1L", quantity: 2, unit_selling_price: 18500 },
    ],
  },
  {
    id: "S-003", invoice_number: "INV/20260901/016", transaction_date: "2026-09-01T13:40:00",
    cashier_name: "Dina Kasir", customer_name: "Ibu Sari", payment_method: "debt", status: "debt", total: 148000,
    details: [
      { product_name: "Beras Medium 5kg", quantity: 1, unit_selling_price: 65000 },
      { product_name: "Telur Ayam 1kg", quantity: 2, unit_selling_price: 28000 },
      { product_name: "Gula Pasir 1kg", quantity: 2, unit_selling_price: 15500 },
    ],
  },
  {
    id: "S-004", invoice_number: "INV/20260831/012", transaction_date: "2026-08-31T16:22:00",
    cashier_name: "Musthofa Arya", customer_name: null, payment_method: "cash", status: "paid", total: 24800,
    details: [
      { product_name: "Kopi Sachet", quantity: 4, unit_selling_price: 2000 },
      { product_name: "Mie Instan", quantity: 3, unit_selling_price: 3500 },
      { product_name: "Air Mineral 600ml", quantity: 3, unit_selling_price: 4000 },
    ],
  },
  {
    id: "S-005", invoice_number: "INV/20260830/011", transaction_date: "2026-08-30T11:30:00",
    cashier_name: "Dina Kasir", customer_name: "Pak Budi Santoso", payment_method: "debt", status: "debt", total: 62000,
    details: [{ product_name: "Beras Premium 5kg", quantity: 1, unit_selling_price: 62000 }],
  },
  {
    id: "S-006", invoice_number: "INV/20260829/009", transaction_date: "2026-08-29T14:47:00",
    cashier_name: "Musthofa Arya", customer_name: null, payment_method: "qris", status: "waiting_payment", total: 18500,
    details: [{ product_name: "Minyak Goreng 1L", quantity: 1, unit_selling_price: 18500 }],
  },
  {
    id: "S-007", invoice_number: "INV/20260829/010", transaction_date: "2026-08-29T15:02:00",
    cashier_name: "Musthofa Arya", customer_name: null, payment_method: "cash", status: "cancelled", total: 12000,
    details: [{ product_name: "Tepung Terigu 1kg", quantity: 1, unit_selling_price: 13000 }],
  },
];

// ===== ACTIVITY_LOGS =====
export type ActivityAction =
  | "login" | "logout" | "productAdd" | "productEdit" | "productDeactivate"
  | "supplierAdd" | "purchase" | "sale" | "qrisConfirm" | "debtAdd"
  | "debtPayment" | "stockAdjustment" | "cashierAdd" | "cashierEdit"
  | "cashierDeactivate" | "storeInfoChange" | "profileChange";

export interface ActivityLog {
  id: string;
  user_name: string;
  action: ActivityAction;
  description: string;
  created_at: string;
}

export const mockActivityLogs: ActivityLog[] = [
  { id: "LOG-015", user_name: "Musthofa Arya", action: "stockAdjustment", description: "Penyesuaian stok Air Mineral 600ml (-2)", created_at: "2026-09-01T15:10:00" },
  { id: "LOG-014", user_name: "Musthofa Arya", action: "purchase", description: "Pembelian PO-003 dari UD Berkah Amanah", created_at: "2026-09-01T10:20:00" },
  { id: "LOG-013", user_name: "Dina Kasir", action: "sale", description: "Transaksi INV/20260901/016 (Hutang - Ibu Sari)", created_at: "2026-09-01T13:40:00" },
  { id: "LOG-012", user_name: "Dina Kasir", action: "qrisConfirm", description: "Konfirmasi QRIS INV/20260901/015", created_at: "2026-09-01T10:08:00" },
  { id: "LOG-011", user_name: "Musthofa Arya", action: "productEdit", description: "Ubah produk Sabun Mandi Batang (nonaktif)", created_at: "2026-08-31T17:00:00" },
  { id: "LOG-010", user_name: "Musthofa Arya", action: "debtPayment", description: "Pembayaran hutang DR-001 Rp 50.000", created_at: "2026-08-31T14:25:00" },
  { id: "LOG-009", user_name: "Musthofa Arya", action: "storeInfoChange", description: "Ubah footer struk toko", created_at: "2026-08-31T09:15:00" },
  { id: "LOG-008", user_name: "Dina Kasir", action: "login", description: "Login ke sistem", created_at: "2026-08-31T07:55:00" },
  { id: "LOG-007", user_name: "Musthofa Arya", action: "supplierAdd", description: "Tambah supplier UD Berkah Amanah", created_at: "2026-08-30T16:40:00" },
  { id: "LOG-006", user_name: "Musthofa Arya", action: "profileChange", description: "Ubah nomor telepon sendiri", created_at: "2026-08-30T11:05:00" },
  { id: "LOG-005", user_name: "Musthofa Arya", action: "cashierAdd", description: "Tambah akun kasir Dina", created_at: "2026-08-29T09:30:00" },
  { id: "LOG-004", user_name: "Musthofa Arya", action: "debtAdd", description: "Hutang baru INV/20260830/011 (Pak Budi)", created_at: "2026-08-30T11:32:00" },
  { id: "LOG-003", user_name: "Dina Kasir", action: "sale", description: "Transaksi INV/20260831/012 (Tunai)", created_at: "2026-08-31T16:22:00" },
  { id: "LOG-002", user_name: "Musthofa Arya", action: "logout", description: "Logout dari sistem", created_at: "2026-08-29T21:00:00" },
  { id: "LOG-001", user_name: "Musthofa Arya", action: "productAdd", description: "Tambah produk Beras Premium 5kg", created_at: "2026-08-28T08:12:00" },
];

// ===== STORE_SETTINGS =====
export interface StoreSettings {
  store_name: string;
  logo: string;
  address: string;
  phone: string;
  receipt_info: string;
  qris_image: string;
}

export const mockStoreSettings: StoreSettings = {
  store_name: "Toko Sembako Berkah",
  logo: "",
  address: "Jl. Raya Merdeka No. 45, Jakarta Timur",
  phone: "021-8765-4321",
  receipt_info: "Terima kasih telah berbelanja. Barang yang sudah dibeli tidak dapat dikembalikan.",
  qris_image: "",
};
