"use client";

// ============================================================================
// Shared mock store KasSmart — SATU sumber state untuk semua halaman.
// Menggantikan master.ts / kasir.ts / owner.ts / dashboard.ts (terpisah-pisah).
// Field mengikuti ERD final (15 entitas). Persist di localStorage sehingga
// efek antar-alur (transaksi → stok → riwayat → hutang → log) terlihat nyata.
// ponytail: ganti modul ini dengan panggilan API/Prisma saat backend dibuat —
// signature fungsi sengaja menyerupai repository (getX / addX / updateX).
// ============================================================================

import { useEffect, useSyncExternalStore } from "react";
import { getUsers, type StoreUser } from "./users";

export type { StoreUser };

// ---------- Tipe (sesuai ERD) ----------
export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface Product {
  id: string;
  barcode: string | null; // NULL boleh; UNIQUE bila diisi (ERD)
  name: string;
  category_id: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  minimum_stock: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface PurchaseDetail {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_purchase_price: number; // harga historis (ERD)
}
export interface Purchase {
  id: string;
  supplier_id: string | null; // nullable — pembelian tanpa supplier (ERD)
  user_id: string;
  user_name: string;
  purchase_date: string;
  details: PurchaseDetail[];
}

export type SaleStatus =
  | "draft"
  | "waiting_payment"
  | "paid"
  | "debt"
  | "cancelled";
export type PaymentMethod = "cash" | "qris" | "debt";

export interface SaleDetail {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_selling_price: number; // harga historis (ERD)
}
export interface Sale {
  id: string;
  invoice_number: string | null; // KONTRAK-4: baru dibuat saat transaksi selesai; draft/menunggu/batal = null (UNIQUE mengabaikan NULL di DB)
  user_id: string; // pencatat wajib (ERD user_id NOT NULL)
  user_name: string;
  customer_id: string | null; // wajib hanya utk Hutang (ERD nullable)
  customer_name: string | null;
  payment_method: PaymentMethod | null;
  status: SaleStatus;
  total: number;
  amount_paid: number | null; // jumlah dibayar (tunai: nominal diterima)
  change_amount: number | null; // kembalian (KONTRAK-1: nama sama dengan ERD)
  created_at: string; // waktu dibuat (Draft)
  transaction_date: string; // waktu transaksi berjalan (dipakai filter/riwayat)
  paid_at: string | null; // waktu dinyatakan lunas — nullable (ERD)
  details: SaleDetail[];
}

export type DebtStatus = "Unpaid" | "Partial" | "Paid";
export interface DebtPayment {
  payment_id: string; // PK (KONTRAK-2)
  debt_id: string; // FK → DEBT_RECORDS.debt_id
  payment_date: string;
  amount: number;
  user_id: string; // pencatat (DEBT_PAYMENTS.user_id)
  user_name: string;
  note: string;
}
export interface DebtRecord {
  debt_id: string; // PK (KONTRAK-2)
  sale_id: string; // KONTRAK-5: FK + UNIQUE + NOT NULL — hutang SELALU berasal dari transaksi Hutang
  customer_id: string; // customer wajib untuk hutang
  customer_name: string;
  total_debt: number;
  remaining_debt: number;
  status: DebtStatus;
  created_at: string;
  updated_at: string;
  payments: DebtPayment[];
}

export type AdjustmentReason =
  | "stok_rusak"
  | "stok_hilang"
  | "stok_opname"
  | "lainnya";
export interface StockAdjustmentDetail {
  product_id: string;
  product_name: string;
  quantity_change: number; // SELISIH, bukan stok akhir (PRD catatan 1)
}
export interface StockAdjustment {
  id: string;
  user_id: string;
  user_name: string;
  adjustment_date: string;
  reason: AdjustmentReason;
  details: StockAdjustmentDetail[];
}

export type ActivityAction =
  | "login"
  | "logout"
  | "productAdd"
  | "productEdit"
  | "productDeactivate"
  | "categoryAdd"
  | "categoryEdit"
  | "categoryDelete"
  | "supplierAdd"
  | "supplierEdit"
  | "supplierDelete"
  | "purchase"
  | "sale"
  | "saleCancel"
  | "qrisConfirm"
  | "debtAdd"
  | "debtEdit"
  | "debtDelete"
  | "debtPayment"
  | "customerAdd"
  | "stockAdjustment"
  | "cashierAdd"
  | "cashierEdit"
  | "cashierDeactivate"
  | "cashierActivate"
  | "storeInfoChange"
  | "profileChange";

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: ActivityAction;
  description: string;
  created_at: string;
}

export interface StoreSettings {
  store_name: string;
  logo: string;
  address: string;
  phone: string;
  receipt_info: string;
  qris_image: string; // QRIS statis unggahan Owner (ERD STORE_SETTINGS)
}

export interface DB {
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  customers: Customer[];
  purchases: Purchase[];
  sales: Sale[];
  debts: DebtRecord[];
  adjustments: StockAdjustment[];
  logs: ActivityLog[];
  settings: StoreSettings;
}

