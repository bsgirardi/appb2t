import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { fixture } from "./fixtures";
import { executeAdCommand, copyAdText } from "@/server/advertising/commands";
import {
  getAdDraft,
  listAdDrafts,
  listAdProducts,
} from "@/server/advertising/queries";
setupDatabase();
it("persists, reviews, copies and archives without changing the product", async () => {
  const { actor, product } = await fixture("OPERATOR");
  const command = {
    action: "CREATE",
    operationKey: "create-operation-0001",
    productId: product.id,
    channel: "INSTAGRAM",
    internalName: "Campanha",
  };
  let d = await executeAdCommand(actor, undefined, command);
  expect(d.status).toBe("DRAFT");
  expect(d.imageIds).toEqual(product.images.map((i) => i.id));
  expect((await executeAdCommand(actor, undefined, command)).id).toBe(d.id);
  await expect(
    executeAdCommand(actor, undefined, { ...command, internalName: "Outro" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const other = await executeAdCommand(actor, undefined, {
    ...command,
    operationKey: "create-operation-0002",
  });
  expect(other.id).not.toBe(d.id);
  await expect(copyAdText(actor, d.id, d.version)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  d = await executeAdCommand(actor, d.id, {
    action: "UPDATE",
    expectedVersion: d.version,
    fields: {
      internalName: d.internalName,
      title: d.title,
      body: "Texto revisado à mão",
      imageIds: [...d.imageIds].reverse(),
    },
  });
  d = await executeAdCommand(actor, d.id, {
    action: "REVIEW",
    expectedVersion: d.version,
    confirmed: true,
  });
  expect(d.reviewIsCurrent).toBe(true);
  expect((await copyAdText(actor, d.id, d.version)).text).toContain(
    "Texto revisado",
  );
  d = await executeAdCommand(actor, d.id, {
    action: "ARCHIVE",
    expectedVersion: d.version,
  });
  expect(d.status).toBe("ARCHIVED");
  await expect(
    executeAdCommand(actor, d.id, {
      action: "UPDATE",
      expectedVersion: d.version,
      fields: {
        internalName: d.internalName,
        title: d.title,
        body: d.body,
        imageIds: d.imageIds,
      },
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  d = await executeAdCommand(actor, d.id, {
    action: "RESTORE",
    expectedVersion: d.version,
  });
  expect(d.status).toBe("DRAFT");
  expect(
    (await listAdDrafts(actor, { search: "Campanha", page: 1 })).total,
  ).toBe(2);
  expect(
    (await listAdProducts(actor, { search: "Peça", page: 1 })).products[0]
      .productId,
  ).toBe(product.id);
  expect(
    (await db.product.findUniqueOrThrow({ where: { id: product.id } })).version,
  ).toBe(product.version);
  expect(JSON.stringify(d)).not.toContain("secret-cost");
});
it("preserves edits and missing photos until the operator resolves source changes", async () => {
  const { actor, product } = await fixture();
  let d = await executeAdCommand(actor, undefined, {
    action: "CREATE",
    operationKey: "create-operation-0001",
    productId: product.id,
    channel: "WHATSAPP",
    internalName: "Mensagem",
  });
  await db.product.update({
    where: { id: product.id },
    data: {
      version: { increment: 1 },
      active: false,
      availability: "UNAVAILABLE",
    },
  });
  await db.productImage.delete({ where: { id: d.imageIds[0] } });
  const current = await getAdDraft(actor, d.id);
  expect(current.productChanged).toBe(true);
  expect(current.missingPhotoIds).toEqual([d.imageIds[0]]);
  await expect(
    executeAdCommand(actor, d.id, {
      action: "REVIEW",
      expectedVersion: d.version,
      confirmed: true,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  d = await executeAdCommand(actor, d.id, {
    action: "UPDATE",
    expectedVersion: d.version,
    fields: {
      internalName: d.internalName,
      title: d.title,
      body: "Meu texto",
      imageIds: d.imageIds,
    },
  });
  d = await executeAdCommand(actor, d.id, {
    action: "REFRESH_KEEP",
    expectedVersion: d.version,
  });
  expect(d.body).toBe("Meu texto");
  expect(d.missingPhotoIds).toHaveLength(1);
  d = await executeAdCommand(actor, d.id, {
    action: "UPDATE",
    expectedVersion: d.version,
    fields: {
      internalName: d.internalName,
      title: d.title,
      body: d.body,
      imageIds: d.imageIds.slice(1),
    },
  });
  d = await executeAdCommand(actor, d.id, {
    action: "REVIEW",
    expectedVersion: d.version,
    confirmed: true,
  });
  expect(d.reviewIsCurrent).toBe(true);
  d = await executeAdCommand(actor, d.id, {
    action: "REFRESH_REGENERATE",
    expectedVersion: d.version,
    confirmedReplacement: true,
  });
  expect(d.body).toContain("Indisponível");
  expect(d.status).toBe("DRAFT");
});
