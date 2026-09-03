"use client";

import HutangPelangganPage from "@/app/hutang-pelanggan/page";

// Halaman sama dengan Owner (PRD: desain identik) — tombol Bayar tetap ada
// karena Kasir boleh mencatat pembayaran hutang (UC-17).
export default function KasirHutangPage() {
  return <HutangPelangganPage />;
}
