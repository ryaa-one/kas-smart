"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/format";
import { mockActivityLogs, type ActivityAction, type ActivityLog } from "@/lib/mock/owner";

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
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<ActivityAction | "">("");

  const users = useMemo(
    () => [...new Set(mockActivityLogs.map((l) => l.user_name))],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mockActivityLogs.filter(
      (l) =>
        (!userFilter || l.user_name === userFilter) &&
        (!actionFilter || l.action === actionFilter) &&
        (!q || l.description.toLowerCase().includes(q) || l.user_name.toLowerCase().includes(q))
    );
  }, [query, userFilter, actionFilter]);

  const actionMeta = (action: ActivityAction) =>
    actionColor[action] ?? "bg-zinc-500/10 text-muted";

  // Label aktivitas: pakai t.activity bila ada, selain itu teks deskripsi.
  const actionLabel = (log: ActivityLog) => {
    const dict = t.activity as Record<string, string>;
    return dict[log.action] ?? log.action;
  };

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
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className={inputCls}>
              <option value="">{t.logAktivitas.filterAllUsers}</option>
              {users.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as ActivityAction | "")} className={inputCls}>
              <option value="">{t.logAktivitas.filterAllActions}</option>
              {[...new Set(mockActivityLogs.map((l) => l.action))].map((a) => (
                <option key={a} value={a}>{actionLabel(mockActivityLogs.find((l) => l.action === a)!)}</option>
              ))}
            </select>
          </div>
        </div>

        <Table
          empty={mockActivityLogs.length === 0 ? t.logAktivitas.empty : t.logAktivitas.emptySearch}
          head={
            <>
              <Th>{t.logAktivitas.tableTime}</Th>
              <Th>{t.logAktivitas.tableUser}</Th>
              <Th>{t.logAktivitas.tableAction}</Th>
              <Th>{t.logAktivitas.tableDescription}</Th>
            </>
          }
        >
          {filtered.map((l) => {
            return (
              <tr key={l.id} className="hover:bg-zinc-50/70">
                <Td className="text-muted whitespace-nowrap tabular-nums">{formatDateTime(l.created_at)}</Td>
                <Td className="font-medium text-foreground whitespace-nowrap">{l.user_name}</Td>
                <Td>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${actionMeta(l.action)}`}>
                    {actionLabel(l)}
                  </span>
                </Td>
                <Td className="text-muted">{l.description}</Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </DashboardLayout>
  );
}
