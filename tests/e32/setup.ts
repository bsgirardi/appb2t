import { beforeEach, afterAll } from "vitest";
import { assertE32Database } from "./database";
import { db } from "@/lib/db";
export function setupDatabase() {
  beforeEach(async () => {
    assertE32Database(process.env.DATABASE_URL, process.env.E32_TEST_DATABASE);
    const tables = await db.$queryRaw<
      { tablename: string }[]
    >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'`;
    const names = tables
      .map((t) => '"' + t.tablename.replaceAll('"', '""') + '"')
      .join(",");
    if (names) await db.$executeRawUnsafe(`TRUNCATE ${names} CASCADE`);
  });
  afterAll(() => db.$disconnect());
}
export async function fixture() {
  const actor = await db.user.create({
    data: {
      name: "Admin sintético E32",
      email: "admin@e32.test",
      passwordHash: "synthetic",
      role: "ADMIN",
    },
  });
  const customer = await db.customer.create({
    data: { name: "Cliente sintético E32", type: "PERSON" },
  });
  const o = await db.opportunity.create({
    data: {
      title: "Negociação sintética E32",
      customerId: customer.id,
      ownerId: actor.id,
      stage: "NEGOCIACAO",
    },
  });
  const q = await db.quote.create({
    data: {
      opportunityId: o.id,
      customerId: customer.id,
      input: {
        items: [
          {
            lineId: "x",
            description: "Peça sintética",
            quantity: 2,
            unitPrice: "10.00",
          },
        ],
      },
      items: {
        create: {
          position: 0,
          lineKey: "x",
          description: "Peça sintética",
          quantity: 2,
          unitPrice: "10",
        },
      },
    },
  });
  await db.opportunity.update({
    where: { id: o.id },
    data: { principalQuoteId: q.id },
  });
  return { actor, customer, o, q };
}
export async function snapshot() {
  const tables = await db.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`;
  const result: Record<string, unknown> = {};
  for (const t of tables) {
    const name = '"' + t.tablename.replaceAll('"', '""') + '"';
    result[t.tablename] = await db.$queryRawUnsafe(
      `SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS rows FROM ${name} t`,
    );
  }
  return result;
}
