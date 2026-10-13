import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { planningFixture, planningMeta } from "../fixtures/planning";
import {
  saveBatch,
  confirmBatch,
  scheduleBatch,
} from "@/server/planning/batches";
import { setBatchCoverage } from "@/server/planning/materials";
setupDatabase();
export const batchInput = (
  f: Awaited<ReturnType<typeof planningFixture>>,
  units = 6,
) => ({
  printerId: f.printer.id,
  participants: [{ lineId: f.order.lines[0].id, units }],
  materialItemId: f.material.id,
  colorLabel: "Azul",
  profileConfirmed: true,
  fitConfirmed: true,
  durationMinutes: "120",
  durationConfirmed: true,
  prepareMinutes: "5",
  removeMinutes: "10",
});
it("claims pieces only on confirmation and rejects concurrent excess", async () => {
  const f = await planningFixture(),
    a = await saveBatch(f.actor, {
      ...(await planningMeta()),
      ...batchInput(f),
    }),
    b = await saveBatch(f.actor, {
      ...(await planningMeta()),
      ...batchInput(f),
    });
  expect(a.state).toBe("DRAFT");
  const meta = await planningMeta(1);
  const results = await Promise.allSettled([
    confirmBatch(f.actor, { ...meta, batchId: a.id }),
    confirmBatch(f.actor, {
      ...meta,
      operationKey: crypto.randomUUID(),
      batchId: b.id,
    }),
  ]);
  expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  await expect(
    confirmBatch(f.actor, { ...(await planningMeta(1)), batchId: b.id }),
  ).rejects.toThrow();
});
it("requires reviewed color and reserved material without creating consumption or billing", async () => {
  const f = await planningFixture();
  let b = await saveBatch(f.actor, {
    ...(await planningMeta()),
    ...batchInput(f),
  });
  b = await confirmBatch(f.actor, {
    ...(await planningMeta(b.version)),
    batchId: b.id,
  });
  await expect(
    scheduleBatch(f.actor, {
      ...(await planningMeta(b.version)),
      batchId: b.id,
    }),
  ).rejects.toThrow();
  b = await setBatchCoverage(f.actor, {
    ...(await planningMeta(b.version)),
    batchId: b.id,
    colorAvailabilityConfirmed: true,
    needs: [{ participationId: b.participants[0].id, quantity: "70" }],
    allocations: [
      {
        participationId: b.participants[0].id,
        allocationId: f.allocation.id,
        quantity: "70",
      },
    ],
  });
  const before = [
    await db.stockMovement.count(),
    await db.productionEvent.count(),
    await db.financialEntry.count(),
  ];
  b = await scheduleBatch(f.actor, {
    ...(await planningMeta(b.version)),
    batchId: b.id,
  });
  expect(b.state).toBe("SCHEDULED");
  expect([
    await db.stockMovement.count(),
    await db.productionEvent.count(),
    await db.financialEntry.count(),
  ]).toEqual(before);
  const c = await saveBatch(f.actor, {
    ...(await planningMeta()),
    ...batchInput(f, 4),
  });
  const confirmed = await confirmBatch(f.actor, {
    ...(await planningMeta(c.version)),
    batchId: c.id,
  });
  await expect(
    setBatchCoverage(f.actor, {
      ...(await planningMeta(confirmed.version)),
      batchId: c.id,
      colorAvailabilityConfirmed: true,
      needs: [
        { participationId: confirmed.participants[0].id, quantity: "50" },
      ],
      allocations: [
        {
          participationId: confirmed.participants[0].id,
          allocationId: f.allocation.id,
          quantity: "50",
        },
      ],
    }),
  ).rejects.toThrow();
});
it("invalidates sliced time after composition changes and protects retries", async () => {
  const f = await planningFixture(),
    payload = { ...(await planningMeta()), ...batchInput(f) };
  let b = await saveBatch(f.actor, payload);
  expect(await saveBatch(f.actor, payload)).toEqual(b);
  await expect(
    saveBatch(f.actor, { ...payload, colorLabel: "Vermelho" }),
  ).rejects.toThrow();
  b = await saveBatch(f.actor, {
    ...(await planningMeta(b.version)),
    ...batchInput(f, 5),
    id: b.id,
  });
  expect(b.durationConfirmedAt).toBeNull();
  expect(b.state).toBe("DRAFT");
});
it("projects only operational U1 time without multiplying fixed preparation by pieces", async () => {
  const f = await planningFixture();
  const snap = await db.pricingSnapshot.create({
    data: {
      actorId: f.actor.id,
      actorName: f.actor.name,
      operationKey: crypto.randomUUID(),
      requestHash: "test",
      input: {
        version: 2,
        quantity: 10,
        machineFixedMinutes: "30",
        machineMinutesPerUnit: "5",
        informedUnitPrice: "999",
      },
      result: { contribution: "888" },
    },
  });
  const revision = await db.documentCostRevision.create({
    data: {
      saleId: f.sale.id,
      revision: 1,
      bindings: [
        {
          lineId: "line1",
          snapshotId: snap.id,
          state: "VALID",
          fingerprint: "test",
        },
      ],
    },
  });
  await db.sale.update({
    where: { id: f.sale.id },
    data: { costRevisionId: revision.id },
  });
  const b = await saveBatch(f.actor, {
    ...(await planningMeta()),
    ...batchInput(f, 6),
  });
  expect(b.estimates).toEqual([
    {
      lineId: f.order.lines[0].id,
      snapshotId: snap.id,
      sourceQuantity: 10,
      units: 6,
      minutes: "60",
    },
  ]);
  expect(JSON.stringify(b)).not.toContain("999");
  expect(JSON.stringify(b)).not.toContain("contribution");
});
