import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { seedUser } from "../integration/setup";
import { productInput } from "./product";
import { createProduct } from "@/server/products";
import { saveKit } from "@/server/kits/service";
import { reviewInquiry } from "@/server/inquiry";
import {
  receiveCatalogRequest,
  requestHash,
} from "@/server/catalog-requests/receive";
import { changeCatalogRequest } from "@/server/catalog-requests/service";
import { saveCustomer } from "@/server/customers";
import { requestQuoteInput } from "./catalog-request-db";
import { kitPreparationReview } from "@/domain/kits/document";
export async function createC3RequestFixture(consult = false) {
  const actor = await seedUser(),
    uploads = {
      a: { bytes: new Uint8Array([1]), mimeType: "image/webp" as const },
    };
  const a = await createProduct(
    actor,
    {
      ...productInput,
      name: "Peça Ana",
      price: "30",
      publicPriceMode: consult ? "CONSULT" : "REFERENCE",
    },
    uploads,
  );
  const b = await createProduct(
    actor,
    {
      ...productInput,
      name: "Peça Bia",
      price: "20",
      quantityTiers: [{ minQuantity: 3, baseUnitPrice: "1" }],
    },
    uploads,
  );
  const definition = {
    name: "Kit Ana e Bia",
    description: "",
    active: true,
    position: 0,
    productIds: [a.id, b.id],
    tiers: [
      { minQuantity: 5, kind: "FIXED", amount: "15" },
      { minQuantity: 10, kind: "PERCENT", percent: "20" },
    ],
  };
  const kit = await saveKit(actor, undefined, definition);
  const kit2 = await saveKit(actor, undefined, {
    ...definition,
    name: "Kit Bia",
    productIds: [b.id],
    tiers: [{ minQuantity: 5, kind: "PERCENT", percent: "10" }],
  });
  const items = [
    { lineId: "a", productId: a.id, quantity: 2, kitInstanceId: "g1" },
    { lineId: "b", productId: b.id, quantity: 3, kitInstanceId: "g1" },
    { lineId: "c", productId: b.id, quantity: 5, kitInstanceId: "g2" },
  ];
  const groups = [
    {
      instanceId: "g1",
      kitId: kit.id,
      commercialRevision: 1,
      seenPrice: null,
      placements: [
        { lineId: "a", x: 0.3, y: 0.5, z: 0 },
        { lineId: "b", x: 0.7, y: 0.5, z: 1 },
      ],
    },
    {
      instanceId: "g2",
      kitId: kit2.id,
      commercialRevision: 1,
      seenPrice: null,
      placements: [{ lineId: "c", x: 0.5, y: 0.5, z: 0 }],
    },
  ];
  const review = await reviewInquiry({ schemaVersion: 2, items, groups });
  const browserId = requestHash(randomBytes(32).toString("hex"));
  await db.catalogRequestBrowser.create({
    data: { id: browserId, expiresAt: new Date(Date.now() + 3600000) },
  });
  const payload = {
    schemaVersion: 2,
    attemptKey: randomBytes(32).toString("hex"),
    contact: {
      name: "Ana Silva",
      preferredChannel: "email",
      phone: "",
      email: "ana@example.test",
    },
    items: items.map((item, i) => ({
      ...item,
      commercialRevision: review.lines[i].currentRevision,
      seenPrice: review.lines[i].configuredPrice,
    })),
    groups: groups.map((g, i) => ({
      ...g,
      seenPrice: review.groups![i].price,
    })),
  };
  const receipt = await receiveCatalogRequest(payload, browserId);
  const row = await db.catalogRequest.findFirstOrThrow();
  const request = await changeCatalogRequest(actor, row.id, {
    action: "START",
    expectedVersion: 1,
    assigneeId: actor.id,
  });
  const customer = await saveCustomer(actor, undefined, {
    name: "Ana revisada",
    type: "PERSON",
    active: true,
  });
  const documentInput = requestQuoteInput(customer.id, request.lines);
  documentInput.document.discount = "30.00";
  const input = {
    ...documentInput,
    additionalDiscount: "5.00",
    kitReviewFingerprint: kitPreparationReview(
      documentInput.document.items,
      documentInput.sources,
      "30.00",
    ),
  };
  return {
    actor,
    a,
    b,
    kit,
    kit2,
    definition,
    request,
    customer,
    input,
    receipt,
    payload,
    browserId,
  };
}
