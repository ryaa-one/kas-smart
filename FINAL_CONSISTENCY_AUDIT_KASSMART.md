# FINAL CONSISTENCY AUDIT KASSMART

Revisi: 14 September 2026 (sesi ke-2) · Sifat: READ-ONLY — tidak satu pun file dokumen/source code diubah; satu-satunya file yang ditimpa adalah laporan audit ini sendiri (artefak output audit sebelumnya, 14 Sep 13:57).

## 0. Artefak yang diaudit (versi terbaru, terverifikasi mtime)

| Sumber | File | Waktu | Catatan |
|---|---|---|---|
| PRD (otoritatif) | PRD_PJBL.docx | 13 Sep 20:01 | 491 paragraf+tabel; TEBAR dari PDF |
| PRD (ekspor) | PRD_PJBL.pdf | 12 Sep 16:46 | 35 hal; SELISIH 1 hari — tertinggal dari docx (lihat F-16) |
| Use Case | Use_Case_Diagram_KasSmart_Revisi.drawio | 9 Sep 19:25 | 2 halaman (Owner, Kasir), 25 UC |
| Activity | Activity_Diagram_KasSmart_Swimlane_PREVIEW.drawio | **14 Sep 18:14** | 21 halaman; DIUBAH TANGAN setelah audit sesi-1 (lihat F-06) |
| ERD relational | ERD_KasSmart_PJBL.drawio | 11 Sep 19:48 | 15 tabel + halaman Data Dictionary |
| ERD Chen | ERD_KasSmart_Chen.drawio | 11 Sep 19:48 | 15 entitas; UQ label: username, barcode, invoice_number, sale_id |
| Frontend | kas-smart/src (23 page.tsx incl. root/layout; 22 halaman; mock db.ts 1041 baris) | ≤ 13 Sep 18:36 | `diff -rq` dengan salinan runtime `~/kassmart-test` = IDENTICAL |
| Backend | prisma/schema.prisma | 12 Agu | Tanpa model (fase backend belum dimulai) |
| DFD | DFD_KasSmart.drawio | 14 Sep | TIDAK diaudit sesuai instruksi |

Metode sesi ini: ekstraksi XML drawio → graf terstruktur; dump teks PRD docx (python-docx) + PDF (PyMuPDF) + diff dua sumber; parse UC/ERD; verifier aliran Activity dijalankan ulang sendiri (reachability start→semua node, 1 end, tanpa dead-end, decision ≥2 cabang); grep guard role & kontrak field per file; `tsc --noEmit`, `next build`, `eslint` dieksekusi ulang.

## 1. Status keseluruhan

🟡 **READY WITH MINOR ISSUES**

Rantai dokumen PRD→UC→AD→ERD lolos tanpa ERROR (temuan level ERROR: TIDAK ADA). Verifikasi build/type-check/verifier diulang hari ini: `tsc` exit 0, `next build` exit 0 (22 route), verifier Activity 21/21 PASS. Empat keputusan kontrak MEDIUM warisan sesi-1 masih terbuka (belum ada schema Prisma, jadi belum terlambat), ditambah 1 temuan MEDIUM baru: **`npm run lint` gagal — 7 error eslint**. Temuan baru level LOW: label halaman AD-01 salah tujuan ("Login Owner/Kasir" seharusnya "Dashboard") dan file AD diedit tangan di luar generator.

## 2. Ringkasan per pasangan

### 2.1 PRD ↔ Use Case — **PASS**
- FR-01..FR-20 (tabel prioritas, 20 baris) ↔ UC-01..UC-25: traceability dua arah lengkap; FR-10→UC-11/12/13, FR-13→UC-16/17/25, FR-17→UC-21, FR-20→UC-24 — semua cocok deskripsi bab 7/10 docx.
- Edge aktor terhitung ulang dari XML: Owner 17 UC (01–08, 15, 16, 18–24), Kasir 7 UC (01, 02, 03, 08, 15, 17, 24). UC-09..14, 25 hanya via include/extend; UC-17 Owner via include UC-16 → sub-aksi "Mencatat Pembayaran Hutang". Tidak ada edge liar, tidak ada UC tanpa dasar PRD.
- UC-21 label "Mengelola Data Kasir" + aturan "tanpa hapus permanen" cocok bab User Roles/FR-17 docx. Batasan (tanpa register, tanpa member/loyalty, QRIS manual) cocok.

