"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ReceiptModal } from "@/components/ui/ReceiptModal";
import { BarcodeScanner } from "@/components/ui/BarcodeScanner";
import {
  useDb,
  getDb,
  addCustomer,
  createDraftSale,
  updateDraftContents,
  cancelSale,
  finalizeSale,
  getSale,
  setSaleMethod,
  logActivity,
  type Customer,
  type Product,
  type Sale,
} from "@/lib/mock/db";

type Stage = "cart" | "payment" | "success" | "cancelled";
type PaymentMethod = "cash" | "qris" | "debt";

interface CartItem {
  product: Product;
  quantity: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

// QRIS statis toko dari STORE_SETTINGS; fallback pola placeholder bila Owner
// belum mengunggah gambar (konsistensi dengan halaman Informasi Toko).
function QrisPlaceholder() {
  return (
    <div
      className="w-40 h-40 mx-auto bg-white border border-line rounded-lg p-2 grid grid-cols-8 grid-rows-8 gap-px"
      aria-label="QRIS Toko"
    >
      {Array.from({ length: 64 }).map((_, i) => (
        <div key={i} className={(i * 7) % 5 < 2 ? "bg-foreground" : ""} />
      ))}
    </div>
  );
}

export default function KasirPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const db = useDb(); // katalog produk + pelanggan + settings dari store bersama

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [stage, setStage] = useState<Stage>("cart");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [customerError, setCustomerError] = useState(false);
  const [saleId, setSaleId] = useState(""); // Draft SALES_TRANSACTIONS
  const [finalSale, setFinalSale] = useState<Sale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false); // M-4: modal struk khusus
  const [stockError, setStockError] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>(() => db.customers);
  const [customerQuery, setCustomerQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newError, setNewError] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Sinkron daftar pelanggan dari store (tambahan baru muncul di pencarian).
  useEffect(() => setCustomers(db.customers), [db.customers]);

  // Auto-hide feedback hasil scan (produk masuk / tidak ditemukan).
  useEffect(() => {
    if (!scanFeedback) return;
    const timer = setTimeout(() => setScanFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [scanFeedback]);

  const actor = useRef(user ? { id: user.id, name: user.name } : null);
  useEffect(() => {
    actor.current = user ? { id: user.id, name: user.name } : null;
  }, [user]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, customerQuery]);

  const openAddCustomer = () => {
    setNewName(customerQuery.trim()); // prefill dari kata kunci pencarian
    setNewPhone("");
    setNewAddress("");
    setNewError("");
    setAddOpen(true);
  };

  const submitAddCustomer = () => {
    if (!newName.trim()) {
      setNewError(t.kasir.errorCustomerNameRequired);
      return;
    }
    const created = addCustomer(newName.trim(), newPhone.trim(), newAddress.trim());
    if (actor.current)
      logActivity(actor.current, "customerAdd", `Tambah pelanggan ${created.name}`);
    setCustomers(getDb().customers);
    setCustomerId(created.id);
    setAddOpen(false);
    setJustAdded(true);
  };

  // Katalog = produk AKTIF dari store — sama dengan halaman Produk (H-2).
  const catalog = useMemo(
    () =>
      db.products
        .filter((p) => p.is_active)
        .map((p) => ({ ...p, category: db.categories.find((c) => c.id === p.category_id)?.name ?? "-" })),
    [db.products, db.categories]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode ?? "").includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [query, catalog]);

  const total = cart.reduce(
    (s, item) => s + item.product.selling_price * item.quantity,
    0
  );
  const cashNum = parseInt(cashReceived, 10) || 0;
  const cashChange = method === "cash" ? Math.max(0, cashNum - total) : 0;
  const cashInsufficient = method === "cash" && cashNum < total;

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return;
    setCart((c) => {
      const found = c.find((i) => i.product.id === p.id);
      if (found) {
        if (found.quantity >= p.stock) return c;
        return c.map((i) =>
          i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...c, { product: p, quantity: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((c) =>
      c
        .map((i) =>
          i.product.id === id ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  // Handler hasil scan barcode (ZXing): cocokkan dengan store yang sama.
  const handleScanDetected = (code: string) => {
    const trimmed = code.trim();
    const product = catalog.find((p) => p.barcode === trimmed);
    if (!product) {
      setScanFeedback({ kind: "error", text: t.kasir.scanNotFound.replace("{code}", code) });
      return;
    }
    const inCart = cart.find((i) => i.product.id === product.id);
    const stockLeft = product.stock - (inCart?.quantity ?? 0);
    if (stockLeft <= 0) {
      setScanFeedback({ kind: "error", text: t.kasir.scanOutOfStock.replace("{code}", product.name) });
      return;
    }
    addToCart(product);
    setScanFeedback({ kind: "success", text: t.kasir.scanAdded.replace("{code}", product.name) });
  };

  // Lanjut ke pembayaran → buat/refresh Draft SALES_TRANSACTIONS (Activity c).
  const proceedToPayment = () => {
    if (!actor.current || cart.length === 0) return;
    const items = cart.map((i) => ({
      product: getDb().products.find((p) => p.id === i.product.id) ?? i.product,
      quantity: i.quantity,
    }));
    let id = saleId;
    const existing = id ? getSale(id) : undefined;
    if (existing && existing.status === "draft") {
      updateDraftContents(id, items);
    } else {
      id = createDraftSale(actor.current, items).id;
    }
    setSaleId(id);
    setStage("payment");
    setMethod(null);
    setCustomerId("");
    setCashReceived("");
    setCustomerError(false);
    setCustomerQuery("");
    setJustAdded(false);
    setStockError(false);
  };

  const finishStage = (sale: Sale, s: Stage) => {
    setFinalSale(sale);
    setStage(s);
    setSaleId("");
  };

  const confirmTransaction = () => {
    if (method === "debt" && !customerId) {
      setCustomerError(true);
      return;
    }
    if (!saleId || !method) return;
    const res = finalizeSale(saleId, {
      method,
      customerId: method === "debt" ? customerId : null,
      amountPaid: method === "cash" ? cashNum : null,
    });
    if (!res.ok) {
      setStockError(true);
      setStage("cart");
      return;
    }
    finishStage(getSale(saleId)!, "success");
  };

  // Pembatalan QRIS menunggu → status cancelled, stok tidak berkurang (UC-12).
  const cancelQris = () => {
    if (!saleId) return;
    if (!window.confirm(t.kasir.cancelConfirm)) return;
    const sale = getSale(saleId);
    if (!sale || (sale.status !== "waiting_payment" && sale.status !== "draft")) return;
    cancelSale(saleId);
    setFinalSale(getSale(saleId)!);
    setStage("cancelled");
    setSaleId("");
  };

  const resetAll = () => {
    // Draft yang ditinggalkan dibatalkan supaya tidak menumpuk sebagai draft.
    if (saleId && getSale(saleId)?.status === "draft") cancelSale(saleId);
    setCart([]);
    setStage("cart");
    setMethod(null);
    setCustomerId("");
    setCashReceived("");
    setQuery("");
    setSaleId("");
    setFinalSale(null);
    setStockError(false);
  };

  const methodCard = (m: PaymentMethod, label: string, icon: ReactNode) => {
    const active = method === m;
    return (
      <button
        type="button"
        onClick={() => {
          setMethod(m);
          setCustomerError(false);
          setStockError(false);
          // QRIS: transaksi Draft langsung berstatus Menunggu Pembayaran (UC-12).
          if (m === "qris" && saleId) setSaleMethod(saleId, "qris");
        }}
        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
          active
            ? "border-primary bg-primary/10 text-primary"
            : "border-line text-muted hover:border-primary/40 hover:text-foreground"
        }`}
      >
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </button>
    );
  };

  const iconClass = "w-[22px] h-[22px] text-current";
  const qrisImage = db.settings.qris_image;

  return (
    <DashboardLayout title={t.kasir.title} subtitle={t.kasir.subtitle}>
      {stage === "cart" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Pencarian & daftar produk */}
          <Card className="lg:col-span-3">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-zinc-50 pl-3 pr-1.5 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-muted shrink-0"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input
                id="kasir-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.kasir.searchPlaceholder}
                className="flex-1 min-w-0 bg-transparent py-1 text-sm outline-none placeholder:text-muted/60"
              />
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                title={t.kasir.scanBarcode}
                aria-label={t.kasir.scanBarcode}
                className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M14 8v4M14 15v1M17 8v8" />
                </svg>
                <span className="text-xs font-medium hidden sm:inline">{t.kasir.scanBarcode}</span>
              </button>
            </div>

            {stockError && (
              <p className="mt-2 text-xs font-medium text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2" role="alert">
                {t.kasir.errorStockInsufficient}
              </p>
            )}

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[520px] overflow-y-auto pr-1">
              {results.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const stockLeft = p.stock - (inCart?.quantity ?? 0);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-line hover:border-primary/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted truncate">{p.category} · {p.barcode ?? "-"}</p>
                      <p className="text-sm font-semibold text-primary mt-0.5">{fmt(p.selling_price)}</p>
                      <p className={`text-[10px] mt-0.5 ${stockLeft <= 0 ? "text-danger" : "text-muted"}`}>
                        {stockLeft <= 0
                          ? t.kasir.outOfStock
                          : `${t.kasir.stockLeft}: ${stockLeft}`}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => addToCart(p)} disabled={stockLeft <= 0}>
                      {t.kasir.add}
                    </Button>
                  </div>
                );
              })}
              {results.length === 0 && (
                <p className="col-span-full text-center text-sm text-muted py-10">
                  {t.kasir.emptySearch}
                </p>
              )}
            </div>
          </Card>

          {/* Daftar barang transaksi */}
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t.kasir.cartTitle}</h3>
            {cart.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">{t.kasir.cartEmpty}</p>
            ) : (
              <>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-50 border border-line"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                        <p className="text-xs text-muted">
                          {fmt(item.product.selling_price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => changeQty(item.product.id, -1)}
                          className="w-6 h-6 rounded border border-line text-muted hover:text-foreground flex items-center justify-center"
                          aria-label="-"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(item.product.id, 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="w-6 h-6 rounded border border-line text-muted hover:text-foreground disabled:opacity-40 flex items-center justify-center"
                          aria-label="+"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCart((c) => c.filter((i) => i.product.id !== item.product.id))}
                        className="w-6 h-6 rounded text-muted hover:text-danger flex items-center justify-center shrink-0"
                        aria-label={t.kasir.remove}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-line mt-4 pt-4 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">{t.kasir.subtotal}</span>
                    <span className="font-medium">{fmt(total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground">{t.kasir.total}</span>
                    <span className="text-xl font-bold text-primary">{fmt(total)}</span>
                  </div>
                  <Button className="w-full mt-2" size="lg" onClick={proceedToPayment}>
                    {t.kasir.proceedPayment}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {stage === "payment" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <Card className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-foreground mb-1">{t.kasir.paymentTitle}</h3>
            <p className="text-xs text-muted mb-4">{t.kasir.paymentSubtitle}</p>

            <div className="grid grid-cols-3 gap-2">
              {methodCard(
                "cash",
                t.kasir.cash,
                <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
              {methodCard(
                "qris",
                t.kasir.qris,
                <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM20 14v0M14 20h0M20 20h0" />
                </svg>
              )}
              {methodCard(
                "debt",
                t.kasir.debt,
                <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8" />
                </svg>
              )}
            </div>

            {/* Tunai: uang diterima + kembalian */}
            {method === "cash" && (
              <div className="mt-4 space-y-1">
                <Input
                  type="number"
                  min={0}
                  label={t.kasir.cashAmount}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0"
                  error={cashInsufficient ? t.kasir.cashInsufficient : undefined}
                />
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted">{t.kasir.cashChange}</span>
                  <span className="font-bold text-success">{fmt(cashChange)}</span>
                </div>
              </div>
            )}

            {/* QRIS: gambar QRIS toko + status menunggu konfirmasi */}
            {method === "qris" && (
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full mb-4">
                  {t.kasir.qrisWaitingBadge}
                </span>
                {qrisImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrisImage} alt={t.kasir.qrisPlaceholder} className="w-40 h-40 mx-auto object-contain bg-white border border-line rounded-lg p-2" />
                ) : (
                  <QrisPlaceholder />
                )}
                <p className="text-xs text-muted mt-3 max-w-xs mx-auto">{t.kasir.qrisNote}</p>
                <button
                  type="button"
                  onClick={cancelQris}
                  className="mt-3 text-xs font-semibold text-danger hover:underline underline-offset-4"
                >
                  {t.kasir.cancelPayment}
                </button>
              </div>
            )}

            {/* Hutang: wajib pilih pelanggan — search + tambah pelanggan baru */}
            {method === "debt" && (
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  {t.kasir.customer}
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-zinc-50 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted shrink-0">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4-4" />
                  </svg>
                  <input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder={t.kasir.searchCustomerPlaceholder}
                    className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted/60"
                  />
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCustomerId(c.id);
                        setCustomerError(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                        customerId === c.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-line text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      <span className="text-xs text-muted shrink-0 tabular-nums">{c.phone}</span>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="text-xs text-muted px-1 py-2">{t.kasir.customerNotFound}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openAddCustomer}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t.kasir.addCustomer}
                </button>
                {justAdded && (
                  <span className="ml-2 text-xs text-success">{t.kasir.customerAdded}</span>
                )}
                {customerError && (
                  <span className="text-xs text-danger mt-1 block">{t.kasir.customerRequired}</span>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button variant="secondary" onClick={() => setStage("cart")}>
                {t.kasir.backToCart}
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={!method || cashInsufficient}
                onClick={confirmTransaction}
              >
                {t.kasir.confirmLunas}
              </Button>
            </div>
          </Card>

          {/* Ringkasan */}
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t.kasir.cartTitle}</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-muted truncate pr-2">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="font-medium shrink-0">
                    {fmt(item.product.selling_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-line mt-4 pt-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">{t.kasir.total}</span>
              <span className="text-xl font-bold text-primary">{fmt(total)}</span>
            </div>
          </Card>
        </div>
      )}

      {stage === "success" && finalSale && (
        <Card className="max-w-md mx-auto text-center py-10">
          <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-foreground mt-4">{t.kasir.successTitle}</h3>
          <p className="text-sm text-muted mt-1">{t.kasir.successSubtitle}</p>
          {finalSale.status === "debt" && (
            <p className="text-xs text-warning mt-1">{t.kasir.debtRecordNote}</p>
          )}

          <div className="mt-6 p-3 rounded-lg bg-zinc-50 border border-line text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t.kasir.invoiceNumber}</span>
              <span className="font-semibold tabular-nums">{finalSale.invoice_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t.kasir.total}</span>
              <span className="font-bold text-primary">{fmt(finalSale.total)}</span>
            </div>
            {finalSale.status === "paid" && finalSale.payment_method === "cash" && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{t.kasir.cashAmount}</span>
                  <span className="font-medium tabular-nums">{fmt(finalSale.amount_paid ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{t.kasir.cashChange}</span>
                  <span className="font-medium tabular-nums">{fmt(finalSale.change_amount ?? 0)}</span>
                </div>
              </>
            )}
            {finalSale.status === "debt" && finalSale.customer_name && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t.kasir.customer}</span>
                <span className="font-medium">{finalSale.customer_name}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6 justify-center">
            <Button variant="secondary" onClick={() => setReceiptOpen(true)}>
              {t.kasir.printInvoice}
            </Button>
            <Button onClick={resetAll}>{t.kasir.newTransaction}</Button>
          </div>
        </Card>
      )}

      {stage === "cancelled" && (
        <Card className="max-w-md mx-auto text-center py-10">
          <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-foreground mt-4">{t.kasir.cancelledTitle}</h3>
          <p className="text-sm text-muted mt-1">{t.kasir.cancelledSubtitle}</p>
          <div className="flex gap-2 mt-6 justify-center">
            <Button onClick={resetAll}>{t.kasir.backToCartAfterCancel}</Button>
          </div>
        </Card>
      )}

      {/* Feedback hasil scan — muncul di stage cart & payment, auto-hide 3s */}
      {scanFeedback && stage !== "success" && stage !== "cancelled" && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg border ${
            scanFeedback.kind === "success"
              ? "bg-success/10 text-success border-success/30"
              : "bg-danger/10 text-danger border-danger/30"
          }`}
        >
          {scanFeedback.text}
        </div>
      )}

      {/* M-4: template struk/invoice khusus (FR-11/UC-14) */}
      <ReceiptModal sale={finalSale} open={receiptOpen} onClose={() => setReceiptOpen(false)} />

      {/* Scanner barcode ZXing — tombol Scan Barcode pada bar pencarian */}
      <BarcodeScanner
        open={scanOpen}
        onDetected={handleScanDetected}
        onClose={() => setScanOpen(false)}
      />

      {/* Modal Tambah Pelanggan — hanya dari alur transaksi Hutang */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t.kasir.addCustomerTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submitAddCustomer}>{t.common.save}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted">{t.kasir.addCustomerSubtitle}</p>
          <Input
            label={t.kasir.fieldCustomerName}
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setNewError("");
            }}
            placeholder={t.kasir.fieldCustomerNamePlaceholder}
            error={newError || undefined}
            autoFocus
          />
          <Input
            type="tel"
            label={t.kasir.fieldCustomerPhone}
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder={t.kasir.fieldCustomerPhonePlaceholder}
          />
          <Input
            label={t.kasir.fieldCustomerAddress}
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder={t.kasir.fieldCustomerAddressPlaceholder}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
