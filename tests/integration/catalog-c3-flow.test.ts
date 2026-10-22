import { randomBytes, randomUUID } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (session.token ? { value: session.token } : undefined),
  }),
}));
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { createC3RequestFixture } from "../fixtures/catalog-c3";
import { prepareRequestQuote } from "@/server/catalog-requests/prepare-quote";
import {
  receiveCatalogRequest,
  findCatalogReceipt,
  requestHash,
} from "@/server/catalog-requests/receive";
import { changeCatalogRequest } from "@/server/catalog-requests/service";
import { getCatalogRequest } from "@/server/catalog-requests/queries";
import { saveKit } from "@/server/kits/service";
import { updateProduct } from "@/server/products";
import { reviewInquiry } from "@/server/inquiry";
import { saveQuote, transitionQuote } from "@/server/quotes";
import { convertQuote } from "@/server/sales";
import { tokenHash } from "@/server/auth/session";
import {
  discountReviewFingerprint,
  kitPreparationReview,
} from "@/domain/kits/document";
import { duplicateDocumentItem } from "@/domain/pricing/document-costs";
import { requestQuoteInput } from "../fixtures/catalog-request-db";
import { productInput } from "../fixtures/product";
import { DocumentPrint } from "@/components/commerce/document-print";
import { PUT } from "@/app/api/quotes/[id]/route";
setupDatabase();
beforeEach(() => {
  session.token = undefined;
});
it("full_c3_request_to_converted_quote", async () => {
  const f = await createC3RequestFixture(true);
  expect(await db.quote.count()).toBe(0);
  expect(await db.sale.count()).toBe(0);
  expect(f.request.groups![0].price.total).toBeNull();
  expect(await findCatalogReceipt(f.payload.attemptKey)).toEqual(f.receipt);
  await saveKit(f.actor, f.kit.id, {
    ...f.definition,
    active: false,
    expectedVersion: 1,
  });
  expect(await receiveCatalogRequest(f.payload, f.browserId)).toEqual(
    f.receipt,
  );
  const document = {
    ...f.input.document,
    items: f.input.document.items.map((item, i) =>
      i === 0 ? { ...item, unitPrice: "30.00" } : item,
    ),
  };
  const prepared = await prepareRequestQuote(f.actor, f.request.id, {
    ...f.input,
    document,
    kitReviewFingerprint: kitPreparationReview(
      document.items,
      f.input.sources,
      "30.00",
    ),
  });
  expect(prepared.quote.totals!.total).toBe("190.00");
  const items = prepared.quote.input
    .items!.map((item, i) => (i === 0 ? { ...item, quantity: 3 } : item))
    .reverse();
  const negotiated = await saveQuote(f.actor, prepared.quote.id, {
    ...prepared.quote.input,
    items,
    discount: "28.00",
    expectedVersion: prepared.quote.version,
    kitDiscountReview: {
      fingerprint: discountReviewFingerprint(items, "28.00"),
    },
  });
  const issued = await transitionQuote(
    f.actor,
    negotiated.id,
    negotiated.version,
    "ISSUE",
  );
  expect(issued.totals).toMatchObject({
    subtotal: "250.00",
    discount: "28.00",
    total: "222.00",
  });
  expect(issued.snapshot!.catalogKits!.preparation.totalDiscount).toBe("30.00");
  expect(
    issued.snapshot!.catalogKits!.receivedLines!.find((l) => l.lineId === "a")!
      .answers[0].value,
  ).toBe("Ana");
  const html = renderToStaticMarkup(
    createElement(DocumentPrint, {
      number: issued.number,
      snapshot: issued.snapshot!,
      totals: issued.totals!,
      paymentTerms: "Pix",
    }),
  );
  expect(html).toContain("Conjunto: Kit Ana e Bia");
  expect(html.match(/R\$ 28,00/g) ?? []).toHaveLength(1);
  const approved = await transitionQuote(
    f.actor,
    issued.id,
    issued.version,
    "APPROVE",
  );
  const sale = await convertQuote(
    f.actor,
    approved.id,
    approved.version,
    [{ number: 1, amount: "222.00", dueDate: "2099-12-31" }],
    randomUUID(),
  );
  expect(sale.totals.total).toBe("222.00");
  expect(sale.snapshot!.catalogKits).toEqual(issued.snapshot!.catalogKits);
  expect((await getCatalogRequest(f.actor, f.request.id)).quoteId).toBe(
    issued.id,
  );
});
it("max_c3_snapshot_roundtrips_through_100_line_authenticated_editor", async () => {
  const f = await createC3RequestFixture();
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
  const p = await updateProduct(f.actor, f.a.id, {
    ...productInput,
    name: "Peça Ana",
    price: "30.00",
    configuration,
    images: f.a.images.map((i) => ({ id: i.id })),
    expectedVersion: f.a.version,
  });
  const items = Array.from({ length: 20 }, (_, n) => ({
    lineId: `large-${n}`,
    productId: p.id,
    kitInstanceId: `large-group-${n}`,
    quantity: 99,
    commercialRevision: p.commercialRevision,
    seenPrice: { kind: "REFERENCE", unit: "30.00", subtotal: "2970.00" },
    answers: configuration.fields.map((field, i) => ({
      fieldId: field.id,
      value: `${n}-${i}${"😀".repeat(340)}`,
    })),
  }));
  const groups = items.map((item) => ({
    instanceId: item.kitInstanceId,
    kitId: f.kit.id,
    commercialRevision: 1,
    seenPrice: null,
    placements: [{ lineId: item.lineId, x: 0.5, y: 0.5, z: 0 }],
  }));
  const review = await reviewInquiry({ schemaVersion: 2, items, groups });
  const payload = {
    ...f.payload,
    attemptKey: randomBytes(32).toString("hex"),
    items,
    groups: groups.map((g, i) => ({
      ...g,
      seenPrice: review.groups![i].price,
    })),
  };
  expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(256 * 1024);
  await receiveCatalogRequest(payload, f.browserId);
  const row = await db.catalogRequest.findUniqueOrThrow({
    where: { attemptHash: requestHash(payload.attemptKey) },
  });
  const request = await changeCatalogRequest(f.actor, row.id, {
    action: "START",
    expectedVersion: 1,
    assigneeId: f.actor.id,
  });
  const input = requestQuoteInput(f.customer.id, request.lines);
  input.document.discount = "11880.00";
  await expect(
    prepareRequestQuote(f.actor, request.id, input),
  ).rejects.toThrow();
  input.document.items = input.document.items.map((item, i) => ({
    ...item,
    description: `Resumo comercial revisado da peça ${i + 1}`,
  }));
  const prepared = await prepareRequestQuote(f.actor, request.id, {
    ...input,
    kitReviewFingerprint: kitPreparationReview(
      input.document.items,
      input.sources,
      input.document.discount,
    ),
  });
  expect(prepared.quote.totals!.total).toBe("47520.00");
  const expanded = [
    ...prepared.quote.input.items!,
    ...Array.from({ length: 80 }, (_, i) => ({
      ...duplicateDocumentItem(prepared.quote.input.items![i % 20]),
      description: "D".repeat(1000),
    })),
  ];
  const edit = {
    ...prepared.quote.input,
    items: expanded,
    expectedVersion: prepared.quote.version,
    kitDiscountReview: {
      fingerprint: discountReviewFingerprint(expanded, "11880.00"),
    },
  };
  const body = JSON.stringify(edit);
  expect(Buffer.byteLength(body)).toBeGreaterThan(256 * 1024);
  expect(Buffer.byteLength(body)).toBeLessThan(16 * 1024 * 1024);
  session.token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId: f.actor.id,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const response = await PUT(
    new Request(`http://localhost:3000/api/quotes/${prepared.quote.id}`, {
      method: "PUT",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body,
    }),
    { params: Promise.resolve({ id: prepared.quote.id }) },
  );
  expect(response.status).toBe(200);
  const saved = (await response.json()).data;
  expect(saved.input.items).toHaveLength(100);
  expect(
    saved.input.items.filter(
      (i: { catalogOrigin?: unknown }) => i.catalogOrigin,
    ),
  ).toHaveLength(20);
  expect(saved.input.catalogKits.receivedLines[19].answers[7].value).toBe(
    `19-7${"😀".repeat(340)}`,
  );
  expect(saved.input.catalogKits.groups).toHaveLength(20);
});
