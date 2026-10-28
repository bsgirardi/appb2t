import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { readyFixture, key } from "./fixtures";
import {
  allocationBalance,
  executeCustodyCommand,
} from "@/server/consignment/custody";
import { readOpeningCost } from "@/server/profitability/origin-values";
import { getConsignmentReport } from "@/server/consignment/reports";
import {
  previewStatement,
  executeStatementCommand,
  statementDTO,
} from "@/server/consignment/statements";
import { settleEntry, reverseSettlement } from "@/server/finance/settlements";
import { listEntries } from "@/server/finance/entries";
setupDatabase();
it.each(["RETIDA", "SEPARADA"] as const)(
  "conserves the complete physical and financial cycle for %s",
  async (model) => {
    const f = await readyFixture(model, 6),
      sale = await f.makeSale(3);
    let s = await executeCustodyCommand(f.actor, {
      type: "RETURN",
      operationKey: key(),
      id: f.shipment.id,
      expectedVersion: f.shipment.version,
      effectiveDate: "2026-10-28",
      reason: "Retorno sintético",
      stage: "partner",
      allocations: [{ shipmentAllocationId: f.allocationId, units: 2 }],
    });
    s = await executeCustodyCommand(f.actor, {
      type: "CONFIRM_RETURN",
      operationKey: key(),
      id: s.id,
      expectedVersion: s.version,
      effectiveDate: "2026-10-28",
      reason: "Conferido",
      allocations: [{ shipmentAllocationId: f.allocationId, units: 2 }],
    });
    await executeCustodyCommand(f.actor, {
      type: "LOSS",
      operationKey: key(),
      id: s.id,
      expectedVersion: s.version,
      effectiveDate: "2026-10-28",
      reason: "Extravio sintético",
      stage: "outbound",
      allocations: [{ shipmentAllocationId: f.allocationId, units: 1 }],
    });
    expect(await allocationBalance(db, f.allocationId)).toEqual({
      outbound: 1,
      partner: 1,
      inbound: 0,
      sold: 3,
      lost: 1,
    });
    expect(
      (
        await db.finishedMovement.aggregate({
          where: { originId: f.origin.id },
          _sum: { units: true },
        })
      )._sum.units,
    ).toBe(14);
    const costs = await readOpeningCost(db, f.origin.id);
    expect(
      costs.buckets.find((b) => b.kind === "CONSIGNMENT_SOLD")?.value,
    ).toBe("30");
    expect(
      costs.buckets.find((b) => b.kind === "CONSIGNMENT_LOSS")?.value,
    ).toBe("10");
    const report = await getConsignmentReport(f.actor, {
      partnerId: f.partner.id,
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(report.items[0]).toMatchObject({
      gross: "300",
      commission: "60",
      cost: "30",
      lossCost: "10",
      afterDepreciation: "200",
      contribution: null,
    });
    const before = await db.financialEntry.count();
    const preview = await previewStatement(f.actor, f.partner.id, "2026-10");
    const close = {
      type: "CLOSE",
      operationKey: key(),
      partnerId: f.partner.id,
      competence: "2026-10",
      fingerprint: preview.fingerprint,
    };
    const statement = await executeStatementCommand(f.actor, close);
    expect(await executeStatementCommand(f.actor, close)).toEqual(statement);
    expect(await db.financialEntry.count()).toBe(before);
    const entries = await listEntries(f.actor, { saleId: sale.saleId! });
    expect(entries.total).toBe(model === "RETIDA" ? 1 : 2);
    const account = await db.financialAccount.create({
      data: {
        name: "Caixa E5",
        type: "CASH",
        openingBalance: "0",
        openingDate: new Date("2026-01-01T00:00:00Z"),
      },
    });
    for (const link of sale.finance!.links) {
      const settlement = await settleEntry(f.actor, {
        operationKey: key(),
        entryId: link.id,
        expectedVersion: link.version,
        accountId: account.id,
        amount: link.amount,
        effectiveDate: "2026-10-28",
        method: "PIX",
        notes: "Acerto E5",
      });
      expect(settlement.reversed).toBe(false);
    }
    expect((await statementDTO(db, statement.id)).state).toBe("QUITADO");
    await expect(
      executeStatementCommand(f.actor, {
        type: "CANCEL",
        operationKey: key(),
        id: statement.id,
        expectedVersion: statement.version,
        reason: "Correção",
      }),
    ).rejects.toThrow("Estorne");
    const settlements = await db.settlement.findMany();
    for (const settlement of settlements)
      await reverseSettlement(f.actor, settlement.id, {
        operationKey: key(),
        effectiveDate: "2026-10-28",
        reason: "Correção sintética",
      });
    expect((await statementDTO(db, statement.id)).state).toBe(
      "FECHADO_PENDENTE",
    );
  },
);
