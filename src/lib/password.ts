// Helper password scrypt — MURNI (tanpa import next/*) supaya bisa dipakai
// route handler MAUPUN script seed server-side. Sumber algoritma: api-auth.ts.
// Format hash: scrypt$N$r$p$saltB64$hashB64 — kompatibel verifyPassword login.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      SCRYPT.keylen,
      { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p },
      (err, derived) => (err ? reject(err) : resolve(derived))
    );
  });
}

/** Hash password baru → string format scrypt$... */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(plain, salt);
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/** Verifikasi password terhadap hash tersimpan (timing-safe). */
export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  try {
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const derived = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        plain.normalize("NFKC"),
        salt,
        expected.length,
        { N: Number(n), r: Number(r), p: Number(p) },
        (err, out) => (err ? reject(err) : resolve(out))
      );
    });
    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
}
