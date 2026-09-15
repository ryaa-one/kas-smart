"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, Th, Td } from "@/components/ui/Table";
import {
  getUsers,
  addUser,
  updateUser,
  isUsernameTaken,
  isEmailTaken,
  type StoreUser,
} from "@/lib/mock/users";
import { logActivity } from "@/lib/mock/db";

interface FormState {
  username: string;
  name: string;
  phone_number: string;
  email: string;
  password: string;
  status: "active" | "inactive";
}

// Password tidak prefill saat edit — kolom kosong = password lama tetap terpakai.
const emptyForm: FormState = {
  username: "",
  name: "",
  phone_number: "",
  email: "",
  password: "",
  status: "active",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function KasirCrudPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const c = t.kasirAkun;

  // ponytail: snapshot array mock saat mount — refresh balik ke data awal, ganti GET /api/users.
  const [users, setUsers] = useState<StoreUser[]>(() =>
    getUsers().filter((u) => u.role === "Kasir")
  );
  const [query, setQuery] = useState("");
  const [loading] = useState(false); // mock sinkron — loading tetap disiapkan untuk API
  const [loadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoreUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  // Auto-hide feedback toast.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const refresh = () => setUsers(getUsers().filter((u) => u.role === "Kasir"));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  }, [users, query]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (u: StoreUser) => {
    setEditing(u);
    setForm({
      username: u.username,
      name: u.name,
      phone_number: u.phone_number,
      email: u.email,
      password: "",
      status: u.status,
    });
    setErrors({});
    setModalOpen(true);
  };

  const submit = () => {
    const e: Partial<FormState> = {};
    const username = form.username.trim();
    const email = form.email.trim();
    if (!form.name.trim()) e.name = c.errorNameRequired;
    if (!username) e.username = c.errorUsernameRequired;
    else if (isUsernameTaken(username, editing?.id)) e.username = c.errorUsernameTaken;
    if (!editing && !form.password) e.password = c.errorPasswordRequired;
    if (email && !EMAIL_RE.test(email)) e.email = c.errorEmailInvalid;
    // M-11 (UC-21): email unik — saat edit, milik sendiri tidak dianggap duplikat.
    else if (email && isEmailTaken(email, editing?.id)) e.email = c.errorEmailTaken;
    setErrors(e);
    if (Object.keys(e).length) return;

    if (editing) {
      // Password hanya diubah bila diisi; plaintext lama tidak pernah ditampilkan.
      updateUser(editing.id, {
        username,
        name: form.name.trim(),
        phone_number: form.phone_number.trim(),
        email,
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      });
      logActivity(
        user ? { id: user.id, name: user.name } : null,
        "cashierEdit",
        `Ubah akun kasir ${form.name.trim()}`
      );
      setToast({ kind: "success", text: c.successUpdated });
    } else {
      addUser({
        username,
        name: form.name.trim(),
        phone_number: form.phone_number.trim(),
        email,
        password: form.password,
        role: "Kasir", // selalu Kasir sesuai ERD USERS
        status: form.status,
      });
      logActivity(
        user ? { id: user.id, name: user.name } : null,
        "cashierAdd",
        `Tambah akun kasir ${form.name.trim()}`
      );
      setToast({ kind: "success", text: c.successAdded });
    }
    refresh();
    setModalOpen(false);
  };

  const toggleStatus = (u: StoreUser) => {
    const active = u.status === "active";
    const ok = window.confirm(active ? c.deactivateConfirm : c.activateConfirm);
    if (!ok) return;
    updateUser(u.id, { status: active ? "inactive" : "active" });
    // Nonaktif = penggantian hapus sesuai PRD (akun tetap ada, tidak bisa login).
    logActivity(
      user ? { id: user.id, name: user.name } : null,
      active ? "cashierDeactivate" : "cashierActivate",
      `${active ? "Nonaktifkan" : "Aktifkan kembali"} akun kasir ${u.name}`
    );
    refresh();
    setToast({ kind: "success", text: active ? c.successDeactivated : c.successActivated });
  };

  const actionBtn = "p-1.5 rounded-md hover:bg-zinc-100 transition-colors";

  return (
    <DashboardLayout title={c.title} subtitle={c.subtitle}>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
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
          <Table
            empty={query ? c.emptySearch : c.empty}
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
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50/70">
                <Td className="font-medium text-foreground whitespace-nowrap">{u.name}</Td>
                <Td className="text-muted whitespace-nowrap">{u.username}</Td>
                <Td className="text-muted tabular-nums whitespace-nowrap">{u.phone_number}</Td>
                <Td className="text-muted max-w-xs truncate">{u.email}</Td>
                <Td className="text-center">
                  <Badge variant={u.status === "active" ? "success" : "muted"}>
                    {u.status === "active" ? t.status.active : t.status.inactive}
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
                      title={u.status === "active" ? c.deactivateLabel : c.activateLabel}
                      aria-label={u.status === "active" ? c.deactivateLabel : c.activateLabel}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                        {u.status === "active" ? (
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
            <Button onClick={submit}>{t.common.save}</Button>
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
            <option value="active">{t.status.active}</option>
            <option value="inactive">{t.status.inactive}</option>
          </Select>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
