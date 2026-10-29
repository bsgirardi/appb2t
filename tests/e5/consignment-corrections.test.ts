import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { readyFixture, key } from "./fixtures";
import {
  executeCustodyCommand,
  allocationBalance,
} from "@/server/consignment/custody";
import { executeConsignmentSaleCommand } from "@/server/consignment/sales";
import {
  executeStatementCommand,
  previewStatement,
} from "@/server/consignment/statements";
import { readOpeningCost } from "@/server/profitability/origin-values";
setupDatabase();
it("compensates a loss once and preserves the remaining loss cost", async () => {
  const f = await readyFixture();
  let s = await executeCustodyCommand(f.actor, {
    type: "LOSS",
    operationKey: key(),
    id: f.shipment.id,
    expectedVersion: f.shipment.version,
    effectiveDate: "2026-10-28",
    stage: "partner",
    reason: "Perda sintética",
    allocations: [{ shipmentAllocationId: f.allocationId, units: 2 }],
  });
  const loss = s.events.find((e) => e.kind === "LOSS")!;
  s = await executeCustodyCommand(f.actor, {
    type: "COMPENSATE",
    operationKey: key(),
    id: s.id,
    expectedVersion: s.version,
    sourceId: loss.id,
    effectiveDate: "2026-10-28",
    reason: "Correção da conferência",
    allocations: [{ shipmentAllocationId: f.allocationId, units: 1 }],
  });
  expect(await allocationBalance(db, f.allocationId)).toMatchObject({
    partner: 7,
    lost: 1,
  });
  expect(
    (await readOpeningCost(db, f.origin.id)).buckets.find(
      (b) => b.kind === "CONSIGNMENT_LOSS",
    )?.value,
  ).toBe("10");
  await expect(
    executeCustodyCommand(f.actor, {
      type: "COMPENSATE",
      operationKey: key(),
      id: s.id,
      expectedVersion: s.version,
      sourceId: loss.id,
      effectiveDate: "2026-10-28",
      reason: "Excesso",
      allocations: [{ shipmentAllocationId: f.allocationId, units: 2 }],
    }),
  ).rejects.toThrow("líquido");
});
it("creates a complementary statement for a late report and requires removing the original statement before cancellation", async () => {
  const f = await readyFixture(),
    first = await f.makeSale(1, "REL-1");
  const preview = await previewStatement(f.actor, f.partner.id, "2026-10");
  const statement = await executeStatementCommand(f.actor, {
    type: "CLOSE",
    operationKey: key(),
    partnerId: f.partner.id,
    competence: "2026-10",
    fingerprint: preview.fingerprint,
  });
  await expect(
    executeConsignmentSaleCommand(f.actor, {
      type: "CANCEL",
      operationKey: key(),
      id: first.id,
      expectedVersion: first.version,
      reason: "Correção",
    }),
  ).rejects.toThrow("acerto");
  await f.makeSale(1, "REL-TARDIO");
  const next = await previewStatement(f.actor, f.partner.id, "2026-10");
  expect(next.lines.map((l) => l.reference)).toEqual(["REL-TARDIO"]);
  const complement = await executeStatementCommand(f.actor, {
    type: "CLOSE",
    operationKey: key(),
    partnerId: f.partner.id,
    competence: "2026-10",
    fingerprint: next.fingerprint,
  });
  expect(complement.sequence).toBeGreaterThan(statement.sequence);
  expect(await db.financialEntry.count()).toBe(2);
  await executeStatementCommand(f.actor, {
    type: "CANCEL",
    operationKey: key(),
    id: statement.id,
    expectedVersion: statement.version,
    reason: "Correção",
  });
  expect(
    (
      await executeConsignmentSaleCommand(f.actor, {
        type: "CANCEL",
        operationKey: key(),
        id: first.id,
        expectedVersion: first.version,
        reason: "Correção",
      })
    ).status,
  ).toBe("CANCELED");
  expect(
    await db.consignmentStatementLine.count({
      where: { statementId: complement.id, active: true },
    }),
  ).toBe(1);
});
it("allows compensating receipt after canceling its sale", async () => {
  const f = await readyFixture();
  const sale = await f.makeSale(8);
  const receipt = f.shipment.events.find((e) => e.kind === "RECEIVE")!;
  const command = {
    type: "COMPENSATE" as const,
    operationKey: key(),
    id: f.shipment.id,
    expectedVersion: f.shipment.version,
    sourceId: receipt.id,
    effectiveDate: "2026-10-28",
    reason: "Correção conferida",
    allocations: [{ shipmentAllocationId: f.allocationId, units: 8 }],
  };
  await expect(executeCustodyCommand(f.actor, command)).rejects.toThrow();
  await executeConsignmentSaleCommand(f.actor, {
    type: "CANCEL",
    operationKey: key(),
    id: sale.id,
    expectedVersion: sale.version,
    reason: "Correção",
  });
  await executeCustodyCommand(f.actor, { ...command, operationKey: key() });
  expect(await allocationBalance(db, f.allocationId)).toMatchObject({
    outbound: 8,
    partner: 0,
    sold: 0,
  });
});
it("allows receipt correction after loss reversal and independent later receipt", async () => {
  const f = await readyFixture("RETIDA", 4);
  const receipt = f.shipment.events.find((e) => e.kind === "RECEIVE")!;
  let s = await executeCustodyCommand(f.actor, {
    type: "LOSS",
    operationKey: key(),
    id: f.shipment.id,
    expectedVersion: f.shipment.version,
    effectiveDate: "2026-10-28",
    stage: "partner",
    reason: "Perda",
    allocations: [{ shipmentAllocationId: f.allocationId, units: 4 }],
  });
  const loss = s.events.find((e) => e.kind === "LOSS")!;
  s = await executeCustodyCommand(f.actor, {
    type: "COMPENSATE",
    operationKey: key(),
    id: s.id,
    expectedVersion: s.version,
    sourceId: loss.id,
    effectiveDate: "2026-10-28",
    reason: "Correção perda",
    allocations: [{ shipmentAllocationId: f.allocationId, units: 4 }],
  });
  s = await executeCustodyCommand(f.actor, {
    type: "RECEIVE",
    operationKey: key(),
    id: s.id,
    expectedVersion: s.version,
    effectiveDate: "2026-10-28",
    receiver: "Loja",
    reason: "",
    allocations: [{ shipmentAllocationId: f.allocationId, units: 4 }],
  });
  await executeCustodyCommand(f.actor, {
    type: "COMPENSATE",
    operationKey: key(),
    id: s.id,
    expectedVersion: s.version,
    sourceId: receipt.id,
    effectiveDate: "2026-10-28",
    reason: "Correção recebimento",
    allocations: [{ shipmentAllocationId: f.allocationId, units: 4 }],
  });
  expect(await allocationBalance(db, f.allocationId)).toMatchObject({
    partner: 4,
    outbound: 4,
    lost: 0,
  });
});