// ---------- Seed (sama dengan mock lama, kini jadi satu kesatuan konsisten) ----------
const SEED: DB = {
  categories: [
    { id: "CAT-01", name: "Beras" },
    { id: "CAT-02", name: "Minyak" },
    { id: "CAT-03", name: "Sembako" },
    { id: "CAT-04", name: "Minuman" },
    { id: "CAT-05", name: "Makanan" },
    { id: "CAT-06", name: "Bumbu" },
    { id: "CAT-07", name: "Kebutuhan Rumah" },
  ],
  suppliers: [
    { id: "SUP-01", name: "CV Sumber Rejeki", phone: "0812-1111-2222", address: "Jl. Pasar Baru No. 12, Jakarta" },
    { id: "SUP-02", name: "PT Grosir Makmur", phone: "0813-3333-4444", address: "Jl. Industri Raya No. 5, Bekasi" },
    { id: "SUP-03", name: "UD Berkah Amanah", phone: "0857-5555-6666", address: "Jl. Raya Bogor KM 27, Depok" },
  ],
  products: [
    { id: "P-001", barcode: "8991002100011", name: "Beras Premium 5kg", category_id: "CAT-01", purchase_price: 62000, selling_price: 72000, stock: 120, minimum_stock: 20, is_active: true },
    { id: "P-002", barcode: "8991002100028", name: "Minyak Goreng 1L", category_id: "CAT-02", purchase_price: 15500, selling_price: 18500, stock: 85, minimum_stock: 15, is_active: true },
    { id: "P-003", barcode: "8991002100035", name: "Gula Pasir 1kg", category_id: "CAT-03", purchase_price: 13000, selling_price: 15500, stock: 96, minimum_stock: 20, is_active: true },
    { id: "P-004", barcode: "8991002100042", name: "Telur Ayam 1kg", category_id: "CAT-03", purchase_price: 24000, selling_price: 28000, stock: 12, minimum_stock: 20, is_active: true },
    { id: "P-005", barcode: "8991002100059", name: "Kopi Sachet", category_id: "CAT-04", purchase_price: 1500, selling_price: 2000, stock: 240, minimum_stock: 50, is_active: true },
    { id: "P-006", barcode: "8991002100066", name: "Tepung Terigu 1kg", category_id: "CAT-03", purchase_price: 11000, selling_price: 13000, stock: 60, minimum_stock: 15, is_active: true },
    { id: "P-007", barcode: "8991002100073", name: "Mie Instan", category_id: "CAT-05", purchase_price: 2800, selling_price: 3500, stock: 180, minimum_stock: 40, is_active: true },
    { id: "P-008", barcode: "8991002100080", name: "Air Mineral 600ml", category_id: "CAT-04", purchase_price: 3000, selling_price: 4000, stock: 150, minimum_stock: 30, is_active: true },
    { id: "P-009", barcode: "8991002100097", name: "Beras Medium 5kg", category_id: "CAT-01", purchase_price: 56000, selling_price: 65000, stock: 80, minimum_stock: 20, is_active: true },
    { id: "P-010", barcode: "8991002100103", name: "Garam Dapur 250g", category_id: "CAT-06", purchase_price: 2200, selling_price: 3000, stock: 110, minimum_stock: 25, is_active: true },
    { id: "P-011", barcode: "8991002100110", name: "Kecap Manis 520ml", category_id: "CAT-06", purchase_price: 20000, selling_price: 24000, stock: 45, minimum_stock: 10, is_active: true },
    { id: "P-012", barcode: "8991002100127", name: "Sabun Mandi Batang", category_id: "CAT-07", purchase_price: 4200, selling_price: 5500, stock: 90, minimum_stock: 20, is_active: false },
  ],
  customers: [
    { id: "C-001", name: "Ibu Sari", phone: "0812-3456-7890", address: "Jl. Melati No. 3" },
    { id: "C-002", name: "Pak Budi Santoso", phone: "0813-9876-5432", address: "Jl. Kenanga No. 7" },
    { id: "C-003", name: "Bu Ratna", phone: "0857-1122-3344", address: "Jl. Anggrek No. 15" },
  ],
  purchases: [
    {
      id: "PO-001", supplier_id: "SUP-01", user_id: "U-001", user_name: "Musthofa Arya", purchase_date: "2026-08-28",
      details: [
        { product_id: "P-001", product_name: "Beras Premium 5kg", quantity: 50, unit_purchase_price: 62000 },
        { product_id: "P-009", product_name: "Beras Medium 5kg", quantity: 30, unit_purchase_price: 56000 },
      ],
    },
    {
      id: "PO-002", supplier_id: "SUP-02", user_id: "U-001", user_name: "Musthofa Arya", purchase_date: "2026-08-30",
      details: [
        { product_id: "P-002", product_name: "Minyak Goreng 1L", quantity: 48, unit_purchase_price: 15500 },
        { product_id: "P-003", product_name: "Gula Pasir 1kg", quantity: 60, unit_purchase_price: 13000 },
      ],
    },
    {
      id: "PO-003", supplier_id: "SUP-03", user_id: "U-001", user_name: "Musthofa Arya", purchase_date: "2026-09-01",
      details: [
        { product_id: "P-004", product_name: "Telur Ayam 1kg", quantity: 20, unit_purchase_price: 24000 },
      ],
    },
  ],
  sales: [
    {
      id: "S-001", invoice_number: "INV/20260901/014", user_id: "U-001", user_name: "Musthofa Arya",
      customer_id: null, customer_name: null, payment_method: "cash", status: "paid", total: 73500,
      amount_paid: 80000, change_amount: 6500,
      created_at: "2026-09-01T09:10:00", transaction_date: "2026-09-01T09:12:00", paid_at: "2026-09-01T09:12:00",
      details: [
        { product_id: "P-001", product_name: "Beras Premium 5kg", quantity: 1, unit_selling_price: 72000 },
        { product_id: "P-010", product_name: "Garam Dapur 250g", quantity: 1, unit_selling_price: 3000 },
      ],
    },
    {
      id: "S-002", invoice_number: "INV/20260901/015", user_id: "U-002", user_name: "Dina Kasir",
      customer_id: null, customer_name: null, payment_method: "qris", status: "paid", total: 37000,
      amount_paid: 37000, change_amount: 0,
      created_at: "2026-09-01T10:03:00", transaction_date: "2026-09-01T10:05:00", paid_at: "2026-09-01T10:05:00",
      details: [
        { product_id: "P-002", product_name: "Minyak Goreng 1L", quantity: 2, unit_selling_price: 18500 },
      ],
    },
    {
      id: "S-003", invoice_number: "INV/20260901/016", user_id: "U-002", user_name: "Dina Kasir",
      customer_id: "C-001", customer_name: "Ibu Sari", payment_method: "debt", status: "debt", total: 148000,
      amount_paid: null, change_amount: null,
      created_at: "2026-09-01T13:38:00", transaction_date: "2026-09-01T13:40:00", paid_at: null,
      details: [
        { product_id: "P-009", product_name: "Beras Medium 5kg", quantity: 1, unit_selling_price: 65000 },
        { product_id: "P-004", product_name: "Telur Ayam 1kg", quantity: 2, unit_selling_price: 28000 },
        { product_id: "P-003", product_name: "Gula Pasir 1kg", quantity: 2, unit_selling_price: 15500 },
      ],
    },
    {
      id: "S-004", invoice_number: "INV/20260831/012", user_id: "U-002", user_name: "Dina Kasir",
      customer_id: null, customer_name: null, payment_method: "cash", status: "paid", total: 24800,
      amount_paid: 30000, change_amount: 5200,
      created_at: "2026-08-31T16:20:00", transaction_date: "2026-08-31T16:22:00", paid_at: "2026-08-31T16:22:00",
      details: [
        { product_id: "P-005", product_name: "Kopi Sachet", quantity: 4, unit_selling_price: 2000 },
        { product_id: "P-007", product_name: "Mie Instan", quantity: 3, unit_selling_price: 3500 },
        { product_id: "P-008", product_name: "Air Mineral 600ml", quantity: 3, unit_selling_price: 4000 },
      ],
    },
    {
      id: "S-005", invoice_number: "INV/20260830/011", user_id: "U-002", user_name: "Dina Kasir",
      customer_id: "C-002", customer_name: "Pak Budi Santoso", payment_method: "debt", status: "debt", total: 62000,
      amount_paid: null, change_amount: null,
      created_at: "2026-08-30T11:28:00", transaction_date: "2026-08-30T11:30:00", paid_at: null,
      details: [
        { product_id: "P-001", product_name: "Beras Premium 5kg", quantity: 1, unit_selling_price: 62000 },
      ],
    },
    // KONTRAK-4: invoice_number hanya dibuat saat transaksi selesai & disimpan.
    // S-008: hutang yang sudah lunas penuh (transaksi ikut paid + paid_at).
    {
      id: "S-008", invoice_number: "INV/20260825/008", user_id: "U-001", user_name: "Musthofa Arya",
      customer_id: "C-003", customer_name: "Bu Ratna", payment_method: "debt", status: "paid", total: 86000,
      amount_paid: 86000, change_amount: 0,
      created_at: "2026-08-25T09:58:00", transaction_date: "2026-08-25T10:00:00", paid_at: "2026-08-28T12:00:00",
      details: [
        { product_id: "P-001", product_name: "Beras Premium 5kg", quantity: 1, unit_selling_price: 72000 },
        { product_id: "P-005", product_name: "Kopi Sachet", quantity: 7, unit_selling_price: 2000 },
      ],
    },
    // S-006 (QRIS menunggu) & S-007 (dibatalkan) = belum final -> invoice null.
    {
      id: "S-006", invoice_number: null, user_id: "U-001", user_name: "Musthofa Arya",
      customer_id: null, customer_name: null, payment_method: "qris", status: "waiting_payment", total: 18500,
      amount_paid: null, change_amount: null,
      created_at: "2026-08-29T14:45:00", transaction_date: "2026-08-29T14:47:00", paid_at: null,
      details: [
        { product_id: "P-002", product_name: "Minyak Goreng 1L", quantity: 1, unit_selling_price: 18500 },
      ],
    },
    {
      id: "S-007", invoice_number: null, user_id: "U-001", user_name: "Musthofa Arya",
      customer_id: null, customer_name: null, payment_method: "cash", status: "cancelled", total: 12000,
      amount_paid: null, change_amount: null,
      created_at: "2026-08-29T15:00:00", transaction_date: "2026-08-29T15:02:00", paid_at: null,
      details: [
        { product_id: "P-006", product_name: "Tepung Terigu 1kg", quantity: 1, unit_selling_price: 13000 },
      ],
    },
  ],
  debts: [
    {
      debt_id: "DR-001", sale_id: "S-003", customer_id: "C-001", customer_name: "Ibu Sari",
      total_debt: 148000, remaining_debt: 98000, status: "Partial",
      created_at: "2026-09-01T13:40:00", updated_at: "2026-09-01T14:25:00",
      payments: [
        { payment_id: "DP-001", debt_id: "DR-001", payment_date: "2026-09-01", amount: 50000, user_id: "U-001", user_name: "Musthofa Arya", note: "Bayar sebagian" },
      ],
    },
    {
      debt_id: "DR-002", sale_id: "S-005", customer_id: "C-002", customer_name: "Pak Budi Santoso",
      total_debt: 62000, remaining_debt: 62000, status: "Unpaid",
      created_at: "2026-08-30T11:30:00", updated_at: "2026-08-30T11:30:00",
      payments: [],
    },
    // KONTRAK-5: tidak ada hutang manual tanpa transaksi — DR-003 bersumber dari S-008.
    {
      debt_id: "DR-003", sale_id: "S-008", customer_id: "C-003", customer_name: "Bu Ratna",
      total_debt: 86000, remaining_debt: 0, status: "Paid",
      created_at: "2026-08-25T10:00:00", updated_at: "2026-08-28T12:00:00",
      payments: [
        { payment_id: "DP-002", debt_id: "DR-003", payment_date: "2026-08-27", amount: 40000, user_id: "U-001", user_name: "Musthofa Arya", note: "" },
        { payment_id: "DP-003", debt_id: "DR-003", payment_date: "2026-08-28", amount: 46000, user_id: "U-001", user_name: "Musthofa Arya", note: "Lunas" },
      ],
    },
  ],
  adjustments: [
    {
      id: "SA-001", user_id: "U-001", user_name: "Musthofa Arya", adjustment_date: "2026-08-27", reason: "stok_opname",
      details: [
        { product_id: "P-003", product_name: "Gula Pasir 1kg", quantity_change: -3 },
        { product_id: "P-007", product_name: "Mie Instan", quantity_change: 5 },
      ],
    },
    {
      id: "SA-002", user_id: "U-001", user_name: "Musthofa Arya", adjustment_date: "2026-08-29", reason: "stok_rusak",
      details: [{ product_id: "P-005", product_name: "Kopi Sachet", quantity_change: -6 }],
    },
    {
      id: "SA-003", user_id: "U-001", user_name: "Musthofa Arya", adjustment_date: "2026-09-01", reason: "stok_hilang",
      details: [{ product_id: "P-008", product_name: "Air Mineral 600ml", quantity_change: -2 }],
    },
  ],
  logs: [
    { id: "LOG-015", user_id: "U-001", user_name: "Musthofa Arya", action: "stockAdjustment", description: "Penyesuaian stok Air Mineral 600ml (-2)", created_at: "2026-09-01T15:10:00" },
    { id: "LOG-014", user_id: "U-001", user_name: "Musthofa Arya", action: "purchase", description: "Pembelian PO-003 dari UD Berkah Amanah", created_at: "2026-09-01T10:20:00" },
    { id: "LOG-013", user_id: "U-002", user_name: "Dina Kasir", action: "sale", description: "Transaksi INV/20260901/016 (Hutang - Ibu Sari)", created_at: "2026-09-01T13:40:00" },
    { id: "LOG-012", user_id: "U-002", user_name: "Dina Kasir", action: "qrisConfirm", description: "Konfirmasi QRIS INV/20260901/015", created_at: "2026-09-01T10:08:00" },
    { id: "LOG-011", user_id: "U-001", user_name: "Musthofa Arya", action: "productEdit", description: "Ubah produk Sabun Mandi Batang (nonaktif)", created_at: "2026-08-31T17:00:00" },
    { id: "LOG-010", user_id: "U-001", user_name: "Musthofa Arya", action: "debtPayment", description: "Pembayaran hutang DR-001 Rp 50.000", created_at: "2026-08-31T14:25:00" },
    { id: "LOG-009", user_id: "U-001", user_name: "Musthofa Arya", action: "storeInfoChange", description: "Ubah footer struk toko", created_at: "2026-08-31T09:15:00" },
    { id: "LOG-008", user_id: "U-002", user_name: "Dina Kasir", action: "login", description: "Login ke sistem", created_at: "2026-08-31T07:55:00" },
    { id: "LOG-007", user_id: "U-001", user_name: "Musthofa Arya", action: "supplierAdd", description: "Tambah supplier UD Berkah Amanah", created_at: "2026-08-30T16:40:00" },
    { id: "LOG-006", user_id: "U-001", user_name: "Musthofa Arya", action: "profileChange", description: "Ubah nomor telepon sendiri", created_at: "2026-08-30T11:05:00" },
    { id: "LOG-005", user_id: "U-001", user_name: "Musthofa Arya", action: "cashierAdd", description: "Tambah akun kasir Dina", created_at: "2026-08-29T09:30:00" },
    { id: "LOG-004", user_id: "U-001", user_name: "Musthofa Arya", action: "debtAdd", description: "Hutang baru INV/20260830/011 (Pak Budi)", created_at: "2026-08-30T11:32:00" },
    { id: "LOG-003", user_id: "U-002", user_name: "Dina Kasir", action: "sale", description: "Transaksi INV/20260831/012 (Tunai)", created_at: "2026-08-31T16:22:00" },
    { id: "LOG-002", user_id: "U-001", user_name: "Musthofa Arya", action: "logout", description: "Logout dari sistem", created_at: "2026-08-29T21:00:00" },
    { id: "LOG-001", user_id: "U-001", user_name: "Musthofa Arya", action: "productAdd", description: "Tambah produk Beras Premium 5kg", created_at: "2026-08-28T08:12:00" },
  ],
  settings: {
    store_name: "Toko Sembako Berkah",
    logo: "",
    address: "Jl. Raya Merdeka No. 45, Jakarta Timur",
    phone: "021-8765-4321",
    receipt_info: "Terima kasih telah berbelanja. Barang yang sudah dibeli tidak dapat dikembalikan.",
    qris_image: "",
  },
};

