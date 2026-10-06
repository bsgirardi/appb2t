import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  getPricingCatalog,
  savePricingSettings,
  savePricingChannel,
  savePricingExtra,
} from "@/server/pricing/catalog";
setupDatabase();
export const rates = {
  energyRate: "1",
  maintenancePerHour: "0.5",
  failurePercent: "0",
  laborPerHour: "20",
  markupPercent: "100",
  targetMarginPercent: "30",
};
it("settingsAreInitiallyMissing", async () =>
  expect((await getPricingCatalog(await seedUser())).settings).toBeNull());
it("operatorCannotSetTariffs", async () => {
  const op = await seedUser("OPERATOR");
  await expect(
    savePricingSettings(op, { ...rates, expectedVersion: 0 }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    savePricingChannel(op, {
      name: "Direto",
      fees: [],
      fixedCost: "0",
      active: true,
      expectedVersion: 0,
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    savePricingExtra(op, {
      name: "Caixa",
      unitCost: "1",
      active: true,
      expectedVersion: 0,
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
});
it("competingUpdateConflicts", async () => {
  const a = await seedUser();
  await savePricingSettings(a, { ...rates, expectedVersion: 0 });
  const outcomes = await Promise.allSettled([
    savePricingSettings(a, { ...rates, energyRate: "2", expectedVersion: 1 }),
    savePricingSettings(a, { ...rates, energyRate: "3", expectedVersion: 1 }),
  ]);
  expect(outcomes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.find((x) => x.status === "rejected")).toMatchObject({
    reason: { code: "CONFLICT" },
  });
});
it("inactive entries are hidden from simulation but visible to admin editing", async () => {
  const a = await seedUser();
  const c = await savePricingChannel(a, {
    name: "Direto",
    fees: [],
    fixedCost: "0",
    active: true,
    expectedVersion: 0,
  });
  await savePricingChannel(a, {
    id: c.id,
    name: c.name,
    fees: [],
    fixedCost: "0",
    active: false,
    expectedVersion: c.version,
  });
  const e = await savePricingExtra(a, {
    name: "Caixa",
    unitCost: "1",
    active: true,
    expectedVersion: 0,
  });
  expect((await getPricingCatalog(a)).extras[0].id).toBe(e.id);
  expect((await getPricingCatalog(a)).channels).toHaveLength(0);
  expect((await getPricingCatalog(a, true)).channels[0].active).toBe(false);
});