### 2.2 Use Case ↔ Activity Diagram — **PASS (1 LOW baru)**
- Pemetaan 21 halaman ↔ 25 UC identik dengan sesi-1 (08+09+10+14→p.03; 13+25→p.06; 16→p.18; dst). Verifier aliran hari ini: **21/21 PASS** — semua node action/decision terjangkau start, tepat 1 endState per halaman, tidak ada dead-end, semua decision bercabang ≥2.
- Lane per halaman cocok aktor UC (07/08/10/12/13/14/15/19/20/21 = Owner; 03/04/05/06/09/11/16/17/18 = Owner/Kasir). AD-18 memakai decision "Role pengguna?" (Owner→CRUD penuh, Kasir→lihat+lanjut bayar) = persis aturan UC-16/UC-17.
- Cabang pembayaran AD-03: decision "Metode pembayaran?" fan-out Tunai/QRIS/Hutang, ketiga sub-activity bermuara ke end yang sama; QRIS p.05 loop "Tetap Menunggu" dan exit "Batal"→Dibatalkan tanpa invoice/stok — cocok UC-12.
- **LOW (F-05 baru)**: AD-01 Login melabeli akhir alur "Sistem mengarahkan ke halaman **Login** Owner / **Login** Kasir" — PRD workflow Login langkah 6–7 dan deskripsi activity (a.) jelas menuliskan **Dashboard** Owner/Kasir. Node "Membuka Halaman khusus **admin dan user**" juga memakai istilah admin/user, bukan Owner/Kasir. Kode frontend BENAR (login → /dashboard atau /kasir/dashboard), jadi ini cacat label dokumen saja.

### 2.3 Activity Diagram ↔ ERD — **PASS**
- Semua node yang menyebut tabel konsisten: p.06 "Sistem menyimpan pelanggan baru ke CUSTOMERS", "membuat DEBT_RECORDS", "menetapkan total_debt dan remaining_debt", "status DEBT_RECORDS Unpaid" = kolom DEBT_RECORDS ERD; p.09 "Sistem membuat DEBT_PAYMENTS" = FK debt_id/user_id/payment_date/amount/note; p.08 memakai quantity_change SELISIH (catatan 1 PRD); p.10 menyimpan "akun kasir" sebagai USERS role Kasir — TIDAK ada entitas KASIR di Chen maupun relational (konsisten).
- Status yang disebut AD (Draft, Menunggu Pembayaran, Lunas, Hutang, Dibatalkan; Unpaid/Partial/Paid) = enum ERD/PRD.

### 2.4 ERD ↔ PRD — **PASS dengan 1 MEDIUM warisan + 2 LOW baru**
- 15 entitas: field, FK, nullable (supplier_id, customer_id, amount_paid/change/paid_at, barcode), unique (username, barcode-if-filled, invoice_number, sale_id 1:0..1) cocok penjelasan entitas 1–15 docx + halaman Data Dictionary ERD.
- created_at vs paid_at, barcode NULL-boleh-UNIQUE-bila-isi, customer_id wajib-hanya-hutang: rumusan identik dua arah.
- **MEDIUM warisan F-03**: PRD UC-21 + DFD 8.2 + frontend mewajibkan email unik; label ERD (Chen & relational) hanya menandai UQ pada username. ERD = satu-satunya dokumen yang tertinggal di sini.
- **LOW baru F-17**: PRD内部 inkonsisten menyebut FK pembayaran hutang dua nama: entity 12 & ERD memakai `debt_id`, workflow "Ketika Pelanggan Membayar Hutang" & narasi DFD memakai `debt_record_id`. Mock memakai `debt_id` (ikut ERD). Pilih satu nama sebelum schema.
- **LOW baru F-18**: workflow Pembayaran Hutang docx memakai kode Inggris (`payment_method = debt`, `status = debt`) sementara bab lain memakai label Indonesia (Hutang); dan docx sidebar Owner §Catatan 11 salah ketik "**Stattistik** Kasir". Typo lain docx: "Worfklow Informasi Toko", "Halamat register", BMC "Owner & **Kasit**", "**dekstop**/tablet". Semua murni tipografi, tanpa dampak teknis.

