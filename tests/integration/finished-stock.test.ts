import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { product, meta, date } from "../fixtures/production";
import {
  saveFinishedStock,
  openFinishedStock,
  adjustFinishedStock,
} from "@/server/production/finished-stock";
setupDatabase();
it("requires a real opening count and preserves unknown opening cost", async () => {
  const a = await seedUser(),
    p = await product();
  const s = await saveFinishedStock(a, {
    ...meta(),
    productId: p.id,
    active: true,
  });
  expect(s.inventoriedAt).toBeNull();
  const opened = await openFinishedStock(a, {
    ...meta(s.version),
    stockId: s.id,
    units: 8,
    value: null,
    effectiveDate: date(),
  });
  expect(opened.physical).toBe("8");
  expect((await db.finishedOrigin.findFirstOrThrow()).initialValue).toBeNull();
  await expect(
    adjustFinishedStock(a, {
      ...meta(opened.version),
      stockId: s.id,
      deltaUnits: -9,
      effectiveDate: date(),
      reason: "Contagem",
    }),
  ).rejects.toThrow();
  expect(await db.finishedMovement.count()).toBe(1);
});
it("reserves inventory configuration and count to admin", async () => {
  const op = await seedUser("OPERATOR"),
    p = await product();
  await expect(
    saveFinishedStock(op, { ...meta(), productId: p.id, active: true }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  const a = await seedUser("ADMIN", "other@example.test");
  const s = await saveFinishedStock(a, {
    ...meta(),
    productId: p.id,
    active: true,
  });
  await expect(
    openFinishedStock(op, {
      ...meta(s.version),
      stockId: s.id,
      units: 0,
      value: null,
      effectiveDate: date(),
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  const o = await openFinishedStock(a, {
    ...meta(s.version),
    stockId: s.id,
    units: 0,
    value: null,
    effectiveDate: date(),
  });
  expect(o.inventoriedAt).not.toBeNull();
  expect(o.physical).toBe("0");
});
