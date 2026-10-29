import { expect, it } from "vitest";
import {
  partnerCommandSchema,
  custodyCommandSchema,
} from "@/domain/consignment/validation";
const meta = { operationKey: "12345678", expectedVersion: 0 };
it("validates partner terms and rejects unknown fields", () => {
  const input = {
    ...meta,
    type: "CREATE",
    customerId: "c",
    responsibleId: "u",
    location: "Loja",
    model: "RETIDA",
    percent: "20",
    dueDay: 10,
    notes: "",
  };
  expect(partnerCommandSchema.parse(input).type).toBe("CREATE");
  expect(() => partnerCommandSchema.parse({ ...input, dueDay: 29 })).toThrow();
  expect(() =>
    partnerCommandSchema.parse({ ...input, active: true, secret: "x" }),
  ).toThrow();
});
it("requires physical movement quantity and loss explanation", () => {
  const input = {
    operationKey: "12345678",
    expectedVersion: 1,
    id: "s",
    type: "LOSS",
    stage: "outbound",
    effectiveDate: "2026-10-28",
    reason: "Extravio",
    allocations: [{ shipmentAllocationId: "a", units: 1 }],
  };
  expect(custodyCommandSchema.parse(input).type).toBe("LOSS");
  expect(() => custodyCommandSchema.parse({ ...input, reason: "" })).toThrow();
  expect(() =>
    custodyCommandSchema.parse({
      ...input,
      allocations: [{ shipmentAllocationId: "a", units: 1.5 }],
    }),
  ).toThrow();
  expect(() =>
    custodyCommandSchema.parse({ ...input, stage: "sold" }),
  ).toThrow();
});
