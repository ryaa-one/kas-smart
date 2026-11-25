"use client";

// UC-04 Mengelola Produk — SUMBER DATA: database via API (tanpa fallback mock).
// GET/POST /api/products | PATCH /api/products/:id | DELETE (soft: is_active=false)
// UI (layout, search, filter, modal, scanner ZXing, i18n) dipertahankan 1:1.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { BarcodeScanner } from "@/components/ui/BarcodeScanner";
import { Table, Th, Td } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { ProductThumbnail } from "@/components/ui/ProductThumbnail";
import {
  ImageCompressionError,
  compressProductImage,
  formatFileSize,
} from "@/lib/image-compression";
import { formatRupiah } from "@/lib/format";

interface ApiProduct {
  id: string;
  name: string;
  category_id: string;
  category_name: string | null;
  barcode: string | null;
  purchase_price: number;
  selling_price: number;
  stock: number;
  minimum_stock: number;
  is_active: boolean;
  image_path: string | null;
  image_url: string | null;
}
interface ApiCategory {
  id: string;
  name: string;
}

interface FormState {
  barcode: string;
  name: string;
  category_id: string;
  purchase_price: string;
  selling_price: string;
  stock: string;
  minimum_stock: string;
  is_active: boolean;
  image?: string;
}

const emptyForm: FormState = {
  barcode: "",
  name: "",
  category_id: "",
  purchase_price: "",
  selling_price: "",
  stock: "",
  minimum_stock: "",
  is_active: true,
};