### 2.5 ERD ↔ Source code (kas-smart/) — **WARNING (4 MEDIUM kontrak, tetap terbuka)**
`src/lib/mock/db.ts` (10 koleksi) + `users.ts` memetakan 15 tabel; field snake_case sama dengan ERD; nested `details`/`payments` = bentuk agregat wajar untuk mock. Yang cocok: barcode `string|null`+`barcodeTaken()` (uniq-if-filled, excludeId saat edit — produk/page.tsx:108), `paid_at: string|null`, `user_id` NOT NULL di semua header, `supplier_id: string|null` (H-5), `remaining_debt`+status Unpaid/Partial/Paid, `quantity_change` selisih+tolak hasil negatif, STORE_SETTINGS incl. `qris_image`, ACTIVITY_LOGS (user_id, action, description, created_at).
Selisih yang wajib diputuskan saat schema (TIDAK diubah saat audit): F-01 `change_given` (db.ts:89,645,755,907) vs `change_amount` (ERD); F-02 `DebtRecord.sale_id: string|null` (db.ts:108,813 — hutang manual UC-16) vs ERD "sale_id FK+UQ" tanpa tanda nullable; F-04 Draft `invoice_number:""` (db.ts:636) vs UNIQUE; F-03 email UQ (lihat 2.4). Enum mock lowercase (`draft/paid/...`, `cash/qris/debt`, `active/inactive`) vs label dokumen — jembatan UI sudah benar (LOW F-09 lama).

### 2.6 Role & permission Owner/Kasir — **PASS**
- Guard terpusat `components/layout/DashboardLayout.tsx:39-41`: `/kasir` (persis) = CRUD akun → Owner-only; `/kasir/*` + `/transaksi` = shared; sisanya Owner-only → 403 untuk Kasir (9 URL diverifikasi runtime sesi-1; kode tidak berubah sejak itu — src salinan runtime IDENTICAL).
- Sidebar (`Sidebar.tsx:14-37`): Owner 15 item, Kasir 5 item + tombol Logout (baris 146) = PRD Catatan 11/12. Owner list frontend memisah "Transaksi" (/transaksi) dan "Kasir" (/kasir CRUD) — PRD hanya mencantumkan "Kasir" satu entri; workflow PRD memang membolehkan Owner bertransaksi → perluasan label, bukan fitur hantu (INFO F-19).
- Aksi per UC cocok: hapus kategori/supplier diberi guard pemakaian (produk/page vs `productsUsingCategory`; supplier vs `purchasesUsingSupplier`); produk tanpa hapus permanen (`setProductActive`); kasir tanpa `deleteUser` (users.ts:115-117注释 eksplisit), validasi username+email unik di kasir/page.tsx:108-112 dan profil-saya/page.tsx:66-69; nonaktif ditolak login (`authenticate` users.ts:82 → pesan `errorInactive` login/page.tsx:43); hutang: aksi Owner dijaga `isOwner` (hutang-pelanggan/page.tsx:39,154,211,256), Kasir hanya lihat+Bayar; pelanggan CREATE-only dari transaksi — `updateCustomer`/`deleteCustomer` TIDAK ada di kode mana pun; riwayat Kasir difilter `user_id` sesi (`mineOnly`, riwayat-penjualan/page.tsx:42); log & statistik hanya lewat guard Owner.

### 2.7 Transaksi Tunai / QRIS / Hutang — **PASS**
- Tunai: `cashInsufficient` memblokir tombol Konfirmasi (transaksi/page.tsx:158,602); `finalizeSale` → status paid, `paid_at`, `amount_paid`, `change_given`, stok berkurang, invoice, log `sale` (db.ts:756-769,795).
- QRIS: `setSaleMethod` → `waiting_payment` tanpa sentuh stok (db.ts:672-678); `cancelSale` → `cancelled`, invoice tetap diberikan agar unik-riwayat, stok utuh, log `saleCancel` (db.ts:697-710); Konfirmasi Lunas → jalur tunai + log `qrisConfirm`. `qris_image` dibaca dari settings (transaksi/page.tsx:303).
- Hutang: wajib pelanggan (transaksi/page.tsx:234), `finalizeSale(debt)` → status debt, paid_at null, DEBT_RECORD Unpaid `remaining=total`, `sale_id` terisi (db.ts:751-785); pelunasan total → `payDebt` menormalkan transaksi sumber ke paid + paid_at (db.ts:901-908) = aturan paid_at "Hutang saat remaining_debt=0". Invoice unik via `nextInvoiceNumber` (max+1 — race-prone di DB, F-07 lama tetap berlaku untuk backend).
- Struk/invoice memakai identitas toko dari settings (`ReceiptModal.tsx:55-57,152`) = UC-14/UC-20.

