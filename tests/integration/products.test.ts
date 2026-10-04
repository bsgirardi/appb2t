import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import {
  createProduct,
  updateProduct,
  listPublicProducts,
  setProductActive,
  getProductImage,
  getProduct,
} from "@/server/products";
import { productInput } from "../fixtures/product";
import { saveSettings } from "@/server/settings";
setupDatabase();
const image = {
  bytes: new Uint8Array([1, 2, 3]),
  mimeType: "image/webp" as const,
};
it.each(["ADMIN", "OPERATOR"] as const)(
  "lets %s manage products, hides private fields and inactive photos",
  async (role) => {
    const actor = await seedUser(role);
    const product = await createProduct(actor, productInput, { a: image });
    expect(product.price).toBe("75.00");
    const publicProducts = await listPublicProducts();
    expect(Object.keys(publicProducts[0]).sort()).toEqual(
      [
        "id",
        "name",
        "description",
        "paymentTerms",
        "price",
        "imageUrl",
        "images",
        "seoTitle",
        "seoDescription",
        "sku",
        "shortDescription",
        "specifications",
        "colors",
        "sizes",
        "availability",
        "leadTimeDays",
      ].sort(),
    );
    expect((await getProductImage(product.id, null)).bytes).toEqual(
      image.bytes,
    );
    const inactive = await setProductActive(
      actor,
      product.id,
      false,
      product.version,
    );
    expect(await listPublicProducts()).toHaveLength(0);
    await expect(getProductImage(product.id, null)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await getProductImage(product.id, actor)).bytes).toEqual(
      image.bytes,
    );
    await setProductActive(actor, product.id, true, inactive.version);
    expect(await listPublicProducts()).toHaveLength(1);
  },
);
it("keeps snapshots independent of global changes and inactive references", async () => {
  const actor = await seedUser();
  const material = await db.material.create({
    data: { name: "PLA", technology: "FDM", price: "100" },
  });
  const product = await createProduct(
    actor,
    { ...productInput, materialId: material.id },
    { a: image },
  );
  await saveSettings(actor, {
    ...productInput.calculation.settings,
    energyRate: "99",
    expectedVersion: 0,
  });
  await db.material.update({
    where: { id: material.id },
    data: { active: false, price: "500" },
  });
  expect((await getProduct(actor, product.id)).price).toBe("75.00");
  const updated = await updateProduct(actor, product.id, {
    ...productInput,
    images: product.images.map((i) => ({ id: i.id })),
    materialId: material.id,
    name: "Novo nome",
    calculation: { ...productInput.calculation, materialPrice: "400" },
    expectedVersion: 1,
  });
  expect(updated.price).toBe("75.00");
});
it("rolls back stale concurrent text and image writes together", async () => {
  const actor = await seedUser();
  const product = await createProduct(actor, productInput, { a: image });
  const results = await Promise.allSettled(
    [1, 2].map((n) =>
      updateProduct(
        actor,
        product.id,
        { ...productInput, name: `Produto ${n}`, expectedVersion: 1 },
        { a: { ...image, bytes: new Uint8Array([n]) } },
      ),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.find((r) => r.status === "rejected")).toMatchObject({
    reason: { code: "CONFLICT" },
  });
  const current = await getProduct(actor, product.id);
  expect((await getProductImage(product.id, actor)).bytes[0]).toBe(
    Number(current.name.slice(-1)),
  );
});
it("rejects missing photo, incompatible reference and invalid final price", async () => {
  const actor = await seedUser();
  const material = await db.material.create({
    data: { name: "Resina", technology: "RESIN", price: "100" },
  });
  await expect(
    createProduct(
      actor,
      { ...productInput, materialId: material.id },
      { a: image },
    ),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  await expect(
    createProduct(actor, { ...productInput, price: "0" }, { a: image }),
  ).rejects.toThrow();
  await expect(
    createProduct(actor, productInput, undefined as never),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await listPublicProducts()).toHaveLength(0);
});
