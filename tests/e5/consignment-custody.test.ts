import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { fixture, key } from "./fixtures";
import { executePartnerCommand } from "@/server/consignment/partners";
import { executeCustodyCommand } from "@/server/consignment/custody";
import { db } from "@/lib/db";
setupDatabase();
it("moves pieces through partial receipt and return without a sale or obligation", async () => {
  const f = await fixture();
  const partner = await executePartnerCommand(f.actor, {
    type: "CREATE",
    operationKey: key(),
    expectedVersion: 0,
    customerId: f.customer.id,
    responsibleId: f.actor.id,
    location: "Loja",
    model: "RETIDA",
    percent: "20",
    dueDay: 10,
    notes: "",
  });
  let s = await executeCustodyCommand(f.actor, {
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
  s = await executeCustodyCommand(f.actor, {
    type: "DISPATCH",
    operationKey: key(),
    id: s.id,
    expectedVersion: s.version,
    effectiveDate: "2026-10-28",
    reason: "Remessa",
  });
  const allocationId = s.lines[0].allocations[0].id;
  const receive = {
    type: "RECEIVE",
    operationKey: key(),
    id: s.id,
    expectedVersion: s.version,
    effectiveDate: "2026-10-28",
    reason: "",
    receiver: "Equipe loja",
    allocations: [{ shipmentAllocationId: allocationId, units: 6 }],
  };
  s = await executeCustodyCommand(f.actor, receive);
  expect(s.balances[0]).toMatchObject({ outbound: 2, partner: 6 });
  expect(await executeCustodyCommand(f.actor, receive)).toEqual(s);
  s = await executeCustodyCommand(f.actor, {
    type: "RETURN",
    operationKey: key(),
    id: s.id,
    expectedVersion: s.version,
    effectiveDate: "2026-10-28",
    reason: "Retorno",
    stage: "partner",
    allocations: [{ shipmentAllocationId: allocationId, units: 2 }],
  });
  s = await executeCustodyCommand(f.actor, {
    type: "CONFIRM_RETURN",
    operationKey: key(),
    id: s.id,
    expectedVersion: s.version,
    effectiveDate: "2026-10-28",
    reason: "Conferido",
    allocations: [{ shipmentAllocationId: allocationId, units: 2 }],
  });
  expect(s.balances[0]).toMatchObject({ partner: 4, inbound: 0, outbound: 2 });
  expect(
    (
      await db.finishedMovement.aggregate({
        where: { originId: f.origin.id },
        _sum: { units: true },
      })
    )._sum.units,
  ).toBe(14);
  expect(await db.sale.count()).toBe(0);
  expect(await db.financialEntry.count()).toBe(0);
});
