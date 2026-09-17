// Seed SATU KALI — 2 akun awal KasSmart (owner + kasir), password di-hash
// dengan helper SAMA seperti login (src/lib/password.ts, scrypt format
// scrypt$N$r$p$salt$hash). Bukan migration, bukan perubahan schema:
// hanya INSERT 2 baris ke users yang sudah ada. Jalankan:
//   node --experimental-strip-types --env-file=.env scripts/seed-initial-users.mts
// Idempoten: ON CONFLICT (username) DO NOTHING. Hapus file ini setelah dipakai
// kalau tidak diperlukan lagi.
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const initial = [
  {
    name: "Admin Owner",
    username: "owner",
    password: await hashPassword("owner123"),
    phone_number: "", // kolom NOT NULL di schema final -> string kosong
    email: null, // K3: NULL = tanpa email
    role: "Owner" as const,
    status: "aktif" as const,
  },
  {
    name: "Kasir",
    username: "kasir",
    password: await hashPassword("kasir123"),
    phone_number: "",
    email: null,
    role: "Kasir" as const,
    status: "aktif" as const,
  },
];

for (const u of initial) {
  await prisma.user
    .upsert({
      where: { username: u.username },
      update: {}, // jangan timpa akun yang sudah ada
      create: u,
    })
    .then((r) => console.log("OK", r.username, "role", r.role, "hash", r.password.slice(0, 11) + "..."));
}

const check = await prisma.user.findMany({
  select: { username: true, role: true, status: true },
});
console.log("USERS:", JSON.stringify(check));
await prisma.$disconnect();
