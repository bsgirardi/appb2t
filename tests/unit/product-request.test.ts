import { expect, it } from "vitest";
import { readProductRequest } from "@/lib/product-request";
import { productSchema } from "@/domain/products/validation";
import { productInput } from "../fixtures/product";
const origin = "http://localhost:3000";
async function request(data: FormData, source = origin) {
  process.env.APP_URL = origin;
  // Encode before reading/cancelling the request so Node 24's multipart
  // producer cannot enqueue into an already cancelled stream. Keep the same
  // multipart bytes and intentionally omit Content-Length for the limit tests.
  const encoded = new Response(data);
  const bytes = await encoded.arrayBuffer();
  return new Request(origin, {
    method: "POST",
    headers: {
      origin: source,
      "content-type": encoded.headers.get("content-type")!,
    },
    body: bytes,
  });
}
it("reads data without requiring replacement photo", async () => {
  const data = new FormData();
  data.set("data", '{"name":"Peça"}');
  expect(await readProductRequest(await request(data))).toEqual({
    input: { name: "Peça" },
    uploads: {},
  });
});
it("accepts complete valid commercial text beyond the former 16 KiB limit", async () => {
  const input = productSchema.parse({
    ...productInput,
    description: "ç".repeat(5000),
    specifications: "é".repeat(3000),
    paymentTerms: "à".repeat(1000),
    shortDescription: "ó".repeat(240),
    seoTitle: "á".repeat(70),
    seoDescription: "ã".repeat(170),
    colors: Array.from({ length: 30 }, (_, i) => `${i}-${"ç".repeat(55)}`),
    sizes: Array.from({ length: 30 }, (_, i) => `${i}-${"é".repeat(55)}`),
  });
  const json = JSON.stringify(input);
  expect(Buffer.byteLength(json)).toBeGreaterThan(16 * 1024);
  const data = new FormData();
  data.set("data", json);
  expect((await readProductRequest(await request(data))).input).toEqual(input);
});
it("still rejects product data above 256 KiB without a Content-Length", async () => {
  const data = new FormData();
  data.set("data", JSON.stringify({ description: "ç".repeat(128 * 1024) }));
  await expect(readProductRequest(await request(data))).rejects.toMatchObject({
    code: "VALIDATION",
  });
});
it("rejects foreign origin, malformed JSON and unexpected fields", async () => {
  const data = new FormData();
  data.set("data", "{}");
  await expect(
    readProductRequest(await request(data, "https://evil.test")),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  data.set("data", "invalid");
  await expect(readProductRequest(await request(data))).rejects.toMatchObject({
    code: "VALIDATION",
  });
  data.set("data", "{}");
  data.set("extra", "value");
  await expect(readProductRequest(await request(data))).rejects.toMatchObject({
    code: "VALIDATION",
  });
});
it("limits bytes even without Content-Length", async () => {
  const data = new FormData();
  data.set("data", "{}");
  data.set(
    "photo:a",
    new Blob([new Uint8Array(53 * 1024 * 1024)]),
    "large.png",
  );
  await expect(readProductRequest(await request(data))).rejects.toMatchObject({
    code: "VALIDATION",
  });
});
