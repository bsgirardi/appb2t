import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { checkoutFixture } from "../fixtures/checkout";
import { db } from "@/lib/db";
import { prepareCheckout, confirmCheckout } from "@/server/checkout/confirm";
setupDatabase();
async function session() {
  const s = await db.checkoutSession.create({
    data: { id: "s1", expiresAt: new Date(Date.now() + 86400000) },
  });
  return { sessionId: s.id, checkoutId: null };
}
it("confirms a direct purchase exactly once and recovers the original result after catalog changes", async () => {
  const { draft, product } = await checkoutFixture();
  const principal = await session();
  const review = await prepareCheckout(principal, draft, "a".repeat(64));
  expect(await db.customer.count()).toBe(0);
  expect(await db.sale.count()).toBe(0);
  const input = {
    operationKey: "b".repeat(64),
    expectedVersion: review.version,
    fingerprint: review.fingerprint,
    name: "Ana",
    agreed: true as const,
  };
  const [a, b] = await Promise.all([
    confirmCheckout(principal, input),
    confirmCheckout(principal, input),
  ]);
  expect(a).toEqual(b);
  expect(await db.sale.count()).toBe(1);
  expect(await db.financialEntry.count()).toBe(1);
  await db.product.update({
    where: { id: product.id },
    data: { price: "100.00", commercialRevision: { increment: 1 } },
  });
  expect(await confirmCheckout(principal, input)).toEqual(a);
  await expect(
    confirmCheckout(principal, { ...input, name: "Bia" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.stockReservation.count()).toBe(0);
});
it("sends review requests without customer, sale or receivable and rejects changed direct prices", async () => {
  const { draft, product } = await checkoutFixture(false);
  const principal = await session();
  const review = await prepareCheckout(principal, draft, "a".repeat(64));
  expect(review.route).toBe("REVIEW");
  const input = {
    operationKey: "b".repeat(64),
    expectedVersion: review.version,
    fingerprint: review.fingerprint,
    name: "Ana",
    agreed: true as const,
  };
  expect((await confirmCheckout(principal, input)).state).toBe("REVIEW");
  expect(await db.customer.count()).toBe(0);
  expect(await db.sale.count()).toBe(0);
  expect(await db.catalogRequest.count()).toBe(1);
  await db.product.update({
    where: { id: product.id },
    data: { price: "100.00", commercialRevision: { increment: 1 } },
  });
  expect((await confirmCheckout(principal, input)).state).toBe("REVIEW");
});
it("rejects an altered price between review and confirmation without residual commercial records", async () => {
  const { draft, product } = await checkoutFixture();
  const principal = await session();
  const review = await prepareCheckout(principal, draft, "a".repeat(64));
  await db.product.update({
    where: { id: product.id },
    data: { price: "100.00", commercialRevision: { increment: 1 } },
  });
  await expect(
    confirmCheckout(principal, {
      operationKey: "b".repeat(64),
      expectedVersion: review.version,
      fingerprint: review.fingerprint,
      name: "Ana",
      agreed: true,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.sale.count()).toBe(0);
  expect(await db.customer.count()).toBe(0);
});
