// Server-only helper untuk manajemen gambar produk di Supabase Storage.
// Memakai SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY khusus di sisi server
// (jangan pernah diekspos ke client atau memakai prefix NEXT_PUBLIC_).
import { randomUUID } from "node:crypto";

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const PRODUCT_IMAGE_MAX_BYTES = 3 * 1024 * 1024; // 3 MB

const ALLOWED_INPUT_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type ProductImageValidationError =
  | "image_empty"
  | "image_too_large"
  | "image_invalid_type";

export type ProductImageValidationResult =
  | { ok: true; buffer: Buffer; mimeType: string; ext: "jpg" | "png" | "webp" }
  | { ok: false; code: ProductImageValidationError };

function getSupabaseStorageConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Konfigurasi Supabase Storage belum lengkap: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di server."
    );
  }

  return { url, serviceRoleKey };
}

function detectImageTypeFromBuffer(
  buf: Buffer
): { mimeType: string; ext: "jpg" | "png" | "webp" } | null {
  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mimeType: "image/jpeg", ext: "jpg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { mimeType: "image/png", ext: "png" };
  }
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mimeType: "image/webp", ext: "webp" };
  }
  return null;
}

/**
 * Validasi file gambar produk dari multipart/form-data:
 * - Tidak boleh kosong (0 byte)
 * - Maksimal 3 MB
 * - Format JPEG / PNG / WebP terverifikasi melalui magic bytes + MIME
 */
export async function validateProductImageFile(
  file: File
): Promise<ProductImageValidationResult> {
  if (file.size <= 0) {
    return { ok: false, code: "image_empty" };
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return { ok: false, code: "image_too_large" };
  }

  const declaredType = (file.type || "").toLowerCase().trim();
  if (declaredType && !ALLOWED_INPUT_MIME.has(declaredType)) {
    return { ok: false, code: "image_invalid_type" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length <= 0) {
    return { ok: false, code: "image_empty" };
  }
  if (buffer.length > PRODUCT_IMAGE_MAX_BYTES) {
    return { ok: false, code: "image_too_large" };
  }

  const detected = detectImageTypeFromBuffer(buffer);
  if (!detected) {
    return { ok: false, code: "image_invalid_type" };
  }

  if (declaredType) {
    const normalizedDeclared =
      declaredType === "image/jpg" ? "image/jpeg" : declaredType;
    if (normalizedDeclared !== detected.mimeType) {
      return { ok: false, code: "image_invalid_type" };
    }
  }

  return { ok: true, buffer, mimeType: detected.mimeType, ext: detected.ext };
}

/**
 * Mengunggah buffer gambar tervalidasi ke bucket public `product-images`
 * dengan nama file unik (tanpa memakai nama file input pengguna).
 * Mengembalikan relative object path (mis. `products/<ts>-<uuid>.webp`).
 */
export async function uploadProductImage(
  buffer: Buffer,
  mimeType: string,
  ext: "jpg" | "png" | "webp"
): Promise<string> {
  const { url, serviceRoleKey } = getSupabaseStorageConfig();
  const objectPath = `products/${Date.now()}-${randomUUID()}.${ext}`;

  const res = await fetch(
    `${url}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": mimeType,
        "cache-control": "31536000",
        "x-upsert": "false",
      },
      body: new Uint8Array(buffer),
    }
  );

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `Gagal mengunggah gambar ke Supabase Storage (status ${res.status}): ${bodyText}`
    );
  }

  return objectPath;
}

/**
 * Menghapus file gambar produk di Supabase Storage secara aman (best-effort).
 * Mengembalikan true jika terhapus atau tidak ditemukan (404), false jika gagal.
 */
export async function deleteProductImage(
  imagePath: string | null | undefined
): Promise<boolean> {
  const cleanPath = imagePath?.trim().replace(/^\/+/, "");
  if (!cleanPath || cleanPath.includes("..")) return true;

  try {
    const { url, serviceRoleKey } = getSupabaseStorageConfig();
    const encodedPath = cleanPath
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");

    const res = await fetch(
      `${url}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}/${encodedPath}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );

    if (!res.ok && res.status !== 404) {
      const bodyText = await res.text().catch(() => "");
      console.error(
        `[deleteProductImage] Gagal menghapus "${cleanPath}" (${res.status}): ${bodyText}`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[deleteProductImage] Error saat menghubungi Storage:", err);
    return false;
  }
}

/**
 * Menghasilkan Public URL untuk bucket `product-images` berdasarkan path tersimpan.
 */
export function getProductImageUrl(
  imagePath: string | null | undefined
): string | null {
  const cleanPath = imagePath?.trim().replace(/^\/+/, "");
  const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!cleanPath || !baseUrl) return null;

  const encodedPath = cleanPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${baseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${encodedPath}`;
}
