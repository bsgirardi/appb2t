import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { sale, meta } from "../fixtures/production";
import { assertProductionArt } from "@/server/art/production";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { Prisma } from "@prisma/client";

setupDatabase();
it("preserves legacy production but blocks required lines without a matching approval", async () => {
  const actor = await seedUser();
  const s = await sale();
  await expect(
    db.$transaction((tx) => assertProductionArt(tx, s.id, ["line1"])),
  ).resolves.toBeUndefined();
  const origin = {
    schemaVersion: 1,
    requestId: "request",
    sourceLineId: "source",
    snapshot: {},
  };
  const item = {
    lineId: "line1",
    description: "Ana",
    quantity: 10,
    unitPrice: "10",
    catalogOrigin: origin,
  };
  await db.sale.update({
    where: { id: s.id },
    data: { document: { items: [item] } as unknown as Prisma.InputJsonValue },
  });
  // A persisted origin with a missing requirement cannot invent a requirement,
  // but once one exists, release must enforce it regardless of client payload.
  await db.catalogRequest.create({
    data: {
      id: "request",
      attemptHash: "attempt",
      contentHash: "hash",
      name: "Ana",
      preferredChannel: "email",
      contact: {},
      knownTotal: "10",
      consultCount: 0,
    },
  });
  await db.artLineRequirement.create({
    data: {
      requestId: "request",
      sourceLineId: "source",
      configurationHash: "hash",
    },
  });
  await expect(
    db.$transaction((tx) => assertProductionArt(tx, s.id, ["line1"])),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const draft = await saveOrder(actor, {
    ...meta(),
    origin: "SALE",
    saleId: s.id,
    lines: [
      {
        saleLineKey: "line1",
        description: "Ana",
        technology: "FDM",
        targetUnits: 1,
      },
    ],
  });
  await expect(
    releaseOrder(actor, { ...meta(draft.version), orderId: draft.id }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(
    (await db.productionOrder.findUniqueOrThrow({ where: { id: draft.id } }))
      .status,
  ).toBe("RASCUNHO");
});
