/** Fresh disposable E4 database only; never resets an existing database. */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { assertE4DatabaseUrl } from "./database";
async function main() {
  const url = assertE4DatabaseUrl(process.env.E4_TEST_DATABASE_URL ?? "");
  process.env.DATABASE_URL = url.toString();
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const scratch = resolve(
    "node_modules/.cache/alertas-validation/reply-baseline",
  );
  const run = (args: string[]) =>
    execFileSync(
      process.execPath,
      [resolve("node_modules/prisma/build/index.js"), ...args],
      {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: url.toString() },
      },
    );
  try {
    const tables = await db.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`;
    assert.equal(
      Number(tables[0].count),
      0,
      "Use fresh exclusive E4 database; never reset existing data.",
    );
    mkdirSync(join(scratch, "migrations"), { recursive: true });
    cpSync("prisma/schema.prisma", join(scratch, "schema.prisma"));
    for (const entry of readdirSync("prisma/migrations", {
      withFileTypes: true,
    }))
      if (entry.name !== "20261107110000_commercial_reply_settings")
        cpSync(
          join("prisma/migrations", entry.name),
          join(scratch, "migrations", entry.name),
          { recursive: entry.isDirectory() },
        );
    run(["migrate", "deploy", "--schema", join(scratch, "schema.prisma")]);
    const customer = await db.customer.create({
      data: { name: "Cliente sintético legado", type: "PERSON" },
    });
    const quote = await db.quote.create({
      data: {
        customerId: customer.id,
        input: { items: [] },
        status: "RASCUNHO",
      },
    });
    const before = JSON.stringify({ customer, quote });
    run(["migrate", "deploy"]);
    run(["migrate", "deploy"]);
    assert.equal(
      JSON.stringify({
        customer: await db.customer.findUnique({ where: { id: customer.id } }),
        quote: await db.quote.findUnique({ where: { id: quote.id } }),
      }),
      before,
    );
    assert.equal(await db.commercialSettings.count(), 0);
    await assert.rejects(
      db.commercialSettings.create({
        data: { id: 1, replyWaitDays: 0, updatedById: "test" },
      }),
    );
    await assert.rejects(
      db.commercialSettings.create({
        data: { id: 2, replyWaitDays: 14, updatedById: "test" },
      }),
    );
    console.log(
      "Reply settings migration/reapply preserved legacy customer and quote; constraints and absent configuration verified.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
