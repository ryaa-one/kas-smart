// Helper Informasi Toko (UC-20) — STORE_SETTINGS sebagai single source of truth.
// Arsitektur single-store: hanya satu baris konfigurasi yang dipakai.
// Field mengikuti prisma/schema.prisma (model StoreSetting) apa adanya.

export interface SerializedStoreSettings {
  id: string | null; // null = belum pernah disimpan ke database
  store_name: string;
  logo: string;
  address: string;
  phone: string;
  receipt_info: string;
  qris_image: string;
}

export const EMPTY_STORE_SETTINGS: SerializedStoreSettings = {
  id: null,
  store_name: "",
  logo: "",
  address: "",
  phone: "",
  receipt_info: "",
  qris_image: "",
};

export const STORE_SETTING_FIELDS = [
  "store_name",
  "address",
  "phone",
  "receipt_info",
  "logo",
  "qris_image",
] as const;

export type StoreSettingField = (typeof STORE_SETTING_FIELDS)[number];

// Batas panjang wajar untuk validasi aplikasi
export const LIMITS: Record<StoreSettingField, number> = {
  store_name: 100,
  address: 255,
  phone: 30,
  receipt_info: 500,
  logo: 2_000_000, // mendukung URL, path, atau data-URI gambar (~1.5 MB)
  qris_image: 2_000_000, // mendukung URL, path, atau data-URI gambar (~1.5 MB)
};

const PHONE_RE = /^[0-9+\-\s().]*$/;
const IMAGE_URI_RE = /^(data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+|https?:\/\/.+|\/[a-zA-Z0-9_\-./]+)$/;

export type StoreSettingsPatch = Partial<Record<StoreSettingField, string>>;

export function validateStoreSettingsPatch(body: unknown):
  | { valid: true; data: StoreSettingsPatch }
  | { valid: false; code: string; extra?: Record<string, unknown> } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, code: "invalid_body" };
  }
  const raw = body as Record<string, unknown>;
  const data: StoreSettingsPatch = {};

  for (const key of STORE_SETTING_FIELDS) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] !== "string") {
      return { valid: false, code: `${key}_invalid` };
    }
    const value = (raw[key] as string).trim();
    if (value.length > LIMITS[key]) {
      return { valid: false, code: `${key}_too_long`, extra: { max: LIMITS[key] } };
    }
    if ((key === "logo" || key === "qris_image") && value !== "") {
      if (!IMAGE_URI_RE.test(value)) {
        return { valid: false, code: `${key}_invalid` };
      }
    }
    data[key] = value;
  }

  if (data.store_name !== undefined && data.store_name === "") {
    return { valid: false, code: "store_name_required" };
  }
  if (data.phone !== undefined && data.phone !== "") {
    const digits = data.phone.replace(/\D/g, "");
    if (!PHONE_RE.test(data.phone) || digits.length < 6) {
      return { valid: false, code: "phone_invalid" };
    }
  }

  return { valid: true, data };
}

export const FIELD_LABEL: Record<StoreSettingField, string> = {
  store_name: "nama toko",
  address: "alamat",
  phone: "telepon",
  receipt_info: "info struk",
  logo: "logo",
  qris_image: "gambar QRIS",
};

export function serializeStoreSettings(
  row: Omit<SerializedStoreSettings, "id"> & { id: string }
): SerializedStoreSettings {
  return {
    id: row.id,
    store_name: row.store_name,
    logo: row.logo,
    address: row.address,
    phone: row.phone,
    receipt_info: row.receipt_info,
    qris_image: row.qris_image,
  };
}
