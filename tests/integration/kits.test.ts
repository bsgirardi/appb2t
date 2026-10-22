import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { createProduct, setProductActive } from "@/server/products";
import { saveKit, listKits } from "@/server/kits/service";
import { getPublicKit, listPublicKits } from "@/server/kits/queries";
import { productInput } from "../fixtures/product";
setupDatabase();
const uploads = {
  a: { bytes: new Uint8Array([1, 2]), mimeType: "image/webp" as const },
};
it("operator_can_manage_with_audit_and_optimistic_version", async () => {
  const actor = await seedUser("OPERATOR");
  const p = await createProduct(actor, productInput, uploads);
  const input = {
    name: "Kit Ana",
    description: "Escolha as peças",
    active: true,
    position: 0,
    productIds: [p.id],
    tiers: [{ minQuantity: 5, kind: "FIXED", amount: "15" }],
  };
  const kit = await saveKit(actor, undefined, input);
  expect(kit).toMatchObject({
    name: "Kit Ana",
    version: 1,
    commercialRevision: 1,
  });
  expect((await listKits(actor))[0].tiers).toEqual([
    { minQuantity: 5, kind: "FIXED", amount: "15.00" },
  ]);
  const editorial = await saveKit(actor, kit.id, {
    ...input,
    position: 3,
    expectedVersion: kit.version,
  });
  expect(editorial.commercialRevision).toBe(1);
  await expect(
    saveKit(actor, kit.id, { ...input, expectedVersion: 1 }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const commercial = await saveKit(actor, kit.id, {
    ...input,
    tiers: [],
    expectedVersion: editorial.version,
  });
  expect(commercial.commercialRevision).toBe(2);
  expect(await db.catalogKitEvent.count({ where: { kitId: kit.id } })).toBe(3);
});
it("disabled_product_not_selectable_and_inactive_kit_is_private", async () => {
  const actor = await seedUser();
  const p = await createProduct(actor, productInput, uploads);
  const input = {
    name: "Kit",
    description: "",
    active: true,
    position: 0,
    productIds: [p.id],
    tiers: [],
  };
  const kit = await saveKit(actor, undefined, input);
  expect((await getPublicKit(kit.id))?.productIds).toEqual([p.id]);
  await setProductActive(actor, p.id, false, p.version);
  expect(await getPublicKit(kit.id)).toBeNull();
  expect(await listPublicKits()).toEqual([]);
  await expect(saveKit(actor, undefined, input)).rejects.toMatchObject({
    code: "VALIDATION",
  });
  await saveKit(actor, kit.id, {
    ...input,
    active: false,
    expectedVersion: kit.version,
  });
  expect(await getPublicKit(kit.id)).toBeNull();
});
