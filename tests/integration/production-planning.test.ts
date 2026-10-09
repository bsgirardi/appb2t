import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { meta, sale } from "../fixtures/production";
import {
  saveOrder,
  releaseOrder,
  updateOrderPlanning,
} from "@/server/production/orders";
setupDatabase();
it("updates planning with immutable history without changing targets or actual reports", async () => {
  const a = await seedUser(),
    s = await sale();
  let o = await saveOrder(a, {
    ...meta(),
    origin: "SALE",
    saleId: s.id,
    lines: [
      {
        saleLineKey: "line1",
        description: "Avulsa",
        technology: "FDM",
        targetUnits: 10,
      },
    ],
  });
  o = await releaseOrder(a, { ...meta(o.version), orderId: o.id });
  const input = {
    ...meta(o.version),
    orderId: o.id,
    responsibleId: a.id,
    dueDate: "2026-12-20",
    notes: "Novo planejamento",
    lines: [{ lineId: o.lines[0].id, plannedPrinterId: null }],
    reason: "Reorganização da equipe",
  };
  const updated = await updateOrderPlanning(a, input);
  expect(updated).toMatchObject({
    responsibleId: a.id,
    dueDate: "2026-12-20",
    notes: "Novo planejamento",
  });
  expect(updated.lines[0].targetUnits).toBe(10);
  expect(await updateOrderPlanning(a, input)).toEqual(updated);
  const events = await db.productionEvent.findMany({
    where: { lineId: o.lines[0].id },
  });
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    kind: "UPDATE",
    goodUnits: 0,
    reason: input.reason,
  });
  await expect(
    updateOrderPlanning(a, {
      ...input,
      ...meta(o.version),
      notes: "Concorrente",
    }),
  ).rejects.toThrow();
});
