import { expect, it } from "vitest";
import {
  opportunityCommandSchema,
  opportunityFilterSchema,
} from "@/domain/opportunities/validation";
import {
  assertOpportunityTransition,
  opportunityDueState,
} from "@/domain/opportunities/states";
import { todaySaoPaulo } from "@/domain/commerce/dates";
const fields = {
  title: "Peças",
  customerId: "c",
  ownerId: "u",
  stage: "CONTATO",
  nextAction: "Ligar",
  nextContactDate: "2026-10-27",
  pendingNotes: "",
};
it("requires complete open opportunities and rejects client controlled wins", () => {
  expect(
    opportunityCommandSchema.safeParse({
      action: "CREATE",
      operationKey: "12345678",
      fields,
    }).success,
  ).toBe(true);
  for (const patch of [
    { title: " " },
    { title: "x".repeat(161) },
    { nextAction: "" },
    { nextAction: "x".repeat(501) },
    { pendingNotes: "x".repeat(4001) },
    { nextContactDate: "2026-02-30" },
    { stage: "PROPOSTA" },
    { stage: "GANHO" },
  ])
    expect(
      opportunityCommandSchema.safeParse({
        action: "CREATE",
        operationKey: "12345678",
        fields: { ...fields, ...patch },
      }).success,
    ).toBe(false);
  expect(
    opportunityCommandSchema.safeParse({
      action: "CREATE",
      operationKey: "12345678",
      fields,
      wonSaleId: "s",
    }).success,
  ).toBe(false);
});
it("bounds interactions and loss reasons", () => {
  for (const text of ["", "x".repeat(4001)])
    expect(
      opportunityCommandSchema.safeParse({
        action: "INTERACTION",
        operationKey: "12345678",
        expectedVersion: 1,
        text,
      }).success,
    ).toBe(false);
  for (const reason of ["xx", "x".repeat(2001)])
    expect(
      opportunityCommandSchema.safeParse({
        action: "LOSE",
        operationKey: "12345678",
        expectedVersion: 1,
        reason,
      }).success,
    ).toBe(false);
});
it("does not equate approval with gain or allow proposal without principal", () => {
  expect(() =>
    assertOpportunityTransition("CONTATO", "PROPOSTA", false),
  ).toThrow();
  expect(() => assertOpportunityTransition("CONTATO", "GANHO", true)).toThrow();
  expect(() =>
    assertOpportunityTransition("NEGOCIACAO", "LEVANTAMENTO", true),
  ).not.toThrow();
  expect(() => assertOpportunityTransition("GANHO", "CONTATO", true)).toThrow();
});
it("uses civil dates and Sao Paulo midnight for overdue actions", () => {
  expect(opportunityDueState("2026-10-26", "2026-10-27")).toBe("atrasada");
  expect(opportunityDueState("2026-10-27", "2026-10-27")).toBe("hoje");
  expect(opportunityDueState(null, "2026-10-27")).toBe(null);
  expect(todaySaoPaulo(new Date("2026-10-28T02:59:59Z"))).toBe("2026-10-27");
  expect(todaySaoPaulo(new Date("2026-10-28T03:00:00Z"))).toBe("2026-10-28");
  expect(opportunityFilterSchema.parse({}).pageSize).toBe(20);
  expect(opportunityFilterSchema.parse({}).stage).toBe("abertas");
});