// v2 = store dengan 5 kontrak database final (change_amount, debt_id/payment_id,
// email UQ, invoice null-until-final, sale_id NOT NULL). v1 lama tidak dibaca lagi.
const STORAGE_KEY = "kassmart_db_v2";

let db: DB = structuredClone(SEED);
let hydrated = false;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // storage penuh/blocked — mock tetap jalan in-memory
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<DB>;
      db = { ...structuredClone(SEED), ...saved };
      version += 1; // re-render pertama setelah hidrasi
    }
  } catch {
    // data rusak — lanjut dengan seed
  }
}

function mutate(fn: (d: DB) => void) {
  hydrate();
  fn(db);
  persist();
  emit();
}

// ---------- Hook React ----------
function subscribe(cb: () => void) {
  hydrate();
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const getSnapshot = () => version;

/** Berlangganan store bersama — setiap mutate() memicu re-render pemakaian. */
export function useDb(): DB {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return db;
}

/** Baca tanpa reaktif (untuk event handler). */
export const getDb = (): DB => {
  hydrate();
  return db;
};

// ---------- Util ID ----------
function nextId(prefix: string, existing: string[], pad = 3): string {
  let n = existing.length + 1;
  const taken = new Set(existing);
  while (taken.has(`${prefix}-${String(n).padStart(pad, "0")}`)) n += 1;
  return `${prefix}-${String(n).padStart(pad, "0")}`;
}

export const nowIso = () => new Date().toISOString().slice(0, 19);

/** Nomor invoice INV/YYYYMMDD/NNN — urutan global per format (UNIQUE), label tetap per hari. */
function nextInvoiceNumber(sales: Sale[]): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const seqs = sales
    .map((s) => (s.invoice_number ? parseInt(s.invoice_number.slice(-3), 10) : NaN))
    .filter((n) => Number.isFinite(n));
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return `INV/${stamp}/${String(next).padStart(3, "0")}`;
}

