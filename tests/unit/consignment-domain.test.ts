import { expect, it } from "vitest";
import {
  calculateConsignmentLines,
  consignmentDueDate,
} from "@/domain/consignment/commercial";
import {
  projectCustody,
  projectDatedCustody,
} from "@/domain/consignment/quantities";

const line = {
  quantity: 1,
  unitPrice: "100.00",
  percent: "20",
  model: "RETIDA" as const,
};
it("retains commission without inventing a payment obligation", () => {
  expect(calculateConsignmentLines([line])).toMatchObject({
    gross: "100.00",
    commission: "20.00",
    receivable: "80.00",
    payable: "0.00",
  });
});
it("keeps gross collection and separate commission payment distinct", () => {
  expect(
    calculateConsignmentLines([{ ...line, model: "SEPARADA" }]),
  ).toMatchObject({
    gross: "100.00",
    commission: "20.00",
    receivable: "100.00",
    payable: "20.00",
  });
});
it("rounds half up independently per line before adding totals", () => {
  expect(
    calculateConsignmentLines(
      [1, 2].map(() => ({ ...line, unitPrice: "0.05", percent: "10" })),
    ),
  ).toMatchObject({ gross: "0.10", commission: "0.02", receivable: "0.08" });
});
it.each([
  ["0", "100.00"],
  ["100", "0.00"],
  ["12.3456", "87.65"],
])("supports percentage %s without losing precision", (percent, receivable) => {
  expect(calculateConsignmentLines([{ ...line, percent }]).receivable).toBe(
    receivable,
  );
});
it.each([
  { quantity: 0 },
  { quantity: 1.5 },
  { quantity: 2147483648 },
  { unitPrice: "-1" },
  { unitPrice: "1.001" },
  { percent: "100.0001" },
  { percent: "1.00001" },
])("rejects an invalid commercial line %j", (change) => {
  expect(() => calculateConsignmentLines([{ ...line, ...change }])).toThrow();
});
it("rejects mixing commission models in one sale", () => {
  expect(() =>
    calculateConsignmentLines([line, { ...line, model: "SEPARADA" }]),
  ).toThrow();
});
it("sets a next-month civil due date including year rollover", () => {
  expect(consignmentDueDate("2026-12-31", 28)).toBe("2027-01-28");
  expect(consignmentDueDate("2026-10-01", 1)).toBe("2026-11-01");
  expect(() => consignmentDueDate("2026-02-30", 1)).toThrow();
  expect(() => consignmentDueDate("2026-10-01", 29)).toThrow();
});
it("conserves external custody through partial receipt, sale, return and loss", () => {
  expect(
    projectCustody([
      { from: null, to: "outbound", units: 8 },
      { from: "outbound", to: "partner", units: 6 },
      { from: "partner", to: "sold", units: 3 },
      { from: "partner", to: "inbound", units: 2 },
      { from: "inbound", to: null, units: 2 },
      { from: "outbound", to: "lost", units: 1 },
    ]),
  ).toEqual({ outbound: 1, partner: 1, inbound: 0, sold: 3, lost: 1 });
});
it("rejects negative custody, fractional facts and cumulative integer overflow", () => {
  expect(() =>
    projectCustody([{ from: "partner", to: "sold", units: 1 }]),
  ).toThrow();
  expect(() =>
    projectCustody([{ from: null, to: "outbound", units: 0.5 }]),
  ).toThrow();
  expect(() =>
    projectCustody([
      { from: null, to: "outbound", units: 2147483647 },
      { from: null, to: "outbound", units: 1 },
    ]),
  ).toThrow();
});
it("rejects a backdated sale before the corresponding pieces were received", () => {
  expect(
    projectDatedCustody([
      { from: null, to: "outbound", units: 8, date: "2026-10-27", sequence: 1 },
      {
        from: "outbound",
        to: "partner",
        units: 8,
        date: "2026-10-28",
        sequence: 2,
      },
    ]),
  ).toMatchObject({ partner: 8, outbound: 0 });
  expect(() =>
    projectDatedCustody([
      { from: null, to: "outbound", units: 8, date: "2026-10-27", sequence: 1 },
      {
        from: "outbound",
        to: "partner",
        units: 8,
        date: "2026-10-28",
        sequence: 2,
      },
      {
        from: "partner",
        to: "sold",
        units: 3,
        date: "2026-10-27",
        sequence: 3,
      },
    ]),
  ).toThrow();
});