### 2.8 Stok, Pembelian, Hutang, Barcode, Laporan, Kasir, Log — **PASS**
- Stok hanya di PRODUCTS; naik saat `addPurchase` (db.ts:943-946), turun hanya saat lunas/hutang, koreksi via selisih `addAdjustment` (tolak hasil < 0). UI penyesuaian satu produk per header vs ERD 1:N detail — shape data mendukung N, UI membatasi 1 (INFO F-20).
- Pembelian: supplier opsional, header+detail+harga historis. Barcode: input manual + kamera ZXing di Produk dan Kasir (`BarcodeScanner.tsx`, transaksi/page.tsx:184,717; produk/page.tsx:362). Laporan: 7 tab = 7 jenis PRD (sales/purchases/profit/stock/suppliers/debt/adjustments, laporan/page.tsx:18). Kelola Kasir & Log: lengkap (log mock 27 aksi ⊇ 17 daftar PRD, payung "dan aktivitas lainnya" — INFO). Pembeli/penjual name-snapshot = read-model by design.

### 2.9 Field, FK, nullable, unique, enum, alur — terangkum di 2.4/2.5 + Findings.
### 2.10 Build / type-check / validator — **PASS, kecuali lint**
- `npx tsc --noEmit` exit 0; `next build` exit 0 — 22 route static ter-prerender; verifier Activity self-made 21/21; `diff -rq` src vs salinan runtime IDENTICAL.
- **MEDIUM baru F-04**: `npm run lint` **exit 1 — 7 error + 9 warning**. Error (semua rule react-hooks v6/Next16): `informasi-toko/page.tsx:23`, `profil-saya/page.tsx:43`, `transaksi/page.tsx:88`, `lib/auth.tsx:55` = set-state sinkron dalam effect; `BarcodeScanner.tsx:28` (refs saat render), `:73` (akses sebelum deklarasi `errorFor`), `:91` (set-state-in-effect). Tidak memblokir build/runtime (semua alur sudah lolos smoke), tapi gerbang CI/lint merah dan `BarcodeScanner.tsx:73` adalah defect urutan deklarasi nyata.

## 3. Temuan prioritas

| ID | Sev | Temuan | Lokasi | Rekomendasi |
|---|---|---|---|---|
| F-01 | MEDIUM | `change_given` (mock) vs `change_amount` (ERD/PRD) | db.ts:89,645,755,907 vs ERD t_sales | Putuskan 1 nama saat API layer (anjuran: ikut ERD) |
| F-02 | MEDIUM | Hutang manual `sale_id: null` vs ERD sale_id UQ tanpa tanda nullable | db.ts:108,813 vs ERD DEBT_RECORDS | `sale_id` nullable+unique (partial index) ATAU pisahkan jalur manual — dokumentasikan |
| F-03 | MEDIUM | Email unik di PRD/DFD/frontend; label ERD hanya UQ username | ERD USERS vs users.ts:94 | Tambah `@@unique([email])` di Prisma; selaraskan label ERD di sesi dokumen |
| F-04 | MEDIUM | **Lint gagal: 7 error** (set-state-in-effect ×4, refs, akses-sebelum-deklarasi `errorFor` di scanner) | lihat §2.10 | Perbaiki sebelum backend; rule react-hooks ini nyata (render cascade) |
| F-05 | LOW | AD-01 salah label tujuan: "halaman Login Owner/Kasir" + "khusus admin dan user"; PRD/UC/kode = Dashboard Owner/Kasir | Activity p.01 vs PRD workflow Login 6–7 | Revisi label saat AD diedit lagi |
| F-06 | LOW | AD di-edit TANGAN (14 Sep 18:14) di luar generator — `gen_activity_diagrams.py` tidak memuat "Tampil form login"/"Tekan tombol login"/node admin-user; re-run generator akan menimpa edit | Activity_..._PREVIEW.drawio vs gen_activity_diagrams.py | Sinkronkan generator dengan file terkini sebelum eksperimen re-generate |
| F-07 | LOW | `nextInvoiceNumber` max()+1 & clamp `Math.max(0, stock-qty)` race-prone | db.ts:468-476,598-603 | Backend: DB transaction + guard `stock >= qty` per baris + sequence |
| F-08 | LOW | Dua nama FK pembayaran: `debt_id` (entity ERD/PRD + mock) vs `debt_record_id` (workflow & DFD PRD) | PRD workflow vs ERD | Tetapkan `debt_id` (ikuts ERD) atau sebaliknya, satu arah |
| F-09 | LOW | Enum mock lowercase vs label Indonesia dokumen (status transaksi/hutang, role status active/inactive) — jembatan UI sudah ada | db.ts:64-70,96; users.ts:15 | Petakan sekali di enum Prisma |
| F-10 | LOW | Draft `payment_method: null` padahal ERD tak menandai nullable; tumpang tindih `created_at` vs `transaction_date` saat draft | db.ts:641-647 | Pasangan F-04 draft: jangan persist draft ATAU nullable-kan |
| F-16 | INFO | PDF PRD (12 Sep) tertinggal docx (13 Sep 20:01); docx = otoritatif audit ini; typo docx "Stattistik Kasir", "Worfklow", "Halamat", "Kasit", "dekstop" | PRD_PJBL.* | Regenerate PDF via export_prd.ps1 setelah typo dibereskan |
| F-19 | INFO | Sidebar Owner frontend 15 item vs PRD 14 (Transaksi & Kelola Kasir dipisah; Owner memang boleh transaksi) | Sidebar.tsx:14-30 | Tidak perlu ubah; catatan saja |
| F-20 | INFO | Penyesuaian stok UI 1 produk/header vs ERD 1:N details (mock sudah support array) | penyesuaian-stok/page.tsx:63-72 | Naikkan ke multi-item bila diperlukan, tanpa ubah ERD |
| F-13/14/15 | INFO | (warisan) name-snapshot denormal; `reason` enum-4 vs teks bebas; modul mock lama tak terpakai (hanya `ChartPoint` dashboard.ts yang masih diimport) | db.ts, master/owner/kasir.ts | Bersihkan saat fase backend |
| F-21 | INFO | `URL.createObjectURL` logo/QRIS → URL blob mati setelah reload; sesi users vs db terpisah (kassmart_users vs kassmart_db_v1); settings tanpa id | informasi-toko/page.tsx:97,125; users.ts | Akan hilang saat upload betulan + satu endpoint |

