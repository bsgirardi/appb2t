import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { checkoutFixture } from "../fixtures/checkout";
import { db } from "@/lib/db";
import { prepareCheckout, confirmCheckout } from "@/server/checkout/confirm";
import {
  requestCheckoutCancellation,
  resolveCheckoutCancellation,
} from "@/server/checkout/cancellations";
setupDatabase();
it("keeps a cancellation as a request until the team cancels the existing sale", async () => {
  const { actor, draft } = await checkoutFixture();
  await db.checkoutSession.create({
    data: { id: "s", expiresAt: new Date(Date.now() + 86400000) },
  });
  const p = { sessionId: "s", checkoutId: null };
  const r = await prepareCheckout(p, draft, "a".repeat(64));
  const receipt = await confirmCheckout(p, {
    operationKey: "b".repeat(64),
    expectedVersion: r.version,
    fingerprint: r.fingerprint,
    name: "Ana",
    agreed: true,
  });
  const requested = await requestCheckoutCancellation(
    p,
    "Não preciso mais",
    "c".repeat(64),
  );
  expect(requested.cancellation?.state).toBe("PENDING");
  expect((await db.sale.findFirstOrThrow()).status).toBe("CONFIRMADA");
  await requestCheckoutCancellation(p, "Não preciso mais", "d".repeat(64));
  expect(await db.checkoutCancellation.count()).toBe(1);
  const c = await db.checkout.findUniqueOrThrow({
    where: { id: receipt.checkoutId },
  });
  const resolved = await resolveCheckoutCancellation(
    actor,
    c.id,
    c.version,
    "COMPLETE",
    "Conferido pela equipe",
  );
  expect(resolved.cancellation?.state).toBe("COMPLETED");
  expect((await db.sale.findFirstOrThrow()).status).toBe("CANCELADA");
  expect(
    (await db.financialEntry.findFirstOrThrow()).canceledAt,
  ).not.toBeNull();
});
