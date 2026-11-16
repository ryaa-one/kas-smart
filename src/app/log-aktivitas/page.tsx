"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  type SerializedActivityLog,
  getActivityActionColor,
} from "@/lib/activity-log-api";

export default function LogAktivitasPage() {
  const { t } = useLang();

  const [logs, setLogs] = useState<SerializedActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [usersList, setUsersList] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [actionsList, setActionsList] = useState<Array<{ action: string; label: string }>>([]);

  const [detail, setDetail] = useState<SerializedActivityLog | null>(null);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Server-side fetch dari PostgreSQL via /api/activity-logs
  useEffect(() => {
    let active = true;
    async function loadLogs() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("page_size", String(pageSize));
        if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
        if (userFilter) params.set("user_id", userFilter);
        if (actionFilter) params.set("action", actionFilter);
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const res = await fetch(`/api/activity-logs?${params.toString()}`);
        if (!res.ok) {
          if (active) {
            setLogs([]);
            setTotalItems(0);
            setTotalPages(1);
          }
          return;
        }

        const json = await res.json();
        if (active && json?.data) {
          setLogs(json.data.logs ?? []);
          if (json.data.pagination) {
            setTotalItems(json.data.pagination.total);
            setTotalPages(json.data.pagination.total_pages);
          } else {
            setTotalItems(json.data.logs?.length ?? 0);
            setTotalPages(1);
          }

          if (Array.isArray(json.data.users) && json.data.users.length > 0) {
            setUsersList(json.data.users);
          }
          if (Array.isArray(json.data.actions) && json.data.actions.length > 0) {
            setActionsList(json.data.actions);
          }
        }
      } catch (err) {
        console.error("Gagal memuat log aktivitas:", err);
        if (active) {
          setLogs([]);
          setTotalItems(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLogs();
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedQuery, userFilter, actionFilter, from, to]);

  const handleResetFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setUserFilter("");
    setActionFilter("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const hasActiveFilter = Boolean(query || userFilter || actionFilter || from || to);

  const inputCls =
    "px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

  return (
    <DashboardLayout title={t.logAktivitas.title} subtitle={t.logAktivitas.subtitle}>
      <Card>
        {/* Toolbar: cari + rentang tanggal + filter pengguna + filter jenis aktivitas */}
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
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              aria-label={t.riwayat.dateFrom}
              className={inputCls}
            />
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              aria-label={t.riwayat.dateTo}
              className={inputCls}
            />
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">{t.logAktivitas.filterAllUsers}</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">{t.logAktivitas.filterAllActions}</option>
              {actionsList.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.label}
                </option>
              ))}
            </select>
            {hasActiveFilter && (
              <Button size="sm" variant="secondary" onClick={handleResetFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Tabel Log Aktivitas */}
        <Table
          empty={
            !loading && logs.length === 0
              ? hasActiveFilter
                ? t.logAktivitas.emptySearch
                : t.logAktivitas.empty
              : undefined
          }
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
          {loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted">
                {t.common.loading}
              </td>
            </tr>
          ) : (
            logs.map((l) => (
              <tr key={l.id} className="hover:bg-zinc-50/70">
                <Td className="text-muted whitespace-nowrap tabular-nums">{formatDateTime(l.created_at)}</Td>
                <Td className="font-medium text-foreground whitespace-nowrap">{l.user_name}</Td>
                <Td className="text-muted whitespace-nowrap">{l.user_role}</Td>
                <Td>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${getActivityActionColor(
                      l.action
                    )}`}
                  >
                    {l.action_label}
                  </span>
                </Td>
                <Td className="text-muted">{l.description}</Td>
                <Td className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDetail(l)}>
                    {t.common.detail}
                  </Button>
                </Td>
              </tr>
            ))
          )}
        </Table>

        {/* Pagination Server-side */}
        {!loading && totalItems > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        )}
      </Card>

      {/* Modal Detail Aktivitas */}
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
                <p className="font-medium">{detail.user_role}</p>
              </div>
              <div>
                <p className="text-xs text-muted">{t.logAktivitas.tableAction}</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getActivityActionColor(
                    detail.action
                  )}`}
                >
                  {detail.action_label}
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
