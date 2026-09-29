import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  createProduct,
  updateProduct,
  getProductImage,
  getProduct,
} from "@/server/products";
import { productInput } from "../fixtures/product";
import { db } from "@/lib/db";
import { readFile } from "node:fs/promises";
setupDatabase();
const image = (n: number) => ({
  bytes: new Uint8Array([n]),
  mimeType: "image/webp" as const,
});
it("preserves legacy photo bytes when migrating to a gallery", async () => {
  const migration = await readFile(
    "prisma/migrations/202609290001_product_gallery/migration.sql",
    "utf8",
  );
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'CREATE TEMP TABLE "ProductImage" ("productId" TEXT PRIMARY KEY,"bytes" BYTEA,"mimeType" TEXT) ON COMMIT DROP',
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO "ProductImage" VALUES ('legacy',decode('010203','hex'),'image/webp')`,
    );
    for (const statement of migration.split(";").filter((s) => s.trim()))
      await tx.$executeRawUnsafe(statement);
    const rows = await tx.$queryRawUnsafe<
      { id: string; position: number; bytes: Uint8Array }[]
    >('SELECT * FROM "ProductImage"');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("legacy_legacy");
    expect(rows[0].position).toBe(0);
    expect([...rows[0].bytes]).toEqual([1, 2, 3]);
  });
});
it("orders, removes and replaces gallery images atomically", async () => {
  const actor = await seedUser();
  const p = await createProduct(
    actor,
    { ...productInput, images: [{ uploadKey: "a" }, { uploadKey: "b" }] },
    { a: image(1), b: image(2) },
  );
  expect(p.images).toHaveLength(2);
  const updated = await updateProduct(
    actor,
    p.id,
    {
      ...productInput,
      expectedVersion: p.version,
      images: [{ id: p.images[1].id }, { id: p.images[0].id }],
    },
    {},
  );
  expect(updated.images.map((i) => i.id)).toEqual([
    p.images[1].id,
    p.images[0].id,
  ]);
  expect((await getProductImage(p.id, null)).bytes[0]).toBe(2);
  await expect(
    updateProduct(
      actor,
      p.id,
      {
        ...productInput,
        expectedVersion: p.version,
        images: [{ uploadKey: "c" }],
      },
      { c: image(3) },
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect((await getProduct(actor, p.id)).images).toHaveLength(2);
  const removed = await updateProduct(
    actor,
    p.id,
    {
      ...productInput,
      expectedVersion: updated.version,
      images: [{ id: p.images[0].id }],
    },
    {},
  );
  expect(removed.images).toHaveLength(1);
  expect((await getProductImage(p.id, null)).bytes[0]).toBe(1);
});
it("rejects foreign photos and invalid galleries without modifying the product", async () => {
  const actor = await seedUser();
  const a = await createProduct(
    actor,
    { ...productInput, images: [{ uploadKey: "a" }] },
    { a: image(1) },
  );
  const b = await createProduct(
    actor,
    { ...productInput, images: [{ uploadKey: "a" }] },
    { a: image(2) },
  );
  for (const images of [
    [],
    [{ id: b.images[0].id }],
    [{ id: a.images[0].id }, { id: a.images[0].id }],
    Array.from({ length: 11 }, () => ({ uploadKey: "a" })),
  ]) {
    await expect(
      updateProduct(
        actor,
        a.id,
        { ...productInput, expectedVersion: 1, images },
        {},
      ),
    ).rejects.toThrow();
  }
  await expect(
    updateProduct(
      actor,
      a.id,
      { ...productInput, expectedVersion: 1, images: [{ id: a.images[0].id }] },
      { unused: image(3) },
    ),
  ).rejects.toThrow();
  expect((await getProduct(actor, a.id)).version).toBe(1);
  await expect(
    getProductImage(a.id, null, b.images[0].id),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  const ten = await createProduct(
    actor,
    {
      ...productInput,
      images: Array.from({ length: 10 }, (_, i) => ({ uploadKey: `p${i}` })),
    },
    Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`p${i}`, image(i)]),
    ),
  );
  expect(ten.images).toHaveLength(10);
});
