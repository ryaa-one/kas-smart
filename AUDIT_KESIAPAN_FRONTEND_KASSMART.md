# Audit Kesiapan Frontend KasSmart

Tanggal audit: 13 September 2026.
Sumber acuan: PRD_PJBL.pdf (35 hal., v terbaru — bab 6 User Roles, 7 FR-01..FR-20, 9 Business Rules, 10 UC-01..UC-25, 11 Activity a–u / 21 diagram, 13 DFD Level 0–2 / 15 data store, 14 ERD 15 entitas, 16 Workflow, catatan 1–12 termasuk BATASAN SISTEM), Use_Case_Diagram_KasSmart_Revisi.drawio (25 UC terverifikasi), Activity_Diagram (21 halaman generator), DFD_KasSmart.drawio, ERD_KasSmart_Chen.drawio.
Metode: (1) audit kode sumber `src/` (41 file TS/TSX, ±6.900 baris), (2) testing runtime browser against `next dev` (localhost:3111, salinan kode identik di ~/kassmart-test — source project TIDAK diubah), sesi Owner (admin) dan Kasir (user), DOM/console probes. Tidak ada file sumber/dokumen yang dimodifikasi selama audit.

## 1. Ringkasan

| Metrik | Hasil |
|---|---|
| Halaman wajib PRD (utama) | 17 (16 menu Owner+Kasir + Statistik Kasir) + form/detail turunan |
| Halaman terimplementasi | 16 route unik (login, dashboard Owner, dashboard Kasir, transaksi + 4 alias kasir, produk, kategori, supplier, kelola kasir, pembelian, hutang pelanggan, penyesuaian stok, riwayat, laporan, informasi toko, log aktivitas, profil saya) |
| Halaman wajib belum ada | **Statistik Kasir (FR-18/UC-22) — nol implementasi** |
| Halaman perlu perbaikan | Kelola Kasir (ada tombol hapus ilegal), Hutang Pelanggan (CRUD Owner tak ada), Invoice/struk (template belum) |
| Skenario fitur dites | 48 skenario |
| Hasil | 30 PASS · 6 PARTIAL · 12 FAIL |
| Console/runtime error | **0** di semua route & seluruh alur interaksi (listener window error + unhandledrejection); error path scanner (kamera absent) ditangani tanpa crash, `<video>` unmount setelah close (diverifikasi: videos=1 saat open → 0 setelah close) |
| Guard role via URL | PASS — 12 URL Owner → 403 untuk Kasir; unauthenticated → redirect /login |
| Registrasi | PASS — tidak ada halaman/link register |

Status keseluruhan: **PARTIAL — siap-siap-backend belum tuntas**. UI, navigasi, guard role, dan form validasi dasar solid; namun alur inti PRD (stok berkurang/bertambah, riwayat tersambung, hutang tercatat dari transaksi, log aktivitas tercatat, invoice ber-identitas toko) belum terjadi bahkan sebagai state-change frontend, dan 1 halaman wajib hilang.

## 2. Audit Halaman

