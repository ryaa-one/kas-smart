// Test koneksi read-only Prisma Client -> Supabase (fase fondasi, bukan fitur).
// Jalankan: npx tsx scripts/prisma-connection-test.ts
// Hanya SELECT count(*) — tidak menulis apa pun ke database.
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [users, products, sales, categories] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.salesTransaction.count(),
    prisma.category.count(),
  ]);
  console.log("PRISMA CONNECTION OK");
  console.log("count users            =", users);
  console.log("count products         =", products);
  console.log("count sales_transactions =", sales);
  console.log("count categories       =", categories);
}

main()
  .catch((e) => {
    console.error("PRISMA CONNECTION FAIL:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
