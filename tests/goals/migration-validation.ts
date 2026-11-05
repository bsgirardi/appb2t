import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, cpSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { assertGoalsDatabase } from "./database";
async function main() {
  process.env.DATABASE_URL = assertGoalsDatabase(
    process.env.GOALS_TEST_DATABASE_URL ?? "",
  );
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const [state] = await db.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`;
    assert.equal(
      Number(state.count),
      0,
      "Exige banco descartável vazio. Nenhum dado será apagado.",
    );
    const scratch = resolve(".superpowers/goals-migration-baseline");
    mkdirSync(join(scratch, "migrations"), { recursive: true });
    writeFileSync(
      join(scratch, "schema.prisma"),
      execFileSync("git", ["show", "HEAD:prisma/schema.prisma"], {
        encoding: "utf8",
      }),
    );
    for (const entry of readdirSync("prisma/migrations", {
      withFileTypes: true,
    }))
      if (entry.name !== "20261105180000_monthly_goals")
        cpSync(
          join("prisma/migrations", entry.name),
          join(scratch, "migrations", entry.name),
          { recursive: entry.isDirectory() },
        );
    const deploy = (schema: string) =>
      execFileSync(
        process.execPath,
        [
          resolve("node_modules/prisma/build/index.js"),
          "migrate",
          "deploy",
          "--schema",
          schema,
        ],
        { stdio: "inherit" },
      );
    deploy(join(scratch, "schema.prisma"));
    await db.user.create({
      data: {
        id: "goals-legacy",
        name: "Legado sintético",
        email: "legacy-goals@example.test",
        passwordHash: "unusable",
      },
    });
    await db.customer.create({
      data: {
        id: "goals-legacy-customer",
        name: "Cliente sintético",
        type: "COMPANY",
      },
    });
    await db.quote.create({
      data: {
        id: "goals-legacy-quote",
        customerId: "goals-legacy-customer",
        input: { synthetic: true },
        totals: { total: "123.45" },
      },
    });
    const snapshot = async () => ({
      users: await db.user.findMany(),
      customers: await db.customer.findMany(),
      quotes: await db.quote.findMany(),
    });
    const before = await snapshot();
    deploy("prisma/schema.prisma");
    assert.deepEqual(await snapshot(), before);
    assert.equal(await db.monthlyGoal.count(), 0);
    assert.equal(await db.monthlyGoalRevision.count(), 0);
    deploy("prisma/schema.prisma");
    assert.deepEqual(await snapshot(), before);
    console.log(
      "PASS metas: upgrade e reaplicação; usuários, clientes e orçamentos sintéticos preservados; sem backfill.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