ERROR: tidak ada. CRITICAL/HIGH: tidak ada.

## 4. Keputusan yang masih diperlukan (pintu gerbang sebelum backend)

1. **F-01** nama field kembalian final → `change_amount` (ERD) atau `change_given` (mock).
2. **F-02** pemodelan hutang manual UC-16 vs `DEBT_RECORDS.sale_id` UNIQUE.
3. **F-03** `USERS.email` `@@unique` di Prisma (PRD otoritatif) + selaraskan label ERD.
4. **F-04-strategy** Draft: `invoice_number` nullable sampai lunas ATAU draft tidak dipersist.
5. **F-08** nama FK pembayaran hutang final: `debt_id` vs `debt_record_id`.
6. **F-04** perbaiki 7 error lint sebelum menulis API (atau putuskan lint bukan gerbang).

## 5. Rekomendasi langkah berikutnya

1. Ambil keputusan 1–5 di atas sebagai catatan 1 halaman (tidak mengubah file apa pun sekarang).
2. Fase backend: isi `prisma/schema.prisma` (15 model, enum, unique, nullable) mengikuti keputusan; mulai API route per entitas; ganti lapisan `db.ts` (signature repository-shaped sudah disiapkan).
3. Sekali edit dokumen (jika guru meminta): label AD-01 → "Dashboard Owner/Kasir", hapus istilah admin/user; UQ email di ERD; samakan `debt_id`; bersihkan typo docx lalu regenerate PDF (saat ini PDF ekspor 12 Sep masih valid isinya — bedanya hanya sidebar §Catatan dan BMC table tidak terekstrak teks).
4. Sebelum re-run `gen_activity_diagrams.py`: sinkronkan generator dengan AD tangan terbaru (F-06), kalau tidak hasil generate akan mengembalikan node lama.
5. Perbaiki 7 error eslint (terutama `BarcodeScanner.tsx:73` akses sebelum deklarasi) → `npm run lint` hijau.
6. Backend jadi → smoke test ulang 21 skenario PERBAIKAN_FRONTEND_KASSMART.md terhadap API nyata.

---
Konfirmasi read-only: seluruh dokumen (.drawio, .docx, .pdf), `src/`, `prisma/`, `.env` tidak disentuh (write hanya ke /tmp/audit9 + file laporan ini); `git status` kas-smart hanya berisi perubahan milik user dari sesi perbaikan sebelumnya (41 file M, tidak bertambah akibat audit ini). Verifikasi ulang post-audit di §6.
