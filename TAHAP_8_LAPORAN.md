# LAPORAN TAHAP 8 — CRUD Pembelian Migrasi ke Database + Stok Management

**Tanggal:** 16 September 2026  
**Status:** ✅ SELESAI

---

## 1. FILE DIBUAT

### API Routes
- `src/app/api/purchases/route.ts` — GET list + POST create (Owner only)
- `src/app/api/purchases/[id]/route.ts` — GET detail + PATCH update + DELETE (Owner only)

### Library
- `src/lib/purchase-api.ts` — validasi server-side: details wajib (min 1), product_id required, quantity > 0, price >= 0, supplier_id opsional (nullable)

---

## 2. FILE DIUBAH

- `src/app/pembelian/page.tsx` — **tulis ulang 100%** dari mock localStorage ke API database; Owner full CRUD, Kasir read-only (tombol Tambah hidden); layout/UI tetap sama
- `src/lib/i18n/translations.ts` — tambah string `pembelian.error*` (LoadFailed, AddFailed, UpdateFailed, DeleteFailed, ProductNotFound, SupplierNotFound, InsufficientStock) + `common.{errorUnauthorized, errorForbidden}` id & en

---

## 3. API PEMBELIAN

### Endpoint tersedia

```
GET    /api/purchases          → list semua pembelian + detail (Owner/Kasir)
POST   /api/purchases          → tambah pembelian + stok bertambah atomik (Owner only)
GET    /api/purchases/[id]     → detail satu pembelian (Owner/Kasir)
PATCH  /api/purchases/[id]     → update pembelian + adjust stok atomik (Owner only)
DELETE /api/purchases/[id]     → hapus pembelian + kembalikan stok atomik (Owner only)
```

### Authorization
- **Owner:** full CRUD pembelian
- **Kasir:** **read-only** (GET list + detail), POST/PATCH/DELETE → **403 forbidden**
- **Tanpa login:** semua endpoint → **401 unauthorized**

**Catatan:** Sesuai instruksi user, Kasir **hanya dapat melihat** daftar dan detail pembelian (untuk referensi), **tidak boleh** melakukan operasi CRUD (berbeda dari Produk/Supplier yang Kasir bisa baca untuk dropdown transaksi).

---

## 4. SUMBER DATA

### Sebelum Tahap 8
```
localStorage kassmart_db_v2
  ↓
src/lib/mock/db.ts (addPurchase → stok update manual)
  ↓
halaman Pembelian
```

### Setelah Tahap 8
```
Supabase PostgreSQL
  ↓
Prisma Client ($transaction atomik)
  ↓
API /api/purchases (stok update atomik)
  ↓
halaman Pembelian
```

**Tidak ada fallback mock.** API gagal → error ditampilkan ke user.

---

## 5. STOK MANAGEMENT ATOMIK

### CREATE Pembelian
1. Validasi supplier_id (jika diisi) + semua product_id exist
2. **Prisma $transaction** (atomik):
   - Create PURCHASES record
   - Create PURCHASE_DETAILS (bulk)
   - **Update PRODUCTS.stock** (increment quantity per produk)
   - Create ACTIVITY_LOGS (purchaseCreate)
3. Rollback otomatis jika salah satu langkah gagal

**Hasil:** Stok bertambah sesuai quantity pembelian.

### PATCH Pembelian
1. Validasi supplier_id + product_id exist
2. Hitung **net change** per produk (new quantity - old quantity)
3. Validasi stok tidak negatif setelah adjust
4. **Prisma $transaction** (atomik):
   - **Revert stok lama** (decrement old quantity)
   - Delete old PURCHASE_DETAILS
   - Update PURCHASES + create new PURCHASE_DETAILS
   - **Apply stok baru** (increment new quantity)
   - Create ACTIVITY_LOGS (purchaseUpdate)

**Hasil:** Stok terupdate sesuai perubahan (tidak menggandakan).

### DELETE Pembelian
1. **Prisma $transaction** (atomik):
   - **Kembalikan stok** (decrement quantity dari purchase_details)
   - Validasi stok tidak negatif (guard insufficient_stock)
   - Delete PURCHASE_DETAILS
   - Delete PURCHASES
   - Create ACTIVITY_LOGS (purchaseDelete)

**Hasil:** Stok dikembalikan sesuai quantity pembelian yang dihapus.

### Transaction Rollback
Jika **salah satu operasi gagal** (stok negatif, product not found, constraint violation), **seluruh transaction rollback** → database tetap konsisten, tidak ada stok yang berubah sebagian.

---

## 6. VALIDASI SERVER-SIDE

