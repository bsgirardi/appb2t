import { expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { fixture } from "./fixtures";
import { setupDatabase } from "./setup";
import { db } from "@/lib/db";
import { executeAdCommand } from "@/server/advertising/commands";
import { exportAdDraft } from "@/server/advertising/export";
setupDatabase();
it("exports only a reviewed current version and records no success for corrupt photos", async () => {
  const { actor, product } = await fixture();
  let d = await executeAdCommand(actor, undefined, {
    action: "CREATE",
    operationKey: "create-operation-0001",
    productId: product.id,
    channel: "WHATSAPP",
    internalName: "Texto",
  });
  await expect(exportAdDraft(actor, d.id, d.version)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  d = await executeAdCommand(actor, d.id, {
    action: "REVIEW",
    expectedVersion: d.version,
    confirmed: true,
  });
  const result = await exportAdDraft(actor, d.id, d.version),
    zip = unzipSync(result.bytes);
  expect(result.filename).toMatch(/\.zip$/);
  expect(strFromU8(zip["texto.txt"])).not.toContain("secret-cost");
  expect(strFromU8(zip["referencia.json"])).not.toContain(actor.email);
  expect(await db.advertisingExport.count()).toBe(1);
  await db.productImage.update({
    where: { id: d.imageIds[0] },
    data: { bytes: Buffer.from([1, 2, 3]) },
  });
  await expect(exportAdDraft(actor, d.id, d.version)).rejects.toMatchObject({
    code: "VALIDATION",
  });
  expect(await db.advertisingExport.count()).toBe(1);
  await db.product.update({
    where: { id: product.id },
    data: { version: { increment: 1 } },
  });
  await expect(exportAdDraft(actor, d.id, d.version)).rejects.toMatchObject({
    code: "CONFLICT",
  });
});
