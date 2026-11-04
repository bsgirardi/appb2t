// Synthetic E22 custody fixtures; own setup and database guard.
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { seedUser } from "./setup";
import type { CommissionModel } from "@/domain/consignment/types";
import { executePartnerCommand } from "@/server/consignment/partners";
import { executeCustodyCommand } from "@/server/consignment/custody";
import { executeConsignmentSaleCommand } from "@/server/consignment/sales";
export const key = () => randomUUID();
export async function fixture() {
  const actor = await seedUser();
  const customer = await db.customer.create({
    data: { name: "Parceiro sintético E5", type: "COMPANY" },
  });
  const product = await db.product.create({
    data: {
      name: "Peça E5",
      description: "Sintética",
      active: true,
      paymentTerms: "Pix",
      calculation: {},
      price: "100",
    },
  });
  const stock = await db.finishedStock.create({
    data: { productId: product.id, inventoriedAt: new Date() },
  });
  const origin = await db.finishedOrigin.create({
    data: {
      stockId: stock.id,
      kind: "OPENING",
      initialValue: "200",
      movements: {
        create: {
          kind: "OPENING",
          units: 20,
          actorId: actor.id,
          effectiveDate: new Date("2026-10-28T00:00:00Z"),
        },
      },
    },
  });
  return { actor, customer, product, stock, origin };
}
export async function readyFixture(
  model: CommissionModel = "RETIDA",
  received = 8,
) {
  const f = await fixture();
  const partner = await executePartnerCommand(f.actor, {
    type: "CREATE",
    operationKey: key(),
    expectedVersion: 0,
    customerId: f.customer.id,
    responsibleId: f.actor.id,
    location: "Loja E5",
    model,
    percent: "20",
    dueDay: 10,
    notes: "",
  });
  let shipment = await executeCustodyCommand(f.actor, {
    type: "SAVE_DRAFT",
    operationKey: key(),
    expectedVersion: 0,
    partnerId: partner.id,
    notes: "",
    lines: [
      {
        productId: f.product.id,
        allocations: [{ originId: f.origin.id, units: 8 }],
      },
    ],
  });
  shipment = await executeCustodyCommand(f.actor, {
    type: "DISPATCH",
    operationKey: key(),
    id: shipment.id,
    expectedVersion: shipment.version,
    effectiveDate: "2026-10-28",
    reason: "Remessa sintética",
  });
  const allocationId = shipment.lines[0].allocations[0].id;
  shipment = await executeCustodyCommand(f.actor, {
    type: "RECEIVE",
    operationKey: key(),
    id: shipment.id,
    expectedVersion: shipment.version,
    effectiveDate: "2026-10-28",
    receiver: "Loja E5",
    reason: "",
    allocations: [{ shipmentAllocationId: allocationId, units: received }],
  });
  async function draftSale(quantity = 1, reference: string = key()) {
    return executeConsignmentSaleCommand(f.actor, {
      type: "SAVE_DRAFT",
      operationKey: key(),
      expectedVersion: 0,
      partnerId: partner.id,
      reference,
      effectiveDate: "2026-10-28",
      model,
      notes: "",
      overrideReason: "",
      lines: [
        {
          productId: f.product.id,
          quantity,
          unitPrice: "100.00",
          percent: "20",
          allocations: [
            { shipmentAllocationId: allocationId, units: quantity },
          ],
        },
      ],
    });
  }
  async function makeSale(quantity = 1, reference: string = key()) {
    const draft = await draftSale(quantity, reference);
    return executeConsignmentSaleCommand(f.actor, {
      type: "CONFIRM",
      operationKey: key(),
      id: draft.id,
      expectedVersion: draft.version,
      reason: "",
    });
  }
  return { ...f, partner, shipment, allocationId, draftSale, makeSale };
}
