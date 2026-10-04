import { expect, it, vi, beforeEach } from "vitest";
import sharp from "sharp";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { tokenHash } from "@/server/auth/session";
import { productInput } from "../fixtures/product";
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
// The Next request context is the only stub; authentication and persistence are real.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (session.token ? { value: session.token } : undefined),
  }),
}));
import { POST, GET } from "@/app/api/products/route";
import { PUT, PATCH } from "@/app/api/products/[id]/route";
import { GET as imageGET } from "@/app/api/products/[id]/image/route";
import { GET as settingsGET } from "@/app/api/settings/route";
setupDatabase();
beforeEach(() => {
  process.env.APP_URL = "http://localhost:3000";
  session.token = undefined;
});
async function form(input: unknown, photo = true) {
  const body = new FormData();
  body.set("data", JSON.stringify(input));
  if (photo) {
    const bytes = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "green" },
    })
      .png()
      .toBuffer();
    body.set(
      "photo:a",
      new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      "photo.png",
    );
  }
  return new Request("http://localhost:3000/api/products", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
    body,
  });
}
it("runs authenticated multipart lifecycle and denies revoked sessions", async () => {
  expect((await POST(await form(productInput))).status).toBe(401);
  const actor = await seedUser("OPERATOR");
  session.token = "a".repeat(64);
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId: actor.id,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  const completeInput = {
    ...productInput,
    description: "ç".repeat(5000),
    specifications: "é".repeat(3000),
    paymentTerms: "à".repeat(1000),
  };
  expect(Buffer.byteLength(JSON.stringify(completeInput))).toBeGreaterThan(16384);
  const response = await POST(await form(completeInput));
  expect(response.status).toBe(200);
  const product = (await response.json()).data;
  expect(product.price).toBe("75.00");
  expect(await db.product.findUnique({ where: { id: product.id } })).toMatchObject({
    description: completeInput.description,
    specifications: completeInput.specifications,
    paymentTerms: completeInput.paymentTerms,
  });
  expect((await settingsGET()).status).toBe(403);
  const context = { params: Promise.resolve({ id: product.id }) };
  const updated = await PUT(
    await form(
      {
        ...completeInput,
        specifications: "ó".repeat(3000),
        images: product.images.map((i: { id: string }) => ({ id: i.id })),
        name: "Atualizado",
        expectedVersion: 1,
      },
      false,
    ),
    context,
  );
  expect(updated.status).toBe(200);
  expect(await db.product.findUnique({ where: { id: product.id } })).toMatchObject({
    description: completeInput.description,
    specifications: "ó".repeat(3000),
    paymentTerms: completeInput.paymentTerms,
  });
  const patch = new Request("http://localhost:3000", {
    method: "PATCH",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify({ active: false, expectedVersion: 2 }),
  });
  expect((await PATCH(patch, context)).status).toBe(200);
  const photo = await imageGET(new Request("http://localhost:3000"), context);
  expect(
    (await sharp(new Uint8Array(await photo.arrayBuffer())).metadata()).format,
  ).toBe("webp");
  session.token = undefined;
  expect(
    (await imageGET(new Request("http://localhost:3000"), context)).status,
  ).toBe(404);
  session.token = "a".repeat(64);
  await db.user.update({ where: { id: actor.id }, data: { active: false } });
  expect((await GET()).status).toBe(401);
  expect((await POST(await form(productInput))).status).toBe(401);
});
