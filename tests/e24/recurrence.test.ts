import { Prisma } from "@prisma/client";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { getProductiveRecurrence } from "@/server/profitability/recurrence";
import { calculateV2 } from "@/domain/pricing/calculate";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import { readSaleSources } from "@/server/profitability/sources";
import { recordAssessment } from "@/server/profitability/assessments";
import { saveProfitabilityRevision } from "@/server/profitability/revisions";
import { profitabilitySale } from "../fixtures/profitability-db";
import { adminPayload } from "../fixtures/profitability";
import { lotFixture } from "../fixtures/pricing";
import { assertE24DatabaseUrl } from "./database";
import { readyFixture, key } from "../e22/consignment-fixtures";
import { executeCustodyCommand } from "@/server/consignment/custody";
import { renderToStaticMarkup } from "react-dom/server";
import ProfitabilityPage from "@/app/(private)/rentabilidade/page";
const pageIdentity = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/server/auth/guards", () => ({
  requireAdmin: async () => pageIdentity.value,
}));

beforeEach(async () => {
  assertE24DatabaseUrl(process.env.DATABASE_URL ?? "");
  const tables = await db.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => '"' + t.tablename.replaceAll('"', '""') + '"').join(",")} CASCADE`,
  );
  await db.financialCategory.create({
    data: {
      id: "system-sale-revenue",
      name: "Receita",
      kind: "REVENUE",
      systemCode: "SALE_REVENUE",
    },
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-07T02:59:59.999Z"));
});
afterEach(() => vi.useRealTimers());
afterAll(() => db.$disconnect());

async function population() {
  const actor = await db.user.create({
    data: {
      name: "Sintético E24",
      email: "e24@example.test",
      role: "ADMIN",
      passwordHash: "not-an-operational-login",
    },
  });
  const product = await db.product.create({
    data: {
      name: "Peça sintética",
      description: "Teste",
      paymentTerms: "Teste",
      price: "200",
      calculation: {},
    },
  });
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
    machineMinutesPerUnit: "0",
    energyRate: "0",
    maintenancePerHour: "0",
    failurePercent: "0",
    setupMinutes: "0",
    finishingMinutesPerUnit: "0",
    laborPerHour: "0",
    extras: [],
    channel: { ...lotFixture.channel, fixedCost: "0", fees: [] },
  };
  const snapshot = await db.pricingSnapshot.create({
    data: {
      actorId: actor.id,
      actorName: actor.name,
      operationKey: crypto.randomUUID(),
      requestHash: "e24",
      input: input as Prisma.InputJsonValue,
      result: calculateV2(input) as unknown as Prisma.InputJsonValue,
    },
  });
  const sales = [];
  for (let i = 0; i < 5; i++) {
    const s = await profitabilitySale(actor.id);
    await db.saleItem.updateMany({
      where: { saleId: s.saleId },
      data: { productId: product.id },
    });
    if (i > 2) {
      const event = await db.productionEvent.findUniqueOrThrow({
        where: { id: s.eventId },
      });
      const premises = event.premises as Prisma.JsonObject;
      premises.settings = {
        values: {
          energyRate: "0",
          maintenancePerHour: "0",
          laborPerHour: "50",
        },
      };
      await db.productionEvent.update({
        where: { id: s.eventId },
        data: { premises: premises as Prisma.InputJsonValue },
      });
    }
    const revision = await db.documentCostRevision.create({
      data: {
        saleId: s.saleId,
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
              productId: product.id,
            }),
          },
        ],
      },
    });
    await db.sale.update({
      where: { id: s.saleId },
      data: { costRevisionId: revision.id },
    });
    async function review(version = 0) {
      const [source] = await db.$transaction((tx) =>
        readSaleSources(tx, [s.saleId]),
      );
      const payload = adminPayload();
      payload.lineReviews = [
        {
          lineKey: "line1",
          sourceHash: source.lines[0].sourceHash,
          complete: true,
        },
      ];
      await saveProfitabilityRevision(actor, {
        saleId: s.saleId,
        expectedVersion: version,
        operationKey: crypto.randomUUID(),
        effectiveDate: "2026-11-06",
        reason: "Conferência sintética",
        payload,
      });
    }
    await review();
    sales.push({ ...s, review });
  }
  return { actor, product, snapshot, sales };
}

it("reads the complete 90-day population under READ ONLY without changing history or cost revisions", async () => {
  const f = await population();
  await recordAssessment(f.actor, {
    saleId: f.sales[0].saleId,
    operationKey: crypto.randomUUID(),
  });
  const historical = await db.profitabilityAssessment.findMany();
  const before = await db.profitabilityRevision.findMany({
    orderBy: { id: "asc" },
  });
  const result = await getProductiveRecurrence(f.actor);
  expect(result.period).toEqual({ from: "2026-08-09", to: "2026-11-06" });
  expect(result.groups[0]).toMatchObject({
    eligibleCount: 5,
    materialCount: 3,
    suggestReview: true,
  });
  expect(
    result.groups[0].evidence.find((e) => e.saleId === f.sales[4].saleId)
      ?.productionKeys,
  ).toEqual([f.sales[4].lineId]);
  expect(await db.productionCostRevision.count()).toBe(0);
  expect(await db.profitabilityAssessment.findMany()).toEqual(historical);
  expect(
    await db.profitabilityRevision.findMany({ orderBy: { id: "asc" } }),
  ).toEqual(before);
  await db.pricingSettings.create({
    data: { id: 1, values: { laborPerHour: "999" }, updatedById: f.actor.id },
  });
  expect((await getProductiveRecurrence(f.actor)).groups[0].materialCount).toBe(
    3,
  );
});

it("includes civil start/end boundaries, excludes out-of-window dates and keeps stale review visible", async () => {
  const f = await population();
  const times = [
    "2026-08-09T02:59:59.999Z",
    "2026-08-09T03:00:00Z",
    "2026-11-07T02:59:59.999Z",
    "2026-11-07T03:00:00Z",
  ];
  for (let i = 0; i < times.length; i++)
    await db.commerceEvent.updateMany({
      where: { saleId: f.sales[i].saleId, action: "CONFIRM" },
      data: { createdAt: new Date(times[i]) },
    });
  await db.productionEvent.update({
    where: { id: f.sales[4].eventId },
    data: { setupMinutes: "120" },
  });
  const result = await getProductiveRecurrence(f.actor);
  expect(result.groups[0]).toMatchObject({
    candidateCount: 3,
    eligibleCount: 2,
    suggestReview: false,
  });
  expect(
    result.groups[0].evidence.find((e) => e.saleId === f.sales[4].saleId)
      ?.reviewed,
  ).toBe(false);
});

it("retains independent provenance across two different origins of the same production, even across product filters", async () => {
  const f = await population();
  const otherProduct = await db.product.create({
    data: {
      name: "Outra",
      description: "Teste",
      paymentTerms: "Teste",
      price: "200",
      calculation: {},
    },
  });
  await db.saleItem.updateMany({
    where: { saleId: f.sales[1].saleId },
    data: { productId: otherProduct.id },
  });
  const origin = await db.finishedOrigin.findUniqueOrThrow({
    where: { id: f.sales[1].originId },
  });
  await db.finishedOrigin.update({
    where: { id: origin.id },
    data: { lineId: f.sales[0].lineId, eventId: null },
  });
  const result = await getProductiveRecurrence(f.actor, f.product.id);
  expect(
    result.groups[0].evidence
      .find((e) => e.saleId === f.sales[0].saleId)
      ?.reasons.join(" "),
  ).toContain("dependente");
  expect(result.groups[0].eligibleCount).toBe(3);
});

it.each(["missing", "operator", "inactive"])(
  "refuses %s identity before reading financial information",
  async (kind) => {
    const f = await population();
    if (kind === "inactive")
      await db.user.update({
        where: { id: f.actor.id },
        data: { active: false },
      });
    const actor = {
      ...f.actor,
      ...(kind === "missing" ? { id: "absent" } : {}),
      ...(kind === "operator" ? { role: "OPERATOR" as const } : {}),
    };
    await expect(getProductiveRecurrence(actor)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  },
);

it("does not suggest with cancelled, unknown opening or malformed memory and does not mutate hashes", async () => {
  const f = await population();
  await db.sale.update({
    where: { id: f.sales[0].saleId },
    data: { status: "CANCELADA" },
  });
  await db.finishedOrigin.update({
    where: { id: f.sales[1].originId },
    data: { kind: "OPENING", lineId: null, eventId: null, initialValue: "80" },
  });
  const input = f.snapshot.input as Prisma.JsonObject;
  input.materials = [];
  await db.pricingSnapshot.update({
    where: { id: f.snapshot.id },
    data: { input: input as Prisma.InputJsonValue },
  });
  const result = await getProductiveRecurrence(f.actor);
  expect(result.groups).toHaveLength(0);
  expect(result.ungrouped).toHaveLength(5);
  expect(result.ungrouped.every((e) => !e.eligible)).toBe(true);
});

it("keeps known costs available when a legacy snapshot input cannot be read", async () => {
  const f = await population();
  await db.pricingSnapshot.update({
    where: { id: f.snapshot.id },
    data: { input: Prisma.JsonNull },
  });
  const result = await getProductiveRecurrence(f.actor);
  expect(result.ungrouped).toHaveLength(5);
  expect(
    result.ungrouped.every((e) => !e.eligible && Number(e.knownCost) > 0),
  ).toBe(true);
  expect(await db.productionCostRevision.count()).toBe(0);
});

it("traces consignment to productive origin and requires human review without treating custody loss as factory failure", async () => {
  vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
  const f = await readyFixture();
  const order = await db.productionOrder.create({
    data: {
      origin: "STOCK",
      status: "CONCLUIDA",
      lines: {
        create: {
          productId: f.product.id,
          description: "Peça E24",
          technology: "FDM",
          targetUnits: 20,
          events: {
            create: {
              kind: "REPORT",
              goodUnits: 20,
              failedUnits: 2,
              reason: "Falhas incorporadas",
              machineMinutes: "60",
              setupMinutes: "60",
              finishingMinutes: "0",
              materialComplete: true,
              timeComplete: true,
              actorId: f.actor.id,
              effectiveDate: new Date("2026-10-27"),
              premises: {
                printer: {
                  watts: "0",
                  acquisitionCost: "200",
                  amortizationMonths: 1,
                  daysPerMonth: 1,
                  hoursPerDay: "1",
                },
                settings: {
                  values: {
                    energyRate: "0",
                    maintenancePerHour: "0",
                    laborPerHour: "400",
                  },
                },
              },
            },
          },
        },
      },
    },
    include: { lines: { include: { events: true } } },
  });
  await db.finishedOrigin.update({
    where: { id: f.origin.id },
    data: {
      kind: "PRODUCTION",
      lineId: order.lines[0].id,
      eventId: order.lines[0].events[0].id,
      initialValue: null,
    },
  });
  await db.finishedMovement.updateMany({
    where: { originId: f.origin.id, kind: "OPENING" },
    data: { kind: "PRODUCTION" },
  });
  const consignment = await f.makeSale();
  await db.commerceEvent.updateMany({
    where: { saleId: consignment.saleId!, action: "CONFIRM" },
    data: { createdAt: new Date("2026-10-28T12:00:00Z") },
  });
  const item = await db.saleItem.findFirstOrThrow({
    where: { saleId: consignment.saleId! },
  });
  const input = {
    ...structuredClone(lotFixture),
    quantity: 1,
    materials: [
      {
        ...lotFixture.materials[0],
        consumptionPerUnit: "100",
        fixedWaste: "0",
      },
    ],
    energyRate: "0",
    maintenancePerHour: "0",
    laborPerHour: "0",
    failurePercent: "0",
    extras: [],
    channel: { ...lotFixture.channel, fees: [], fixedCost: "0" },
  };
  const snapshot = await db.pricingSnapshot.create({
    data: {
      actorId: f.actor.id,
      actorName: f.actor.name,
      operationKey: crypto.randomUUID(),
      requestHash: "e24-consignment",
      input: input as Prisma.InputJsonValue,
      result: calculateV2(input) as unknown as Prisma.InputJsonValue,
    },
  });
  const revision = await db.documentCostRevision.create({
    data: {
      saleId: consignment.saleId!,
      revision: 1,
      frozenAt: new Date(),
      bindings: [
        {
          lineId: item.lineKey!,
          snapshotId: snapshot.id,
          state: "VALID",
          fingerprint: lineFingerprint({
            description: item.description,
            quantity: 1,
            productId: f.product.id,
            unitPrice: "100.00",
          }),
        },
      ],
    },
  });
  await db.sale.update({
    where: { id: consignment.saleId! },
    data: { costRevisionId: revision.id },
  });
  let report = await getProductiveRecurrence(f.actor);
  expect(report.groups[0].evidence[0]).toMatchObject({
    productionKeys: [order.lines[0].id],
    reviewed: false,
    eligible: false,
    actual: "20",
  });
  const [source] = await db.$transaction((tx) =>
    readSaleSources(tx, [consignment.saleId!]),
  );
  const payload = adminPayload();
  payload.lineReviews = [
    {
      lineKey: item.lineKey!,
      sourceHash: source.lines[0].sourceHash,
      complete: true,
    },
  ];
  await saveProfitabilityRevision(f.actor, {
    saleId: consignment.saleId!,
    expectedVersion: 0,
    operationKey: key(),
    effectiveDate: "2026-10-28",
    reason: "Conferência sintética",
    payload,
  });
  report = await getProductiveRecurrence(f.actor);
  expect(report.groups[0]).toMatchObject({
    eligibleCount: 1,
    materialCount: 1,
    suggestReview: false,
  });
  await executeCustodyCommand(f.actor, {
    type: "LOSS",
    operationKey: key(),
    id: f.shipment.id,
    expectedVersion: f.shipment.version,
    effectiveDate: "2026-10-28",
    reason: "Perda em custódia",
    stage: "partner",
    allocations: [{ shipmentAllocationId: f.allocationId, units: 1 }],
  });
  report = await getProductiveRecurrence(f.actor);
  expect(report.groups[0].evidence[0].actual).toBe("20");
  expect(report.groups[0].evidence[0].reconciliation.includedLosses).toEqual(
    [],
  );
});

it("renders independent recurrence evidence when the prior report cannot read a legacy memory", async () => {
  const f = await population();
  pageIdentity.value = f.actor;
  await db.pricingSnapshot.update({
    where: { id: f.snapshot.id },
    data: { input: Prisma.JsonNull },
  });
  const html = renderToStaticMarkup(
    await ProfitabilityPage({
      searchParams: Promise.resolve({ from: "2026-10-01", to: "2026-10-31" }),
    }),
  );
  expect(html).toContain("Relatório temporariamente indisponível");
  expect(html).toContain("Recorrência de desvios produtivos");
  expect(html).toContain("Dados sem grupo comparável");
  expect(html).toContain("Conhecido de origem");
});

it("includes a traced closed productive loss once without creating a second independent observation", async () => {
  const f = await population();
  const loss = await db.productionOrder.create({
    data: {
      origin: "SALE",
      saleId: f.sales[0].saleId,
      status: "CONCLUIDA",
      lines: {
        create: {
          saleLineKey: "line1",
          description: "Perda vinculada",
          technology: "FDM",
          targetUnits: 1,
          events: {
            create: {
              kind: "REPORT",
              goodUnits: 0,
              failedUnits: 1,
              reason: "Falha sintética",
              materialComplete: true,
              timeComplete: true,
              machineMinutes: "0",
              setupMinutes: "60",
              finishingMinutes: "0",
              premises: { settings: { values: { laborPerHour: "30" } } },
              actorId: f.actor.id,
              effectiveDate: new Date("2026-10-30"),
            },
          },
        },
      },
    },
    include: { lines: true },
  });
  await f.sales[0].review(1);
  const report = await getProductiveRecurrence(f.actor);
  expect(report.groups[0]).toMatchObject({
    eligibleCount: 5,
    materialCount: 3,
    suggestReview: true,
  });
  const e = report.groups[0].evidence.find(
    (e) => e.saleId === f.sales[0].saleId,
  )!;
  expect(e).toMatchObject({ actual: "110", difference: "60" });
  expect(e.productionKeys).toEqual(
    [f.sales[0].lineId, loss.lines[0].id].sort(),
  );
  expect(e.reconciliation.includedLosses).toMatchObject([
    { id: loss.lines[0].id, value: "30" },
  ]);
});

it("distinguishes missing memory, stale binding and stale human review", async () => {
  const f = await population();
  const revision = await db.documentCostRevision.findFirstOrThrow({
    where: { saleId: f.sales[0].saleId },
  });
  const bindings = revision.bindings as Prisma.JsonObject[];
  bindings[0].state = "STALE";
  await db.documentCostRevision.update({
    where: { id: revision.id },
    data: { bindings: bindings as Prisma.InputJsonValue },
  });
  await db.sale.update({
    where: { id: f.sales[1].saleId },
    data: { costRevisionId: null },
  });
  await db.productionEvent.update({
    where: { id: f.sales[2].eventId },
    data: { setupMinutes: "120" },
  });
  const r = await getProductiveRecurrence(f.actor);
  expect(
    r.ungrouped.find((e) => e.saleId === f.sales[0].saleId)?.reasons,
  ).toContain("Vínculo da memória desatualizado");
  expect(
    r.ungrouped.find((e) => e.saleId === f.sales[1].saleId)?.reasons,
  ).toContain("Memória prevista não vinculada");
  expect(
    r.groups[0].evidence.find((e) => e.saleId === f.sales[2].saleId)?.reasons,
  ).toContain("Conferência da linha desatualizada");
});
