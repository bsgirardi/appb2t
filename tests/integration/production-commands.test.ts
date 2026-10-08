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
