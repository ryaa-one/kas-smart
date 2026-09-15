"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/format";
import { useDb, activityLabelAction, type ActivityAction, type ActivityLog } from "@/lib/mock/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getUsers } from "@/lib/mock/users";

// FR-19: log hanya Owner; daftar aktivitas mengikuti butir a-q di PRD hal. 8.
// Warna chip per jenis aktivitas; label dari t.activity (key = ActivityAction).
const actionColor: Record<string, string> = {
  login: "bg-blue-600/10 text-blue-600",
  logout: "bg-zinc-500/10 text-muted",
  productAdd: "bg-primary/10 text-primary",
  productEdit: "bg-primary/10 text-primary",
  productDeactivate: "bg-primary/10 text-primary",
  supplierAdd: "bg-primary/10 text-primary",
  purchase: "bg-amber-600/10 text-amber-600",
  sale: "bg-amber-600/10 text-amber-600",
  qrisConfirm: "bg-purple-600/10 text-purple-600",
  debtAdd: "bg-rose-600/10 text-rose-600",
  debtPayment: "bg-success/10 text-success",
  stockAdjustment: "bg-warning/10 text-warning",
  cashierAdd: "bg-primary/10 text-primary",
  cashierEdit: "bg-primary/10 text-primary",
  cashierDeactivate: "bg-primary/10 text-primary",
  storeInfoChange: "bg-primary/10 text-primary",
  profileChange: "bg-success/10 text-success",
};

export default function LogAktivitasPage() {
  const { t } = useLang();
  const db = useDb(); // ACTIVITY_LOGS store bersama (C-3)

  const [query, setQuery] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<ActivityAction | "">("");
  // M-5 (UC-23): filter tanggal dari–sampai + detail aktivitas (modal).
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<ActivityLog | null>(null);

  // Role actor dari USERS (sumber tunggal; log hanya menyimpan user_id/user_name).
  const roleOf = (userId: string) =>
    getUsers().find((u) => u.id === userId)?.role ?? "—";

  const users = useMemo(
    () => [...new Set(db.logs.map((l) => l.user_name))],
    [db.logs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.logs.filter(
      (l) =>
        (!userFilter || l.user_name === userFilter) &&
        (!actionFilter || l.action === actionFilter) &&
        (!from || l.created_at.slice(0, 10) >= from) &&
        (!to || l.created_at.slice(0, 10) <= to) &&
        (!q || l.description.toLowerCase().includes(q) || l.user_name.toLowerCase().includes(q))
    );
  }, [db.logs, query, userFilter, actionFilter, from, to]);

  const actionMeta = (action: ActivityAction) =>
    actionColor[action] ?? "bg-zinc-500/10 text-muted";

  // Label aktivitas dari jenis + nama user di store (log baru ikut tampil).
  const actionLabel = (log: ActivityLog) =>
    activityLabelAction(db, log.action);

  const inputCls =
    "px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

  return (
    <DashboardLayout title={t.logAktivitas.title} subtitle={t.logAktivitas.subtitle}>
      <Card>
        {/* Toolbar: cari + filter pengguna + filter jenis aktivitas */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0 rounded-lg border border-line bg-zinc-50 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.logAktivitas.searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              aria-label={t.riwayat.dateFrom}
              className={inputCls}
            />
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              aria-label={t.riwayat.dateTo}
              className={inputCls}
            />
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className={inputCls}>
              <option value="">{t.logAktivitas.filterAllUsers}</option>
              {users.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as ActivityAction | "")} className={inputCls}>
              <option value="">{t.logAktivitas.filterAllActions}</option>
              {([...new Set(db.logs.map((l) => l.action))] as ActivityAction[]).map((a) => {
                const sample = db.logs.find((l) => l.action === a)!;
                return <option key={a} value={a}>{actionLabel(sample)}</option>;
              })}
            </select>
          </div>
        </div>

        <Table
          empty={db.logs.length === 0 ? t.logAktivitas.empty : t.logAktivitas.emptySearch}
          head={
            <>
              <Th>{t.logAktivitas.tableTime}</Th>
              <Th>{t.logAktivitas.tableUser}</Th>
              <Th>{t.logAktivitas.tableRole}</Th>
              <Th>{t.logAktivitas.tableAction}</Th>
              <Th>{t.logAktivitas.tableDescription}</Th>
              <Th className="text-right">{t.common.actions}</Th>
            </>
          }
        >
          {filtered.map((l) => {
            return (
              <tr key={l.id} className="hover:bg-zinc-50/70">
                <Td className="text-muted whitespace-nowrap tabular-nums">{formatDateTime(l.created_at)}</Td>
                <Td className="font-medium text-foreground whitespace-nowrap">{l.user_name}</Td>
                <Td className="text-muted whitespace-nowrap">{roleOf(l.user_id)}</Td>
                <Td>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${actionMeta(l.action)}`}>
                    {actionLabel(l)}
                  </span>
                </Td>
                <Td className="text-muted">{l.description}</Td>
                <Td className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDetail(l)}>
                    {t.common.detail}
                  </Button>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>

      {/* M-5: detail aktivitas (modal) — waktu, actor+role, aksi, deskripsi */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={`${t.logAktivitas.detailTitle}${detail ? ` — ${detail.id}` : ""}`}
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            {t.common.close}
          </Button>
        }
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted">{t.logAktivitas.tableTime}</p>
                <p className="font-medium tabular-nums">{formatDateTime(detail.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">{t.logAktivitas.tableUser}</p>
                <p className="font-medium">{detail.user_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted">{t.common.role}</p>
                <p className="font-medium">{roleOf(detail.user_id)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">{t.logAktivitas.tableAction}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${actionMeta(detail.action)}`}>
                  {actionLabel(detail)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted">{t.logAktivitas.tableDescription}</p>
              <p className="mt-1 rounded-lg border border-line bg-zinc-50 px-3 py-2">{detail.description}</p>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
