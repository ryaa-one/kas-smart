"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth";
import { updateUser, isUsernameTaken, isEmailTaken } from "@/lib/mock/users";
import { logActivity } from "@/lib/mock/db";

interface ProfileForm {
  name: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  confirm: string;
}

// Workflow Profil Saya (PRD): lihat info akun, ubah nama/username/password/
// telepon/email. Perubahan hanya untuk akun yang sedang login (UC-24).
export default function ProfilSayaPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    name: user?.name ?? "",
    username: user?.username ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [saved, setSaved] = useState(false);

  // Guard me-render halaman setelah user siap — sinkronkan form saat user belum termuat.
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.name,
        username: f.username || user.username,
        phone: f.phone || user.phone,
        email: f.email || user.email,
      }));
    }
  }, [user]);

  const set = (patch: Partial<ProfileForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Partial<Record<keyof ProfileForm, string>> = {};
    if (!form.name.trim()) err.name = t.profil.errorNameRequired;
    if (!form.username.trim()) err.username = t.profil.errorUsernameRequired;
    if (!form.phone.trim()) err.phone = t.profil.errorPhoneRequired;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = t.profil.errorEmailInvalid;
    if (form.password && form.password.length < 8) err.password = t.profil.errorPasswordMin;
    if (form.password && form.password !== form.confirm) err.confirm = t.profil.errorPasswordMismatch;
    // Username tidak boleh milik akun lain (store USERS).
    if (user && form.username.trim() !== user.username && isUsernameTaken(form.username.trim()))
    err.username = t.kasirAkun.errorUsernameTaken;
    // M-11: email juga unik lintas USERS (milik sendiri saat edit bukan duplikat).
    if (user && form.email.trim() && isEmailTaken(form.email.trim(), user.id))
    err.email = t.kasirAkun.errorEmailTaken;
    setErrors(err);
    if (Object.keys(err).length || !user) return;

    // Simpan ke USERS (localStorage) + ACTIVITY_LOGS — efek terasa setelah logout/login.
    updateUser(user.id, {
    name: form.name.trim(),
    username: form.username.trim(),
    phone_number: form.phone.trim(),
    email: form.email.trim() || undefined,
    ...(form.password ? { password: form.password } : {}),
    });
    logActivity({ id: user.id, name: form.name.trim() || user.name }, "profileChange", "Perbarui profil saya");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
            <p className="text-sm text-muted">@{form.username}</p>
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
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.profil.fieldName}
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              error={errors.name}
            />
            <Input
              label={t.profil.fieldUsername}
              value={form.username}
              onChange={(e) => set({ username: e.target.value })}
              error={errors.username}
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
              <Button type="submit">{t.common.save}</Button>
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
