import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { product, meta, date } from "../fixtures/production";
import {
  saveFinishedStock,
  openFinishedStock,
} from "@/server/production/finished-stock";
setupDatabase();
it("retries opening once and rejects payload changes and inactive actors", async () => {
  const a = await seedUser(),
    p = await product();
  const s = await saveFinishedStock(a, {
    ...meta(),
    productId: p.id,
    active: true,
  });
  const input = {
    ...meta(s.version),
    stockId: s.id,
    units: 8,
    value: null,
    effectiveDate: date(),
  };
  const [x, y] = await Promise.all([
    openFinishedStock(a, input),
    openFinishedStock(a, input),
  ]);
  expect(x).toEqual(y);
  expect(await db.finishedMovement.count()).toBe(1);
  await expect(
    openFinishedStock(a, { ...input, units: 9 }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await db.user.update({ where: { id: a.id }, data: { active: false } });
  await expect(openFinishedStock(a, input)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

it("uses current permissions for replay and never returns costs to an operator", async () => {
  const { sale } = await import("../fixtures/production");
  const { saveOrder, releaseOrder } =
    await import("@/server/production/orders");
  const { getOrder } = await import("@/server/production/queries");
  const a = await seedUser(),
    s = await sale();
  const payload = {
    ...meta(),
    origin: "SALE",
    saleId: s.id,
    lines: [
      {
        saleLineKey: "line1",
        description: "Peça",
        technology: "FDM",
        targetUnits: 1,
      },
    ],
  };
  const draft = await saveOrder(a, payload);
  await releaseOrder(a, { ...meta(draft.version), orderId: draft.id });
  const p = await product(),
    stock = await saveFinishedStock(a, { ...meta(), productId: p.id });
  const opening = {
    ...meta(stock.version),
    stockId: stock.id,
    units: 1,
    value: "99",
    effectiveDate: date(),
  };
  await openFinishedStock(a, opening);
  const op = await db.user.update({
    where: { id: a.id },
    data: { role: "OPERATOR" },
  });
  const detail = await getOrder(op, draft.id),
    replay = await saveOrder(op, payload);
  for (const response of [detail, replay])
    expect(JSON.stringify(response)).not.toMatch(
      /"(?:cost|premises|unitCost|initialValue|total|knownTotal|manualUnitCost)"/,
    );
  await expect(openFinishedStock(op, opening)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(getOrder(a, draft.id)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
