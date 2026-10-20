import { randomBytes } from "node:crypto";
import { seedUser } from "../integration/setup";
import { createProduct } from "@/server/products";
import {
  receiveCatalogRequest,
  requestHash,
} from "@/server/catalog-requests/receive";
import { db } from "@/lib/db";
import { productInput } from "./product";
import { requestSubmission } from "./catalog-request";
import type {
  CatalogLineSnapshot,
  RequestQuoteInput,
} from "@/domain/catalog-requests/types";
export async function createCatalogRequestFixture(consult = false) {
  const actor = await seedUser();
  const product = await createProduct(
    actor,
    {
      ...productInput,
      publicPriceMode: consult ? "CONSULT" : "REFERENCE",
      configuration: {
        formatVersion: 1,
        included: "Uma peça",
        leadTimeCondition: "Após arte",
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
  const browserId = requestHash(randomBytes(32).toString("hex"));
  await db.catalogRequestBrowser.create({
    data: { id: browserId, expiresAt: new Date(Date.now() + 86400000) },
  });
  const payload = {
    ...requestSubmission,
    attemptKey: randomBytes(32).toString("hex"),
    items: ["Ana", "Bia"].map((value, i) => ({
      lineId: `l${i}`,
      productId: product.id,
      quantity: 1,
      answers: [{ fieldId: "name", value }],
      commercialRevision: product.commercialRevision,
      seenPrice: consult
        ? { kind: "CONSULT", unit: null, subtotal: null }
        : { kind: "REFERENCE", unit: "75.00", subtotal: "75.00" },
    })),
  };
  const receipt = await receiveCatalogRequest(payload, browserId);
  const request = await db.catalogRequest.findUniqueOrThrow({
    where: { attemptHash: requestHash(payload.attemptKey) },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  return {
    actor,
    product,
    payload,
    request,
    receipt,
    lines: request.lines.map(
      (l) => l.snapshot as unknown as CatalogLineSnapshot,
    ),
  };
}
export function requestQuoteInput(
  customerId: string,
  lines: CatalogLineSnapshot[],
  expectedVersion = 2,
): RequestQuoteInput {
  return {
    expectedVersion,
    document: {
      customerId,
      validUntil: "2099-12-31",
      discount: "0.00",
      shipping: "0.00",
      paymentTerms: "Pix",
      internalNotes: "",
      items: lines.map((line, i) => ({
        lineId: `q-${i}`,
        productId: line.productId,
        description: `${line.name} — ${line.answerLabels.map((a) => `${a.label}: ${a.valueLabel}`).join("; ")}`,
        quantity: line.quantity,
        unitPrice: line.unitPrice ?? "90.00",
      })),
    },
    sources: lines.map((line, i) => ({
      lineId: `q-${i}`,
      sourceLineId: line.lineId,
      standalone: false,
    })),
  };
}
