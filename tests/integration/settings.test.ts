import { it, expect } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  saveMaterial,
  savePrinter,
  getCalculatorData,
} from "@/server/catalog-inputs";
import { saveSettings } from "@/server/settings";
setupDatabase();
const rates = {
  energyRate: "1",
  maintenancePercent: "10",
  failurePercent: "10",
  finishingPercent: "10",
  fixation: "0.2",
  markupPercent: "200",
};
it("shares active data with operators and rejects their changes", async () => {
  const admin = await seedUser();
  const op = await seedUser("OPERATOR", "op@example.test");
  await saveSettings(admin, { ...rates, expectedVersion: 0 });
  const mat = await saveMaterial(admin, {
    name: "PLA",
    technology: "FDM",
    price: "100",
    active: true,
  });
  expect((await getCalculatorData(op)).materials[0].id).toBe(mat.id);
  await expect(
    saveMaterial(op, {
      name: "PLA",
      technology: "FDM",
      price: "1",
      active: true,
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    saveSettings(op, { ...rates, expectedVersion: 1 }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    savePrinter(op, {
      name: "X",
      technology: "FDM",
      active: true,
      acquisitionCost: "2400",
      amortizationMonths: 12,
      daysPerMonth: 25,
      hoursPerDay: "8",
      watts: "100",
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await saveMaterial(admin, {
    id: mat.id,
    expectedVersion: mat.version,
    name: "PLA",
    technology: "FDM",
    price: "100",
    active: false,
  });
  expect((await getCalculatorData(op)).materials).toHaveLength(0);
});
it("rejects stale concurrent settings writes", async () => {
  const a = await seedUser();
  await saveSettings(a, { ...rates, expectedVersion: 0 });
  const r = await Promise.allSettled([
    saveSettings(a, { ...rates, energyRate: "2", expectedVersion: 1 }),
    saveSettings(a, { ...rates, energyRate: "3", expectedVersion: 1 }),
  ]);
  expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(r.find((x) => x.status === "rejected")).toMatchObject({
    reason: { code: "CONFLICT" },
  });
});
it("rejects invalid machine, non-finite costs, and unknown fields", async () => {
  const a = await seedUser();
  await expect(
    saveSettings(a, { ...rates, energyRate: "NaN", expectedVersion: 0 }),
  ).rejects.toThrow();
  await expect(
    saveMaterial(a, {
      name: "PLA",
      technology: "FDM",
      price: "100",
      active: true,
      role: "ADMIN",
    }),
  ).rejects.toThrow();
  await expect(
    savePrinter(a, {
      name: "X",
      technology: "FDM",
      active: true,
      acquisitionCost: "1",
      amortizationMonths: 0,
      daysPerMonth: 25,
      hoursPerDay: "8",
      watts: "100",
    }),
  ).rejects.toThrow();
});
