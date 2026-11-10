import { expect, it } from "vitest";
import { activeMaintenanceReports } from "@/domain/production/maintenance";
const report = {
  id: "r1",
  kind: "REPORT",
  sourceId: null,
  activity: ["2", "0", "60", "10", "0", "100"],
};
it("removes a fully reversed report and selects its replacement", () => {
  const correction = {
    id: "c",
    kind: "CORRECTION",
    sourceId: "r1",
    activity: ["-2", "0", "-60", "-10", "0", "-100"],
  };
  expect([...activeMaintenanceReports([report, correction])]).toEqual([]);
  expect([
    ...activeMaintenanceReports([report, correction, { ...report, id: "r2" }]),
  ]).toEqual(["r2"]);
});
it("keeps partial reversals, remaining failed work and unmeasured reports", () => {
  const correction = {
    id: "c",
    kind: "CORRECTION",
    sourceId: "r1",
    activity: ["-2", "0", "-60", "-10", "0", "-100"],
  };
  for (const activity of [
    ["2", "1", "60", "10", "0", "100"],
    ["2", "0", null, "10", "0", "100"],
    ["2", "0", "60", "10", "0", "200"],
  ]) {
    expect([
      ...activeMaintenanceReports([{ ...report, activity }, correction]),
    ]).toEqual(["r1"]);
  }
});
it("keeps a manual batch with zero machine hours and supports cumulative reversals", () => {
  const manual = { ...report, activity: ["2", "0", "0", "10", "0", "0"] };
  expect([...activeMaintenanceReports([manual])]).toEqual(["r1"]);
  const correction = {
    id: "c1",
    kind: "CORRECTION",
    sourceId: "r1",
    activity: ["-1", "0", "0", "-5", "0", "0"],
  };
  expect([
    ...activeMaintenanceReports([
      manual,
      correction,
      { ...correction, id: "c2" },
    ]),
  ]).toEqual([]);
});