### Supplier (Opsional)
- `supplier_id` boleh `null` (sesuai ERD nullable)
- Jika diisi, harus exist di DB → 404 `supplier_not_found`

### Details (Wajib)
- Minimal 1 item → 400 `details_required`
- Setiap detail:
  - `product_id` wajib + exist di DB → 400 `product_required` / 404 `product_not_found`
  - `quantity` integer > 0 → 400 `quantity_min`
  - `unit_purchase_price` integer >= 0 → 400 `price_invalid`

### Stok Guard (PATCH/DELETE)
- Stok tidak boleh negatif setelah adjust/delete → 400 `insufficient_stock` + detail current_stock/required_reduction

### Total Server-Calculated
Frontend kirim details, **server hitung total** dari `sum(quantity * unit_purchase_price)` → tidak percaya input frontend.

---

## 7. RELASI DATABASE

### PURCHASES
- `supplier_id` → SUPPLIERS (nullable, ON DELETE guard 409 supplier_in_use)
- `user_id` → USERS (NOT NULL, siapa yang input pembelian)
- `purchase_date` → DateTime default now()

### PURCHASE_DETAILS
- `purchase_id` → PURCHASES (FK NOT NULL, cascade on delete via transaction)
- `product_id` → PRODUCTS (FK NOT NULL)
- `quantity` → Int (jumlah beli)
- `unit_purchase_price` → Int (harga historis saat pembelian)

---

## 8. ACTIVITY LOG

Operasi berikut dicatat ke `ACTIVITY_LOGS`:

- `purchaseCreate` — Owner tambah pembelian (description: ID + item count + total Rp)
- `purchaseUpdate` — Owner ubah pembelian (description: ID + item count + total Rp)
- `purchaseDelete` — Owner hapus pembelian (description: ID + product count dikembalikan)

`user_id` diambil dari **session cookie** (`session.id`), tidak diterima dari frontend.

---

## 9. HASIL TEST

### Test API (Python script - 32 skenario)

| Skenario | HTTP | Error Code | Stok | Status |
|----------|------|------------|------|--------|
| GET anon | 401 | `unauthorized` | — | ✅ |
| POST anon | 401 | `unauthorized` | — | ✅ |
| Owner login | 200 | — | — | ✅ |
| Setup supplier+category+products | 201 | — | Mouse=10, Keyboard=5 | ✅ |
| GET list (empty) | 200 | — | — | ✅ |
| POST no details | 400 | `details_required` | — | ✅ |
| POST empty details | 400 | `details_required` | — | ✅ |
| POST no product_id | 400 | `product_required` | — | ✅ |
| POST qty zero | 400 | `quantity_min` | — | ✅ |
| POST price negative | 400 | `price_invalid` | — | ✅ |
| POST product not exist | 404 | `product_not_found` | — | ✅ |
| POST supplier not exist | 404 | `supplier_not_found` | — | ✅ |
| **CREATE purchase (+20+10)** | **201** | — | **Mouse: 10→30 (+20)** | **✅** |
|  |  |  | **Keyboard: 5→15 (+10)** | **✅** |
| GET list (1 item) | 200 | — | — | ✅ |
| GET single purchase | 200 | — | — | ✅ |
| POST no supplier (null) | 201 | — | Mouse: 30→35 (+5) | ✅ |
| **PATCH update (20→25, 10→15)** | **200** | — | **Mouse: 35→40 (+5)** | **✅** |
|  |  |  | **Keyboard: 15→20 (+5)** | **✅** |
| **DELETE purchase (-25-15)** | **200** | — | **Mouse: 40→15 (-25)** | **✅** |
|  |  |  | **Keyboard: 20→5 (-15)** | **✅** |
| DELETE purchase2 | 200 | — | Mouse: 15→10 (-5) | ✅ |
| POST create final (+3) | 201 | — | Mouse: 10→13 (+3) | ✅ |
| DELETE supplier in-use | 409 | `supplier_in_use` | — | ✅ |
| Kasir login | 200 | — | — | ✅ |
| Kasir GET list | 200 | — | — | ✅ |
| Kasir GET single | 200 | — | — | ✅ |
| Kasir POST | 403 | `forbidden` | — | ✅ |
| Kasir PATCH | 403 | `forbidden` | — | ✅ |
| Kasir DELETE | 403 | `forbidden` | — | ✅ |
| **Final stock check** | — | — | **Mouse: 13 (10+3)** | **✅** |
|  |  |  | **Keyboard: 5 (unchanged)** | **✅** |

**Semua 32 skenario lolos.**

### Verifikasi Stok Management

#### CREATE (+20 mouse, +10 keyboard)
```
Stock BEFORE:  Mouse=10,  Keyboard=5
Stock AFTER:   Mouse=30,  Keyboard=15
Delta:         +20        +10          ✅ CORRECT
```

