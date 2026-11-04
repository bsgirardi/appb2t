import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { lotFixture } from "../fixtures/pricing";
import { calculateV2 } from "@/domain/pricing/calculate";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import { profitabilitySale } from "../fixtures/profitability-db";
import { seedUser } from "./setup";
import { adminPayload } from "../fixtures/profitability";
import { readSaleSources } from "@/server/profitability/sources";
import { saveProfitabilityRevision } from "@/server/profitability/revisions";
export async function fixture(kind: "PRODUCTION" | "OPENING" = "PRODUCTION") {
  const actor = await seedUser();
  const sale = await profitabilitySale(actor.id, kind);
  const input = {
    ...structuredClone(lotFixture),
    quantity: 1,
    materials: [
      {
        ...lotFixture.materials[0],
        consumptionPerUnit: "500",
        fixedWaste: "0",
      },
    ],
    machineFixedMinutes: "60",
    energyRate: "5",
    maintenancePerHour: "5",
    failurePercent: "10",
    setupMinutes: "60",
    finishingMinutesPerUnit: "0",
    laborPerHour: "20",
    printer: { ...lotFixture.printer, watts: "1000" },
    extras: [{ ...lotFixture.extras[0], unitCost: "10" }],
    channel: { ...lotFixture.channel, fixedCost: "0", fees: [] },
  };
  const snapshot = await db.pricingSnapshot.create({
    data: {
      actorId: actor.id,
      actorName: actor.name,
      operationKey: crypto.randomUUID(),
      requestHash: "synthetic-e22",
      input: input as unknown as Prisma.InputJsonValue,
      result: calculateV2(input) as unknown as Prisma.InputJsonValue,
    },
  });
  const revision = await db.documentCostRevision.create({
    data: {
      saleId: sale.saleId,
      revision: 1,
      frozenAt: new Date(),
      bindings: [
        {
          lineId: "line1",
          snapshotId: snapshot.id,
          state: "VALID",
          fingerprint: lineFingerprint({
            description: "Peça",
            quantity: 1,
            unitPrice: "200",
          }),
        },
      ],
    },
  });
  await db.sale.update({
    where: { id: sale.saleId },
    data: { costRevisionId: revision.id },
  });
  async function review(
    kind: "U3_SOURCE" | "COMPLEMENT" | "NOT_OCCURRED" = "NOT_OCCURRED",
    version = 0,
  ) {
    const [source] = await db.$transaction((tx) =>
      readSaleSources(tx, [sale.saleId]),
    );
    const payload = adminPayload();
    payload.expectedShipping =
      payload.shipping =
      payload.fees =
        { state: "DECLARED", value: "0" };
    payload.lineReviews = [
      {
        lineKey: "line1",
        sourceHash: source.lines[0].sourceHash,
        complete: true,
      },
    ];
    const common = { lineKey: "line1", extraKey: `${snapshot.id}:0` };
    if (kind === "U3_SOURCE")
      payload.confirmations = [
        { ...common, kind, sourceId: sale.deliveryLineId, value: "10" },
      ];
    if (kind === "NOT_OCCURRED")
      payload.confirmations = [
        { ...common, kind, reason: "Extra não ocorreu" },
      ];
    if (kind === "COMPLEMENT") {
      payload.extras = [
        {
          id: "synthetic-complement",
          lineKey: "line1",
          reference: "Embalagem",
          description: "Extra externo",
          value: "10",
          effectiveDate: "2026-10-30",
          notInProduction: true,
        },
      ];
      payload.confirmations = [
        { ...common, kind, complementId: "synthetic-complement" },
      ];
    }
    return saveProfitabilityRevision(actor, {
      saleId: sale.saleId,
      expectedVersion: version,
      operationKey: crypto.randomUUID(),
      effectiveDate: "2026-10-30",
      reason: "Conferência sintética E22",
      payload,
    });
  }
  return { ...sale, actor, snapshot, review };
}