// ---------- ACTIVITY_LOGS ----------
export interface Actor {
  id: string;
  name: string;
}

export function logActivity(
  actor: Actor | null,
  action: ActivityAction,
  description: string
) {
  if (!actor) return;
  mutate((d) => {
    d.logs.unshift({
      id: nextId("LOG", d.logs.map((l) => l.id), 3),
      user_id: actor.id,
      user_name: actor.name,
      action,
      description,
      created_at: nowIso(),
    });
  });
}

export function activityLabelAction(d: DB, action: ActivityAction): string {
  return action;
}

// ---------- PRODUCTS ----------
export const barcodeTaken = (barcode: string, excludeId?: string): boolean => {
  const b = barcode.trim();
  if (!b) return false;
  return getDb().products.some((p) => p.barcode === b && p.id !== excludeId);
};

export function addProduct(data: Omit<Product, "id">): Product {
  const p: Product = { id: nextId("P", getDb().products.map((x) => x.id)), ...data };
  mutate((d) => {
    d.products.push(p);
  });
  return p;
}

export function updateProduct(id: string, data: Partial<Omit<Product, "id">>): void {
  mutate((d) => {
    const idx = d.products.findIndex((p) => p.id === id);
    if (idx !== -1) d.products[idx] = { ...d.products[idx], ...data };
  });
}

