// Server-only helpers untuk autentikasi KasSmart (API Route Handlers).
// Mekanisme sesi: cookie httpOnly "kassmart_session" berisi payload JSON
// {id, role, exp} + signature HMAC-SHA256 — stateless, tanpa library auth.
// Password: hash scrypt (node:crypto) — bukan bcrypt agar tanpa dependensi baru;
// kekuatan setara untuk skala proyek, mudah dibaca ulang oleh Node di CI.
// HANYA boleh diimpor dari kode server (route handler). Jangan dari client.

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { hashPassword, verifyPassword } from "@/lib/password";

// hashPassword/verifyPassword pindah ke lib/password.ts (murni, dipakai juga
// oleh script seed). Diimpor ulang di sini agar pemakai lama tidak berubah.
export { hashPassword, verifyPassword };

// ---------- Session cookie ----------

export const SESSION_COOKIE = "kassmart_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

function sessionSecret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  // ponytail: fallback deterministik untuk dev/sekolah — set AUTH_SECRET
  // di production sebelum deploy.
  return createHash("sha256")
    .update("kassmart-auth-v1:" + (process.env.DATABASE_URL ?? ""))
    .digest("hex");
}

export interface SessionPayload {
  id: string;
  role: "Owner" | "Kasir";
  exp: number; // epoch detik
}

function sign(payloadB64: string): string {
  return createHmac("sha256", sessionSecret()).update(payloadB64).digest("hex");
}

export function createSessionToken(p: SessionPayload): string {
  const payload = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    ) as SessionPayload;
    if (!data.id || (data.role !== "Owner" && data.role !== "Kasir")) return null;
    if (typeof data.exp !== "number" || data.exp * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return raw ? verifySessionToken(raw) : null;
}

/** Guard server-side: wajib sesi login (role apa pun). null = boleh lanjut. */
export async function requireLogin(): Promise<SessionPayload | ReturnType<typeof fail>> {
  const session = await getSession();
  if (!session) return fail(401, "unauthorized");
  return session;
}

/** Guard server-side: khusus Owner (UC-16/UC-21 dsb). Kasir -> 403. */
export async function requireOwner(): Promise<SessionPayload | ReturnType<typeof fail>> {
  const session = await getSession();
  if (!session) return fail(401, "unauthorized");
  if (session.role !== "Owner") return fail(403, "forbidden");
  return session;
}

export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax`;
}

export function clearedSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

// ---------- Response JSON konsisten ----------

/** Shape user yg aman dikirim ke klien: TANPA password/hash. */
export function hashlessUser<T extends { password: string }>(
  user: T
): Omit<T, "password"> {
  const { password: _hidden, ...rest } = user;
  return rest;
}

export function ok(data: unknown, status = 200, extraHeaders?: string[]) {
  const res = Response.json({ ok: true, data }, { status });
  extraHeaders?.forEach((h) => res.headers.append("Set-Cookie", h));
  return res;
}

export function fail(
  status: number,
  error: string,
  extra?: Record<string, unknown>,
  setCookie?: string
) {
  const res = Response.json({ ok: false, error, ...extra }, { status });
  if (setCookie) res.headers.append("Set-Cookie", setCookie);
  return res;
}
