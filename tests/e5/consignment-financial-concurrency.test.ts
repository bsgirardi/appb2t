import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { readyFixture, key } from "./fixtures";
import { raceUnderEntryLock } from "./entry-race";
import { executeConsignmentSaleCommand } from "@/server/consignment/sales";
import {
  executeStatementCommand,
  previewStatement,
} from "@/server/consignment/statements";
import { settleEntry } from "@/server/finance/settlements";
setupDatabase();
it.each(["sale", "statement"] as const)(
  "serializes %s cancellation against a real financial settlement",
  async (target) => {
    const f = await readyFixture(),
      sale = await f.makeSale();
    const entry = sale.finance!.links[0];
    const account = await db.financialAccount.create({
      data: {
        name: "Caixa E5",
        type: "CASH",
        openingBalance: "0",
        openingDate: new Date("2026-01-01T00:00:00Z"),
      },
    });
    let cancel: () => Promise<unknown>;
    if (target === "statement") {
      const p = await previewStatement(f.actor, f.partner.id, "2026-10");
      const statement = await executeStatementCommand(f.actor, {
        type: "CLOSE",
        operationKey: key(),
        partnerId: f.partner.id,
        competence: "2026-10",
        fingerprint: p.fingerprint,
      });
      cancel = () =>
        executeStatementCommand(f.actor, {
          type: "CANCEL",
          operationKey: key(),
          id: statement.id,
          expectedVersion: statement.version,
          reason: "Correção concorrente",
        });
    } else
      cancel = () =>
        executeConsignmentSaleCommand(f.actor, {
          type: "CANCEL",
          operationKey: key(),
          id: sale.id,
          expectedVersion: sale.version,
          reason: "Correção concorrente",
        });
    const results = await raceUnderEntryLock(entry.id, [
      cancel,
      () =>
        settleEntry(f.actor, {
          operationKey: key(),
          entryId: entry.id,
          expectedVersion: entry.version,
          accountId: account.id,
          amount: entry.amount,
          effectiveDate: "2026-10-28",
          method: "PIX",
          notes: "",
        }),
    ]);
    if (target === "sale")
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    else
      expect(
        results.filter((r) => r.status === "fulfilled").length,
      ).toBeGreaterThanOrEqual(1);
    const persisted = await db.financialEntry.findUniqueOrThrow({
      where: { id: entry.id },
      include: { settlements: true },
    });
    expect(
      persisted.canceledAt && persisted.settlements.length > 0,
    ).toBeFalsy();
  },
);
