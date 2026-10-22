import { PrismaClient } from "@prisma/client";
import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { createProduct, setProductActive } from "@/server/products";
import { saveKit, saveKitWithClient } from "@/server/kits/service";
import { productInput } from "../fixtures/product";
setupDatabase();
it("catalog_mutation_and_intake_do_not_deadlock", async () => {
  const actor = await seedUser();
  const p = await createProduct(actor, productInput, {
    a: { bytes: new Uint8Array([1]), mimeType: "image/webp" },
  });
  const input = {
    name: "Kit",
    description: "",
    active: true,
    position: 0,
    productIds: [p.id],
    tiers: [],
  };
  const kit = await saveKit(actor, undefined, input);
  const saves = await Promise.allSettled([
    saveKit(actor, kit.id, { ...input, expectedVersion: 1 }),
    saveKit(actor, kit.id, { ...input, expectedVersion: 1 }),
  ]);
  expect(saves.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(saves.filter((r) => r.status === "rejected")).toHaveLength(1);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set("connection_limit", "1");
  const client = new PrismaClient({ datasources: { db: { url: url.href } } });
  try {
    const created = await client.$transaction((tx) =>
      saveKitWithClient(tx, actor, undefined, { ...input, active: false }),
    );
    expect(created.name).toBe("Kit");
    const results = await Promise.allSettled([
      setProductActive(actor, p.id, false, p.version),
      saveKit(actor, kit.id, { ...input, expectedVersion: 2 }),
    ]);
    expect(results[0].status).toBe("fulfilled");
  } finally {
    await client.$disconnect();
  }
});