/** Produk boleh dinonaktifkan; penghapusan permanen tidak tersedia (UC-04). */
export function setProductActive(id: string, active: boolean): void {
  updateProduct(id, { is_active: active });
}

// ---------- CATEGORIES ----------
export const productsUsingCategory = (categoryId: string): number =>
  getDb().products.filter((p) => p.category_id === categoryId).length;

export function addCategory(name: string): Category {
  const c: Category = { id: nextId("CAT", getDb().categories.map((x) => x.id), 2), name };
  mutate((d) => {
    d.categories.push(c);
  });
  return c;
}

export function updateCategory(id: string, name: string): void {
  mutate((d) => {
    const idx = d.categories.findIndex((c) => c.id === id);
    if (idx !== -1) d.categories[idx].name = name;
  });
}

export function deleteCategory(id: string): void {
  mutate((d) => {
    d.categories = d.categories.filter((c) => c.id !== id);
  });
}

// ---------- SUPPLIERS ----------
export const purchasesUsingSupplier = (supplierId: string): number =>
  getDb().purchases.filter((p) => p.supplier_id === supplierId).length;

export function addSupplier(data: Omit<Supplier, "id">): Supplier {
  const s: Supplier = { id: nextId("SUP", getDb().suppliers.map((x) => x.id), 2), ...data };
  mutate((d) => {
    d.suppliers.push(s);
  });
  return s;
}

export function updateSupplier(id: string, data: Partial<Omit<Supplier, "id">>): void {
  mutate((d) => {
    const idx = d.suppliers.findIndex((s) => s.id === id);
    if (idx !== -1) d.suppliers[idx] = { ...d.suppliers[idx], ...data };
  });
}

