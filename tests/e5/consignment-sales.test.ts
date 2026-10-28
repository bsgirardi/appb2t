import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { fixture, key } from "./fixtures";
import { executePartnerCommand } from "@/server/consignment/partners";
import { executeCustodyCommand } from "@/server/consignment/custody";
import { executeConsignmentSaleCommand } from "@/server/consignment/sales";
import { cancelSale } from "@/server/sales";
import { allocationBalance } from "@/server/consignment/custody";
setupDatabase();
it.each(["RETIDA", "SEPARADA"] as const)(
  "confirms %s without another internal stock exit",
  async (model) => {
    const f = await fixture();
    const p = await executePartnerCommand(f.actor, {
      type: "CREATE",
      operationKey: key(),
      expectedVersion: 0,
      customerId: f.customer.id,
      responsibleId: f.actor.id,
      location: "Loja",
      model,
      percent: "20",
      dueDay: 10,
      notes: "",
    });
    let s = await executeCustodyCommand(f.actor, {
      type: "SAVE_DRAFT",
      operationKey: key(),
      expectedVersion: 0,
      partnerId: p.id,
      notes: "",
      lines: [
        {
          productId: f.product.id,
          allocations: [{ originId: f.origin.id, units: 8 }],
        },
      ],
    });
    s = await executeCustodyCommand(f.actor, {
      type: "DISPATCH",
      operationKey: key(),
      id: s.id,
      expectedVersion: s.version,
      effectiveDate: "2026-10-28",
      reason: "Remessa",
    });
    const a = s.lines[0].allocations[0].id;
    await executeCustodyCommand(f.actor, {
      type: "RECEIVE",
      operationKey: key(),
      id: s.id,
      expectedVersion: s.version,
      effectiveDate: "2026-10-28",
      reason: "",
      receiver: "Loja",
      allocations: [{ shipmentAllocationId: a, units: 8 }],
    });
    let sale = await executeConsignmentSaleCommand(f.actor, {
      type: "SAVE_DRAFT",
      operationKey: key(),
      expectedVersion: 0,
      partnerId: p.id,
      reference: "REL-1",
      effectiveDate: "2026-10-28",
      model,
      notes: "",
      overrideReason: "",
      lines: [
        {
          productId: f.product.id,
          quantity: 1,
          unitPrice: "100.00",
          percent: "20",
          allocations: [{ shipmentAllocationId: a, units: 1 }],
        },
      ],
    });
    const confirm = {
      type: "CONFIRM",
      operationKey: key(),
      id: sale.id,
      expectedVersion: sale.version,
      reason: "",
    };
    sale = await executeConsignmentSaleCommand(f.actor, confirm);
    expect(await executeConsignmentSaleCommand(f.actor, confirm)).toEqual(sale);
    expect(sale.totals).toMatchObject({
      gross: "100.00",
      commission: "20.00",
      receivable: model === "RETIDA" ? "80.00" : "100.00",
    });
    expect(await db.sale.count()).toBe(1);
    expect(await db.saleInstallment.count()).toBe(0);
    expect(await db.financialEntry.count()).toBe(model === "RETIDA" ? 1 : 2);
    expect(await db.finishedMovement.count()).toBe(2);
    const regular = await db.sale.findUniqueOrThrow({
      where: { id: sale.saleId! },
    });
    expect(regular).toMatchObject({
      fulfillmentMode: "CONSIGNMENT",
      status: "ENTREGUE",
    });
    expect(await db.cashMovement.count()).toBe(0);
    await expect(
      cancelSale(f.actor, regular.id, regular.version, "Correção"),
    ).rejects.toThrow("Pontos de venda");
    sale = await executeConsignmentSaleCommand(f.actor, {
      type: "CANCEL",
      operationKey: key(),
      id: sale.id,
      expectedVersion: sale.version,
      reason: "Relatório incorreto",
    });
    expect(sale.status).toBe("CANCELED");
    expect((await allocationBalance(db, a)).partner).toBe(8);
    expect(await db.financialEntry.count({ where: { canceledAt: null } })).toBe(
      0,
    );
  },
);
