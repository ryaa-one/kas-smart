"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/mock/db";

interface ProfileForm {
  name: string;
  phone: string;
  email: string;
  currentPassword: string;
  password: string;
  confirm: string;
}

// Workflow Profil Saya (PRD UC-24): lihat info akun + ubah nama/telepon/email/
// password untuk akun YANG SEDANG LOGIN. Identitas diambil dari sesi
// (GET /api/auth/me) — bukan id dari frontend. Username/id/role/status tidak
// dapat diubah (read-only). Password diverifikasi ulang di server
// (PATCH /api/auth/profile) — hash tidak pernah keluar dari server.
export default function ProfilSayaPage() {
  const { t } = useLang();
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    currentPassword: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm | "general", string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ambil data terbaru langsung dari database (/api/auth/me) saat halaman dibuka.
  useEffect(() => {
    refreshUser();
  }, []);

  // Sinkronkan form saat sesi pulih dari /me (refresh halaman).
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.name,
        phone: f.phone || user.phone,
        email: f.email || user.email,
      }));
    }
  }, [user]);

  const set = (patch: Partial<ProfileForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const err: typeof errors = {};
    if (!form.name.trim()) err.name = t.profil.errorNameRequired;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      err.email = t.profil.errorEmailInvalid;
    if (form.password) {
      if (!form.currentPassword)
        err.currentPassword = t.profil.errorCurrentPasswordRequired;
      if (form.password.length < 8) err.password = t.profil.errorPasswordMin;
      if (form.password !== form.confirm) err.confirm = t.profil.errorPasswordMismatch;
    }
    setErrors(err);
    if (Object.keys(err).length) return;

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: form.name.trim(),
          phone_number: form.phone.trim(),
          email: form.email.trim(),
          ...(form.password
            ? { current_password: form.currentPassword, password: form.password }
            : {}),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { data?: { user?: { name: string; email: string | null; phone_number: string } }; error?: string }
        | null;
      if (!res.ok) {
        const code = json?.error ?? "server";
        setErrors({
          general:
            code === "current_password_incorrect"
              ? t.profil.errorCurrentPasswordIncorrect
              : code === "current_password_required"
                ? t.profil.errorCurrentPasswordRequired
                : code === "email_taken"
                  ? t.kasirAkun.errorEmailTaken
                  : code === "name_required"
                    ? t.profil.errorNameRequired
                    : code === "password_min_8"
                      ? t.profil.errorPasswordMin
                      : t.kasirAkun.errorLoad,
        });
        return;
      }
      // Sinkron ringan: mock log utk widget aktivitas; nama tampil ikut ter-update.
      logActivity(
        { id: user.id, name: form.name.trim() || user.name },
        "profileChange",
        "Perbarui profil saya"
      );
      await refreshUser();
      setForm((f) => ({
        ...f,
        name: json?.data?.user?.name ?? form.name.trim(),
        phone: json?.data?.user?.phone_number ?? form.phone.trim(),
        email: json?.data?.user?.email ?? form.email.trim(),
        currentPassword: "",
        password: "",
        confirm: "",
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setErrors({ general: t.kasirAkun.errorLoad });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={t.profil.title} subtitle={t.profil.subtitle}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ringkasan akun */}
        <Card className="lg:col-span-1 h-fit">
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold">
              {(form.name || "A").charAt(0).toUpperCase()}
            </div>
            <p className="text-base font-bold text-foreground mt-3">{form.name}</p>
            <p className="text-sm text-muted">@{user?.username}</p>
            <div className="mt-3">
              <Badge variant="primary">
                {user?.role === "Kasir" ? t.common.roleKasir : t.common.roleOwner}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Form ubah profil */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t.profil.accountInfo}
          </h3>
          {errors.general && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-danger">
              {errors.general}
            </div>
          )}
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.profil.fieldName}
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              error={errors.name}
            />
            <Input
              label={`${t.profil.fieldUsername} — ${t.profil.fieldUsernameReadonly}`}
              value={user?.username ?? ""}
              readOnly
              disabled
              className="opacity-60 cursor-not-allowed"
            />
            <Input
              type="tel"
              label={t.profil.fieldPhone}
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
              error={errors.phone}
            />
            <Input
              type="email"
              label={t.profil.fieldEmail}
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              error={errors.email}
            />
            {form.password && (
              <Input
                type="password"
                label={t.profil.fieldCurrentPassword}
                value={form.currentPassword}
                onChange={(e) => set({ currentPassword: e.target.value })}
                error={errors.currentPassword}
                autoComplete="current-password"
              />
            )}
            <Input
              type="password"
              label={t.profil.fieldNewPassword}
              value={form.password}
              onChange={(e) => set({ password: e.target.value })}
              placeholder={t.profil.fieldNewPasswordPlaceholder}
              error={errors.password}
              autoComplete="new-password"
            />
            <Input
              type="password"
              label={t.profil.fieldConfirmPassword}
              value={form.confirm}
              onChange={(e) => set({ confirm: e.target.value })}
              error={errors.confirm}
              autoComplete="new-password"
            />
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {t.common.save}
              </Button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                  {t.profil.saved}
                </span>
              )}
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