export function deleteSupplier(id: string): void {
  mutate((d) => {
    d.suppliers = d.suppliers.filter((s) => s.id !== id);
  });
}

// ---------- CUSTOMERS ----------
export function addCustomer(name: string, phone: string, address: string): Customer {
  const c: Customer = {
    id: nextId("C", getDb().customers.map((x) => x.id)),
    name,
    phone,
    address,
  };
  mutate((d) => {
    d.customers.push(c);
  });
  return c;
}

// ---------- SALES_TRANSACTIONS (+SALE_DETAILS, DEBT_RECORDS, stok) ----------
const decrementStock = (details: SaleDetail[]) => {
  for (const line of details) {
    const p = db.products.find((x) => x.id === line.product_id);
    if (p) p.stock = Math.max(0, p.stock - line.quantity);
  }
};

/** Buat transaksi Draft saat user lanjut ke pembayaran (Activity c).
 * KONTRAK-4: Draft disimpan dengan invoice_number NULL — invoice baru dibuat
 * saat transaksi benar-benar selesai (finalizeSale). Draft bukan transaksi final. */
export function createDraftSale(
  actor: Actor,
  items: { product: Product; quantity: number }[]
): Sale {
  hydrate();
  // Pulihkan draft kosong milik user ini (kembali dari pembayaran ke keranjang)
  // supaya tidak menumpuk draft baru setiap kali lanjut ke pembayaran.
  const reusable = db.sales.find(
    (s) => s.status === "draft" && s.user_id === actor.id && !s.details.length
  );
  if (reusable) {
    const total = items.reduce((s, i) => s + i.product.selling_price * i.quantity, 0);
    mutate((d) => {
      const idx = d.sales.findIndex((s) => s.id === reusable.id);
      d.sales[idx] = {
        ...d.sales[idx],
        total,
        details: items.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          quantity: i.quantity,
          unit_selling_price: i.product.selling_price,
        })),
        transaction_date: nowIso(),
      };
    });
    return reusable;
  }
  const sale: Sale = {
    id: nextId("S", getDb().sales.map((x) => x.id)),
    invoice_number: null, // KONTRAK-4: belum final — tanpa nomor invoice
    user_id: actor.id,
    user_name: actor.name,
    customer_id: null,
    customer_name: null,
    payment_method: null,
    status: "draft",
    total: items.reduce((s, i) => s + i.product.selling_price * i.quantity, 0),
    amount_paid: null,
    change_amount: null,
    created_at: nowIso(),
    transaction_date: nowIso(),
    paid_at: null,
    details: items.map((i) => ({
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
      unit_selling_price: i.product.selling_price,
    })),
  };
  mutate((d) => {
    d.sales.unshift(sale);
  });
  return sale;
}

function patchSale(id: string, patch: Partial<Sale>): void {
  mutate((d) => {
    const idx = d.sales.findIndex((s) => s.id === id);
    if (idx !== -1) d.sales[idx] = { ...d.sales[idx], ...patch };
  });
}

export const getSale = (id: string): Sale | undefined =>
  getDb().sales.find((s) => s.id === id);

export function setSaleMethod(id: string, method: PaymentMethod): void {
  // QRIS: status berubah menjadi Menunggu Pembayaran (UC-12).
  patchSale(id, {
    payment_method: method,
    status: method === "qris" ? "waiting_payment" : getSale(id)?.status ?? "draft",
  });
}

export function updateDraftContents(
  id: string,
  items: { product: Product; quantity: number }[]
): void {
  patchSale(id, {
    total: items.reduce((s, i) => s + i.product.selling_price * i.quantity, 0),
    details: items.map((i) => ({
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
      unit_selling_price: i.product.selling_price,
    })),
    transaction_date: nowIso(),
  });
}

/** Batalkan transaksi (jalur QRIS menunggu / draft ditinggalkan) — stok tidak berubah (UC-12).
 * KONTRAK-4: transaksi batal TIDAK mendapat nomor invoice (invoice hanya utk final). */
export function cancelSale(id: string): void {
  const sale = getSale(id);
  patchSale(id, { status: "cancelled" });
  if (sale)
    logActivity(
      { id: sale.user_id, name: sale.user_name },
      "saleCancel",
      `Transaksi ${id} dibatalkan (metode ${sale.payment_method ?? "-"}) — stok tidak berubah`
    );
}

export interface FinalizeResult {
  ok: boolean;
  invoice?: string;
  error?: "stock";
}

/**
 * Selesaikan transaksi (UC-11/12/13/14):
 * - tunai/QRIS → status paid + paid_at; hutang → status debt + DEBT_RECORD Unpaid.
 * - kurangi stok, buat invoice, catat log.
 */
