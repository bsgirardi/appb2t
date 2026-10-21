import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { createProduct } from "@/server/products";
import { saveKit } from "@/server/kits/service";
import { reviewInquiry } from "@/server/inquiry";
import {
  receiveCatalogRequest,
  requestHash,
} from "@/server/catalog-requests/receive";
import { parseCatalogSubmission } from "@/domain/catalog-requests/validation";
import { canonicalSubmission } from "@/domain/catalog-requests/identity";
import {
  catalogLineSnapshotSchema,
  catalogLineOriginSchema,
} from "@/domain/catalog-requests/snapshot";
import { kitRequestSnapshotSchema } from "@/domain/kits/snapshot";
import { productInput } from "../fixtures/product";
import { POST as reviewRoute } from "@/app/api/portfolio/inquiry/route";
setupDatabase();
it("malformed_group_returns_validation_instead_of_internal_error", async () => {
  const response = await reviewRoute(
    new Request("http://localhost:3000/api/portfolio/inquiry", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        schemaVersion: 2,
        items: [
          { productId: "p", lineId: "l", quantity: 1, kitInstanceId: "orphan" },
        ],
        groups: [],
      }),
    }),
  );
  expect(response.status).toBe(422);
});
async function fixture(consult = false) {
  const actor = await seedUser();
  const p = await createProduct(
    actor,
    {
      ...productInput,
      publicPriceMode: consult ? "CONSULT" : "REFERENCE",
      quantityTiers: [{ minQuantity: 5, baseUnitPrice: "10" }],
    },
    { a: { bytes: new Uint8Array([1]), mimeType: "image/webp" } },
  );
  const definition = {
    name: "Kit",
    description: "",
    active: true,
    position: 0,
    productIds: [p.id],
    tiers: [
      { minQuantity: 5, kind: "FIXED", amount: "15" },
      { minQuantity: 10, kind: "PERCENT", percent: "20" },
    ],
  };
  const kit = await saveKit(actor, undefined, definition);
  const selection = {
    schemaVersion: 2,
    items: [{ lineId: "l", productId: p.id, quantity: 5, kitInstanceId: "g" }],
    groups: [
      {
        instanceId: "g",
        kitId: kit.id,
        commercialRevision: 1,
        placements: [{ lineId: "l", x: 0.5, y: 0.5, z: 0 }],
        seenPrice: null,
      },
    ],
  };
  const review = await reviewInquiry(selection);
  const confirmed = {
    ...selection,
    items: review.lines.map((l) => ({
      ...selection.items[0],
      commercialRevision: l.currentRevision,
      seenPrice: l.configuredPrice,
    })),
    groups: review.groups!.map((g) => ({
      ...selection.groups[0],
      commercialRevision: g.currentRevision,
      seenPrice: g.price,
    })),
  };
  const browserId = randomBytes(32).toString("hex");
  await db.catalogRequestBrowser.create({
    data: { id: browserId, expiresAt: new Date(Date.now() + 3600000) },
  });
  const payload = {
    ...confirmed,
    attemptKey: randomBytes(32).toString("hex"),
    contact: {
      name: "Ana",
      preferredChannel: "email",
      phone: "",
      email: "ana@example.test",
    },
  };
  return { actor, p, kit, definition, payload, browserId, review };
}
it("receipt_retry_survives_catalog_change_and_keeps_complete_table", async () => {
  const f = await fixture();
  expect(f.review.lines[0].price).toBe("75.00");
  expect(f.review.groups![0].price).toMatchObject({
    subtotal: "375.00",
    discount: "15.00",
    total: "360.00",
  });
  const receipt = await receiveCatalogRequest(f.payload, f.browserId);
  expect(Object.keys(receipt).sort()).toEqual([
    "acceptedAt",
    "protocol",
    "received",
  ]);
  const row = await db.catalogRequest.findFirstOrThrow();
  expect(row.kitSnapshot).toMatchObject({
    schemaVersion: 1,
    groups: [
      {
        tiers: [
          { minQuantity: 5, kind: "FIXED", amount: "15.00" },
          { minQuantity: 10, kind: "PERCENT", percent: "20.00" },
        ],
      },
    ],
  });
  await saveKit(f.actor, f.kit.id, {
    ...f.definition,
    active: false,
    expectedVersion: 1,
  });
  expect(await receiveCatalogRequest(f.payload, f.browserId)).toEqual(receipt);
  await expect(
    receiveCatalogRequest(
      {
        ...f.payload,
        groups: [
          {
            ...f.payload.groups[0],
            placements: [{ lineId: "l", x: 0.6, y: 0.5, z: 0 }],
          },
        ],
      },
      f.browserId,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("consult_group_stays_pending_and_never_applies_partial_discount", async () => {
  const f = await fixture(true);
  expect(f.review.groups![0].price).toMatchObject({
    kind: "CONSULT",
    subtotal: null,
    discount: null,
    total: null,
  });
  await receiveCatalogRequest(f.payload, f.browserId);
  const row = await db.catalogRequest.findFirstOrThrow();
  expect(row.consultCount).toBe(1);
});
it("snapshot_never_trusts_client_discount_or_ineligible_product", async () => {
  const f = await fixture();
  await expect(
    receiveCatalogRequest(
      {
        ...f.payload,
        groups: [
          {
            ...f.payload.groups[0],
            seenPrice: {
              ...f.payload.groups[0].seenPrice,
              discount: "1.00",
              total: "374.00",
            },
          },
        ],
      },
      f.browserId,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.catalogRequest.count()).toBe(0);
  await saveKit(f.actor, f.kit.id, {
    ...f.definition,
    active: false,
    expectedVersion: 1,
  });
  await expect(
    receiveCatalogRequest(f.payload, f.browserId),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("returns_pre_migration_legacy_receipt_before_quota_or_catalog", async () => {
  const payload = {
    attemptKey: "a".repeat(64),
    contact: {
      name: "Ana",
      preferredChannel: "email",
      phone: "",
      email: "ana@example.test",
    },
    items: [{ productId: "p", lineId: "l", quantity: 1 }],
  };
  const oldCanonical =
    '["Ana","email","","ana@example.test",[["l","p","","",1,[],null,null]]]';
  await db.catalogRequest.create({
    data: {
      attemptHash: requestHash(payload.attemptKey),
      contentHash: requestHash(oldCanonical),
      name: "Ana",
      preferredChannel: "email",
      contact: payload.contact,
      consultCount: 0,
    },
  });
  expect(
    (await receiveCatalogRequest(payload, "nonexistent-browser")).received,
  ).toBe(true);
  expect(await db.catalogRequest.count()).toBe(1);
});
it("catalog_mutation_and_intake_are_consistent", async () => {
  const f = await fixture();
  const result = await Promise.allSettled([
    receiveCatalogRequest(f.payload, f.browserId),
    saveKit(f.actor, f.kit.id, {
      ...f.definition,
      active: false,
      expectedVersion: 1,
    }),
  ]);
  expect(result[1].status).toBe("fulfilled");
  if (result[0].status === "rejected")
    expect(result[0].reason).toMatchObject({ code: "CONFLICT" });
  const rows = await db.catalogRequest.findMany();
  expect(rows.length).toBe(result[0].status === "fulfilled" ? 1 : 0);
  if (rows.length)
    expect(
      kitRequestSnapshotSchema.parse(rows[0].kitSnapshot).groups[0]
        .commercialRevision,
    ).toBe(1);
});
it("max_selection_snapshot_roundtrips_without_truncation", async () => {
  const f = await fixture();
  const { updateProduct } = await import("@/server/products");
  const configuration = {
    formatVersion: 1,
    included: "I".repeat(1000),
    leadTimeCondition: "L".repeat(240),
    fields: Array.from({ length: 8 }, (_, i) => ({
      id: `field${i}`,
      type: "LONG_TEXT",
      label: `Campo ${i}`,
      help: "",
      required: true,
      maxLength: 500,
      effect: { kind: "NONE" },
    })),
  };
  const p = await updateProduct(f.actor, f.p.id, {
    ...productInput,
    quantityTiers: [],
    configuration,
    images: f.p.images.map((i) => ({ id: i.id })),
    expectedVersion: f.p.version,
  });
  const selection = {
    schemaVersion: 2,
    items: Array.from({ length: 20 }, (_, n) => ({
      lineId: `l${n}`,
      productId: p.id,
      kitInstanceId: `g${n}`,
      quantity: 99,
      commercialRevision: p.commercialRevision,
      seenPrice: { kind: "REFERENCE", unit: "75.00", subtotal: "7425.00" },
      answers: configuration.fields.map((field, i) => ({
        fieldId: field.id,
        value: `${n}-${i}`.padEnd(500, "A"),
      })),
    })),
    groups: Array.from({ length: 20 }, (_, n) => ({
      ...f.payload.groups[0],
      instanceId: `g${n}`,
      seenPrice: null,
      placements: [{ lineId: `l${n}`, x: 0.5, y: 0.5, z: 0 }],
    })),
  };
  const review = await reviewInquiry(selection);
  const payload = {
    ...f.payload,
    ...selection,
    groups: selection.groups.map((g, i) => ({
      ...g,
      seenPrice: review.groups![i].price,
    })),
  };
  expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(256 * 1024);
  await receiveCatalogRequest(payload, f.browserId);
  const request = await db.catalogRequest.findFirstOrThrow({
    include: { lines: true },
  });
  const groups = kitRequestSnapshotSchema.parse(request.kitSnapshot).groups;
  expect(groups).toHaveLength(20);
  expect(request.lines).toHaveLength(20);
  for (const line of request.lines) {
    const snapshot = catalogLineSnapshotSchema.parse(line.snapshot);
    expect(snapshot.answers[7].value).toHaveLength(500);
    expect(
      catalogLineOriginSchema.parse({
        schemaVersion: 1,
        requestId: request.id,
        sourceLineId: snapshot.lineId,
        snapshot,
      }).snapshot.quantity,
    ).toBe(99);
  }
  expect(
    Buffer.byteLength(JSON.stringify({ groups, lines: request.lines })),
  ).toBeLessThan(8 * 1024 * 1024);
  expect(canonicalSubmission(parseCatalogSubmission(payload))).toContain("g19");
});
