/** Browser-only disposable C2 environment. Never run against an operational database. */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { hashPassword } from "@/server/auth/password";
const url = new URL(process.env.DATABASE_URL ?? "http://missing");
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "55431" ||
  url.pathname !== "/b2t_test"
)
  throw Error("Only the disposable C2 database on port 55431 is allowed");
async function main() {
  const tables = await db.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `public."${t.tablename.replaceAll('"', '""')}"`).join(",")} RESTART IDENTITY CASCADE`,
  );
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "tests/fixtures/catalog-c1.ts"],
    { env: process.env, stdio: "inherit" },
  );
  const user = await db.user.create({
    data: {
      name: "Equipe demonstração C2",
      email: "catalog-c2@example.test",
      role: "ADMIN",
      passwordHash: await hashPassword("CatalogC2Fixture2026!"),
    },
  });
  const fixture = JSON.parse(
    await readFile("test-results/catalog-c1/fixture.json", "utf8"),
  );
  await mkdir("test-results/catalog-c2", { recursive: true });
  await writeFile(
    "test-results/catalog-c2/fixture.json",
    JSON.stringify({ products: fixture.products, email: user.email }, null, 2),
  );
  console.log("C2 disposable browser fixture ready; no operational data used.");
}
main().finally(() => db.$disconnect());