#### PATCH (20→25, 10→15)
```
Stock BEFORE:  Mouse=35,  Keyboard=15
Stock AFTER:   Mouse=40,  Keyboard=20
Delta:         +5         +5           ✅ CORRECT (net change, tidak double)
```

#### DELETE (-25 mouse, -15 keyboard)
```
Stock BEFORE:  Mouse=40,  Keyboard=20
Stock AFTER:   Mouse=15,  Keyboard=5
Delta:         -25        -15          ✅ CORRECT (stok dikembalikan)
```

#### Final State
```
Mouse:     awal=10, akhir=13  (+3 dari purchase terakhir)  ✅
Keyboard:  awal=5,  akhir=5   (kembali ke initial)        ✅
```

**Stok management atomik bekerja sempurna.**

---

## 10. DATA TEST

### Setup
- Supplier: "PT Distributor ABC"
- Kategori: "Elektronik"
- Produk: "Mouse Wireless" (stock 10), "Keyboard Mekanik" (stock 5)
- Pembelian: 3 records (2 deleted, 1 final)
- Purchase_details: tested with 1-2 items per purchase
- Activity logs: 12 entries (create/update/delete operations)

### Cleanup
Setelah test selesai:
- ❌ Hapus semua purchase_details (1 record)
- ❌ Hapus semua purchases (1 record)
- ❌ Hapus semua produk test (2 records)
- ❌ Hapus semua kategori test (1 record)
- ❌ Hapus semua supplier test (1 record)
- ❌ Clear activity logs test (12 records)
- ✅ Pertahankan akun `owner` dan `kasir`

**Kondisi database final:**
```
users: 2 (owner/Owner/aktif, kasir/Kasir/aktif)
products: 0
categories: 0
suppliers: 0
purchases: 0
activity_logs: 0
```

---

## 11. SUPPLIER IN-USE GUARD

Test supplier yang masih dipakai purchases:

```python
DELETE /api/suppliers/{sup1}
→ 409 supplier_in_use
{
  "error": "supplier_in_use",
  "data": {
    "purchase_count": 1
  }
}
```

Guard dari **Tahap 7** bekerja dengan benar setelah pembelian dibuat.

---

## 12. MOCK DATA

### Status setelah migrasi

- ✅ `src/lib/mock/db.ts` **TETAP ADA** (fitur lain masih pakai: Transaksi/Hutang/Penyesuaian Stok/Laporan/Dashboard)
- ✅ `kassmart_db_v2` localStorage **TETAP ADA** (fitur lain masih pakai)
- ❌ Halaman `/pembelian` **TIDAK LAGI membaca** `mock/db.ts` atau localStorage
- ❌ Halaman `/produk` **TIDAK LAGI membaca** mock (Tahap 5)
- ❌ Halaman `/kategori` **TIDAK LAGI membaca** mock (Tahap 6)
- ❌ Halaman `/supplier` **TIDAK LAGI membaca** mock (Tahap 7)
- ❌ **Tidak ada fallback** mock jika API gagal

### Dependency yang tersisa ke mock

Halaman/fitur yang **masih menggunakan mock** (belum migrasi):
- Transaksi POS (SALES_TRANSACTIONS + SALE_ITEMS + DEBT_RECORDS)
- Hutang Pelanggan (CUSTOMERS + DEBT_RECORDS + DEBT_PAYMENTS)
- Penyesuaian Stok (STOCK_MOVEMENTS)
- Laporan & Dashboard (agregasi database belum diimplementasikan)

---

## 13. VALIDASI AKHIR

### Prisma
```bash
npx prisma validate
```
**Status:** ✅ Schema valid

### Build
```bash
npm run build
```
**Status:** ✅ Exit 0

**Endpoint API yang ter-build:**
```
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
├ ƒ /api/auth/me
├ ƒ /api/auth/profile
├ ƒ /api/categories
├ ƒ /api/categories/[id]
├ ƒ /api/kasir
├ ƒ /api/kasir/[id]
├ ƒ /api/products
├ ƒ /api/products/[id]
├ ƒ /api/purchases              ← BARU (Tahap 8)
├ ƒ /api/purchases/[id]         ← BARU (Tahap 8)
├ ƒ /api/suppliers
└ ƒ /api/suppliers/[id]
```

Total: **14 dynamic API routes** (+2 dari Tahap 7)

---

## 14. KONFIRMASI TIDAK DIUBAH

