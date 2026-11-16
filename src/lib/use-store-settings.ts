"use client";

// Hook baca STORE_SETTINGS dari backend (GET /api/store-settings).
// Dipakai halaman Transaksi (QRIS statis) & struk (nama/alamat/telepon/footer).
import { useEffect, useState } from "react";
import { EMPTY_STORE_SETTINGS, type SerializedStoreSettings } from "@/lib/store-settings-api";

export function useStoreSettings(): SerializedStoreSettings {
  const [settings, setSettings] = useState<SerializedStoreSettings>(EMPTY_STORE_SETTINGS);

  useEffect(() => {
    let alive = true;
    fetch("/api/store-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const s = json?.data?.settings ?? json?.settings;
        if (alive && s) setSettings(s);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return settings;
}
