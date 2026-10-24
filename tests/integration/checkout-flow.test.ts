import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { checkoutFixture } from "../fixtures/checkout";
import { db } from "@/lib/db";
import { saveKit } from "@/server/kits/service";
import { reviewInquiry } from "@/server/inquiry";
import { checkoutDraftSchema } from "@/domain/checkout/validation";
import { prepareCheckout, confirmCheckout } from "@/server/checkout/confirm";
import { createArtPackage, publishRevision } from "@/server/art/revisions";
import { assertProductionArt } from "@/server/art/production";
import { requestCheckoutCancellation } from "@/server/checkout/cancellations";
setupDatabase();
it("preserves two personalizations, kit discount and the required-art production gate after direct checkout", async () => {
  const { actor, product, draft } = await checkoutFixture();
  await db.product.update({
    where: { id: product.id },
    data: {
      configuration: {
        formatVersion: 1,
        included: "Uma peça",
        leadTimeCondition: "Após aprovação de arte",
        fields: [
          {
            id: "name",
            type: "SHORT_TEXT",
            label: "Nome",
            help: "",
            required: true,
            maxLength: 120,
            effect: { kind: "NONE" },
          },
        ],
      },
      commercialRevision: { increment: 1 },
    },
  });
  const kit = await saveKit(actor, undefined, {
    name: "Kit de nomes",
    description: "",
    active: true,
    position: 0,
    productIds: [product.id],
    tiers: [{ minQuantity: 2, kind: "FIXED", amount: "10.00" }],
    checkoutPolicy: {
      directEnabled: true,
      deliveryModes: ["PICKUP"],
      externalPaymentInstructions: "Pagamento externo",
    },
  });
  const items = ["Ana", "Bia"].map((name, i) => ({
    productId: product.id,
    lineId: `l${i}`,
    quantity: 1,
    kitInstanceId: "g",
    answers: [{ fieldId: "name", value: name }],
  }));
  const group = {
    instanceId: "g",
    kitId: kit.id,
    commercialRevision: kit.commercialRevision,
    seenPrice: null,
    placements: [
      { lineId: "l0", x: 0.3, y: 0.5, z: 0 },
      { lineId: "l1", x: 0.7, y: 0.5, z: 1 },
    ],
  };
  const inquiry = await reviewInquiry({
    schemaVersion: 2,
    items,
    groups: [group],
  });
  const selection = checkoutDraftSchema.parse({
    ...draft,
    schemaVersion: 2,
    items: items.map((item, i) => ({
      ...item,
      commercialRevision: inquiry.lines[i].currentRevision,
      seenPrice: inquiry.lines[i].configuredPrice,
    })),
    groups: [{ ...group, seenPrice: inquiry.groups![0].price }],
  });
  await db.checkoutSession.create({
    data: { id: "s", expiresAt: new Date(Date.now() + 86400000) },
  });
  const p = { sessionId: "s", checkoutId: null };
  const review = await prepareCheckout(p, selection, "a".repeat(64));
  expect(review.total).toBe("140.00");
  const receipt = await confirmCheckout(p, {
    operationKey: "b".repeat(64),
    expectedVersion: review.version,
    fingerprint: review.fingerprint,
    name: "Ana",
    agreed: true,
  });
  const checkout = await db.checkout.findUniqueOrThrow({
    where: { id: receipt.checkoutId },
  });
  const sale = await db.sale.findUniqueOrThrow({
    where: { id: checkout.saleId! },
  });
  const document = sale.document as unknown as {
    items: { catalogOrigin: { snapshot: { answers: { value: string }[] } } }[];
  };
  expect(
    document.items.map((i) => i.catalogOrigin.snapshot.answers[0].value),
  ).toEqual(["Ana", "Bia"]);
  expect((sale.totals as { discount: string }).discount).toBe("10.00");
  expect(await db.stockReservation.count()).toBe(0);
  expect(await db.settlement.count()).toBe(0);
  const art = await createArtPackage(actor, checkout.requestId!, {
    operationKey: "require-direct-art",
    sourceLineIds: ["l0"],
    instructions: "Conferir arte antes de produzir",
  });
  await expect(
    db.$transaction((tx) => assertProductionArt(tx, sale.id, ["l0"])),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await db.artFile.create({
    data: {
      revisionId: art.id,
      name: "arte.pdf",
      purpose: "FINAL",
      mimeType: "application/pdf",
      bytes: new Uint8Array([1]),
      sha256: "a".repeat(64),
      byteLength: 1,
    },
  });
  const published = await publishRevision(
    actor,
    art.id,
    art.version,
    "publish-direct-art",
  );
  await db.artDecision.create({
    data: {
      revisionId: published.id,
      action: "APPROVE",
      name: "Ana",
      manifestHash: published.manifestHash!,
      manifest: {},
      operationKey: "direct-art-approval",
      payloadHash: "a",
    },
  });
  await db.artRevision.update({
    where: { id: published.id },
    data: { state: "APPROVED" },
  });
  await expect(
    db.$transaction((tx) => assertProductionArt(tx, sale.id, ["l0"])),
  ).resolves.toBeUndefined();
  await requestCheckoutCancellation(p, "Aguardar nova decisão", "c".repeat(64));
  expect(
    (await db.sale.findUniqueOrThrow({ where: { id: sale.id } })).status,
  ).toBe("CONFIRMADA");
});
