"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const { t, lang } = useLang();
  const { user, login, hydrated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  // Sudah login? Langsung ke dashboard sesuai role.
  useEffect(() => {
    if (hydrated && user) {
      window.location.href = user.role === "Kasir" ? "/kasir/dashboard" : "/dashboard";
    }
  }, [hydrated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!username.trim()) newErrors.username = t.login.errorRequiredUsername;
    if (!password.trim()) newErrors.password = t.login.errorRequiredPassword;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);

    // POST /api/auth/login — verifikasi password & sesi cookie di server.
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) {
      setErrors({
        general:
          res.reason === "inactive"
            ? t.login.errorInactive
            : res.reason === "network"
              ? t.common.loading // placeholder singkat: jaringan bermasalah
              : t.login.errorInvalid,
      });
      return;
    }
    window.location.href = res.user.role === "Kasir" ? "/kasir/dashboard" : "/dashboard";
  };

  return (
    // Latar terang + kartu besar membulat melayang di tengah (dua kolom), mengikuti referensi desain.
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-8">
      <div className="relative w-full max-w-5xl rounded-3xl bg-card shadow-[0_24px_64px_-24px_rgba(15,23,42,0.25)] ring-1 ring-foreground/5 overflow-hidden">
        {/* Language switcher — desktop: sudut kanan atas kartu */}
        <div className="hidden lg:flex absolute top-6 right-6 z-20">
          <LanguageSwitcher />
        </div>

        <div className="grid lg:grid-cols-2">
          {/* Kiri — Panel branding (primary solid, aksen dekoratif flat) */}
          <div className="hidden lg:flex flex-col bg-primary p-12 relative overflow-hidden min-h-[560px]">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
            <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12v3H6z" fill="currentColor" stroke="none" />
                    <path d="M5 6h14l1 5H4l1-5z" />
                    <path d="M4 11h16v2H4z" />
                    <path d="M6 13v7h12v-7" />
                    <path d="M9 16h6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{t.appName}</h1>
                  <p className="text-sm text-white/70">Point of Sale</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center max-w-lg">
                <h2 className="text-3xl font-bold text-white leading-tight">
                  {t.appTagline}
                </h2>
                <p className="mt-4 text-white/80 leading-relaxed">
                  {lang === "id"
                    ? "KasSmart membantu Anda mengelola transaksi, stok, dan laporan toko sembako dalam satu sistem yang sederhana dan efisien."
                    : "KasSmart helps you manage transactions, stock, and store reports in one simple and efficient system."}
                </p>

                <div className="mt-10 grid grid-cols-2 gap-4">
                  {[
                    { label: lang === "id" ? "Transaksi Cepat" : "Fast Transactions", icon: "M4 4h16v10H4zM9 18h6M12 14v4" },
                    { label: lang === "id" ? "Manajemen Stok" : "Stock Management", icon: "M4 7h10M4 12h16M4 17h10M18 5v6M15 8h6" },
                    { label: lang === "id" ? "Laporan Otomatis" : "Auto Reports", icon: "M5 21V8M12 21V3M19 21v-9" },
                    { label: lang === "id" ? "Multi-Kasir" : "Multi-Cashier", icon: "M12 3a5 5 0 015 5c0 3-2 4-2 4H9s-2-1-2-4a5 5 0 015-5zM5 21h14" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 text-white/90">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d={item.icon} />
                      </svg>
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-sm text-white/50">
                &copy; {new Date().getFullYear()} KasSmart
              </p>
            </div>
          </div>

          {/* Kanan — Panel form, konten terpusat */}
          <div className="relative flex items-center justify-center px-6 py-12 sm:px-12">
            <div className="w-full max-w-sm">
              {/* Mobile: logo + switcher */}
              <div className="lg:hidden flex justify-between items-center mb-10">
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-kassmart.svg"
                    alt="Logo KasSmart"
                    className="w-10 h-10"
                  />
                  <div className="leading-tight">
                    <p className="text-base font-bold text-foreground">{t.appName}</p>
                    <p className="text-[11px] text-muted">Point of Sale</p>
                  </div>
                </div>
                <LanguageSwitcher />
              </div>

              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.login.title}</h1>
                <p className="text-sm text-muted mt-2.5">{t.login.subtitle}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {errors.general && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-danger">
                    {errors.general}
                  </div>
                )}

                <Input
                  label={t.login.username}
                  placeholder={t.login.usernamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  error={errors.username}
                  autoComplete="username"
                  autoFocus
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {t.login.password}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t.login.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm text-foreground
                        placeholder:text-muted/60 outline-none transition-colors pr-10
                        focus:border-primary focus:ring-2 focus:ring-primary/10
                        ${errors.password ? "border-danger focus:border-danger focus:ring-danger/20" : "border-line"}`}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 text-muted hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" />
                          <path d="M1 1l22 22" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-xs text-danger">{errors.password}</span>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full !rounded-xl"
                  size="lg"
                  loading={loading}
                >
                  {loading ? t.login.loggingIn : t.login.loginButton}
                </Button>
              </form>

              <p className="mt-8 text-xs text-center text-muted">{t.login.roleNote}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