export function finalizeSale(
  id: string,
  opts: {
    method: PaymentMethod;
    customerId?: string | null;
    amountPaid?: number | null;
  }
): FinalizeResult {
  hydrate();
  const sale = db.sales.find((s) => s.id === id);
  if (!sale) return { ok: false };

  // Validasi stok saat menyimpan (aturan bisnis: stok cukup).
  for (const line of sale.details) {
    const p = db.products.find((x) => x.id === line.product_id);
    if (!p || p.stock < line.quantity) return { ok: false, error: "stock" };
  }

  const now = nowIso();
  // KONTRAK-4: invoice hanya dibuat di titik finalisasi ini (draft/waiting = null).
  const invoice = sale.invoice_number ?? nextInvoiceNumber(db.sales);
  const customer = opts.customerId
    ? db.customers.find((c) => c.id === opts.customerId) ?? null
    : null;

  mutate((d) => {
    const idx = d.sales.findIndex((s) => s.id === id);
    const s = d.sales[idx];
    if (opts.method === "debt") {
      s.status = "debt";
      s.paid_at = null;
      s.amount_paid = null;
      s.change_amount = null;
    } else {
      s.status = "paid";
      s.paid_at = now;
      s.amount_paid =
        opts.method === "cash" ? opts.amountPaid ?? s.total : s.total;
      s.change_amount =
        opts.method === "cash" ? Math.max(0, (opts.amountPaid ?? s.total) - s.total) : 0;
    }
    s.invoice_number = invoice;
    s.payment_method = opts.method;
    s.customer_id = customer?.id ?? null;
    s.customer_name = customer?.name ?? null;
    s.transaction_date = now;
    decrementStock(s.details);

    if (opts.method === "debt" && customer) {
      // KONTRAK-5: hutang SELALU lahir dari transaksi Hutang — sale_id FK+UNIQUE NOT NULL.
      d.debts.unshift({
        debt_id: nextId("DR", d.debts.map((x) => x.debt_id)),
        sale_id: s.id,
        customer_id: customer.id,
        customer_name: customer.name,
        total_debt: s.total,
        remaining_debt: s.total,
        status: "Unpaid",
        created_at: now,
        updated_at: now,
        payments: [],
      });
    }
  });

  const actor: Actor = { id: sale.user_id, name: sale.user_name };
  const methodLabel =
    opts.method === "cash" ? "Tunai" : opts.method === "qris" ? "QRIS" : `Hutang - ${customer?.name ?? "-"}`;
  if (opts.method === "qris")
    logActivity(actor, "qrisConfirm", `Konfirmasi Lunas QRIS ${invoice}`);
  if (opts.method === "debt")
    logActivity(actor, "debtAdd", `Hutang baru ${invoice} (${customer?.name ?? "-"})`);
  logActivity(actor, "sale", `Transaksi ${invoice} (${methodLabel})`);

  return { ok: true, invoice };
}

// ---------- DEBT_RECORDS / DEBT_PAYMENTS (UC-16, UC-17) ----------
// KONTRAK-5: tidak ada addDebt() manual — DEBT_RECORDS hanya lahir dari
// finalizeSale(method "debt"). UC-16 = melihat/mengubah/menghapus data hutang
// yang ada + riwayatnya; UC-17 = mencatat pembayaran.
export const getDebt = (debtId: string): DebtRecord | undefined =>
  getDb().debts.find((x) => x.debt_id === debtId);

export function updateDebt(
  actor: Actor,
  debtId: string,
  patch: { total_debt?: number; customer_id?: string }
): { ok: boolean; error?: "below_paid" } {
  hydrate();
  const debt = db.debts.find((x) => x.debt_id === debtId);
  if (!debt) return { ok: false };
  if (patch.total_debt !== undefined) {
    const paid = debt.total_debt - debt.remaining_debt;
    if (patch.total_debt < paid) return { ok: false, error: "below_paid" }; // total < sudah dibayar
  }
  const customer = patch.customer_id
    ? db.customers.find((c) => c.id === patch.customer_id)
    : undefined;
  mutate((d) => {
    const idx = d.debts.findIndex((x) => x.debt_id === debtId);
    const cur = d.debts[idx];
    const newTotal = patch.total_debt ?? cur.total_debt;
    const paidAmount = cur.total_debt - cur.remaining_debt;
    cur.total_debt = newTotal;
    cur.remaining_debt = newTotal - paidAmount;
    cur.status =
      cur.remaining_debt <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid";
    if (customer) {
      cur.customer_id = customer.id;
      cur.customer_name = customer.name;
    }
    cur.updated_at = nowIso();
  });
  logActivity(actor, "debtEdit", `Ubah data hutang ${debtId}`);
  return { ok: true };
}

export function deleteDebt(actor: Actor, debtId: string): void {
  mutate((d) => {
    d.debts = d.debts.filter((x) => x.debt_id !== debtId);
  });
  logActivity(actor, "debtDelete", `Hapus data hutang ${debtId}`);
}

export function payDebt(
  actor: Actor,
  debtId: string,
  amount: number,
  note: string
): { ok: boolean; error?: "over"; status?: DebtStatus } {
  hydrate();
  const debt = db.debts.find((x) => x.debt_id === debtId);
  if (!debt) return { ok: false, error: "over" };
  if (amount <= 0 || amount > debt.remaining_debt)
    return { ok: false, error: "over" };
  const now = nowIso();
  let remaining = 0;
  mutate((d) => {
    const idx = d.debts.findIndex((x) => x.debt_id === debtId);
    const cur = d.debts[idx];
    cur.remaining_debt -= amount;
    remaining = cur.remaining_debt;
    cur.status = cur.remaining_debt === 0 ? "Paid" : "Partial";
    cur.updated_at = now;
    cur.payments.push({
      payment_id: nextId("DP", cur.payments.map((p) => p.payment_id)), // PK (KONTRAK-2)
      debt_id: cur.debt_id, // FK → DEBT_RECORDS.debt_id
      payment_date: now.slice(0, 10),
      amount,
      user_id: actor.id,
      user_name: actor.name,
      note,
    });
    // Lunas penuh → transaksi sumbernya ikut lunas: paid_at ditetapkan (ERD).
    if (cur.status === "Paid") {
      const s = d.sales.find((x) => x.id === cur.sale_id);
      if (s && s.status === "debt") {
        s.status = "paid";
        s.paid_at = now;
        s.amount_paid = s.total;
        s.change_amount = 0;
      }
    }
  });
  logActivity(
    actor,
    "debtPayment",
    `Pembayaran hutang ${debtId} Rp ${amount.toLocaleString("id-ID")}${remaining === 0 ? " (Lunas)" : ` (sisa Rp ${remaining.toLocaleString("id-ID")})`}`
  );
  return { ok: true, status: remaining === 0 ? "Paid" : "Partial" };
}