| No | Halaman | Role | Status | Catatan |
|---|---|---|---|---|
| 1 | /login | Owner+Kasir | ✓ Ada | Validasi kosong, pesan salah kredensial, pesan akun nonaktif, loading state, switcher ID/EN, tanpa link register |
| 2 | /dashboard (Owner) | Owner | ! Belum lengkap | Semua 11 butir PRD 2a–2k tampil, tetapi 100% statis `lib/mock/dashboard.ts` (128 produk, 4 kasir, aktor "Siti/Budi" tak dikenal sistem); link "Lihat semua aktivitas" `href="#"` mati |
| 3 | /kasir/dashboard | Kasir | ✓ Ada | 4 butir PRD (penjualan hari ini, jumlah transaksi, shortcut, aktivitas); fallback "hari ini" = tanggal terakhir mock (`ponytail` comment) |
| 4 | /transaksi (+/kasir/transaksi) | Owner+Kasir | ! Belum lengkap | Alur cart→payment→success + scan OK; TIDAK ada draft persisted, TIDAK ada status "Menunggu Pembayaran"/"Dibatalkan" yang tersimpan, stok tidak berkurang, invoice number lemah |
| 5 | /produk | Owner | ✓ Ada | Tabel+search+filter kategori, modal tambah/ubah, scan ZXing, toggle aktif. Tanpa detail "Lihat" (UC-04 menyebut melihat); ada tombol Hapus hard-delete (UC-04 hanya nonaktifkan); duplikasi barcode lolos |
| 6 | /kategori | Owner | ✓ Ada | Tambah/ubah/hapus ada; TANPA penolakan "kategori masih digunakan" (UC-05) |
| 7 | /supplier | Owner | ✓ Ada | Tambah/ubah/hapus ada; TANPA penolakan "supplier masih digunakan" (UC-06) |
| 8 | /kasir (Kelola Kasir) | Owner | ! Belum lengkap | Tambah/ubah/aktif/nonaktif + unik username OK; ADA tombol Hapus permanen → melanggar PRD hal.5,17 no.17 & UC-21 ("nonaktif menggantikan hapus") |
| 9 | /pembelian | Owner | ✓ Ada | Form multi-line + detail modal + validasi; TIDAK menaikkan stok & supplier dipaksa wajib (PRD: opsional) |
| 10 | /hutang-pelanggan (+alias kasir) | Owner (CRUD)/Kasir (lihat+bayar) | ! Belum lengkap | List, summary, filter, modal bayar+riwayat+validasi nominal OK; UC-16 (Owner tambah/ubah/hapus data hutang) tidak ada — tombol tersebut memang tidak tersedia bagi role mana pun |
| 11 | /penyesuaian-stok | Owner | ✓ Ada | Field selisih + alasan + hint benar; TANPA validasi "stok hasil tidak negatif" (UC-18) dan stok produk tidak berubah |
| 12 | /riwayat-penjualan (+/kasir/riwayat-transaksi) | Owner semua / Kasir hanya sendiri | ✓ Ada | Filter invoice/tanggal/metode/status + detail modal SALE_DETAILS; untuk Kasir TIDAK difilter milik sendiri (UC-15) |
| 13 | /laporan | Owner | ✓ Ada | 7 tab (penjualan, pembelian, profit, stok, supplier, hutang, penyesuaian) + filter rentang tanggal — lengkap sesuai FR-15 |
| 14 | /informasi-toko | Owner | ✓ Ada | Semua field STORE_SETTINGS (nama, logo, alamat, telepon, footer struk, qris_image upload); save tidak persist (reset saat reload) |
| 15 | /log-aktivitas | Owner | ! Belum lengkap | Tabel + cari + filter pengguna & jenis aksi + warna chip; TANPA filter tanggal (UC-23) dan TANPA tampilan detail aktivitas; isi = mock statis, nol aksi user tercatat |
| 16 | /profil-saya (+alias kasir) | Owner+Kasir | ✓ Ada | Ikuti akun login, validasi lengkap (username, email, password min 8, konfirmasi); save tidak persist ke store users |
| 17 | Statistik Kasir | Owner | ✗ Tidak ada | FR-18/UC-22/Activity-20/DFD 7.3: nol route, nol entri sidebar, nol terjemahan (`grep statistik` = 0 hit) |
| 18 | Invoice/struk (cetak) | Owner+Kasir | ! Belum lengkap | `window.print()` mencetak seluruh halaman (sidebar+topbar ikut); tidak ada template struk dengan identitas toko (FR-11, UC-14) |
| 19 | Tambah pelanggan in-transaksi (UC-25) | Owner+Kasir | ✓ Ada | Modal dari alur Hutang, validasi nama, auto-terpilih setelah simpan — persis UC-25 |
| 20 | Detail pembelian | Owner | ✓ Ada | Modal header+line items+total |
| 21 | Detail transaksi riwayat | Owner+Kasir | ✓ Ada | Modal SALE_DETAILS dengan unit_selling_price historis |

## 3. Testing Fitur

Semua diuji runtime di browser (dev server localhost:3111), bukan hanya baca kode.

