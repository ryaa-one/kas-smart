// Prisma Client singleton — Prisma 7 + PostgreSQL driver adapter (pg).
// HANYA untuk sisi server (route handler / server action / server component).
// DATABASE_URL = pooler Supabase (pgbouncer, port 6543) untuk runtime aplikasi.
// DIRECT_URL tetap khusus tooling CLI (lihat prisma.config.ts).
//
// ponytail: tanpa serverExternalPackages di next.config.ts — Prisma 7 mengimpor
// `pg` secara statis, jadi sudah aman dibundel; tambahkan bila muncul error bundler.

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL tidak diset — cek .env (runtime) / .env (CLI).");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Hot reload Next.js dev tidak membuat koneksi baru tiap compile.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
