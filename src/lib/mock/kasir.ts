// Mock data sementara untuk halaman Kasir — akan diganti API/DB saat backend terhubung.
// Nama field mengikuti struktur ERD: PRODUCTS, CUSTOMERS, SALES_TRANSACTIONS.

export interface KasirProduct {
  id: string;
  barcode: string;
  name: string;
  category: string;
  selling_price: number;
  stock: number;
}

export interface KasirCustomer {
  id: string; // CUSTOMERS.id
  name: string; // CUSTOMERS.name
  phone: string; // CUSTOMERS.phone
  address: string; // CUSTOMERS.address
}

export interface CartItem {
  product: KasirProduct;
  quantity: number;
}

export const mockKasirProducts: KasirProduct[] = [
  { id: "P-001", barcode: "8991002100015", name: "Beras Premium 5kg", category: "Beras", selling_price: 72000, stock: 120 },
  { id: "P-002", barcode: "8991002100022", name: "Minyak Goreng 1L", category: "Minyak", selling_price: 18500, stock: 85 },
  { id: "P-003", barcode: "8991002100039", name: "Gula Pasir 1kg", category: "Sembako", selling_price: 15500, stock: 96 },
  { id: "P-004", barcode: "8991002100046", name: "Telur Ayam 1kg", category: "Sembako", selling_price: 28000, stock: 40 },
  { id: "P-005", barcode: "8991002100053", name: "Kopi Sachet", category: "Minuman", selling_price: 2000, stock: 240 },
  { id: "P-006", barcode: "8991002100060", name: "Tepung Terigu 1kg", category: "Sembako", selling_price: 13000, stock: 60 },
  { id: "P-007", barcode: "8991002100077", name: "Mie Instan", category: "Makanan", selling_price: 3500, stock: 180 },
  { id: "P-008", barcode: "8991002100084", name: "Air Mineral 600ml", category: "Minuman", selling_price: 4000, stock: 150 },
  { id: "P-009", barcode: "8991002100091", name: "Beras Medium 5kg", category: "Beras", selling_price: 65000, stock: 80 },
  { id: "P-010", barcode: "8991002100107", name: "Garam Dapur 250g", category: "Bumbu", selling_price: 3000, stock: 110 },
  { id: "P-011", barcode: "8991002100114", name: "Kecap Manis 520ml", category: "Bumbu", selling_price: 24000, stock: 45 },
  { id: "P-012", barcode: "8991002100121", name: "Sabun Mandi Batang", category: "Kebutuhan Rumah", selling_price: 5500, stock: 90 },
];

// ponytail: array mutable in-memory — ganti POST /api/customers saat backend ada.
const mockKasirCustomers: KasirCustomer[] = [
  { id: "C-001", name: "Ibu Sari", phone: "0812-3456-7890", address: "Jl. Melati No. 12" },
  { id: "C-002", name: "Pak Budi Santoso", phone: "0813-9876-5432", address: "Jl. Kenanga No. 8" },
  { id: "C-003", name: "Bu Ratna", phone: "0857-1122-3344", address: "Jl. Anggrek No. 21" },
];

export const getCustomers = (): KasirCustomer[] => mockKasirCustomers;

let customerSeq = mockKasirCustomers.length;
export function addCustomer(name: string, phone: string, address: string): KasirCustomer {
  customerSeq += 1;
  const c: KasirCustomer = {
    id: `C-${String(customerSeq).padStart(3, "0")}`,
    name,
    phone,
    address,
  };
  mockKasirCustomers.push(c);
  return c;
}