| No | Fitur | Role | Skenario | Status | Catatan |
|---|---|---|---|---|---|
| 1 | Login kredensial salah | Both | admin/salah → pesan "Username atau password salah" | PASS | Tetap di /login, tanpa console error |
| 2 | Login kosong | Both | submit tanpa isi → 2 error required inline | PASS | |
| 3 | Login Owner | Owner | admin/admin → /dashboard | PASS | Redirect sesuai role (PRD workflow) |
| 4 | Login Kasir | Kasir | user/user → /kasir/dashboard | PASS | |
| 5 | Login akun nonaktif | Kasir | kasiruji (baru dibuat, dinonaktifkan) → ditolak "Akun ini nonaktif. Hubungi pemilik toko." | PASS | Sesuai UC-21 |
| 6 | Logout | Kasir | Keluar → /login, `kassmart_session` bersih | PASS | |
| 7 | Guard unauthenticated | — | /laporan tanpa sesi → redirect /login | PASS | |
| 8 | Dashboard Owner render | Owner | 6 stat + 3 grafik + low stock + aktivitas | PASS* | Render lengkap tapi data statis (lihat Temuan M-3) |
| 9 | Dashboard Kasir | Kasir | penjualan hari ini Rp185.000, 2 transaksi, shortcut, aktivitas | PASS | Difilter by name user login |
| 10 | Cari produk transaksi | Both | "telur" → hanya Telur Ayam 1kg | PASS | |
| 11 | Tambah item + dedupe | Both | Tambah ×2 → 1 baris qty 2 (bukan duplikat) | PASS | |
| 12 | Validasi stok cart | Both | qty + dibatasi stok (disabled saat qty≥stok), out-of-stock label | PASS | |
| 13 | Hapus item cart | Both | ikon trash menghapus baris | PASS | |
| 14 | Subtotal/total | Both | dihitung ulang otomatis | PASS | |
| 15 | Pembayaran Tunai kurang | Both | nominal < total → error + tombol Konfirmasi disabled | PASS | |
| 16 | Pembayaran Tunai cukup | Both | kembalian dihitung (Rp500.000−Rp360.000=Rp140.000), sukses + nomor invoice | PASS | |
| 17 | Pembayaran QRIS | Both | badge "Menunggu Pembayaran", QR tampil, manual Konfirmasi Lunas → sukses | PARTIAL | Alur benar TAPI gambar = placeholder hardcoded, bukan store_settings.qris_image; status menunggu tidak persisted |
| 18 | Hutang tanpa pelanggan | Both | Konfirmasi tanpa pilih pelanggan → error wajib | PASS | PRD: customer wajib untuk Hutang |
| 19 | Tambah pelanggan in-flow (UC-25) | Both | modal, validasi nama kosong ditolak, simpan → otomatis terpilih | PASS | |
| 20 | Transaksi hutang tersimpan | Both | setelah sukses, cek /hutang-pelanggan → TIDAK ada DEBT_RECORD baru | FAIL | Tidak ada pembuatan catatan hutang (UC-13/Activity f); state halaman hutang = mock terpisah |
| 21 | Stok berkurang pasca transaksi | Both | setelah 3 transaksi sukses, stok mock tetap (120/85/…) | FAIL | Aturan bisnis PRD hal.12 & Workflow "Sistem mengurangi stok" tidak terjadi bahkan di state mock |
| 22 | Transaksi masuk riwayat | Both | riwayat tetap 7 baris mock, transaksi baru tidak muncul | FAIL | Riwayat ≠ hasil transaksi |
| 23 | Scan barcode (kamera) | Both | buka scanner → error path "Kamera tidak ditemukan" + tombol Coba Lagi; tutup → video unmount | PASS | Headless tanpa kamera; cleanup stream terverifikasi (video 1→0) |
| 24 | Cetak invoice | Both | tombol Cetak → window.print() whole page | PARTIAL | Tidak ada layout struk ber-identitas toko (FR-11) |
| 25 | Tambah produk | Owner | form lengkap tersimpan in-memory; harga jual≤beli ditolak ("Harga jual harus lebih besar dari harga beli") | PASS | |
| 26 | Barcode produk duplikat | Owner | isi barcode = milik produk lain → TETAP tersimpan | FAIL | ERD: barcode UNIQUE jika diisi; tidak divalidasi |
| 27 | Barcode NULL | Owner | simpan tanpa barcode → diisi string "-" placeholder | PARTIAL | Interface `barcode: string` non-nullable; backend perlu null, bukan "-" |
| 28 | Nonaktifkan/aktifkan produk | Owner | toggle status Aktif/Nonaktif bekerja | PASS | |
| 29 | Hapus produk | Owner | tombol Hapus hard-delete baris | FAIL* | UC-04 hanya menambah/mengubah/melihat/menonaktifkan — delete di luar PRD |
| 30 | Persistensi CRUD master | Owner | reload /produk → 12 baris awal, semua perubahan hilang | FAIL | Hanya akun kasir yang persist (localStorage); inkonsisten |
| 31 | Kategori: hapus terpakai | Owner | hapus "Beras" (2 produk) → berhasil terhapus | FAIL | UC-05 mewajibkan penolakan "kategori masih digunakan" |
| 32 | Supplier: hapus terpakai | Owner | hapus "CV Sumber Rejeki" (ada PO) → terhapus | FAIL | UC-06 mewajibkan penolakan "supplier masih digunakan" |
| 33 | Pembelian baru | Owner | form supplier+produk+qty+harga tersimpan, muncul di list | PARTIAL | Stok TIDAK bertambah (PRD: otomatis +), supplier dipaksa wajib (PRD: opsional), hilang saat reload |
| 34 | Hutang: bayar > sisa | Both | nominal 99999999 → "Nominal pembayaran tidak boleh melebihi sisa hutang" | PASS | |
| 35 | Hutang: bayar sampai lunas | Both | Rp62.000 → sisa 0, badge Paid, success banner, riwayat pembayaran bertambah | PASS | user_name pencatat ikut tercatat |
| 36 | Penyesuaian stok negatif berlebih | Owner | stok 120, quantity_change −999 → TERSIMPAN | FAIL | UC-18: validasi stok hasil tidak negatif; stok master pun tidak berubah |
| 37 | Riwayat filter | Owner | search invoice + rentang tanggal berfungsi | PASS | |
| 38 | Riwayat scope Kasir | Kasir | tabel menampilkan transaksi Musthofa Arya (Owner) | FAIL | UC-15: Kasir hanya transaksi miliknya |
| 39 | Laporan 7 tab + filter tanggal | Owner | semua tab render, tab penyesuaian 4 baris | PASS | |
| 40 | Informasi toko save | Owner | validasi + toast sukses; reload → balik ke mock | PARTIAL | Upload logo/QRIS pakai URL.createObjectURL (hilang saat reload) |
| 41 | Kelola Kasir tambah | Owner | akun baru muncul, toast "berhasil ditambahkan" | PASS | |
| 42 | Kelola Kasir username dup | Owner | "kasiruji" dup → "Username sudah digunakan" | PASS | |
| 43 | Kelola Kasir nonaktifkan | Owner | confirm → status Nonaktif → login ditolak | PASS | Rantai aktif/nonaktif↔login bekerja penuh |
| 44 | Kelola Kasir hapus | Owner | tombol Hapus → akun terhapus permanen | FAIL | PRD: "Sistem tidak menyediakan penghapusan akun kasir" |
| 45 | Log aktivitas content | Owner | filter user/aksi OK; aksi-aksi barusan (tambah kasir, bayar hutang, transaksi) TIDAK muncul di log | FAIL | UC-23/FR-19 butir a–q: log harus mencatat; frontend tidak menulis satu pun |
| 46 | Profil saya | Both | field terisi dari sesi, validasi bekerja; save tidak tersimpan ke store users | PARTIAL | |
| 47 | Switcher bahasa ID/EN | Both | tersedia di login + sidebar semua halaman | PASS | |
| 48 | Console error sweep | Both | 10 route + seluruh alur interaksi dengan listener error/unhandledrejection | PASS | 0 error runtime |

