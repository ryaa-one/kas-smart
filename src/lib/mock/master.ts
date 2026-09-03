// Mock data sementara — nama field mengikuti ERD (PRODUCTS, CATEGORIES, SUPPLIERS, CUSTOMERS).
// Akan diganti API/DB saat backend terhubung.

export interface Category {
  id: string;
  name: string;
  product_count: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  product_count: number;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category_id: string;
  category: string;
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

export const mockCategories: Category[] = [
  { id: "CAT-01", name: "Beras", product_count: 2 },
  { id: "CAT-02", name: "Minyak", product_count: 1 },
  { id: "CAT-03", name: "Sembako", product_count: 3 },
  { id: "CAT-04", name: "Minuman", product_count: 2 },
  { id: "CAT-05", name: "Makanan", product_count: 1 },
  { id: "CAT-06", name: "Bumbu", product_count: 2 },
  { id: "CAT-07", name: "Kebutuhan Rumah", product_count: 1 },
];

export const mockSuppliers: Supplier[] = [
  {
    id: "SUP-01",
    name: "CV Sumber Rejeki",
    phone: "0812-1111-2222",
    address: "Jl. Pasar Baru No. 12, Jakarta",
    product_count: 6,
  },
  {
    id: "SUP-02",
    name: "PT Grosir Makmur",
    phone: "0813-3333-4444",
    address: "Jl. Industri Raya No. 5, Bekasi",
    product_count: 4,
  },
  {
    id: "SUP-03",
    name: "UD Berkah Amanah",
    phone: "0857-5555-6666",
    address: "Jl. Raya Bogor KM 27, Depok",
    product_count: 2,
  },
];

export const mockProducts: Product[] = [
  { id: "P-001", barcode: "8991002100011", name: "Beras Premium 5kg", category_id: "CAT-01", category: "Beras", purchase_price: 62000, selling_price: 72000, stock: 120, minimum_stock: 20, is_active: true },
  { id: "P-002", barcode: "8991002100028", name: "Minyak Goreng 1L", category_id: "CAT-02", category: "Minyak", purchase_price: 15500, selling_price: 18500, stock: 85, minimum_stock: 15, is_active: true },
  { id: "P-003", barcode: "8991002100035", name: "Gula Pasir 1kg", category_id: "CAT-03", category: "Sembako", purchase_price: 13000, selling_price: 15500, stock: 96, minimum_stock: 20, is_active: true },
  { id: "P-004", barcode: "8991002100042", name: "Telur Ayam 1kg", category_id: "CAT-03", category: "Sembako", purchase_price: 24000, selling_price: 28000, stock: 12, minimum_stock: 20, is_active: true },
  { id: "P-005", barcode: "8991002100059", name: "Kopi Sachet", category_id: "CAT-04", category: "Minuman", purchase_price: 1500, selling_price: 2000, stock: 240, minimum_stock: 50, is_active: true },
  { id: "P-006", barcode: "8991002100066", name: "Tepung Terigu 1kg", category_id: "CAT-03", category: "Sembako", purchase_price: 11000, selling_price: 13000, stock: 60, minimum_stock: 15, is_active: true },
  { id: "P-007", barcode: "8991002100073", name: "Mie Instan", category_id: "CAT-05", category: "Makanan", purchase_price: 2800, selling_price: 3500, stock: 180, minimum_stock: 40, is_active: true },
  { id: "P-008", barcode: "8991002100080", name: "Air Mineral 600ml", category_id: "CAT-04", category: "Minuman", purchase_price: 3000, selling_price: 4000, stock: 150, minimum_stock: 30, is_active: true },
  { id: "P-009", barcode: "8991002100097", name: "Beras Medium 5kg", category_id: "CAT-01", category: "Beras", purchase_price: 56000, selling_price: 65000, stock: 80, minimum_stock: 20, is_active: true },
  { id: "P-010", barcode: "8991002100103", name: "Garam Dapur 250g", category_id: "CAT-06", category: "Bumbu", purchase_price: 2200, selling_price: 3000, stock: 110, minimum_stock: 25, is_active: true },
  { id: "P-011", barcode: "8991002100110", name: "Kecap Manis 520ml", category_id: "CAT-06", category: "Bumbu", purchase_price: 20000, selling_price: 24000, stock: 45, minimum_stock: 10, is_active: true },
  { id: "P-012", barcode: "8991002100127", name: "Sabun Mandi Batang", category_id: "CAT-07", category: "Kebutuhan Rumah", purchase_price: 4200, selling_price: 5500, stock: 90, minimum_stock: 20, is_active: false },
];

export const mockCustomers: Customer[] = [
  { id: "C-001", name: "Ibu Sari", phone: "0812-3456-7890", address: "Jl. Melati No. 3" },
  { id: "C-002", name: "Pak Budi Santoso", phone: "0813-9876-5432", address: "Jl. Kenanga No. 7" },
  { id: "C-003", name: "Bu Ratna", phone: "0857-1122-3344", address: "Jl. Anggrek No. 15" },
];
