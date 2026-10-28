import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { readyFixture, key } from "./fixtures";
import { executeConsignmentSaleCommand } from "@/server/consignment/sales";
import { getConsignmentReport } from "@/server/consignment/reports";
import { settleEntry, reverseSettlement } from "@/server/finance/settlements";
setupDatabase();
it.each(["RETIDA", "SEPARADA"] as const)(
  "allocates actual cash by frozen obligations for %s",
  async (model) => {
    const f = await readyFixture(model);
    // Two independently identifiable products supplied by the same partner.
    const second = await db.product.create({
      data: {
        name: "Produto B",
        description: "Sintético",
        active: true,
        paymentTerms: "Pix",
        calculation: {},
        price: "100",
      },
    });
    // A second line shares neither product nor custody allocation with the first.
    const stock = await db.finishedStock.create({
      data: { productId: second.id, inventoriedAt: new Date() },
    });
    const origin = await db.finishedOrigin.create({
      data: {
        stockId: stock.id,
        kind: "OPENING",
        initialValue: "100",
        movements: {
          create: {
            kind: "OPENING",
            units: 1,
            actorId: f.actor.id,
            effectiveDate: new Date("2026-10-28T00:00:00Z"),
          },
        },
      },
    });
    const { executeCustodyCommand } = await import(
      "@/server/consignment/custody"
    );
    let shipment = await executeCustodyCommand(f.actor, {
      type: "SAVE_DRAFT",
      operationKey: key(),
      expectedVersion: 0,
      partnerId: f.partner.id,
      notes: "",
      lines: [
        {
          productId: second.id,
          allocations: [{ originId: origin.id, units: 1 }],
        },
      ],
    });
    shipment = await executeCustodyCommand(f.actor, {
      type: "DISPATCH",
      operationKey: key(),
      id: shipment.id,
      expectedVersion: shipment.version,
      effectiveDate: "2026-10-28",
      reason: "Teste",
    });
    const allocation = shipment.lines[0].allocations[0].id;
    await executeCustodyCommand(f.actor, {
      type: "RECEIVE",
      operationKey: key(),
      id: shipment.id,
      expectedVersion: shipment.version,
      effectiveDate: "2026-10-28",
      receiver: "Loja",
      reason: "",
      allocations: [{ shipmentAllocationId: allocation, units: 1 }],
    });
    const draft = await executeConsignmentSaleCommand(f.actor, {
      type: "SAVE_DRAFT",
      operationKey: key(),
      expectedVersion: 0,
      partnerId: f.partner.id,
      reference: key(),
      effectiveDate: "2026-10-28",
      model,
      notes: "",
      overrideReason: "Percentuais sintéticos distintos",
      lines: [
        {
          productId: f.product.id,
          quantity: 1,
          unitPrice: "100",
          percent: "100",
          allocations: [{ shipmentAllocationId: f.allocationId, units: 1 }],
        },
        {
          productId: second.id,
          quantity: 1,
          unitPrice: "100",
          percent: "0",
          allocations: [{ shipmentAllocationId: allocation, units: 1 }],
        },
      ],
    });
    const sale = await executeConsignmentSaleCommand(f.actor, {
      type: "CONFIRM",
      operationKey: key(),
      id: draft.id,
      expectedVersion: draft.version,
      reason: "",
    });
    const account = await db.financialAccount.create({
      data: {
        name: "Caixa",
        type: "CASH",
        openingBalance: "0",
        openingDate: new Date("2026-01-01T00:00:00Z"),
      },
    });
    const settlements = [];
    for (const link of sale.finance!.links)
      settlements.push(
        await settleEntry(f.actor, {
          operationKey: key(),
          entryId: link.id,
          expectedVersion: link.version,
          accountId: account.id,
          amount: link.amount,
          effectiveDate: "2026-10-28",
          method: "PIX",
          notes: "",
        }),
      );
    const a = await getConsignmentReport(f.actor, { productId: f.product.id });
    const b = await getConsignmentReport(f.actor, { productId: second.id });
    expect(a.totals.received).toBe(model === "RETIDA" ? "0" : "100");
    expect(b.totals.received).toBe("100");
    expect(a.totals.commissionPaid).toBe(model === "RETIDA" ? "0" : "100");
    expect(b.totals.commissionPaid).toBe("0");
    for (const s of settlements)
      await reverseSettlement(f.actor, s.id, {
        operationKey: key(),
        effectiveDate: "2026-10-28",
        reason: "Estorno",
      });
    expect((await getConsignmentReport(f.actor, {})).totals).toMatchObject({
      received: "0",
      commissionPaid: "0",
    });
  },
);
