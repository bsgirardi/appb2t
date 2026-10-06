import { expect, it } from "vitest";
import {
  lineFingerprint,
  compareLineCost,
  duplicateDocumentItem,
} from "@/domain/pricing/document-costs";
import { lotFixture } from "../fixtures/pricing";
import { calculateV2 } from "@/domain/pricing/calculate";
const item = {
  lineId: "a",
  description: "Peça",
  quantity: 10,
  unitPrice: "8.00",
};
it("quantityChangeMarksStale and priceChangeKeepsCost", () => {
  expect(lineFingerprint({ ...item, quantity: 20 })).not.toBe(
    lineFingerprint(item),
  );
  expect(lineFingerprint({ ...item, unitPrice: "90.00" })).toBe(
    lineFingerprint(item),
  );
  expect(lineFingerprint({ ...item, description: "Outra" })).not.toBe(
    lineFingerprint(item),
  );
});
it("duplicateGetsNewIdentity", () => {
  const copy = duplicateDocumentItem(item);
  expect(copy.lineId).not.toBe(item.lineId);
  expect(copy.description).toBe(item.description);
});
it("compares negotiated revenue using frozen batch assumptions", () => {
  const snapshot = {
    id: "s",
    version: 2 as const,
    input: lotFixture,
    result: calculateV2(lotFixture),
    actorId: "a",
    actorName: "A",
    createdAt: new Date().toISOString(),
  };
  expect(compareLineCost(item, snapshot, "VALID")).toMatchObject({
    offeredRevenue: "80",
    contribution: "17.8",
    afterDepreciation: "15.8",
  });
  expect(
    compareLineCost({ ...item, quantity: 11 }, snapshot, "VALID"),
  ).toBeNull();
  expect(compareLineCost(item, snapshot, "STALE")).toBeNull();
});
