import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { productInput } from "../fixtures/product";
import { createProduct } from "@/server/products";
import {
  receiveCatalogRequest,
  findCatalogReceipt,
} from "@/server/catalog-requests/receive";
import { consumeRequestQuota } from "@/server/catalog-requests/rate-limit";
import { requestSubmission } from "../fixtures/catalog-request";
setupDatabase();
async function fixture(consult = false) {
  const actor = await seedUser();
  const product = await createProduct(
    actor,
    {
      ...productInput,
      publicPriceMode: consult ? "CONSULT" : "REFERENCE",
      configuration: {
        formatVersion: 1,
        included: "Uma peça",
        leadTimeCondition: "Após aprovação",
        fields: [
          {
            id: "name",
            label: "Nome",
            help: "",
            required: true,
            type: "SHORT_TEXT",
            maxLength: 120,
            effect: { kind: "NONE" },
          },
        ],
      },
    },
    { a: { bytes: new Uint8Array([1, 2]), mimeType: "image/webp" } },
  );
  const browserId = "browser-1";
  await db.catalogRequestBrowser.create({
    data: { id: browserId, expiresAt: new Date(Date.now() + 86400000) },
  });
  const payload = {
    ...requestSubmission,
    attemptKey: randomBytes(32).toString("hex"),
    items: ["Ana", "Bia"].map((value, i) => ({
      productId: product.id,
      lineId: `l${i}`,
      quantity: 1,
      answers: [{ fieldId: "name", value }],
      commercialRevision: product.commercialRevision,
      seenPrice: consult
        ? { kind: "CONSULT", unit: null, subtotal: null }
        : { kind: "REFERENCE", unit: "75.00", subtotal: "75.00" },
    })),
  };
  return { actor, product, browserId, payload };
}
it("receives distinct personalizations with authoritative immutable labels and no commercial side effects", async () => {
  const { payload, browserId, product } = await fixture();
  const receipt = await receiveCatalogRequest(payload, browserId);
  expect(receipt.protocol).toMatch(/^SOL-\d{6,}$/);
  expect(Object.keys(receipt).sort()).toEqual([
    "acceptedAt",
    "protocol",
    "received",
  ]);
  const saved = await db.catalogRequest.findFirstOrThrow({
    include: { lines: { orderBy: { position: "asc" } } },
  });
  expect(
    saved.lines.map(
      (l) =>
        (l.snapshot as { answerLabels: { valueLabel: string }[] })
          .answerLabels[0].valueLabel,
    ),
  ).toEqual(["Ana", "Bia"]);
  expect(saved.knownTotal?.toFixed(2)).toBe("150.00");
  const frozen = saved.lines.map((l) => l.snapshot);
  await db.product.update({
    where: { id: product.id },
    data: { name: "Alterado", price: 90, commercialRevision: { increment: 1 } },
  });
  expect(
    (
      await db.catalogRequestLine.findMany({ orderBy: { position: "asc" } })
    ).map((l) => l.snapshot),
  ).toEqual(frozen);
  expect(await db.customer.count()).toBe(0);
  expect(await db.quote.count()).toBe(0);
  expect(await db.sale.count()).toBe(0);
});
it("returns the same receipt for concurrent retries and after catalog removal, rejecting changed content", async () => {
  const { payload, browserId, product } = await fixture();
  const receipts = await Promise.all(
    Array.from({ length: 4 }, () => receiveCatalogRequest(payload, browserId)),
  );
  expect(new Set(receipts.map((r) => r.protocol)).size).toBe(1);
  expect(await db.catalogRequest.count()).toBe(1);
  await db.product.update({
    where: { id: product.id },
    data: { active: false },
  });
  expect(await receiveCatalogRequest(payload, browserId)).toEqual(receipts[0]);
  expect(await findCatalogReceipt(payload.attemptKey)).toEqual(receipts[0]);
  await expect(
    receiveCatalogRequest(
      { ...payload, contact: { ...payload.contact, name: "Outra" } },
      browserId,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("receives consultation without exposing internal price or a false total", async () => {
  const { payload, browserId } = await fixture(true);
  await receiveCatalogRequest(payload, browserId);
  const saved = await db.catalogRequest.findFirstOrThrow({
    include: { lines: true },
  });
  expect(saved.knownTotal).toBeNull();
  expect(saved.consultCount).toBe(2);
  expect(
    saved.lines.every((l) => l.unitPrice === null && l.subtotal === null),
  ).toBe(true);
  expect(JSON.stringify(saved.lines.map((l) => l.snapshot))).not.toContain(
    "75.00",
  );
});
it("allocates missing source identities without colliding with supplied identities", async () => {
  const { payload, browserId } = await fixture();
  const items = payload.items.map((item, index) => {
    const rest = { ...item, lineId: undefined };
    return index === 0 ? { ...rest, lineId: "line-1" } : rest;
  });
  await receiveCatalogRequest({ ...payload, items }, browserId);
  const lines = await db.catalogRequestLine.findMany({
    orderBy: { position: "asc" },
  });
  const ids = lines.map((line) => (line.snapshot as { lineId: string }).lineId);
  expect(ids[0]).toBe("line-1");
  expect(new Set(ids).size).toBe(2);
});
it("rejects changed offers without partial receipt but retains quota debit", async () => {
  const { payload, browserId, product } = await fixture();
  await db.product.update({
    where: { id: product.id },
    data: { price: 80, commercialRevision: { increment: 1 } },
  });
  await expect(receiveCatalogRequest(payload, browserId)).rejects.toMatchObject(
    { code: "CONFLICT" },
  );
  expect(await db.catalogRequest.count()).toBe(0);
  expect(
    (await db.catalogRequestQuota.findMany()).every((q) => q.attempts === 1),
  ).toBe(true);
});
it("enforces per-browser and global quotas atomically and renews windows", async () => {
  const { browserId } = await fixture();
  const now = new Date("2026-10-20T12:00:00Z");
  for (let i = 0; i < 10; i++) await consumeRequestQuota(browserId, now);
  await expect(consumeRequestQuota(browserId, now)).rejects.toMatchObject({
    code: "RATE_LIMIT",
  });
  await consumeRequestQuota(browserId, new Date(now.getTime() + 900000));
  await db.catalogRequestQuota.updateMany({
    where: { key: { startsWith: "global:" } },
    data: { attempts: 299 },
  });
  await db.catalogRequestQuota.deleteMany({
    where: { key: { startsWith: "browser:" } },
  });
  const results = await Promise.allSettled([
    consumeRequestQuota(browserId, now),
    consumeRequestQuota(browserId, now),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  await consumeRequestQuota(browserId, new Date(now.getTime() + 3600000));
});
