import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { pricingFixture, pricingRates } from "../fixtures/pricing-db";
import {
  createPricingEstimate,
  getPricingSnapshot,
} from "@/server/pricing/estimates";
import { savePricingSettings } from "@/server/pricing/catalog";
import { saveMaterial } from "@/server/catalog-inputs";
import { db } from "@/lib/db";
setupDatabase();
it("rejectsForgedMaterialPrice", async () => {
  const { actor, request } = await pricingFixture();
  await expect(
    createPricingEstimate(
      actor,
      {
        ...request,
        materials: request.materials.map((m) => ({ ...m, pricePerBase: "1" })),
      },
      randomUUID(),
    ),
  ).rejects.toThrow();
});
it("staleSettingsRequireReview", async () => {
  const { actor, request } = await pricingFixture();
  await savePricingSettings(actor, {
    ...pricingRates,
    energyRate: "2",
    expectedVersion: 1,
  });
  await expect(
    createPricingEstimate(actor, request, randomUUID()),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("replayReturnsSameSnapshot and does not create receivables", async () => {
  const { actor, request } = await pricingFixture(),
    key = randomUUID();
  const [a, b] = await Promise.all([
    createPricingEstimate(actor, request, key),
    createPricingEstimate(actor, request, key),
  ]);
  expect(a.id).toBe(b.id);
  expect(a.result.contribution).toBe("58.21");
  expect(await db.pricingSnapshot.count()).toBe(1);
  expect(await db.financialEntry.count()).toBe(0);
  await expect(
    createPricingEstimate(actor, { ...request, quantity: 20 }, key),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("snapshotSurvivesReferenceDeactivation but inactiveReferenceCannotStartEstimate", async () => {
  const { actor, request, material } = await pricingFixture();
  const a = await createPricingEstimate(actor, request, randomUUID());
  await saveMaterial(actor, {
    id: material.id,
    expectedVersion: material.version,
    name: material.name,
    technology: "FDM",
    price: "300",
    active: false,
  });
  expect(
    (await db.$transaction((tx) => getPricingSnapshot(tx, a.id))).result,
  ).toEqual(a.result);
  await expect(
    createPricingEstimate(actor, request, randomUUID()),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
