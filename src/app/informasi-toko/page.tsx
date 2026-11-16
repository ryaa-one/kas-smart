"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  EMPTY_STORE_SETTINGS,
  type SerializedStoreSettings,
} from "@/lib/store-settings-api";

// Workflow Informasi Toko (PRD): nama toko, logo, alamat, telepon,
// footer struk, QRIS toko. QRIS = gambar statis unggahan Owner (catatan PRD #5).
export default function InformasiTokoPage() {
  const { t } = useLang();

  const [form, setForm] = useState<SerializedStoreSettings>(EMPTY_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/store-settings");
        if (!res.ok) return;
        const body = await res.json();
        const settings = body?.data?.settings ?? body?.settings;
        if (!cancelled && settings) {
          setForm(settings);
        }
      } catch (err) {
        console.error("Gagal memuat informasi toko:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleImageUpload = (
    file: File | undefined,
    field: "logo" | "qris_image"
  ) => {
    setFileError("");
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      setFileError("Ukuran file maksimal 1.5 MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setFileError("Format file harus PNG, JPEG, atau WebP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      set({ [field]: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.store_name.trim()) {
      setError(t.informasiToko.errorStoreNameRequired);
      return;
    }
    setError("");
    setFileError("");
    setSaving(true);

    try {
      const res = await fetch("/api/store-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: form.store_name,
          address: form.address,
          phone: form.phone,
          receipt_info: form.receipt_info,
          logo: form.logo,
          qris_image: form.qris_image,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const code = data?.error || data?.code || "internal_error";
        if (code === "store_name_required") {
          setError(t.informasiToko.errorStoreNameRequired);
        } else if (code === "phone_invalid") {
          setError("Nomor telepon tidak valid");
        } else if (code === "logo_too_long" || code === "qris_image_too_long") {
          setFileError("Ukuran gambar terlalu besar untuk disimpan.");
        } else if (res.status === 403) {
          setError("Hanya Owner yang dapat mengubah informasi toko.");
        } else {
          setError("Gagal menyimpan informasi toko. Silakan coba lagi.");
        }
        return;
      }

      const settings = data?.data?.settings ?? data?.settings;
      if (settings) {
        setForm(settings);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Gagal menyimpan:", err);
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<SerializedStoreSettings>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <DashboardLayout title={t.informasiToko.title} subtitle={t.informasiToko.subtitle}>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Identitas toko */}
          <Card>
            <div className="space-y-4">
              <Input
                label={t.informasiToko.fieldStoreName}
                value={form.store_name}
                onChange={(e) => set({ store_name: e.target.value })}
                error={error}
              />
              <Input
                type="tel"
                label={t.informasiToko.fieldPhone}
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder={t.informasiToko.fieldPhonePlaceholder}
              />
              <Textarea
                label={t.informasiToko.fieldAddress}
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
                placeholder={t.informasiToko.fieldAddressPlaceholder}
                rows={3}
              />
            </div>
          </Card>

          {/* Logo + QRIS + footer struk */}
          <Card>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  {t.informasiToko.fieldLogo}
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border border-dashed border-line bg-zinc-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {form.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logo} alt="logo" className="w-full h-full object-contain" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleImageUpload(file, "logo");
                      }}
                      className="block w-full text-xs text-muted file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium file:cursor-pointer cursor-pointer"
                    />
                    <p className="text-[11px] text-muted mt-1">{t.informasiToko.fieldLogoHint}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  {t.informasiToko.fieldQris}
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 rounded-lg border border-dashed border-line bg-zinc-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {form.qris_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.qris_image} alt="QRIS" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-muted text-center px-2">{t.informasiToko.noQris}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleImageUpload(file, "qris_image");
                      }}
                      className="block w-full text-xs text-muted file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium file:cursor-pointer cursor-pointer"
                    />
                    <p className="text-[11px] text-muted mt-1">{t.informasiToko.fieldQrisHint}</p>
                  </div>
                </div>
              </div>

              {fileError && (
                <p className="text-xs text-danger">{fileError}</p>
              )}

              <Textarea
                label={t.informasiToko.fieldReceiptInfo}
                value={form.receipt_info}
                onChange={(e) => set({ receipt_info: e.target.value })}
                placeholder={t.informasiToko.fieldReceiptInfoPlaceholder}
                rows={3}
              />
            </div>
          </Card>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button type="submit" disabled={saving || loading}>
            {saving ? "Menyimpan..." : t.common.save}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
              {t.informasiToko.saved}
            </span>
          )}
        </div>
      </form>
    </DashboardLayout>
  );
}
