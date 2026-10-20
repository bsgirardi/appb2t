import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { POST as initialize } from "@/app/api/portfolio/requests/browser/route";
import { POST as submit } from "@/app/api/portfolio/requests/route";
import { POST as recover } from "@/app/api/portfolio/requests/receipt/route";
import { createProduct } from "@/server/products";
import { productInput } from "../fixtures/product";
import { requestSubmission } from "../fixtures/catalog-request";
setupDatabase();
const request = (
  body: unknown,
  cookie = "",
  origin = "http://localhost:3000",
) =>
  new Request("http://localhost:3000/api/portfolio/requests", {
    method: "POST",
    headers: { origin, cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
it("initializes a server-issued HttpOnly browser and accepts only that cookie", async () => {
  const first = await initialize(request({}));
  const setCookie = first.headers.get("set-cookie")!;
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("SameSite=lax");
  const cookie = setCookie.split(";")[0];
  expect(
    (await initialize(request({}, cookie))).headers.get("set-cookie"),
  ).toBeNull();
  expect((await submit(request(requestSubmission))).status).toBe(403);
  expect(
    (
      await submit(
        request(requestSubmission, `b2t_request_browser=${"b".repeat(64)}`),
      )
    ).status,
  ).toBe(403);
  expect(
    (await submit(request({ ...requestSubmission, items: [] }, cookie))).status,
  ).toBe(422);
});
it("returns only private-key authorized receipt data without contact and refuses protocol lookup", async () => {
  const actor = await seedUser();
  const product = await createProduct(actor, productInput, {
    a: { bytes: new Uint8Array([1, 2]), mimeType: "image/webp" },
  });
  const cookie = (await initialize(request({}))).headers
    .get("set-cookie")!
    .split(";")[0];
  const payload = {
    ...requestSubmission,
    items: [
      {
        ...requestSubmission.items[0],
        productId: product.id,
        commercialRevision: product.commercialRevision,
        seenPrice: { kind: "REFERENCE", unit: "75.00", subtotal: "75.00" },
      },
    ],
  };
  const response = await submit(request(payload, cookie));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const receipt = (await response.json()).data;
  expect(Object.keys(receipt).sort()).toEqual([
    "acceptedAt",
    "protocol",
    "received",
  ]);
  expect(
    (await (await recover(request({ attemptKey: payload.attemptKey }))).json())
      .data,
  ).toEqual(receipt);
  expect((await recover(request({ protocol: receipt.protocol }))).status).toBe(
    422,
  );
  expect(
    (await (await recover(request({ attemptKey: "c".repeat(64) }))).json())
      .data,
  ).toBeNull();
});
it("enforces origin, JSON, strict receipt shape and stream byte limit", async () => {
  expect(
    (await initialize(request({}, "", "https://other.example"))).status,
  ).toBe(403);
  expect(
    (
      await submit(
        new Request("http://localhost:3000/api/portfolio/requests", {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
          body: "x",
        }),
      )
    ).status,
  ).toBe(422);
  expect(
    (await recover(request({ attemptKey: "a".repeat(64), name: "private" })))
      .status,
  ).toBe(422);
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(
        new TextEncoder().encode(
          JSON.stringify({ padding: "x".repeat(262145) }),
        ),
      );
      c.close();
    },
  });
  const oversized = new Request(
    "http://localhost:3000/api/portfolio/requests",
    {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" },
  );
  expect((await submit(oversized)).status).toBe(422);
});
