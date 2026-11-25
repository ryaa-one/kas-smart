// Helper kompresi gambar produk di browser memakai Native Canvas API.
// Mengubah gambar JPG/JPEG/PNG/WebP (maks. 10 MB) menjadi WebP (maks. 1024 px, maks. 3 MB).

export const RAW_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const COMPRESSED_IMAGE_MAX_BYTES = 3 * 1024 * 1024; // 3 MB
export const MAX_IMAGE_DIMENSION = 1024;
export const INITIAL_WEBP_QUALITY = 0.82;
export const MIN_WEBP_QUALITY = 0.5;

const WEBP_QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5] as const;

export const ALLOWED_RAW_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type ImageCompressionErrorCode =
  | "image_empty"
  | "image_invalid_type"
  | "image_raw_too_large"
  | "image_decode_failed"
  | "image_invalid_dimensions"
  | "webp_encode_failed"
  | "compressed_too_large";

export class ImageCompressionError extends Error {
  code: ImageCompressionErrorCode;

  constructor(code: ImageCompressionErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ImageCompressionError";
    this.code = code;
  }
}

export interface CompressedImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  qualityUsed: number;
  savedPercent: number;
}

export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_IMAGE_DIMENSION
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new ImageCompressionError("image_invalid_dimensions");
  }
  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function toWebpFileName(originalName: string): string {
  const trimmed = (originalName || "").trim();
  const base = trimmed.replace(/\.[^/.]+$/, "").trim();
  return `${base || "product-image"}.webp`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function calcCompressionSavedPercent(
  originalSize: number,
  compressedSize: number
): number {
  if (originalSize <= 0 || compressedSize >= originalSize) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
}

type DecodedSource = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

async function decodeImageSource(file: File): Promise<DecodedSource> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback ke HTMLImageElement bila opsi imageOrientation tidak didukung browser
    }
  }

  return new Promise<DecodedSource>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      resolve({
        source: img,
        width,
        height,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new ImageCompressionError("image_decode_failed"));
    };
    img.src = objectUrl;
  });
}

function canvasToWebpBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

/**
 * Validasi awal ukuran & MIME file gambar mentah sebelum didecode/dikompres.
 */
export function validateRawImageFile(file: File): void {
  if (file.size <= 0) {
    throw new ImageCompressionError("image_empty");
  }
  const type = (file.type || "").toLowerCase().trim();
  if (!ALLOWED_RAW_IMAGE_TYPES.has(type)) {
    throw new ImageCompressionError("image_invalid_type");
  }
  if (file.size > RAW_IMAGE_MAX_BYTES) {
    throw new ImageCompressionError("image_raw_too_large");
  }
}

/**
 * Kompres file gambar produk secara otomatis di browser ke WebP (maks. 1024 px, maks. 3 MB).
 * Tidak pernah mengembalikan file asli bila encoding WebP gagal atau hasil > 3 MB.
 */
export async function compressProductImage(
  file: File
): Promise<CompressedImageResult> {
  validateRawImageFile(file);

  const decoded = await decodeImageSource(file);
  const canvas = document.createElement("canvas");

  try {
    const target = computeTargetDimensions(
      decoded.width,
      decoded.height,
      MAX_IMAGE_DIMENSION
    );
    canvas.width = target.width;
    canvas.height = target.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new ImageCompressionError("webp_encode_failed");
    }

    ctx.drawImage(decoded.source, 0, 0, target.width, target.height);

    let acceptedBlob: Blob | null = null;
    let qualityUsed: number = INITIAL_WEBP_QUALITY;

    for (const q of WEBP_QUALITY_STEPS) {
      const blob = await canvasToWebpBlob(canvas, q);
      if (!blob || blob.type !== "image/webp") {
        throw new ImageCompressionError("webp_encode_failed");
      }
      qualityUsed = q;
      if (blob.size <= COMPRESSED_IMAGE_MAX_BYTES) {
        acceptedBlob = blob;
        break;
      }
    }

    if (!acceptedBlob) {
      throw new ImageCompressionError("compressed_too_large");
    }

    const compressedFile = new File([acceptedBlob], toWebpFileName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalSize: file.size,
      compressedSize: compressedFile.size,
      originalWidth: decoded.width,
      originalHeight: decoded.height,
      width: target.width,
      height: target.height,
      qualityUsed,
      savedPercent: calcCompressionSavedPercent(file.size, compressedFile.size),
    };
  } finally {
    decoded.cleanup();
    canvas.width = 0;
    canvas.height = 0;
  }
}