export default function ProdukPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const p = t.produk;

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "aktif" | "nonaktif">("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    savedPercent: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const compressionTokenRef = useRef(0);
  const previewUrlRef = useRef<string | null>(null);

  const clearObjectUrl = (url: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    previewUrlRef.current = imagePreview;
  }, [imagePreview]);

  useEffect(() => {
    return () => {
      clearObjectUrl(previewUrlRef.current);
    };
  }, []);

  const msg = (code: string): string => {
    switch (code) {
      case "name_required": return p.errorNameRequired;
      case "category_required": return p.errorCategoryRequired;
      case "category_not_found": return p.errorCategoryNotFound;
      case "price_invalid": return p.errorPriceInvalid;
      case "sell_below_purchase": return p.errorSellBelowPurchase;
      case "stock_invalid":
      case "minimum_stock_invalid": return p.errorStockNegative;
      case "barcode_taken": return p.errorBarcodeDuplicate;
      case "barcode_invalid": return p.errorBarcodeInvalid;
      case "image_invalid_type": return p.errorImageInvalidType;
      case "image_too_large": return p.errorImageTooLarge;
      case "image_empty": return p.errorImageEmpty;
      case "image_upload_failed": return p.errorImageUpload;
      case "product_in_use": return p.errorDeleteInUse;
      case "product_in_use_sales": return p.errorDeleteInUseSales;
      case "product_in_use_purchases": return p.errorDeleteInUsePurchases;
      case "product_in_use_adjustments": return p.errorDeleteInUseAdjustments;
      default: return p.errorLoad;
    }
  };

  const showErr = (code: string, field?: keyof FormState) => {
    const text = msg(code);
    if (field) setErrors((e) => ({ ...e, [field]: text }));
    else setToast({ kind: "error", text });
  };

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as
        | { data?: { products?: ApiProduct[] } }
        | null;
      if (res.ok && json?.data?.products) {
        setProducts(json.data.products);
        setLoadError(null);
      } else {
        setLoadError(p.errorLoad);
      }
    } catch {
      setLoadError(p.errorLoad);
    } finally {
      setLoading(false);
    }
  }, [p.errorLoad]);

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/products", { credentials: "same-origin" }),
          fetch("/api/categories", { credentials: "same-origin" }),
        ]);

        if (!active) return;

        const prodJson = (await prodRes.json().catch(() => null)) as
          | { data?: { products?: ApiProduct[] } }
          | null;
        if (prodRes.ok && prodJson?.data?.products) {
          setProducts(prodJson.data.products);
          setLoadError(null);
        } else {
          setLoadError(p.errorLoad);
        }

        if (catRes.ok) {
          const catJson = (await catRes.json().catch(() => null)) as {
            data?: { categories?: ApiCategory[] };
          } | null;
          if (active) {
            setCategories(catJson?.data?.categories ?? []);
          }
        }
      } catch {
        if (active) setLoadError(p.errorLoad);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitial();
    return () => {
      active = false;
    };
  }, [p.errorLoad]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const catName = (id: string) =>
    products.find((x) => x.category_id === id)?.category_name ??
    categories.find((c) => c.id === id)?.name ??
    "-";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((pr) => {
      const matchCategory = !categoryFilter || pr.category_id === categoryFilter;
      const matchSearch =
        !q ||
        pr.name.toLowerCase().includes(q) ||
        (pr.barcode ?? "").toLowerCase().includes(q);
      const matchStatus =
        !statusFilter ||
        (statusFilter === "aktif" ? pr.is_active : !pr.is_active);
      return matchCategory && matchSearch && matchStatus;
    });
  }, [products, query, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const openAdd = () => {
    compressionTokenRef.current += 1;
    clearObjectUrl(imagePreview);
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setCompressing(false);
    setCompressionInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (pr: ApiProduct) => {
    compressionTokenRef.current += 1;
    clearObjectUrl(imagePreview);
    setEditing(pr);
    setForm({
      barcode: pr.barcode ?? "", // null → kosong, BUKAN "-" (H-2)
      name: pr.name,
      category_id: pr.category_id,
      purchase_price: String(pr.purchase_price),
      selling_price: String(pr.selling_price),
      stock: String(pr.stock),
      minimum_stock: String(pr.minimum_stock),
      is_active: pr.is_active,
    });
    setImageFile(null);
    setImagePreview(pr.image_url ?? null);
    setRemoveImage(false);
    setCompressing(false);
    setCompressionInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors({});
    setModalOpen(true);
  };

  const compressionErrorMessage = (err: unknown): string => {
    if (err instanceof ImageCompressionError) {
      switch (err.code) {
        case "image_empty":
          return p.errorImageEmpty;
        case "image_invalid_type":
          return p.errorImageInvalidType;
        case "image_raw_too_large":
          return p.errorImageRawTooLarge;
        case "compressed_too_large":
          return p.errorImageStillTooLarge;
        case "webp_encode_failed":
          return p.errorImageWebpUnsupported;
        case "image_decode_failed":
        case "image_invalid_dimensions":
          return p.errorImageDecode;
      }
    }
    return p.errorImageDecode;
  };

  const handleImageSelect = async (file: File | undefined) => {
    const token = ++compressionTokenRef.current;
    setErrors((prev) => ({ ...prev, image: undefined }));
    setCompressionInfo(null);

    if (!file) return;

    // Pastikan tidak ada file mentah tersimpan selama/jika kompresi gagal
    setImageFile(null);
    setCompressing(true);

    try {
      const result = await compressProductImage(file);
      if (compressionTokenRef.current !== token) {
        // Pemilihan gambar baru sudah menggantikan proses ini — abaikan hasil usang
        return;
      }

      const nextPreviewUrl = URL.createObjectURL(result.file);
      clearObjectUrl(previewUrlRef.current);
      setImageFile(result.file);
      setImagePreview(nextPreviewUrl);
      setRemoveImage(false);
      setCompressionInfo({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savedPercent: result.savedPercent,
      });
    } catch (err) {
      if (compressionTokenRef.current !== token) return;
      clearObjectUrl(previewUrlRef.current);
      setImageFile(null);
      setCompressionInfo(null);
      // Pertahankan gambar lama di preview jika sedang edit & kompresi gagal
      setImagePreview(editing?.image_url ?? null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setErrors((prev) => ({ ...prev, image: compressionErrorMessage(err) }));
    } finally {
      if (compressionTokenRef.current === token) {
        setCompressing(false);
      }
    }
  };

  const handleCancelSelectedImage = () => {
    compressionTokenRef.current += 1;
    clearObjectUrl(imagePreview);
    setCompressing(false);
    setImageFile(null);
    setCompressionInfo(null);
    setImagePreview(removeImage ? null : (editing?.image_url ?? null));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors((prev) => ({ ...prev, image: undefined }));
  };

  const handleRemoveSavedImage = () => {
    compressionTokenRef.current += 1;
    clearObjectUrl(imagePreview);
    setCompressing(false);
    setImageFile(null);
    setCompressionInfo(null);
    setImagePreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors((prev) => ({ ...prev, image: undefined }));
  };

  const closeModal = () => {
    if (saving) return;
    compressionTokenRef.current += 1;
    clearObjectUrl(imagePreview);
    setCompressing(false);
    setImageFile(null);
    setCompressionInfo(null);
    setImagePreview(null);
    setModalOpen(false);
  };

  // Validasi utama di SERVER; cek cepat client-side sebatas field wajib
  // agar UX tetap responsif (tanpa menggandakan aturan unik/barcode).
  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = p.errorNameRequired;
    if (!form.category_id) e.category_id = p.errorCategoryRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate() || !user || compressing || saving) return;
    const formData = new FormData();
    formData.set("barcode", form.barcode.trim());
    formData.set("name", form.name.trim());
    formData.set("category_id", form.category_id);
    formData.set("purchase_price", String(parseInt(form.purchase_price, 10) || 0));
    formData.set("selling_price", String(parseInt(form.selling_price, 10) || 0));
    formData.set("stock", String(parseInt(form.stock, 10) || 0));
    formData.set("minimum_stock", String(parseInt(form.minimum_stock, 10) || 0));
    formData.set("is_active", String(form.is_active));
    if (imageFile) {
      formData.set("image", imageFile);
    } else if (editing && removeImage) {
      formData.set("remove_image", "true");
    }

    setSaving(true);
    setErrors({});
    try {
      const res = await fetch(
        editing ? `/api/products/${editing.id}` : "/api/products",
        {
          method: editing ? "PATCH" : "POST",
          credentials: "same-origin",
          body: formData,
        }
      );
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.ok) {
        clearObjectUrl(imagePreview);
        setImageFile(null);
        setImagePreview(null);
        setRemoveImage(false);
        setModalOpen(false);
        await refresh();
        setToast({
          kind: "success",
          text: editing ? p.successUpdated : p.successAdded,
        });
      } else {
        const code = json?.error ?? "server";
        const fieldMap: Record<string, keyof FormState | undefined> = {
          name_required: "name",
          category_required: "category_id",
          category_not_found: "category_id",
          price_invalid: "purchase_price",
          sell_below_purchase: "selling_price",
          stock_invalid: "stock",
          minimum_stock_invalid: "minimum_stock",
          barcode_taken: "barcode",
          barcode_invalid: "barcode",
          image_invalid_type: "image",
          image_too_large: "image",
          image_empty: "image",
          image_upload_failed: "image",
        };
        showErr(code, fieldMap[code]);
      }
    } catch {
      setToast({ kind: "error", text: p.errorLoad });
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (pr: ApiProduct) => {
    if (!window.confirm(p.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/products/${pr.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        await refresh();
        setToast({ kind: "success", text: p.successDeleted || "Produk berhasil dihapus" });
      } else {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        if (res.status === 409) {
          const errCode = json?.error;
          let text = p.errorDeleteInUse;
          if (errCode === "product_in_use_sales") {
            text = p.errorDeleteInUseSales;
          } else if (errCode === "product_in_use_purchases") {
            text = p.errorDeleteInUsePurchases;
          } else if (errCode === "product_in_use_adjustments") {
            text = p.errorDeleteInUseAdjustments;
          } else if (json?.message) {
            text = json.message;
          }
          setToast({ kind: "error", text: text || p.errorDeleteInUse });
        } else if (res.status === 403) {
          setToast({ kind: "error", text: t.common.forbidden || "Tidak diizinkan" });
        } else {
          setToast({ kind: "error", text: msg(json?.error ?? "server") });
        }
      }
    } catch {
      setToast({ kind: "error", text: p.errorLoad });
    }
  };

  const toggleActive = async (pr: ApiProduct) => {
    try {
      const res = await fetch(`/api/products/${pr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ is_active: !pr.is_active }),
      });
      if (res.ok) {
        await refresh();
        setToast({
          kind: "success",
          text: pr.is_active ? p.successDeactivated : p.successActivated,
        });
      } else {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast({ kind: "error", text: msg(json?.error ?? "server") });
      }
    } catch {
      setToast({ kind: "error", text: p.errorLoad });
    }
  };

  const actionBtn =
    "p-1.5 rounded-md hover:bg-zinc-100 transition-colors shrink-0";

  const hasFilter = query.trim() !== "" || categoryFilter !== "" || statusFilter !== "";
  const resetFilters = () => {
    setQuery("");
    setCategoryFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title={p.title} subtitle={p.subtitle}>
      <Card>
        {/* Toolbar: search + filter kategori + filter status + reset + tombol tambah */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0 rounded-lg border border-line bg-zinc-50 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={p.searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label={p.fieldCategory}
              className="px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="">{p.filterAllCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "" | "aktif" | "nonaktif");
                setCurrentPage(1);
              }}
              aria-label={t.common.filterStatus}
              className="px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="">{p.filterAllStatus || t.common.filterStatusAll}</option>
              <option value="aktif">{t.status.active}</option>
              <option value="nonaktif">{t.status.inactive}</option>
            </select>
            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 rounded-lg border border-dashed border-line hover:border-danger hover:text-danger text-muted text-xs font-medium transition-colors cursor-pointer"
              >
                {t.common.resetFilter}
              </button>
            )}
            <Button onClick={openAdd}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t.common.add}
            </Button>
          </div>
        </div>

        {toast && (
          <div
            className={`mb-3 px-3 py-2 rounded-lg text-sm font-medium border ${
              toast.kind === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-danger"
            }`}
            role="status"
          >
            {toast.text}
          </div>
        )}

        {loadError ? (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-danger">
            {loadError}
          </div>
        ) : loading ? (
          <p className="text-center text-sm text-muted py-10">{t.common.loading}</p>
        ) : (
          <>
            <Table
              empty={hasFilter ? p.emptySearch : p.empty}
              head={
                <>
                  <Th>{p.tableBarcode}</Th>
                  <Th>{p.tableImage}</Th>
                  <Th>{p.tableProduct}</Th>
                  <Th>{p.tableCategory}</Th>
                  <Th className="text-right">{p.tablePurchasePrice}</Th>
                  <Th className="text-right">{p.tableSellingPrice}</Th>
                  <Th className="text-center">{p.tableStock}</Th>
                  <Th className="text-center">{p.tableStatus}</Th>
                  <Th className="text-right">{t.common.actions}</Th>
                </>
              }
            >
              {paginated.map((pr) => (
                <tr key={pr.id} className="hover:bg-zinc-50/70">
                  <Td className="tabular-nums text-muted whitespace-nowrap">
                    {pr.barcode ?? <span className="italic">{p.noBarcode}</span>}
                  </Td>
                  <Td>
                    <ProductThumbnail src={pr.image_url} alt={pr.name} size="sm" />
                  </Td>
                  <Td className="font-medium text-foreground">{pr.name}</Td>
                  <Td className="text-muted">{catName(pr.category_id)}</Td>
                  <Td className="text-right tabular-nums">{formatRupiah(pr.purchase_price)}</Td>
                  <Td className="text-right tabular-nums font-medium">{formatRupiah(pr.selling_price)}</Td>
                  <Td className="text-center">
                    <span className={`tabular-nums font-medium ${pr.stock <= pr.minimum_stock ? "text-danger" : "text-foreground"}`}>
                      {pr.stock}
                    </span>
                  </Td>
                  <Td className="text-center">
                    <Badge variant={pr.is_active ? "success" : "muted"}>
                      {pr.is_active ? t.status.active : t.status.inactive}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(pr)}
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
                        onClick={() => toggleActive(pr)}
                        className={actionBtn}
                        title={pr.is_active ? p.deactivateLabel : p.activateLabel}
                        aria-label={pr.is_active ? p.deactivateLabel : p.activateLabel}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={pr.is_active ? "text-danger" : "text-success"}>
                          {pr.is_active ? (
                            <path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" />
                          ) : (
                            <path d="M20 6L9 17l-5-5" />
                          )}
                        </svg>
                      </button>
                      <button type="button" onClick={() => removeProduct(pr)} className={actionBtn} title={t.common.delete} aria-label={t.common.delete}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted hover:text-danger">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>

      {/* Modal Tambah/Ubah Produk */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? p.editTitle : p.addTitle}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit} disabled={saving || compressing}>
              {compressing
                ? p.compressingImage
                : saving
                  ? t.common.loading
                  : t.common.save}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label={p.fieldBarcode}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder={p.fieldBarcodePlaceholder}
              error={errors.barcode}
            />
            <p className="text-[11px] text-muted mt-1">{p.barcodeOptionalHint}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground sm:invisible" aria-hidden="true">
              {p.scanBarcode}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setScannerOpen(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10" />
              </svg>
              {p.scanBarcode}
            </Button>
          </div>
          <Select
            label={p.fieldCategory}
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            error={errors.category_id}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <Input
              label={p.fieldName}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={p.fieldNamePlaceholder}
              error={errors.name}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-foreground block mb-1.5">
              {p.fieldImage}
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-line bg-zinc-50/50">
              <ProductThumbnail
                src={imagePreview}
                alt={form.name || p.fieldImage}
                size="lg"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={saving}
                  onChange={(e) => {
                    void handleImageSelect(e.target.files?.[0]);
                  }}
                  className="block w-full text-xs text-muted file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium file:cursor-pointer cursor-pointer disabled:opacity-50"
                />
                <p className="text-[11px] text-muted">{p.fieldImageHint}</p>
                {compressing && (
                  <p className="text-xs text-primary font-medium" role="status">
                    {p.compressingImage}
                  </p>
                )}
                {!compressing && compressionInfo && (
                  <p className="text-xs text-success font-medium" role="status">
                    {p.imageCompressionStats
                      .replace("{before}", formatFileSize(compressionInfo.originalSize))
                      .replace("{after}", formatFileSize(compressionInfo.compressedSize))}
                    {compressionInfo.savedPercent > 0
                      ? ` ${p.imageCompressionSaved.replace("{percent}", String(compressionInfo.savedPercent))}`
                      : ""}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {imageFile && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleCancelSelectedImage}
                      className="text-xs font-medium text-muted hover:text-foreground underline underline-offset-2 cursor-pointer"
                    >
                      {p.cancelImageSelect}
                    </button>
                  )}
                  {editing && editing.image_url && !removeImage && !imageFile && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleRemoveSavedImage}
                      className="text-xs font-medium text-danger hover:underline underline-offset-2 cursor-pointer"
                    >
                      {p.removeImage}
                    </button>
                  )}
                  {editing && removeImage && !imageFile && (
                    <span className="text-xs text-warning font-medium">
                      {p.imageRemovedPending}
                    </span>
                  )}
                </div>
                {errors.image && (
                  <p className="text-xs text-danger" role="alert">
                    {errors.image}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Input
            type="number"
            min={0}
            label={p.fieldPurchasePrice}
            value={form.purchase_price}
            onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
            error={errors.purchase_price}
          />
          <Input
            type="number"
            min={0}
            label={p.fieldSellingPrice}
            value={form.selling_price}
            onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
            error={errors.selling_price}
          />
          <Input
            type="number"
            min={0}
            label={p.fieldStock}
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            error={errors.stock}
          />
          <Input
            type="number"
            min={0}
            label={p.fieldMinimumStock}
            value={form.minimum_stock}
            onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })}
            error={errors.minimum_stock}
          />
          <label className="sm:col-span-2 flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-foreground">{p.fieldActive}</span>
          </label>
        </div>

        <BarcodeScanner
          open={scannerOpen}
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setScannerOpen(false);
            window.alert(p.scanDetected.replace("{code}", code));
          }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>
    </DashboardLayout>
  );
}
