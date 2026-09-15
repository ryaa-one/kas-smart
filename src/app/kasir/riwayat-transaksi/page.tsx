"use client";

import { RiwayatView } from "@/app/riwayat-penjualan/page";

// Halaman sama dengan Owner (UC-15, FR-12) — desain & filter identik.
// Beda: hanya transaksi MILIK Kasir yang login yang tampil (H-3),
// difilter dari store bersama lewat user_id session.
export default function KasirRiwayatPage() {
  return <RiwayatView mineOnly />;
}
