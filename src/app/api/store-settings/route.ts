// /api/store-settings — UC-20 Mengelola Informasi Toko.
// GET   (login Owner/Kasir): baca STORE_SETTINGS — Kasir butuh nama toko/footer
//                            struk & QRIS statis saat transaksi (read-only).
// PATCH (Owner only)       : ubah informasi toko + log storeInfoChange.
// Single-store: satu baris konfigurasi. Baris dibuat saat simpan pertama,
// dilindungi advisory lock agar tidak tercipta duplikat saat simpan bersamaan.
import { prisma } from "@/lib/prisma";
import { fail, ok, requireLogin, requireOwner } from "@/lib/api-auth";
import {
  EMPTY_STORE_SETTINGS,
  FIELD_LABEL,
  STORE_SETTING_FIELDS,
  serializeStoreSettings,
  validateStoreSettingsPatch,
} from "@/lib/store-settings-api";

const STORE_SETTINGS_LOCK_KEY = 7311201; // kunci advisory khusus konfigurasi toko

export async function GET() {
  const guard = await requireLogin();
  if (guard instanceof Response) return guard;

  const row = await prisma.storeSetting.findFirst({ orderBy: { id: "asc" } });
  return ok({ settings: row ? serializeStoreSettings(row) : EMPTY_STORE_SETTINGS });
}

export async function PATCH(request: Request) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  const body = await request.json().catch(() => null);
  const validation = validateStoreSettingsPatch(body);
  if (!validation.valid) return fail(400, validation.code, validation.extra);

  const patch = validation.data;
  if (Object.keys(patch).length === 0) return fail(400, "no_changes");

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${STORE_SETTINGS_LOCK_KEY})`;

        const current = await tx.storeSetting.findFirst({ orderBy: { id: "asc" } });

        if (!current && !patch.store_name) {
          // Simpan pertama wajib menyertakan nama toko (kolom NOT NULL & wajib di UI).
          return { error: "store_name_required" as const };
        }

        const changed = STORE_SETTING_FIELDS.filter(
          (k) => patch[k] !== undefined && patch[k] !== (current?.[k] ?? "")
        );

        const saved = current
          ? await tx.storeSetting.update({ where: { id: current.id }, data: patch })
          : await tx.storeSetting.create({
              data: {
                store_name: patch.store_name!,
                address: patch.address ?? "",
                phone: patch.phone ?? "",
                receipt_info: patch.receipt_info ?? "",
                logo: patch.logo ?? "",
                qris_image: patch.qris_image ?? "",
              },
            });

        if (changed.length > 0) {
          await tx.activityLog.create({
            data: {
              user_id: guard.id,
              action: "storeInfoChange",
              description: `Ubah informasi toko: ${changed.map((k) => FIELD_LABEL[k]).join(", ")}`,
            },
          });
        }

        return { saved, changed };
      },
      { timeout: 15000, maxWait: 10000 }
    );

    if ("error" in result) return fail(400, result.error!);
    return ok({ settings: serializeStoreSettings(result.saved), changed: result.changed });
  } catch (err) {
    console.error("[PATCH /api/store-settings] Error:", err);
    return fail(500, "internal_error");
  }
}
