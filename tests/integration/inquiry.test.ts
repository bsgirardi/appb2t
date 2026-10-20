import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  createProduct,
  updateProduct,
  setProductActive,
} from "@/server/products";
import { reviewInquiry } from "@/server/inquiry";
import { saveAppearance } from "@/server/appearance";
import { defaultAppearance } from "@/domain/appearance/validation";
import { productInput } from "../fixtures/product";
import { db } from "@/lib/db";
import { POST } from "@/app/api/portfolio/inquiry/route";
setupDatabase();
const uploads = {
  a: { bytes: new Uint8Array([1, 2]), mimeType: "image/webp" as const },
};
it("uses current prices, preserves variants and prepares one contact without creating commercial records", async () => {
  const actor = await seedUser();
  await saveAppearance(actor, {
    ...defaultAppearance,
    phone: "11999999999",
    expectedVersion: 0,
  });
  const product = await createProduct(
    actor,
    {
      ...productInput,
      price: "0.10",
      sku: "PLA-01",
      colors: ["Azul", "Branco"],
      sizes: ["P"],
    },
    uploads,
  );
  const items = [
    { productId: product.id, color: "Azul", size: "P", quantity: 3 },
    { productId: product.id, color: "Branco", size: "P", quantity: 2 },
  ];
  const firstReview = await reviewInquiry({ items });
  expect(firstReview.ready).toBe(false);
  const confirmed = firstReview.lines.map((l) => ({
    ...items[firstReview.lines.indexOf(l)],
    commercialRevision: l.currentRevision,
    seenPrice: l.configuredPrice,
  }));
  const first = await reviewInquiry({ items: confirmed });
  expect(first).toMatchObject({
    total: "0.50",
    ready: true,
    channel: "whatsapp",
  });
  expect(first.lines[0].imageUrl).toBe(`/api/products/${product.id}/image`);
  expect(first.message).toContain("Cor: Azul");
  expect(first.message).toContain("Cor: Branco");
  expect(first.message).toContain("PLA-01");
  expect(new URL(first.contact!).searchParams.get("text")).toBe(first.message);
  expect(first.lines[0]).not.toHaveProperty("calculation");
  await updateProduct(actor, product.id, {
    ...productInput,
    price: "10.25",
    images: product.images.map((i) => ({ id: i.id })),
    expectedVersion: product.version,
  });
  expect((await reviewInquiry({ items })).total).toBe("51.25");
  expect(await db.quote.count()).toBe(0);
  expect(await db.sale.count()).toBe(0);
});
it("blocks removed options and unavailable products without exposing inactive product names", async () => {
  const actor = await seedUser();
  const product = await createProduct(
    actor,
    { ...productInput, colors: ["Azul"], availability: "UNAVAILABLE" },
    uploads,
  );
  const input = {
    items: [{ productId: product.id, color: "Azul", quantity: 1 }],
  };
  expect(await reviewInquiry(input)).toMatchObject({
    ready: false,
    contact: null,
    message: "",
    total: "0.00",
  });
  const updated = await updateProduct(actor, product.id, {
    ...productInput,
    colors: ["Branco"],
    availability: "AVAILABLE",
    images: product.images.map((i) => ({ id: i.id })),
    expectedVersion: product.version,
  });
  expect((await reviewInquiry(input)).lines[0].problem).toContain("opções");
  await setProductActive(actor, product.id, false, updated.version);
  const hidden = await reviewInquiry(input);
  expect(hidden.lines[0]).toMatchObject({
    name: "Produto não disponível",
    path: null,
    imageUrl: null,
    price: null,
    sku: "",
  });
  expect(hidden.message).toBe("");
});
it("validates the public endpoint boundary and rejects client-supplied prices", async () => {
  const request = (body: unknown, origin = "http://localhost:3000") =>
    new Request("http://localhost:3000/api/portfolio/inquiry", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  expect((await POST(request({ items: [] }))).status).toBe(200);
  expect(
    (await POST(request({ items: [] }, "https://other.example"))).status,
  ).toBe(403);
  expect(
    (
      await POST(
        request({ items: [{ productId: "x", quantity: 1, price: "0.01" }] }),
      )
    ).status,
  ).toBe(422);
  expect(
    (
      await POST(
        request({
          items: Array.from({ length: 21 }, (_, i) => ({
            productId: String(i),
            quantity: 1,
          })),
        }),
      )
    ).status,
  ).toBe(422);
  expect(
    (await POST(request({ items: [{ productId: "x", quantity: -1 }] }))).status,
  ).toBe(422);
});
it("accepts bounded configured payloads above the old 16KiB cap and rejects oversized streaming requests", async () => {
  const body = {
    items: Array.from({ length: 20 }, (_, i) => ({
      lineId: `l${i}`,
      productId: `missing-${i}`,
      quantity: 1,
      answerLabels: Array.from({ length: 8 }, (_, j) => ({
        fieldId: `f${j}`,
        label: "Resposta antiga",
        valueLabel: "á".repeat(500),
      })),
    })),
  };
  const request = new Request("http://localhost:3000/api/portfolio/inquiry", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  expect((await POST(request)).status).toBe(200);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          JSON.stringify({ padding: "x".repeat(262145) }),
        ),
      );
      controller.close();
    },
  });
  const oversized = new Request("http://localhost:3000/api/portfolio/inquiry", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  const response = await POST(oversized);
  expect(response.status).toBe(422);
  expect((await response.json()).error.message).toContain("muito grande");
});
