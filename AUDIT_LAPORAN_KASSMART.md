# AUDIT LAPORAN KASSMART

## 1. Ringkasan Audit

Audit ini dilakukan secara **READ-ONLY** terhadap dokumen laporan utama proyek KasSmart ([`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx)) dengan membandingkannya terhadap dokumen spesifikasi dan artefak proyek yang sebenarnya, meliputi:
- **Product Requirements Document**: [`PRD_PJBL.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/PRD_PJBL.docx) & [`PRD_PJBL.pdf`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/PRD_PJBL.pdf)
- **Struktur Basis Data & ORM**: [`prisma/schema.prisma`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/prisma/schema.prisma), migration [`20260915140819_init_kassmart`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/prisma/migrations/20260915140819_init_kassmart/migration.sql), [`ERD_KasSmart_PJBL.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/ERD_KasSmart_PJBL.drawio), dan [`ERD_KasSmart_Chen.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/ERD_KasSmart_Chen.drawio)
- **Diagram Sistem**: [`Use_Case_Diagram_KasSmart_Revisi.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Use_Case_Diagram_KasSmart_Revisi.drawio) dan [`Activity_Diagram_KasSmart_Swimlane_PREVIEW.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Activity_Diagram_KasSmart_Swimlane_PREVIEW.drawio)
- **Implementasi Source Code & Dependencies**: [`package.json`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/package.json), [`src/app/`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/src/app), [`src/lib/`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/src/lib)
- **Dokumentasi Progres**: [`HANDOFF_KASSMART_CONTEXT.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/HANDOFF_KASSMART_CONTEXT.md) serta laporan progres Tahap 5–8 ([`TAHAP_5_LAPORAN.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/TAHAP_5_LAPORAN.md) s.d. [`TAHAP_8_LAPORAN.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/TAHAP_8_LAPORAN.md)).

### Poin Kunci Hasil Pemeriksaan:
1. **Ketidaksesuaian Teknologi Basis Data**: Pada BAB 2 terdapat subbab berjudul `2.4 MySQL` yang membahas RDBMS MySQL, padahal proyek KasSmart tidak menggunakan MySQL melainkan **Supabase PostgreSQL** yang diakses menggunakan **Prisma ORM v7** via driver `@prisma/adapter-pg`.
2. **Ketiadaan Komponen Kunci Arsitektur**: Dua teknologi utama yang aktif digunakan dalam kode sumber—yaitu **Prisma ORM v7** (pada backend/database) dan **Tailwind CSS v4** (pada antarmuka frontend)—sama sekali tidak disebutkan di seluruh isi laporan (Kajian Pustaka, Alat & Bahan, maupun Hasil Proyek).
3. **Anachronisme dan Ketertinggalan Linimasa (Timeline)**:
   - Pada Kata Pengantar tertulis tanggal **"Malang, 03 Januari 2023"**, bertentangan dengan Cover ("SEMESTER GANJIL 2026/2027") dan waktu proyek riil (2026).
   - Jadwal Projek (Tabel 1) hanya mencatat waktu sampai **4 Juni 2026**, sama sekali belum mencerminkan progres proyek riil hingga **September 2026** (di mana inisialisasi migration basis data Prisma `20260915140819_init_kassmart` dan integrasi API Tahap 1–8 baru diselesaikan pada September 2026).
   - Bagian Saran menyatakan bahwa sistem masih perlu "mengganti penyimpanan data sementara dengan koneksi API backend", padahal backend API dan basis data Supabase sudah aktif berjalan untuk modul Auth, Kasir, Profil, Produk, Kategori, Supplier, Pembelian, dan Stok.
4. **Ketidaklengkapan Diagram dan Dokumentasi Antarmuka**: Dokumen mengklaim merancang Use Case Diagram, Activity Diagram, dan ERD, namun tidak satupun diagram visual tersebut disertakan dalam batang tubuh laporan. Selain itu, BAB 4 Hasil Proyek hanya menampilkan 1 buah tangkapan layar (Halaman Login), tanpa menampilkan antarmuka Dashboard, Kasir/Transaksi POS, Manajemen Produk, Pembelian, Hutang, Laporan, atau Log Aktivitas yang sudah tersedia.
5. **Inkonsistensi Format & Tipografi**: Terdapat typo `Wirefreame` pada Daftar Gambar, inkonsistensi nomor gambar antara Daftar Gambar (`Gambar 3.1`, `3.2`, `4.1`) dan batang tubuh (`Gambar 1`, `2`, `3`), teks ganda hasil rendering diagram (`Langkah 1Langkah 1`, dst.), serta redundansi kata `Tabel X Tabel ...` pada Lampiran 1.
6. **Audit Rujukan**: Terdapat 2 entri rujukan pada Daftar Rujukan (Laudon & Laudon, 2022 serta Syahputra dkk., 2022) yang berstatus *orphan reference* (tidak pernah disitir di dalam teks), serta sejumlah pernyataan faktual dan teknologi yang belum diberi tanda rujukan.

---

## 2. Temuan Audit

| No | Status | Lokasi | Temuan | Pembanding |
| :---: | :---: | :--- | :--- | :--- |
| 1 | ❌ Tidak sesuai | `Laporan KasSmart.docx`, Halaman ii, KATA PENGANTAR, Paragraf penutup tanggal (P40) | Tertulis tanggal penyusunan `Malang, 03 Januari 2023`. Ini merupakan kesalahan tahun yang fatal dan tidak sinkron dengan periode semester ganjil 2026/2027 serta pelaksanaan proyek tahun 2026. | Cover `Laporan KasSmart.docx` (P4: `SEMESTER GANJIL 2026/2027`), Tabel 1 Jadwal Projek (April–Juni 2026), [`HANDOFF_KASSMART_CONTEXT.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/HANDOFF_KASSMART_CONTEXT.md) (September 2026). |
| 2 | ❌ Tidak sesuai | `Laporan KasSmart.docx`, Halaman 5, BAB 2 KAJIAN PUSTAKA, Subbab 2.4 MySQL (P110–P113) | Judul subbab dan pembahasan awal berfokus pada RDBMS `MySQL`. Proyek KasSmart tidak pernah menggunakan MySQL, melainkan Supabase PostgreSQL. Laporan baru menyebutkan Supabase pada paragraf terakhir subbab ini secara tidak selaras dengan judul subbabnya. | [`PRD_PJBL.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/PRD_PJBL.docx) (Section 15: Supabase), [`prisma/schema.prisma`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/prisma/schema.prisma) (`provider = "postgresql"`), [`package.json`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/package.json) (`@prisma/adapter-pg`, `pg`). |
| 3 | ❌ Tidak sesuai | `Laporan KasSmart.docx`, BAB 2 KAJIAN PUSTAKA, BAB 3 Subbab 3.3 Alat dan Bahan, dan BAB 4 Subbab 4.1 Hasil | Prisma ORM v7 sama sekali tidak disebutkan di seluruh isi laporan, padahal Prisma adalah komponen arsitektur utama backend untuk object-relational mapping, pengelolaan migrasi skema, koneksi database pooled/direct, dan eksekusi transaksi atomik. | [`prisma/schema.prisma`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/prisma/schema.prisma), [`package.json`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/package.json) (`prisma: ^7.9.1`, `@prisma/client: ^7.9.1`), [`src/lib/prisma.ts`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/src/lib/prisma.ts), [`HANDOFF_KASSMART_CONTEXT.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/HANDOFF_KASSMART_CONTEXT.md). |
| 4 | ❌ Tidak sesuai | `Laporan KasSmart.docx`, Halaman vi (DAFTAR GAMBAR) vs Halaman 6, 8, 9 (Batang Tubuh P118, P128, P151) | Penomoran gambar tidak konsisten. Pada Daftar Gambar menggunakan format per bab: `Gambar 3.1 Wirefreame Halaman Login` (terdapat typo `Wirefreame`), `Gambar 3.2 Alur Perencanaan`, dan `Gambar 4.1 Tampilan Halaman Login`. Sedangkan pada caption isi dokumen menggunakan format sekuensial: `Gambar 1 Wireframe Halaman Login`, `Gambar 2 Alur Perencanaan`, dan `Gambar 3 Tampilan Halaman Login`. | DAFTAR GAMBAR (P72, P73, P74) dan Caption Gambar (P118, P128, P151) pada [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx). |
| 5 | ❌ Tidak sesuai | `Laporan KasSmart.docx`, Halaman 8, BAB 3 PROSES KERJA, Subbab 3.4 Jadwal Projek, Tabel 1 (P141) | Jadwal proyek hanya berhenti pada `4 Juni 2026` (Presentasi Akhir). Laporan tidak mencerminkan linimasa dan progres proyek riil hingga September 2026, seperti pembuatan migrasi schema final dan integrasi API Tahap 1–8 pada September 2026. | Migration [`prisma/migrations/20260915140819_init_kassmart`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/prisma/migrations/20260915140819_init_kassmart/migration.sql) (15 September 2026), [`TAHAP_8_LAPORAN.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/TAHAP_8_LAPORAN.md), [`HANDOFF_KASSMART_CONTEXT.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/HANDOFF_KASSMART_CONTEXT.md). |
| 6 | ❌ Tidak sesuai | `Laporan KasSmart.docx`, Halaman 10, BAB 5 PENUTUP, Subbab 5.2 Saran (P156) | Kalimat saran menyebutkan perlunya "mengganti penyimpanan data sementara dengan koneksi API backend yang lebih lengkap agar seluruh fitur berjalan di atas basis data yang sebenarnya". Pernyataan ini tidak akurat karena backend API dan database PostgreSQL Supabase sudah aktif digunakan pada modul Auth, Kasir, Profil, Produk, Kategori, Supplier, Pembelian, dan Stok. | Modul API di [`src/app/api/`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/src/app/api) (14 endpoint aktif), [`TAHAP_8_LAPORAN.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/TAHAP_8_LAPORAN.md), [`HANDOFF_KASSMART_CONTEXT.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/HANDOFF_KASSMART_CONTEXT.md). |
| 7 | ❌ Tidak sesuai | `Laporan KasSmart.docx`, Halaman 13, Lampiran 1 Struktur Tabel Basis Data, Tabel 2 Tabel users, Baris 6 (P172 Row 6) | Kolom `email` dinyatakan memiliki batasan `NOT_NULL, UNIQUE`. Padahal pada spesifikasi ERD, PRD, dan implementasi schema Prisma, email bersifat nullable / opsional (`email String? @unique`) dengan kontrak K3 (email kosong disimpan sebagai NULL). | [`prisma/schema.prisma`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/prisma/schema.prisma) baris 6 & 61, [`PRD_PJBL.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/PRD_PJBL.docx) Section 14 poin 1, [`ERD_KasSmart_PJBL.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/ERD_KasSmart_PJBL.drawio). |
| 8 | ⚠️ Perlu diperiksa | `Laporan KasSmart.docx`, Halaman 6, BAB 3 PROSES KERJA, Subbab 3.2 Alur Perencanaan dan Pelaksanaan (P120, P123, P126) | Terdapat teks penggandaan tanpa spasi: `Langkah 1Langkah 1`, `Langkah 2Langkah 2`, dan `Langkah 3Langkah 3` tepat sebelum Gambar 2. Teks ini merupakan artefak duplikasi rendering shape/label diagram ke teks dokumen. | Paragraf P120, P123, P126 pada `word/document.xml` [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx). |
| 9 | ⚠️ Perlu diperiksa | `Laporan KasSmart.docx`, Halaman 13–19, Lampiran 1 Struktur Tabel Basis Data, Judul Tabel 2 s.d. Tabel 16 (P171, P174, P177, dst.) | Penulisan caption tabel memuat kata "Tabel" ganda secara berulang: `Tabel 2 Tabel users`, `Tabel 3 Tabel suppliers`, `Tabel 4 Tabel store_settings`, hingga `Tabel 16 Tabel activity_logs`. | DAFTAR TABEL (P54–P68) dan Caption Tabel Lampiran 1 pada [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx). |
| 10 | ⚠️ Perlu diperiksa | `Laporan KasSmart.docx`, Halaman 11–12, DAFTAR RUJUKAN (P161 & P166) | Dua sumber yaitu Laudon & Laudon (2022) dan Syahputra dkk. (2022) dicantumkan di Daftar Rujukan, namun sama sekali tidak disitir di dalam teks paragraf mana pun pada isi laporan (*orphan references*). | Batang tubuh dokumen [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx) (tidak ada sitasi `Laudon` maupun `Syahputra`). |
| 11 | ℹ️ Kurang lengkap | `Laporan KasSmart.docx`, BAB 2 KAJIAN PUSTAKA dan BAB 3 Subbab 3.3 Alat dan Bahan | Tailwind CSS v4 tidak disebutkan sama sekali di Alat dan Bahan maupun Kajian Pustaka, padahal seluruh styling antarmuka KasSmart dibangun menggunakan framework utility CSS ini. | [`package.json`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/package.json) (`tailwindcss: ^4`, `@tailwindcss/postcss: ^4`), [`src/app/globals.css`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/src/app/globals.css). |
| 12 | ℹ️ Kurang lengkap | `Laporan KasSmart.docx`, BAB 3 PROSES KERJA dan BAB 4 HASIL PROYEK | Dokumen mengklaim pada P130 bahwa sistem dirancang menggunakan Use Case Diagram dan Activity Diagram, namun tidak ada satu pun visual diagram Use Case maupun Activity Diagram yang ditampilkan dalam laporan. | [`Use_Case_Diagram_KasSmart_Revisi.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Use_Case_Diagram_KasSmart_Revisi.drawio) (28 use case) dan [`Activity_Diagram_KasSmart_Swimlane_PREVIEW.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Activity_Diagram_KasSmart_Swimlane_PREVIEW.drawio) (21 swimlane diagrams). |
| 13 | ℹ️ Kurang lengkap | `Laporan KasSmart.docx`, BAB 3 PROSES KERJA dan Lampiran 1 | Visual diagram ERD (baik notasi Crow's Foot maupun Chen) yang menggambarkan kardinalitas relasi antartabel tidak ditampilkan dalam laporan; yang ditampilkan hanya tabel kamus data di Lampiran 1. | [`ERD_KasSmart_PJBL.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/ERD_KasSmart_PJBL.drawio) dan [`ERD_KasSmart_Chen.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/ERD_KasSmart_Chen.drawio). |
| 14 | ℹ️ Kurang lengkap | `Laporan KasSmart.docx`, Halaman 9, BAB 4 HASIL PROYEK, Subbab 4.1 Hasil (P147–P151) | Dokumentasi visual antarmuka sistem pada BAB 4 sangat minim karena hanya menampilkan 1 buah gambar yaitu Halaman Login (`Gambar 3`). Tidak ada tangkapan layar untuk antarmuka Dashboard, Kasir/POS, Produk, Pembelian, Hutang Pelanggan, Laporan, maupun Log Aktivitas. | Direktori halaman antarmuka di [`src/app/`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/src/app) dan wireframe di [`PRD_PJBL.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/PRD_PJBL.docx) Section 12. |
| 15 | ℹ️ Kurang lengkap | `Laporan KasSmart.docx`, Halaman 3, BAB 2 KAJIAN PUSTAKA, Subbab 2.2 KasSmart, Paragraf 3 (P105) | Penjelasan hak akses role Owner dan Kasir sangat umum ("hak akses penuh" vs "hak akses terbatas"). Laporan belum memuat rincian matriks hak akses per menu (misalnya: Kasir dilarang mengakses modul pembelian, supplier, laporan laba rugi, kelola kasir, dan pengaturan toko). | [`PRD_PJBL.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/PRD_PJBL.docx) Section 6 & 9, [`src/lib/api-auth.ts`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/src/lib/api-auth.ts), [`Use_Case_Diagram_KasSmart_Revisi.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Use_Case_Diagram_KasSmart_Revisi.drawio). |
| 16 | ℹ️ Kurang lengkap | `Laporan KasSmart.docx`, Struktur Dokumen (Antara BAB 4 dan BAB 5) | Laporan tidak memiliki subbab pengujian sistem (seperti Black-Box Testing / UAT / hasil verifikasi transaksi dan stok), padahal kegiatan pengujian tercantum di jadwal pelaksanaan proyek (Tabel 1 baris 6). | Tabel 1 Jadwal Projek baris 6, laporan pengujian 32 skenario pada [`TAHAP_8_LAPORAN.md`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/TAHAP_8_LAPORAN.md). |
| 17 | ✅ Sudah sesuai | `Laporan KasSmart.docx`, Halaman 13–19, Lampiran 1 Struktur Tabel Basis Data, Tabel 3 s.d. Tabel 16 | Struktur 14 tabel basis data lainnya (suppliers, store_settings, categories, products, customers, purchases, purchase_details, sales_transactions, sale_details, debt_records, debt_payments, stock_adjustments, stock_adjustment_details, activity_logs) sudah memetakan nama field, tipe data, serta relasi PK/FK secara presisi sesuai skema database final. | [`prisma/schema.prisma`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/prisma/schema.prisma) dan [`ERD_KasSmart_PJBL.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/ERD_KasSmart_PJBL.drawio). |
| 18 | ✅ Sudah sesuai | `Laporan KasSmart.docx`, Halaman 3–4, BAB 2 Subbab 2.2 dan BAB 4 Subbab 4.1 | Penetapan domain usaha toko sembako, penyediaan dua peran pengguna (Owner dan Kasir), serta dukungan terhadap 3 metode pembayaran (Tunai, QRIS statis toko, dan Hutang Pelanggan) sudah konsisten dengan PRD dan implementasi aplikasi. | [`PRD_PJBL.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/PRD_PJBL.docx) Section 2, 6, 7 dan implementasi transaksi di [`src/app/transaksi/`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/src/app/transaksi). |

---

## 3. Audit Rujukan

### Rujukan Sudah Sesuai

Daftar rujukan berikut sudah memiliki sitasi di dalam teks laporan dengan penempatan yang relevan dan format yang sesuai:

1. **Nuha & Nurdewanto (2026)**
   - **Sitasi dalam teks**: Paragraf P103 pada subbab 2.2 KasSmart (`...dibandingkan pencatatan manual (Nuha & Nurdewanto, 2026).`)
   - **Kesesuaian**: Relevan dengan digitalisasi transaksi UMKM melalui sistem POS berbasis web.
2. **Rezki dkk. (2024)**
   - **Sitasi dalam teks**: Paragraf P103 pada subbab 2.2 KasSmart (`...pengelolaan produk dan transaksi toko (Rezki dkk., 2024).`)
   - **Kesesuaian**: Relevan dengan perancangan aplikasi POS web untuk transaksi dan pengelolaan produk.
3. **Alhazmi (2020)**
   - **Sitasi dalam teks**: Paragraf P104 pada subbab 2.2 KasSmart (`...lazim diteliti pada sistem POS (Alhazmi, 2020)...`)
   - **Kesesuaian**: Relevan dengan sistem pencatatan pembayaran hutang/kredit pada sistem POS.
4. **Berners-Lee dkk. (1992)**
   - **Sitasi dalam teks**: Paragraf P99 pada subbab 2.1 Website (`...diakses melalui internet (Berners-Lee dkk., 1992).`)
   - **Kesesuaian**: Relevan sebagai rujukan historis dan konsep fundamental World Wide Web.
5. **Zaidan & Suyatno (2025)**
   - **Sitasi dalam teks**: Paragraf P107 pada subbab 2.3 Framework Next.js (`...Astro, Nuxt, dan SvelteKit (Zaidan & Suyatno, 2025).`)
   - **Kesesuaian**: Relevan sebagai komparasi performa rendering framework frontend modern termasuk Next.js.
6. **Ball dkk. (2019)**
   - **Sitasi dalam teks**: Paragraf P108 pada subbab 2.3 Framework Next.js (`...sebelum program dijalankan (Ball dkk., 2019).`)
   - **Kesesuaian**: Relevan dengan konsep pengetikan statis (*static typing*) pada TypeScript.
7. **Patni dkk. (2021)**
   - **Sitasi dalam teks**: Paragraf P111 pada subbab 2.4 MySQL / Basis Data Relasional (`...dihubungkan antartabel (Patni dkk., 2021).`)
   - **Kesesuaian**: Relevan dengan konsep dasar RDBMS, relasi tabel, primary key, dan foreign key.
8. **Rasyaad & Wibowo (2025)**
   - **Sitasi dalam teks**: Paragraf P113 pada subbab 2.4 MySQL / Basis Data Relasional (`...aplikasi web modern (Rasyaad & Wibowo, 2025).`)
   - **Kesesuaian**: Relevan dengan pemanfaatan Supabase sebagai Backend-as-a-Service untuk aplikasi web berbasis Next.js.

---

### Rujukan Perlu Diperiksa

Daftar pustaka berikut tercantum pada **DAFTAR RUJUKAN** tetapi **TIDAK DITEMUKAN SITASINYA** di dalam batang tubuh teks laporan (*orphan references*):

1. **Laudon, K. C., & Laudon, J. P. (2022)**
   - **Entri Daftar Rujukan**: P161 — *Management information systems: Managing the digital firm (Global ed., 17th ed.). Pearson.*
   - **Masalah**: Tidak ada satu pun kalimat di dalam batang tubuh naskah (BAB 1 s.d. BAB 5) yang merujuk atau menyitir nama Laudon.
   - **Pemeriksaan yang Diperlukan**: Periksa apakah referensi ini awalnya direncanakan untuk mendukung penjelasan konsep Sistem Informasi / POS di BAB 1 atau BAB 2 subbab 2.1, lalu letakkan sitasi pada kalimat yang tepat atau hapus dari Daftar Rujukan jika tidak digunakan.
2. **Syahputra, A., Wiranti, R., & Astita, W. (2022)**
   - **Entri Daftar Rujukan**: P166 — *Peran sistem informasi manajemen organisasi dalam pengambilan keputusan. Jurnal Manajemen Sistem Informasi (JMASIF), 1(1), 26–31.*
   - **Masalah**: Tidak ada satu pun kalimat di dalam batang tubuh naskah (BAB 1 s.d. BAB 5) yang merujuk atau menyitir nama Syahputra.
   - **Pemeriksaan yang Diperlukan**: Periksa apakah artikel ini ditujukan untuk mendukung pernyataan tentang pengambilan keputusan melalui dashboard analitik pada Latar Belakang atau Manfaat, lalu letakkan sitasi pada kalimat terkait.

---

### Rujukan Belum Ada

Berikut adalah daftar klaim/pernyataan faktual dan teknologi yang memerlukan rujukan beserta titik penempatan penanda:

---

#### 1. Masalah Operasional Pencatatan Manual UMKM
- **Pernyataan yang membutuhkan rujukan**:
  > "Perkembangan teknologi membuat banyak kegiatan usaha mulai beralih dari pencatatan manual ke sistem digital. Namun, masih banyak toko, warung, maupun UMKM yang mencatat transaksi penjualan menggunakan buku, nota, atau website sederhana. Cara tersebut sering menimbulkan beberapa kendala, seperti kesalahan perhitungan, stok barang yang tidak sesuai dengan kondisi sebenarnya, serta proses pembuatan laporan yang membutuhkan waktu cukup lama."
- **Lokasi**:
  [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx), Halaman 1, BAB 1 PENDAHULUAN, Subbab 1.1 Latar Belakang, Paragraf pertama (P81).
- **Tanda**:
  📌 [TAMBAHKAN RUJUKAN DI SINI]
- **Harus diletakkan di sebelah/setelah**:
  📍 **Letak tanda**: Di akhir kalimat ketiga paragraf pertama, tepat setelah kalimat:  
  `"...serta proses pembuatan laporan yang membutuhkan waktu cukup lama."`
- **Jenis sumber yang dibutuhkan**:
  Jurnal ilmiah atau laporan riset terkait kendala operasional pencatatan manual dan digitalisasi UMKM.

---

#### 2. Hambatan Biaya Berlangganan dan Kompleksitas Aplikasi POS
- **Pernyataan yang membutuhkan rujukan**:
  > "Selain itu, sebagian website Point of Sale (POS) yang tersedia saat ini memiliki biaya berlangganan yang cukup tinggi atau menyediakan fitur yang terlalu kompleks bagi usaha kecil. Akibatnya, banyak pemilik usaha belum memiliki sistem kasir yang sesuai dengan kebutuhan mereka."
- **Lokasi**:
  [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx), Halaman 1, BAB 1 PENDAHULUAN, Subbab 1.1 Latar Belakang, Paragraf kedua (P82).
- **Tanda**:
  📌 [TAMBAHKAN RUJUKAN DI SINI]
- **Harus diletakkan di sebelah/setelah**:
  📍 **Letak tanda**: Di akhir paragraf kedua subbab Latar Belakang, tepat setelah kalimat:  
  `"...banyak pemilik usaha belum memiliki sistem kasir yang sesuai dengan kebutuhan mereka."`
- **Jenis sumber yang dibutuhkan**:
  Jurnal atau publikasi ilmiah mengenai faktor adopsi dan hambatan biaya/kompleksitas sistem kasir (POS) bagi usaha mikro dan kecil.

---

#### 3. Konsep Arsitektur Web (Front End, Back End, Statis vs Dinamis)
- **Pernyataan yang membutuhkan rujukan**:
  > "Website terdiri dari tampilan antarmuka (front end) yang berinteraksi langsung dengan pengguna dan bagian server (back end) yang mengelola data serta logika bisnis. Website secara umum dibagi menjadi website statis yang tampilannya tetap dan website dinamis yang kontennya dapat berubah sesuai data serta interaksi pengguna. Website dinamis banyak digunakan untuk membangun aplikasi berbasis web, seperti sistem informasi, toko daring, maupun aplikasi kasir (Point of Sale) yang membutuhkan penyimpanan data ke dalam basis data."
- **Lokasi**:
  [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx), Halaman 3, BAB 2 KAJIAN PUSTAKA, Subbab 2.1 Website, Paragraf kedua (P100).
- **Tanda**:
  📌 [TAMBAHKAN RUJUKAN DI SINI]
- **Harus diletakkan di sebelah/setelah**:
  📍 **Letak tanda**: Di akhir kalimat ketiga paragraf kedua, tepat setelah kalimat:  
  `"...yang membutuhkan penyimpanan data ke dalam basis data."`
- **Jenis sumber yang dibutuhkan**:
  Buku teks rekayasa perangkat lunak / pengembangan web, atau buku teks Sistem Informasi Manajemen (seperti Laudon & Laudon yang sudah ada di daftar rujukan).

---

#### 4. Definisi dan Fitur Inti Framework Next.js (Routing, SSR, API Routes)
- **Pernyataan yang membutuhkan rujukan**:
  > "Next.js adalah framework pengembangan website berbasis React yang memungkinkan bagian front end dan back end dikembangkan dalam satu project yang sama. Next.js menyediakan fitur routing, server-side rendering, serta API Routes yang dapat digunakan untuk membangun logika server tanpa membuat aplikasi backend terpisah."
- **Lokasi**:
  [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx), Halaman 4, BAB 2 KAJIAN PUSTAKA, Subbab 2.3 Framework Next.js, Paragraf pertama (P107).
- **Tanda**:
  📌 [TAMBAHKAN RUJUKAN DI SINI]
- **Harus diletakkan di sebelah/setelah**:
  📍 **Letak tanda**: Di akhir kalimat kedua paragraf pertama, tepat setelah kalimat:  
  `"...tanpa membuat aplikasi backend terpisah."` (sebelum kalimat perbandingan rendering Zaidan & Suyatno).
- **Jenis sumber yang dibutuhkan**:
  Dokumentasi resmi Next.js (Vercel) atau buku panduan resmi pengembangan Next.js.

---

#### 5. Definisi Platform Backend-as-a-Service Supabase
- **Pernyataan yang membutuhkan rujukan**:
  > "Sesuai dokumen PRD, pengelolaan basis data pada KasSmart menggunakan Supabase, yaitu layanan Backend-as-a-Service berbasis PostgreSQL yang menyediakan basis data relasional yang dapat diakses melalui internet."
- **Lokasi**:
  [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx), Halaman 5, BAB 2 KAJIAN PUSTAKA, Subbab 2.4 (tercantum judul MySQL), Paragraf ketiga (P113).
- **Tanda**:
  📌 [TAMBAHKAN RUJUKAN DI SINI]
- **Harus diletakkan di sebelah/setelah**:
  📍 **Letak tanda**: Di akhir kalimat pertama paragraf ketiga, tepat setelah kalimat:  
  `"...yang menyediakan basis data relasional yang dapat diakses melalui internet."` (sebelum kalimat sitasi Rasyaad & Wibowo).
- **Jenis sumber yang dibutuhkan**:
  Dokumentasi resmi Supabase atau website resmi arsitektur platform Supabase.

---

#### 6. Pustaka Pemindaian Barcode ZXing
- **Pernyataan yang membutuhkan rujukan**:
  > "ZXing: Pustaka pemindaian barcode yang digunakan pada fitur barcode scanner untuk mempercepat proses transaksi."
- **Lokasi**:
  [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx), Halaman 7, BAB 3 PROSES KERJA, Subbab 3.3 Alat dan Bahan, Butir kelima (P138).
- **Tanda**:
  📌 [TAMBAHKAN RUJUKAN DI SINI]
- **Harus diletakkan di sebelah/setelah**:
  📍 **Letak tanda**: Di akhir butir penjelasan ZXing, tepat setelah kalimat:  
  `"...untuk mempercepat proses transaksi."`
- **Jenis sumber yang dibutuhkan**:
  Dokumentasi resmi library ZXing / repositori resmi open-source ZXing (`@zxing/library` & `@zxing/browser`).

---

#### 7. Prisma ORM (Teknologi Kunci yang Wajib Ditambahkan ke Laporan)
- **Pernyataan yang membutuhkan rujukan**:
  Pernyataan mengenai Prisma ORM sebagai Object-Relational Mapping (ORM) generasi modern yang menjembatani server Next.js dengan basis data PostgreSQL Supabase.
- **Lokasi**:
  [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx), BAB 2 KAJIAN PUSTAKA dan BAB 3 Subbab 3.3 Alat dan Bahan.
- **Tanda**:
  📌 [TAMBAHKAN RUJUKAN DI SINI]
- **Harus diletakkan di sebelah/setelah**:
  📍 **Letak tanda**: Di akhir kalimat penjelasan fungsi Prisma ORM pada saat teknologi tersebut dicantumkan ke dalam Kajian Pustaka dan daftar Alat dan Bahan.
- **Jenis sumber yang dibutuhkan**:
  Dokumentasi resmi Prisma ORM.

---

#### 8. Tailwind CSS (Teknologi UI yang Wajib Ditambahkan ke Laporan)
- **Pernyataan yang membutuhkan rujukan**:
  Pernyataan mengenai framework Tailwind CSS v4 sebagai utility-first CSS framework untuk membangun desain antarmuka responsif pada KasSmart.
- **Lokasi**:
  [`Laporan KasSmart.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/Laporan%20KasSmart.docx), BAB 2 KAJIAN PUSTAKA dan BAB 3 Subbab 3.3 Alat dan Bahan.
- **Tanda**:
  📌 [TAMBAHKAN RUJUKAN DI SINI]
- **Harus diletakkan di sebelah/setelah**:
  📍 **Letak tanda**: Di akhir kalimat penjelasan fungsi Tailwind CSS pada saat dicantumkan ke dalam Kajian Pustaka dan daftar Alat dan Bahan.
- **Jenis sumber yang dibutuhkan**:
  Dokumentasi resmi Tailwind CSS.

---

## 4. Bagian yang Sudah Sesuai

Bagian-bagian berikut pada laporan telah diperiksa dan terbukti **sudah sesuai** dengan kondisi dan artefak proyek KasSmart yang sebenarnya:

1. **Struktur Data Kamus Basis Data (Lampiran 1)**:
   - 14 tabel dari 15 tabel basis data (yaitu `suppliers`, `store_settings`, `categories`, `products`, `customers`, `purchases`, `purchase_details`, `sales_transactions`, `sale_details`, `debt_records`, `debt_payments`, `stock_adjustments`, `stock_adjustment_details`, dan `activity_logs`) memuat nama kolom, tipe data, serta batasan PK/FK yang sudah selaras dengan [`prisma/schema.prisma`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/prisma/schema.prisma) dan [`ERD_KasSmart_PJBL.drawio`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/ERD_KasSmart_PJBL.drawio).
   - Penamaan atribut kritis seperti `change_amount` (pada `sales_transactions`), nilai enum `SaleStatus`, `PaymentMethod`, dan `DebtStatus` sudah konsisten dengan kontrak database final.
2. **Karakteristik Domain dan Ruang Lingkup Sistem**:
   - Pernyataan bahwa KasSmart ditujukan untuk operasional toko sembako/kelontong UMKM sudah sesuai dengan [`PRD_PJBL.docx`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/PRD_PJBL.docx).
   - Penyediaan 3 metode pembayaran utama (Tunai, QRIS statis, dan Hutang Pelanggan) konsisten dengan use case penjualan dan skema transaksi.
   - Pembedaan peran utama menjadi 2 aktor (**Owner** dan **Kasir**) konsisten dengan konfigurasi enum `UserRole` dan Use Case Diagram.
3. **Penyebutan Teknologi Inti Tertentu**:
   - Penggunaan **Next.js** (App Router & API Routes), **TypeScript** sebagai bahasa bertipe statis, **Supabase** sebagai penyedia PostgreSQL cloud, pustaka **ZXing** untuk pemindaian barcode, serta kakas bantu pengembangan seperti **Visual Studio Code**, **Git/GitHub**, dan **Figma** sudah sesuai dengan dependencies di [`package.json`](file:///mnt/c/TUGAS%20XI%20RPL%20C/PJBL%20PTS%20SEMESTER%201/kas-smart/package.json).
4. **Daftar Rujukan Akademik Inti**:
   - Rujukan ilmiah mengenai digitalisasi UMKM (Nuha & Nurdewanto, 2026), aplikasi penjualan POS (Rezki dkk., 2024), hutang pada POS (Alhazmi, 2020), kinerja Next.js (Zaidan & Suyatno, 2025), dan Supabase (Rasyaad & Wibowo, 2025) valid secara sitasi dan relevan dengan topik yang dibahas.

---

## 5. Daftar Temuan yang Perlu Ditindaklanjuti

Berikut adalah rangkuman ringkas lokasi dan masalah yang ditemukan pada laporan untuk dijadikan catatan tindak lanjut:

1. **Halaman ii (Kata Pengantar, P40)**: Tanggal penulisan tertulis tahun 2023 (`Malang, 03 Januari 2023`), harus disinkronkan dengan tahun pelaksanaan proyek (2026).
2. **Halaman 5 (BAB 2 Subbab 2.4, P110–P113)**: Judul subbab dan pembahasan menyebutkan `MySQL`. Harus diselaraskan dengan teknologi riil proyek yaitu Supabase PostgreSQL.
3. **BAB 2, BAB 3 Subbab 3.3, dan BAB 4**: Ketiadaan pembahasan mengenai **Prisma ORM v7** dan **Tailwind CSS v4** yang merupakan pilar arsitektur backend dan styling frontend KasSmart.
4. **Halaman vi (Daftar Gambar) vs Batang Tubuh Dokumen (P118, P128, P151)**:
   - Koreksi typo kata `Wirefreame` pada Daftar Gambar.
   - Sinkronisasi penomoran gambar antara Daftar Gambar (format bab: 3.1, 3.2, 4.1) dan caption gambar di isi laporan (format sekuensial: Gambar 1, Gambar 2, Gambar 3).
5. **Halaman 6 (BAB 3 Subbab 3.2, P120, P123, P126)**: Periksa dan bersihkan teks ganda rendering diagram (`Langkah 1Langkah 1`, `Langkah 2Langkah 2`, `Langkah 3Langkah 3`).
6. **Halaman 8 (BAB 3 Subbab 3.4, Tabel 1)**: Jadwal proyek berhenti pada 4 Juni 2026; belum mencantumkan periode kerja Juli–September 2026 yang memuat migrasi Prisma dan integrasi API Tahap 1–8.
7. **Halaman 10 (BAB 5 Subbab 5.2 Saran, P156)**: Kalimat saran tidak akurat karena menyatakan backend API belum terhubung ke database riil, padahal Tahap 1–8 sudah aktif terhubung ke Supabase PostgreSQL.
8. **Halaman 13 (Lampiran 1, Tabel 2 Tabel users, P172)**: Kolom `email` tertulis `NOT_NULL, UNIQUE`, padahal pada `schema.prisma` dan ERD berstatus nullable/opsional.
9. **Halaman 13–19 (Lampiran 1, P171 s.d. P214)**: Bersihkan penulisan kata "Tabel" ganda pada caption (contoh: `Tabel 2 Tabel users`).
10. **Halaman 11–12 (Daftar Rujukan, P161 & P166)**: Rujukan Laudon & Laudon (2022) dan Syahputra dkk. (2022) tidak memiliki sitasi di teks (*orphan references*). Perlu disitir di teks yang relevan atau ditinjau ulang.
11. **BAB 3 dan BAB 4 (Kelengkapan Diagram & Screenshot)**:
    - Masukkan visualisasi **Use Case Diagram** dan **Activity Diagram** yang sudah dibuat di repositori ke dalam BAB 3 / BAB 4.
    - Masukkan visualisasi diagram **ERD (Relasi Entitas)** ke dalam BAB 3 / Lampiran.
    - Lengkapi tangkapan layar BAB 4 Hasil Proyek agar tidak hanya memuat halaman Login, melainkan menyertakan Dashboard, Halaman Kasir/POS, Produk, Pembelian, Hutang, dan Laporan.
12. **Struktur Dokumen (Antara BAB 4 dan BAB 5)**: Tambahkan subbab atau dokumentasi hasil **Pengujian Sistem** (Black-Box Testing / UAT / verifikasi skenario transaksi) yang membuktikan ketercapaian fungsi aplikasi.
