"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { formatRupiah } from "@/lib/format";
import { useDb, saveSettings, type StoreSettings } from "@/lib/mock/db";

// Workflow Informasi Toko (PRD): nama toko, logo, alamat, telepon,
// footer struk, QRIS toko. QRIS = gambar statis unggahan Owner (catatan PRD #5).
export default function InformasiTokoPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const db = useDb(); // STORE_SETTINGS dari store bersama (H-7)

  const [form, setForm] = useState<StoreSettings>(db.settings);
  // Sinkron ulang sekali saat store terhidrasi dari localStorage.
  useEffect(() => setForm(db.settings), [db.settings]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.store_name.trim()) {
      setError(t.informasiToko.errorStoreNameRequired);
      return;
    }
    setError("");
    if (user) saveSettings({ id: user.id, name: user.name }, form); // store + ACTIVITY_LOGS
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const set = (patch: Partial<StoreSettings>) => setForm((f) => ({ ...f, ...patch }));

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
                      accept="image/png,image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) set({ logo: URL.createObjectURL(file) });
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
                      accept="image/png,image/jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) set({ qris_image: URL.createObjectURL(file) });
                      }}
                      className="block w-full text-xs text-muted file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium file:cursor-pointer cursor-pointer"
                    />
                    <p className="text-[11px] text-muted mt-1">{t.informasiToko.fieldQrisHint}</p>
                  </div>
                </div>
              </div>

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
          <Button type="submit">{t.common.save}</Button>
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