### Database
- ✅ `prisma/schema.prisma` — sha256 `07bd792e...` (sama dengan Tahap 4, 5, 6, & 7)
- ✅ Migration `20260915140819_init_kassmart` — sha256 `b69bd894...` (sama dengan Tahap 4-7)
- ✅ **Tidak ada migration baru**
- ✅ **Tidak menjalankan** `prisma migrate dev`, `prisma db push`, atau `prisma migrate reset`
- ✅ Struktur Supabase tetap **15 tabel**

### Dokumentasi
- ✅ ERD tidak diubah
- ✅ PRD tidak diubah
- ✅ Use Case Diagram tidak diubah
- ✅ Activity Diagram tidak diubah
- ✅ Data Dictionary tidak diubah

### Fitur lain
- ✅ Authentication (Tahap 3-4) tidak tersentuh
- ✅ CRUD Kasir (Tahap 4) tidak tersentuh
- ✅ Profil Saya (Tahap 4) tidak tersentuh
- ✅ CRUD Produk (Tahap 5) tidak tersentuh
- ✅ CRUD Kategori (Tahap 6) tidak tersentuh
- ✅ CRUD Supplier (Tahap 7) tidak tersentuh
- ✅ Mock `db.ts` tidak dihapus (fitur lain masih pakai)
- ✅ Design system tidak diubah
- ✅ Layout/Sidebar tidak diubah

---

## 15. SECURITY CHECKLIST

- ✅ Authorization di **server-side** (API layer), bukan hanya UI
- ✅ `user_id` activity log dari **session.id**, bukan request body
- ✅ Password/hash **tidak pernah** di-return API
- ✅ Input divalidasi sebelum masuk database (details, quantity, price)
- ✅ Prisma prepared statements (aman dari SQL injection)
- ✅ ID purchase/product/supplier divalidasi existence
- ✅ Stok management **atomik** via `$transaction` (rollback otomatis jika gagal)
- ✅ Guard stok negatif (insufficient_stock)
- ✅ Supplier in-use guard (409 jika masih dipakai purchases)
- ✅ Next.js 16 async params pattern (`await params`)
- ✅ Total pembelian **server-calculated** (tidak percaya input frontend)

---

## 16. FITUR YANG BELUM MIGRASI

Scope Tahap 8 **HANYA Pembelian + Stok Management**. Fitur berikut **sengaja belum dimigrasi**:

- [ ] Transaksi POS (SALES_TRANSACTIONS + SALE_ITEMS + QRIS + stok keluar)
- [ ] Hutang Pelanggan (CUSTOMERS + DEBT_RECORDS + DEBT_PAYMENTS)
- [ ] Penyesuaian Stok (STOCK_MOVEMENTS manual adjustment)
- [ ] Laporan & Dashboard (agregasi penjualan/pembelian/hutang dari database)

---

## 17. NEXT STEPS (Rekomendasi)

1. **Tahap 9:** Migrasi Transaksi POS (SALES + SALE_ITEMS + stok keluar otomatis + QRIS + Hutang langsung)
2. **Tahap 10:** Migrasi Hutang Pelanggan (CUSTOMERS + DEBT_RECORDS + DEBT_PAYMENTS + pembayaran cicilan)
3. **Tahap 11:** Migrasi Penyesuaian Stok (STOCK_MOVEMENTS + alasan + validasi stok tidak negatif)
4. **Tahap 12:** Migrasi Laporan & Dashboard (query agregasi real-time dari database)

---

## RINGKASAN

**CRUD Pembelian 100% menggunakan database Supabase via Prisma dengan stok management atomik.**

✅ API Routes: GET/POST/PATCH/DELETE purchases + stok update atomik via $transaction  
✅ Validasi: supplier opsional (nullable), details wajib (min 1), quantity > 0, price >= 0, server-side  
✅ Authorization: Owner full access, Kasir **read-only** (GET list+detail, POST/PATCH/DELETE forbidden), API enforce 403  
✅ Activity Log: purchaseCreate/purchaseUpdate/purchaseDelete tercatat  
✅ Stok Management: CREATE → +stock, PATCH → adjust (revert+apply), DELETE → -stock, atomik rollback jika gagal  
✅ UI: layout tetap, Owner CRUD, Kasir read-only (tombol Tambah hidden), data dari API (tanpa fallback mock)  
✅ Test: 32 skenario API — semua lolos, stok management verified correct  
✅ Build: npm run build ✅, 14 API routes (tambah 2 baru)  
✅ Database: schema/migration tidak berubah, 15 tabel tetap utuh  
✅ Next.js 16: async params pattern  
✅ Supplier in-use guard: 409 jika masih dipakai purchases  
✅ Transaction rollback: stok konsisten meski operasi gagal  

**Tahap 8 selesai. Berhenti sesuai instruksi.**
