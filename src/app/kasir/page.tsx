"use client";

// UC-21 Kelola Data Kasir (Owner only) — SUMBER DATA: database via API.
// GET /api/kasir | POST /api/kasir | PATCH /api/kasir/:id
// Tidak ada fallback mock: bila API gagal, tampilkan error (data frontend
// tidak boleh menyimpang dari database). Tanpa hapus akun — nonaktif menggantikan hapus.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";

/** Bentuk user dari API (tanpa password/hash — dijaga server). */
interface ApiUser {
  id: string;
  name: string;
  username: string;
  phone_number: string;
  email: string | null;
  role: "Owner" | "Kasir";
  status: "aktif" | "nonaktif";
}

interface FormState {
  username: string;
  name: string;
  phone_number: string;
  email: string;
  password: string;
  status: "aktif" | "nonaktif";
}

// Password tidak prefill saat edit — kolom kosong = password lama tetap terpakai.
const emptyForm: FormState = {
  username: "",
  name: "",
  phone_number: "",
  email: "",
  password: "",
  status: "aktif",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** mapping error code API -> teks lokal */
function apiError(code: string, c: Record<string, string>): string {
  switch (code) {
    case "username_taken":
      return c.errorUsernameTaken;
    case "email_taken":
    case "username_or_email_taken":
      return c.errorEmailTaken;
    case "name_required":
      return c.errorNameRequired;
    case "username_required":
      return c.errorUsernameRequired;
    case "phone_number_required":
      return c.fieldPhone; // label saja; jarang terjadi (validasi utama di form)
    case "password_min_8":
      return c.errorPasswordMin ?? "Password minimal 8 karakter";
    case "email_invalid":
      return c.errorEmailInvalid;
    case "forbidden":
      return "Akses ditolak — hanya Owner.";
    default:
      return c.errorLoad ?? "Gagal menyimpan. Coba lagi.";
  }
}

export default function KasirCrudPage() {
  const { t } = useLang();
  const c = t.kasirAkun;

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "aktif" | "nonaktif">("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  // Auto-hide feedback toast.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Daftar kasir dari DATABASE via API — tanpa fallback mock.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/kasir", { credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as
        | { data?: { users?: ApiUser[] } }
        | null;
      if (res.ok && json?.data?.users) {
        setUsers(json.data.users);
        setLoadError(null);
      } else {
        setLoadError(res.status === 403 ? c.forbidden : c.errorLoad);
      }
    } catch {
      setLoadError(c.errorLoad);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q);
      const matchStatus = !statusFilter || u.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [users, query, statusFilter]);

  // Reset ke halaman 1 saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Pastikan halaman tetap valid bila total data berkurang
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (u: ApiUser) => {
    setEditing(u);
    setForm({
      username: u.username,
      name: u.name,
      phone_number: u.phone_number,
      email: u.email ?? "",
      password: "",
      status: u.status,
    });
    setErrors({});
    setModalOpen(true);
  };

  const submit = async () => {
    const e: Partial<FormState> = {};
    const username = form.username.trim();
    const email = form.email.trim();
    if (!form.name.trim()) e.name = c.errorNameRequired;
    if (!username) e.username = c.errorUsernameRequired;
    if (!editing && !form.password) e.password = c.errorPasswordRequired;
    else if (form.password && form.password.length < 8)
      e.password = c.errorPasswordMin ?? e.password;
    if (email && !EMAIL_RE.test(email)) e.email = c.errorEmailInvalid;
    // Duplikat username/email tetap ditegakkan server (satu-satunya sumber benar).
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/kasir/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              username,
              name: form.name.trim(),
              phone_number: form.phone_number.trim(),
              email,
              status: form.status,
              ...(form.password ? { password: form.password } : {}),
            }),
          })
        : await fetch("/api/kasir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              username,
              name: form.name.trim(),
              phone_number: form.phone_number.trim(),
              email,
              password: form.password,
              status: form.status,
            }),
          });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (res.ok) {
        setModalOpen(false);
        await refresh();
        setToast({
          kind: "success",
          text: editing ? c.successUpdated : c.successAdded,
        });
      } else {
        const code = json?.error ?? "server";
        // error unik tampil di field-nya masing-masing
        if (code === "username_taken") setErrors({ username: c.errorUsernameTaken });
        else if (code === "email_taken" || code === "username_or_email_taken")
          setErrors({ email: c.errorEmailTaken });
        else setToast({ kind: "error", text: apiError(code, c as unknown as Record<string, string>) });
      }
    } catch {
      setToast({ kind: "error", text: c.errorLoad });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: ApiUser) => {
    const active = u.status === "aktif";
    if (!window.confirm(active ? c.deactivateConfirm : c.activateConfirm)) return;
    try {
      const res = await fetch(`/api/kasir/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: active ? "nonaktif" : "aktif" }),
      });
      if (res.ok) {
        // Nonaktif = pengganti hapus sesuai PRD (akun tetap ada, tak bisa login).
        await refresh();
        setToast({
          kind: "success",
          text: active ? c.successDeactivated : c.successActivated,
        });
      } else {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast({ kind: "error", text: apiError(json?.error ?? "server", c as unknown as Record<string, string>) });
      }
    } catch {
      setToast({ kind: "error", text: c.errorLoad });
    }
  };

  const actionBtn = "p-1.5 rounded-md hover:bg-zinc-100 transition-colors";

  const hasFilter = query.trim() !== "" || statusFilter !== "";
  const resetFilters = () => {
    setQuery("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title={c.title} subtitle={c.subtitle}>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
          <div className="relative flex-1 sm:max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              placeholder={c.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-white text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | "aktif" | "nonaktif")}
            className="px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            aria-label={t.common.filterStatus}
          >
            <option value="">{c.filterAllStatus || t.common.filterStatusAll}</option>
            <option value="aktif">{t.status.active}</option>
            <option value="nonaktif">{t.status.inactive}</option>
          </select>

          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 rounded-lg border border-dashed border-line hover:border-danger hover:text-danger text-muted text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
            >
              {t.common.resetFilter}
            </button>
          )}

          <div className="sm:ml-auto">
            <Button onClick={openAdd}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t.common.add}
            </Button>
          </div>
        </div>

        {loadError ? (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-danger">
            {loadError}
          </div>
        ) : loading ? (
          <p className="text-center text-sm text-muted py-10">{t.common.loading}</p>
        ) : (
          <>
            <Table
              empty={hasFilter ? c.emptySearch : c.empty}
              head={
                <>
                  <Th>{c.tableUser}</Th>
                  <Th>{c.tableUsername}</Th>
                  <Th>{c.tablePhone}</Th>
                  <Th>{c.tableEmail}</Th>
                  <Th className="text-center">{c.tableStatus}</Th>
                  <Th className="text-right">{t.common.actions}</Th>
                </>
              }
            >
              {paginated.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium text-foreground whitespace-nowrap">{u.name}</Td>
                  <Td className="text-muted whitespace-nowrap">{u.username}</Td>
                  <Td className="text-muted tabular-nums whitespace-nowrap">{u.phone_number || "—"}</Td>
                  <Td className="text-muted max-w-xs truncate">{u.email || "—"}</Td>
                  <Td className="text-center">
                    <Badge variant={u.status === "aktif" ? "success" : "muted"}>
                      {u.status === "aktif" ? t.status.active : t.status.inactive}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className={actionBtn}
                        title={t.common.edit}
                        aria-label={t.common.edit}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStatus(u)}
                        className={actionBtn}
                        title={u.status === "aktif" ? c.deactivateLabel : c.activateLabel}
                        aria-label={u.status === "aktif" ? c.deactivateLabel : c.activateLabel}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                          {u.status === "aktif" ? (
                            <path d="M18.36 6.64a9 9 0 11-12.72 0M12 2v10" />
                          ) : (
                            <>
                              <path d="M18.36 6.64a9 9 0 11-12.72 0" />
                              <path d="M12 2v6M9 11h6" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>

      {/* Feedback toast — pola sama dengan feedback scan di halaman Transaksi */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg border ${
            toast.kind === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-danger"
          }`}
          role="status"
        >
          {toast.text}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? c.editTitle : c.addTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit} disabled={saving}>
              {t.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={c.fieldName}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={c.fieldNamePlaceholder}
            error={errors.name}
          />
          <Input
            label={c.fieldUsername}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder={c.fieldUsernamePlaceholder}
            error={errors.username}
            autoComplete="off"
          />
          <Input
            type="tel"
            label={c.fieldPhone}
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            placeholder={c.fieldPhonePlaceholder}
          />
          <Input
            type="email"
            label={c.fieldEmail}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={c.fieldEmailPlaceholder}
            error={errors.email}
          />
          <Input
            type="password"
            label={`${c.fieldPassword}${editing ? ` — ${c.fieldPasswordEditHint}` : ""}`}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editing ? "••••••••" : c.fieldPasswordPlaceholder}
            error={errors.password}
            autoComplete="new-password"
          />
          <Select
            label={c.fieldStatus}
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as FormState["status"] })
            }
          >
            <option value="aktif">{t.status.active}</option>
            <option value="nonaktif">{t.status.inactive}</option>
          </Select>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