## 4. Role & Permission

| Fitur/Halaman | Owner | Kasir | Status | Catatan |
|---|---|---|---|---|
| Sidebar | 14 item = 13 item PRD (label "Kasir" → "Transaksi", posisi sesuai) | 5 item = PRD no.10 (Dashboard, Transaksi, Hutang, Riwayat, Profil) + Logout | PASS | Digerakkan role dari useAuth |
| /produk, /kategori, /supplier, /pembelian, /penyesuaian-stok, /laporan, /informasi-toko, /log-aktivitas, /kasir (CRUD), /dashboard | akses penuh | 403 via URL langsung | PASS | Guard di DashboardLayout; 403 punya link kembali ke dashboard sendiri |
| /kasir/* alias + /transaksi | akses | akses | PASS | Area shared sesuai PRD (Owner boleh transaksi) |
| /hutang-pelanggan | list+lihat+bayar | list+lihat+bayar (via /kasir/hutang-pelanggan); TANPA tombol tambah/ubah/hapus hutang | PARTIAL | Batas Kasir sudah benar (UC-17), tapi sisi Owner UC-16 belum ada CRUD-nya |
| /riwayat | semua transaksi | harusnya HANYA milik sendiri — saat ini masih semua | FAIL | `mockSales` tidak difilter `cashier_name===user.name` di mode Kasir |
| /profil-saya | milik sendiri | milik sendiri (data ikut login) | PASS | UC-24 |
| CRUD/aksi kasir | tambah, ubah, aktif, nonaktif — plus **hapus (ilegal)** | tidak ada akses halaman | FAIL | Hapus melanggar FR-17/UC-21/Batasan 12d |
| Register | tidak ada | tidak ada | PASS | Batasan 12c |
| Login akun nonaktif | — | ditolak | PASS | UC-21 |
| Buat pelanggan | hanya in-flow transaksi Hutang | hanya in-flow transaksi Hutang | PASS | Tidak ada menu CRUD pelanggan (benar: bukan member/loyalty) |

## 5. Kesiapan Backend

| Fitur | Siap Backend? | Mock/Hardcoded? | Catatan |
|---|---|---|---|
| Auth/login (lib/auth.tsx, mock/users.ts) | SIAP | mock + localStorage `kassmart_users`, password plaintext | Struktur {ok,reason:"invalid"\|"inactive"} tinggal dipetakan ke POST /api/login; perlu hash + session/token |
| Kelola Kasir | SIAP | CRUD via users.ts (satu-satunya store yang persist) | Ada `deleteUser()` yang harus dibuang saat API dibuat; ID lokal `U-0xx` dari length+1 (rentan tabrakan) |
| Transaksi/penjualan | TIDAK SIAP | mockKasirProducts & mockKasirCustomers in-memory | Belum mengirim user_id, belum persist; nomor invoice lokal `INV/tgl/(cart.length+3)` (duplikat mungkin); tidak menghasilkan SALE_DETAILS/DEBT_RECORDS/ACTIVITY_LOGS; QRIS pakai placeholder bukan qris_image |
| Produk | SETENGAH | mockProducts in-memory | Field ikut ERD (category_id, purchase_price, stock, minimum_stock, is_active, barcode) ✓; tapi barcode non-nullable string ("-"), tanpa unik, tanpa relasi stok ke transaksi/pembelian/penyesuaian |
| Kategori/Supplier | SETENGAH | in-memory | `product_count` hardcoded di seed, bukan dihitung dari data — backend harus agregasi |
| Pembelian | TIDAK SIAP | header mockPurchases in-memory | Tidak menulis ke store stok; supplier_id wajib di UI padahal ERD nullable; detail sudah quantity+unit_purchase_price historis ✓ |
| Hutang/DEBT_RECORDS | TIDAK SIAP | mockDebts in-memory | Pembayaran berjalan di state lokal halaman; tidak terhubung ke transaksi hutang baru; sudah punya total_debt/remaining_debt/status/payments (pola ERD) ✓ |
| Penyesuaian stok | TIDAK SIAP | in-memory | quantity_change selisih ✓; tidak memvalidasi hasil & tidak mengubah stok; satu adjustment = 1 produk (ERD: header + N detail) |
| Riwayat/Laporan/Dashboard/Statistik | SETENGAH | mock statis per halaman | Shape data mendekati ERD; semua query agregasi (profit, statistik kasir, laporan tanggal) harus pindah ke backend; field SALES_TRANSACTIONS belum lengkap |
| Informasi Toko | SETENGAH | mockStoreSettings konstan | Upload → objectURL hilang; backend butuh penyimpanan file qris_image/logo nyata |
| Log Aktivitas | TIDAK SIAP | mockActivityLogs konstan | 0 penulisan log dari aksi frontend; action enum sudah mengikuti butir PRD a–q ✓ |
| Profil | SETENGAH | form lokal | Perubahan tidak menulis ke store users |

Gap field terhadap ERD yang harus dibawa ke API: `SALES_TRANSACTIONS`: user_id (kini cashier_name string), customer_id (kini customer_name), paid_at & created_at (belum ada — transaksi success tidak menyimpan waktu lunas), jumlah_dibayar & kembalian (tidak dipersist), status (transaksi sukses selalu langsung "Lunas" visual, tanpa Draft/Menunggu/Dibatalkan). `DEBT_PAYMENTS.debt_record_id/user_id`, `ACTIVITY_LOGS.user_id` — saat ini serba nama string. `CUSTOMERS`: dua sumber berbeda (`mockCustomers` di master.ts vs `mockKasirCustomers` di kasir.ts, alamat beda) — backend harus satu tabel.

Logic yang HARUS dipindah ke backend (jangan dibenahi dengan state mock baru): decrement/increment stok atomik, unik barcode & username/email (email saat ini bahkan tidak diuji unik), penolakan hapus kategori/supplier terpakai, pembuatan DEBT_RECORDs 1:0..1 dari transaksi hutang, recompute status Unpaid/Partial/Paid, penulisan ACTIVITY_LOGS, generator nomor invoice unik, filter riwayat per user, statistik kasir.

## 6. Konsistensi Dokumen

| Item | Status | Temuan |
|---|---|---|
| barcode NULL tapi UNIQUE jika diisi (ERD/PRD catatan 7) | TIDAK KONSISTEN | Interface `barcode: string` wajib, fallback "-"; tidak ada cek keunikan — duplikat terbukti bisa disimpan (tes #26) |
| qris_image statis + konfirmasi QRIS manual (catatan 5, UC-12) | PARTIAL | Halaman Toko punya upload qris_image ✓; transaksi TIDAK membacanya (QrisPlaceholder hardcoded, ada komentar ponytail); konfirmasi manual & tanpa gateway ✓ |
| created_at ≠ paid_at, paid_at nullable (catatan 6) | TIDAK ADA | Model Sale frontend hanya punya transaction_date tunggal; tidak ada konsep paid_at/Draft/WatingPayment di state |
| customer wajib untuk Hutang (catatan 4, UC-13) | KONSISTEN ✓ | Validasi customerError lolos tes (tes #18); transaksi tunai/QRIS tanpa pelanggan (customer_name nullable mock) ✓ |
| DEBT_RECORDS 1:0..1 (sale_id UNIQUE) | PARTIAL | Mock memenuhi (1 debt per sale_id); tapi transaksi hutang baru tidak pernah membuat debt → relasi tak pernah terwujud di UI |
| quantity_change = selisih (catatan 1, UC-18) | KONSISTEN ✓ | Form, hint, badge +/− benar; minus validasi hasil-negatif |
| Supplier tidak langsung ke PRODUCTS (ERD) | KONSISTEN ✓ | Keterkaitan hanya via PURCHASE_DETAILS; `Supplier.product_count` di mock label misleading (seharusnya riwayat pembelian) — kosmetik |
| Kasir = role USERS, bukan tabel terpisah (ERD no.1) | KONSISTEN ✓ | StoreUser role Owner/Kasir + status; tidak ada entitas KASIR |
| Tidak ada hapus Kasir (FR-17, UC-21, Batasan) | MELANGGAR | Tombol Hapus + deleteUser() aktif di /kasir (tes #44) |
| Tidak ada Register (Batasan 12c, wireframe) | KONSISTEN ✓ | Nol route/link/register |
| 25 Use Case (diagram) vs implementasi | 23/25 | UC-22 Statistik Kasir ✗; UC-16 CRUD hutang Owner ✗; sisanya ada jalurnya (UC-25 via modal transaksi ✓) |
| 21 Activity Diagram (a–u) vs frontend | 15 full / 4 partial / 2 none | None: Statistik Kasir, QRIS-qris_image penuh. Partial: Penjualan (tanpa draft/stok), Pembayaran Hutang (tanpa debt record), Kelola Kategori/Supplier (tanpa guard), Log Aktivitas (tanpa filter tanggal & detail). Catatan: diagram no.20 "Statistik Kasir" wajib diikuti |
| DFD L1: 8 proses ↔ halaman | 7/8 | Proses 7.3 (Statistik Kasir) tak punya permukaan UI; sisanya terwakili halaman |
| ERD 15 entitas ↔ field mock | 13/15 cukup, 2 belum | Semua nama field mengikuti ERD (kategori/supplier/product/customer/debt/adjustment/log/store_settings/users ✓). Kurang: kolom waktu (created_at/paid_at/updated_at), ID-as-FK (semua pakai nama string), CUSTOMERS ganda, SALES_TRANSACTIONS tanpa jumlah_dibayar/kembalian/status persisted |
| Sidebar PRD no.10–11 | KONSISTEN ✓ | Urutan item Owner = PRD (Dashboard→…→Profil Saya, dengan "Kasir"→"Transaksi"); Kasir = PRD; logout tersedia |
| Status transaksi PRD (Draft/Menunggu/Lunas/Hutang/Dibatalkan) | PARTIAL | Riwayat & filter punya 5 label; alur transaksi nyata hanya menghasilkan "sukses/Lunas" visual; Draft & Dibatalkan tidak pernah terjadi |
| Mock ≠ backend (asumsi audit) | DIPENUHI | Tidak ada satu pun fetch()/API route; semua data lokal. Yang persist hanya kassmart_users + kassmart_session (localStorage) |

## 7. Temuan

### CRITICAL
- C-1. **Halaman Statistik Kasir tidak ada** — FR-18/UC-22/Activity 20/DFD 7.3. Nol route, nol sidebar, nol i18n. Lokasi: seharusnya `src/app/statistik-kasir/` (Owner).
- C-2. **Kelola Kasir menyediakan hapus permanen** — melanggar FR-17 & UC-21 ("sistem tidak menyediakan penghapusan akun kasir; nonaktif menggantikan hapus"). Lokasi: `src/app/kasir/page.tsx:147-152,253-263` (tombol Hapus + `removeUser`) dan `src/lib/mock/users.ts:108-113` (`deleteUser`). Terkonfirmasi runtime: akun hilang permanen.
- C-3. **Alur penjualan tidak menghasilkan efek ke entitas mana pun**: stok tidak berkurang, riwayat tidak bertambah, DEBT_RECORDS tidak dibuat dari transaksi hutang, log aktivitas tidak mencatat (PRD Workflow Penjualan/Tunai/QRIS/Hutang langkah "sistem mengurangi stok… menyimpan ke riwayat… mencatat log"). Lokasi: `src/app/transaksi/page.tsx` (`confirmTransaction` hanya set stage), `src/lib/mock/kasir.ts`, `src/lib/mock/owner.ts` (store terpisah tidak terhubung). Minimal sebagai simulasi frontend-state, alur ini harus menyambung sebelum backend.

### HIGH
- H-1. **Hapus kategori/supplier yang masih dipakai tidak ditolak** (UC-05/UC-06). `src/app/kategori/page.tsx:56-59`, `src/app/supplier/page.tsx:71-74`. Terkonfirmasi: "Beras" & "CV Sumber Rejeki" terhapus padahal dipakai produk/PO.
- H-2. **Barcode produk tidak divalidasi unik & tidak nullable** (ERD PRODUCTS.barcode UNIQUE-when-not-null, PRD catatan 7). `src/app/produk/page.tsx:99-139` (validate tanpa cek duplikat; fallback `barcode: "-"`), `src/lib/mock/master.ts:20` (`barcode: string`).
- H-3. **Riwayat Transaksi Kasir tidak difilter milik sendiri** (UC-15). `src/app/riwayat-penjualan/page.tsx:30-40` membaca seluruh `mockSales`; alias `src/app/kasir/riwayat-transaksi/page.tsx` memakai komponen yang sama tanpa mode role.
- H-4. **UC-16 tidak terimplementasi**: Owner tidak bisa menambah/mengubah/menghapus data hutang — hanya list + bayar. `src/app/hutang-pelanggan/page.tsx` (tidak ada aksi CRUD hutang).
- H-5. **Pembelian tidak menaikkan stok** (Business Rules & Workflow Pembelian langkah 6) dan **supplier dipaksa wajib** padahal PRD "memilih supplier (opsional)" / ERD supplier_id nullable. `src/app/pembelian/page.tsx:56` (`errorSupplierRequired`), stok mock tak tersentuh; hasil pembelian juga hilang saat reload.
- H-6. **Penyesuaian stok: tanpa validasi "stok hasil tidak negatif"** (UC-18) dan tidak mengubah stok produk. `src/app/penyesuaian-stok/page.tsx:60-86`. Terkonfirmasi: −999 pada stok 120 tersimpan.
- H-7. **Persistensi timpang**: hanya akun kasir (localStorage); produk, kategori, supplier, pelanggan, pembelian, hutang, penyesuaian, profil, info toko = in-memory → hilang saat reload, sementara `Product` juga punya Hapus hard-delete yang tidak ada di UC-04. `src/lib/mock/master.ts`, `src/app/produk/page.tsx:141-144`.

### MEDIUM
- M-1. Nomor invoice lemah: `INV/{tanggal}/{cart.length+3}` (transaksi/page.tsx:180-182) — bisa duplikat (ERD invoice_number UNIQUE).
- M-2. QRIS transaksi memakai `QrisPlaceholder` hardcoded, bukan `store_settings.qris_image` (transaksi/page.tsx:31-43) — inkonsisten UC-12/Activity e; status "Menunggu Pembayaran" tidak persisted dan tidak ada jalur "Dibatalkan".
- M-3. Dashboard Owner seluruhnya statis `lib/mock/dashboard.ts` dan kontradiktif dengan data mock lain (128 produk vs 12 seed; kasir "Siti/Budi" tak dikenal; totalCashiers 4 vs 1). Link "Lihat semua aktivitas" `href="#"` (dashboard/page.tsx:143-149).
- M-4. Invoice/struk tidak punya template: Cetak = `window.print()` whole page — identitas toko (nama/alamat/footer struk) tidak muncul di struk (FR-11/UC-14).
- M-5. Log Aktivitas tanpa filter tanggal & tanpa view detail (UC-23); filter jenis aksi hanya memunculkan action yang ada di seed. `src/app/log-aktivitas/page.tsx:38-55`.
- M-6. Dua dataset pelanggan berbeda (`mockCustomers` vs `mockKasirCustomers`, alamat beda) — `src/lib/mock/master.ts:87-91` vs `src/lib/mock/kasir.ts:41-45`.
- M-7. Barcode master produk vs barcode kasir produk berbeda (`8991002100011` vs `8991002100015` dst.) → hasil scan di Kasir tidak cocok dengan data Produk.
- M-8. Simpan Profil dan Informasi Toko hanya toast lokal — tidak menulis ke store/session (profil-saya/page.tsx:65-67, informasi-toko/page.tsx:30-34), padahal workflow k/l menuntut perubahan tersimpan + tercatat log.
- M-9. ID lokal dari `length+1` (P-0xx/C-0xx/PO-0xx/DR/SA/U-0xx) tubrukan setelah hapus baris — `produk/page.tsx:125`, `kasir.ts:53`, `pembelian/page.tsx:167`, `users.ts:95`.
- M-10. Status transaksi mock memakai enum lowercase (draft/waiting_payment/paid/debt/cancelled) vs label PRD (Draft, Menunggu Pembayaran, Lunas, Hutang, Dibatalkan) — acceptable mapping, tapi model Sale frontend tidak punya jumlah_dibayar/kembalian/paid_at untuk konsumsi backend.
- M-11. Email unik untuk akun kasir tidak divalidasi (UC-21: username DAN email unik) — `kasir/page.tsx:99-109` hanya cek username.

### LOW
- L-1. UC-04 "melihat" produk tanpa mode detail/readonly (hanya modal edit).
- L-2. Kategori/produk tidak mencegah nama duplikat.
- L-3. Password plaintext di localStorage `kassmart_users` (sudah diberi komentar ponytail; wajib hash saat backend).
- L-4. Kolom supplier `product_count` di mock misleading (relasi supplier–produk tidak ada di ERD; seharusnya jumlah riwayat pembelian).
- L-5. `loading`/`loadError` state disiapkan tapi di-hardcode false/null (kasir/page.tsx:52-53) — bagus untuk migrasi API, bukan bug.
- L-6. Terjemahan i18n lengkap id/en; tidak ditemukan string kosong/undefined label di semua halaman yang dites.

## 8. Kesimpulan

1. **Halaman**: 16 dari 17 halaman wajib ada dan 0 console/runtime error; TIDAK lengkap — Statistik Kasir belum dibuat (C-1), tiga halaman berstatus "perlu perbaikan" (Kelola Kasir, Hutang Pelanggan sisi Owner, Invoice/struk), Log Aktivitas/Dashboard baru partial.
2. **Role**: kerangka permission sudah benar dan terbukti secara runtime (sidebar per role, 403 URL, guard unauth, nonaktif-tolak-login, tanpa register, batas aksi Kasir pada hutang/pelanggan). Satu pelanggaran keras: hapus akun kasir tersedia untuk Owner (C-2), dan riwayat Kasir bocor transaksi milik orang lain (H-3).
3. **Kesiapan backend**: struktur field mock sudah mengikuti ERD dan lapisan data terpusat di `src/lib/mock/*` sehingga penggantian ke API bersifat mekanis untuk auth/kelola-kasir (satu-satunya store yang persist). BELUM siap untuk alur inti: penjualan/pembelian/penyesuaian/hutang tidak saling mengubah state (C-3, H-5, H-6), agregat (stok, product_count, laporan) bukan hasil perhitungan, dan gap field (paid_at, ID-FK string, barcode nullable+unique) harus diselesaikan sebelum skema Prisma/Supabase dipakai. Jangan tulis backend di atas asumsi frontend saat ini tanpa memperbaiki kontrak field ini.
4. **Wajib diperbaiki sebelum implementasi backend**: lihat urutan di bawah; tanpa C-1..C-3 dan H-1..H-7, backend akan mewarisi alur yang tidak sesuai PRD.

## 9. Urutan Perbaikan

Prioritas (hanya daftar, tidak ada kode yang diubah dalam audit ini):

1. C-2 — Hapus tombol Hapus + `deleteUser()` dari Kelola Kasir; jadikan nonaktif satu-satunya penarikan akses (`src/app/kasir/page.tsx`, `src/lib/mock/users.ts`).
2. C-3 — Sambungkan state transaksi: kurangi stok, kirim ke riwayat (dengan user_id, paid_at, status), buat DEBT_RECORDs untuk metode Hutang, tulis ACTIVITY_LOGS — minimal via store bersama di `src/lib/mock/` (pola seperti users.ts) supaya kontrak data siap dipindah ke API.
3. H-5 — Pembelian: naikkan stok produk, supplier jadi opsional, gunakan store bersama.
4. H-6 — Penyesuaian stok: validasi stok hasil ≥ 0 (UC-18), terapkan selisih ke stok.
5. H-1 — Guard hapus kategori/supplier masih dipakai, dengan pesan "masih digunakan" (UC-05/06).
6. H-2 — Barcode: nullable (buang fallback "-"), validasi unik bila diisi (UC-04/PRD catatan 7).
7. H-3 — Filter riwayat untuk role Kasir (UC-15).
8. C-1 — Bangun halaman Statistik Kasir (Owner) sesuai FR-18/UC-22/Activity 20: pilih kasir + rentang tanggal → jumlah transaksi, total penjualan, total pendapatan, riwayat.
9. H-4 — Lengkapi CRUD hutang Owner (UC-16), dengan tetap membatasi Kasir ke lihat+bayar.
10. M-2 — QRIS transaksi membaca `store_settings.qris_image`; persistensi status Menunggu Pembayaran + jalur Dibatalkan.
11. M-1/M-9 — Generator ID/invoice unik (serahkan ke backend saat API ada; untuk mock pakai timestamp+counter).
12. M-4 — Template struk/invoice dengan identitas toko untuk FR-11.
13. M-3/M-5/M-8 — Dashboard dari data bersama; log: filter tanggal + detail; persist profil & info toko.
14. M-6/M-7 — Satu sumber CUSTOMERS dan satu katalog produk untuk semua halaman.
15. LOW L-1..L-6 — polesan (detail produk, nama kategori unik, dsb.) — boleh menyusul setelah backend terhubung.