// ---------- PURCHASES (+ stok naik) ----------
export function addPurchase(
  actor: Actor,
  supplierId: string | null,
  lines: { product_id: string; quantity: number; unit_purchase_price: number }[]
): Purchase {
  hydrate();
  const po: Purchase = {
    id: nextId("PO", db.purchases.map((x) => x.id)),
    supplier_id: supplierId,
    user_id: actor.id,
    user_name: actor.name,
    purchase_date: nowIso().slice(0, 10),
    details: lines.map((l) => ({
      product_id: l.product_id,
      product_name:
        db.products.find((p) => p.id === l.product_id)?.name ?? l.product_id,
      quantity: l.quantity,
      unit_purchase_price: l.unit_purchase_price,
    })),
  };
  mutate((d) => {
    d.purchases.unshift(po);
    // Stok bertambah otomatis saat pembelian (aturan bisnis PRD).
    for (const line of po.details) {
      const p = d.products.find((x) => x.id === line.product_id);
      if (p) p.stock += line.quantity;
    }
  });
  const supplier = po.supplier_id
    ? db.suppliers.find((s) => s.id === po.supplier_id)
    : null;
  logActivity(
    actor,
    "purchase",
    `Pembelian ${po.id} ${supplier ? `dari ${supplier.name}` : "tanpa supplier"}`
  );
  return po;
}

export const purchaseTotal = (p: Purchase): number =>
  p.details.reduce((s, d) => s + d.quantity * d.unit_purchase_price, 0);

// ---------- STOCK_ADJUSTMENTS (+ stok update) ----------
export function addAdjustment(
 actor: Actor,
 productId: string,
 quantityChange: number,
 reason: AdjustmentReason,
 note?: string
): { ok: boolean; error?: "negative_result" } {
  hydrate();
  const product = db.products.find((p) => p.id === productId);
  if (!product) return { ok: false, error: "negative_result" };
  const result = product.stock + quantityChange;
  if (result < 0) return { ok: false, error: "negative_result" }; // stok hasil tidak boleh negatif (UC-18)
  const adj: StockAdjustment = {
    id: nextId("SA", db.adjustments.map((x) => x.id)),
    user_id: actor.id,
    user_name: actor.name,
    adjustment_date: nowIso().slice(0, 10),
    reason,
    details: [
      { product_id: product.id, product_name: product.name, quantity_change: quantityChange },
    ],
  };
  mutate((d) => {
    d.adjustments.unshift(adj);
    const p = d.products.find((x) => x.id === productId);
    if (p) p.stock = result;
  });
  logActivity(
    actor,
    "stockAdjustment",
    `Penyesuaian stok ${product.name} (${quantityChange > 0 ? "+" : ""}${quantityChange})${note ? ` — ${note}` : ""}`
  );
  return { ok: true };
}

// ---------- STORE_SETTINGS ----------
export function saveSettings(
  actor: Actor,
  data: StoreSettings
): void {
  mutate((d) => {
    d.settings = { ...data };
  });
  logActivity(actor, "storeInfoChange", "Ubah informasi toko");
}

// ---------- Helper agregasi (dashboard/laporan/statistik) ----------
export const isSaleCompleted = (s: Sale) =>
  s.status === "paid" || s.status === "debt";

export function cashierUsers(): StoreUser[] {
  return getUsers().filter((u) => u.role === "Kasir");
}

/** Statistik per kasir dalam rentang tanggal (UC-22). */
export function cashierStats(
  userId: string,
  from: string,
  to: string
): { sales: Sale[]; txCount: number; totalSales: number; income: number } {
  hydrate();
  const inRange = (iso: string) => {
    const day = iso.slice(0, 10);
    return (!from || day >= from) && (!to || day <= to);
  };
  const sales = db.sales.filter(
    (s) => s.user_id === userId && isSaleCompleted(s) && inRange(s.transaction_date)
  );
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  // Pendapatan = tunai/QRIS lunas + pembayaran hutang yang dicatat kasir ini.
  const paidCash = sales
    .filter((s) => s.status === "paid" && s.payment_method !== "debt")
    .reduce((sum, s) => sum + s.total, 0);
  const debtIncome = db.debts
    .flatMap((d) => d.payments)
    .filter((p) => p.user_id === userId && inRange(p.payment_date))
    .reduce((sum, p) => sum + p.amount, 0);
  return { sales, txCount: sales.length, totalSales, income: paidCash + debtIncome };
}
