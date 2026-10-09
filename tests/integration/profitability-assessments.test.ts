import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { profitabilitySale } from "../fixtures/profitability-db";
import { meta, date } from "../fixtures/production";
import { adminPayload } from "../fixtures/profitability";
import { readSaleSources } from "@/server/profitability/sources";
import { saveProfitabilityRevision } from "@/server/profitability/revisions";
import {
  recordAssessment,
  getAssessment,
} from "@/server/profitability/assessments";
import { calculateSale } from "@/domain/profitability/calculate";
setupDatabase();
it("refuses stale confirmations and duplicate portions of a productive source", async () => {
  const a = await seedUser("ADMIN"),
    s = await profitabilitySale(a.id);
  const payload = adminPayload();
  payload.lineReviews = [
    { lineKey: "line1", sourceHash: "stale", complete: true },
  ];
  await expect(
    saveProfitabilityRevision(a, {
      ...meta(),
      saleId: s.saleId,
      effectiveDate: date(),
      reason: "Conferência final",
      payload,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  payload.lineReviews = [];
  payload.confirmations = [
    {
      lineKey: "line1",
      extraKey: "unknown",
      kind: "U3_SOURCE",
      sourceId: s.deliveryLineId,
      value: "86",
    },
  ];
  await expect(
    saveProfitabilityRevision(a, {
      ...meta(),
      saleId: s.saleId,
      effectiveDate: date(),
      reason: "Conferência final",
      payload,
    }),
  ).rejects.toThrow();
});
it("saves reproducible assessments without modifying commercial facts", async () => {
  const a = await seedUser("ADMIN"),
    s = await profitabilitySale(a.id);
  const [source] = await db.$transaction((tx) =>
    readSaleSources(tx, [s.saleId]),
  );
  const payload = {
    ...adminPayload(),
    fees: { state: "DECLARED" as const, value: "10" },
    shipping: { state: "DECLARED" as const, value: "20" },
    lineReviews: [
      {
        lineKey: "line1",
        sourceHash: source.lines[0].sourceHash,
        complete: true,
      },
    ],
  };
  await saveProfitabilityRevision(a, {
    ...meta(),
    saleId: s.saleId,
    effectiveDate: date(),
    reason: "Conferência final",
    payload,
  });
  const before = await db.sale.findUnique({
    where: { id: s.saleId },
    include: { items: true, installments: true },
  });
  const saved = await recordAssessment(a, {
    saleId: s.saleId,
    operationKey: crypto.randomUUID(),
  });
  expect(saved.result.actual.contribution.value).toBe("90");
  expect(calculateSale(saved.input)).toEqual(saved.result);
  expect(
    (
      await recordAssessment(a, {
        saleId: s.saleId,
        operationKey: crypto.randomUUID(),
      })
    ).id,
  ).toBe(saved.id);
  await db.productionEvent.update({
    where: { id: s.eventId },
    data: { materialComplete: false },
  });
  const revised = await recordAssessment(a, {
    saleId: s.saleId,
    operationKey: crypto.randomUUID(),
  });
  expect(revised.result.actual.contribution.value).toBeNull();
  expect(revised.id).not.toBe(saved.id);
  expect(await getAssessment(a, saved.id)).toEqual(saved);
  expect(
    await db.sale.findUnique({
      where: { id: s.saleId },
      include: { items: true, installments: true },
    }),
  ).toEqual(before);
});
