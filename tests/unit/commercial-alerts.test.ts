import { expect, it } from "vitest";
import {
  commercialAlerts,
  type AlertQuote,
  type AlertOpportunity,
} from "@/domain/dashboard/commercial-alerts";
const today = "2026-11-07";
const quote = (overrides: Partial<AlertQuote> = {}): AlertQuote => ({
  id: "q",
  sequence: 12,
  status: "ENVIADO",
  validUntil: today,
  opportunityId: null,
  ...overrides,
});
const opportunity = (
  overrides: Partial<AlertOpportunity> = {},
): AlertOpportunity => ({
  id: "o",
  title: "Proposta teste",
  stage: "PROPOSTA",
  principalQuoteId: "q",
  nextContactDate: "2026-11-06",
  nextAction: "Telefonar",
  ownerName: "Ana",
  ...overrides,
});
it("includes today and day seven, excludes drafts, expired and terminal quotes", () => {
  const quotes = [
    quote(),
    quote({ id: "seven", validUntil: "2026-11-14" }),
    ...["RASCUNHO", "CONVERTIDO", "CANCELADO", "RECUSADO", "EXPIRADO"].map(
      (status) => quote({ id: status, status }),
    ),
    quote({ id: "past", validUntil: "2026-11-06" }),
    quote({ id: "later", validUntil: "2026-11-15" }),
  ];
  expect(
    commercialAlerts(quotes, [], today).priorities.map((p) => p.href),
  ).toEqual(["/orcamentos/q", "/orcamentos/seven"]);
});
it("merges overdue contact and principal expiry; secondary quotes never alert", () => {
  const result = commercialAlerts(
    [quote({ opportunityId: "o" }), quote({ id: "old", opportunityId: "o" })],
    [opportunity()],
    today,
  );
  expect(result.priorities).toHaveLength(1);
  expect(result.priorities[0]).toMatchObject({
    href: "/negociacoes/o",
    severity: "urgent",
  });
  expect(result.priorities[0].detail).toMatch(/06\/11\/2026/);
  expect(result.priorities[0].detail).toContain("Ana");
  expect(result.priorities[0].detail).toContain("Telefonar");
  expect(result.priorities[0].detail).toContain("Orçamento #12");
});
it("never treats today or missing dates as overdue; closes gained and lost", () => {
  for (const stage of ["GANHO", "PERDIDO"])
    expect(
      commercialAlerts(
        [quote({ opportunityId: "o" })],
        [opportunity({ stage })],
        today,
      ).priorities,
    ).toEqual([]);
  expect(
    commercialAlerts([], [opportunity({ nextContactDate: today })], today)
      .priorities,
  ).toEqual([]);
  const result = commercialAlerts(
    [quote({ validUntil: null })],
    [
      opportunity({
        nextContactDate: null,
        ownerName: null,
        nextAction: null,
        principalQuoteId: null,
      }),
    ],
    today,
  );
  expect(result.priorities).toEqual([]);
  expect(result.missingValidity).toBe(1);
  expect(result.missingContact).toBe(1);
  expect(result.missingPrincipal).toBe(1);
});
it("recomputes from current source, never using created/updated time as a reply", () => {
  expect(commercialAlerts([], [opportunity()], today).priorities).toHaveLength(
    1,
  );
  expect(
    commercialAlerts(
      [],
      [opportunity({ nextContactDate: "2026-11-08" })],
      today,
    ).priorities,
  ).toEqual([]);
  expect(
    commercialAlerts([quote({ status: "CONVERTIDO" })], [], today).priorities,
  ).toEqual([]);
});
it("sorts overdue contacts by deadline and distinguishes empty from incomplete", () => {
  const result = commercialAlerts(
    [],
    [
      opportunity({ id: "later" }),
      opportunity({ id: "earlier", nextContactDate: "2026-11-01" }),
    ],
    today,
  );
  expect(result.priorities.map((p) => p.href)).toEqual([
    "/negociacoes/earlier",
    "/negociacoes/later",
  ]);
  expect(commercialAlerts([], [], today).openRecords).toBe(0);
  expect(
    commercialAlerts([quote({ validUntil: null })], [], today).openRecords,
  ).toBe(1);
});
it("does not substitute another quote when principal is converted or absent", () => {
  expect(
    commercialAlerts(
      [
        quote({ status: "CONVERTIDO", opportunityId: "o" }),
        quote({ id: "old", opportunityId: "o" }),
      ],
      [opportunity({ nextContactDate: today })],
      today,
    ).priorities,
  ).toEqual([]);
});

it("keeps the seven civil days across year-end and São Paulo midnight", async () => {
  const { resolveDashboardFilter } = await import("@/domain/dashboard/filters");
  const before = resolveDashboardFilter(
    {},
    "OPERATOR",
    new Date("2027-01-01T02:59:59Z"),
  ).today;
  const after = resolveDashboardFilter(
    {},
    "OPERATOR",
    new Date("2027-01-01T03:00:00Z"),
  ).today;
  expect(before).toBe("2026-12-31");
  expect(after).toBe("2027-01-01");
  const q = quote({ validUntil: "2027-01-07" });
  expect(commercialAlerts([q], [], before).expiringCount).toBe(1);
  expect(
    commercialAlerts([quote({ validUntil: "2027-01-08" })], [], before)
      .expiringCount,
  ).toBe(0);
  expect(
    commercialAlerts(
      [],
      [opportunity({ nextContactDate: "2026-12-31" })],
      before,
    ).overdueCount,
  ).toBe(0);
  expect(
    commercialAlerts(
      [],
      [opportunity({ nextContactDate: "2026-12-31" })],
      after,
    ).overdueCount,
  ).toBe(1);
});

it("alerts only from explicit unanswered send at the configured civil deadline, grouping reasons", () => {
  const o = opportunity({
    waitingSince: "2026-10-24",
    nextContactDate: "2026-11-06",
  });
  const q = quote({ opportunityId: "o" });
  expect(commercialAlerts([q], [o], "2026-11-06", 14).unansweredCount).toBe(0);
  const result = commercialAlerts([q], [o], today, 14);
  expect(result.unansweredCount).toBe(1);
  expect(result.priorities).toHaveLength(1);
  expect(result.priorities[0].detail).toContain("Sem retorno do cliente");
  expect(result.priorities[0].detail).toContain("24/10/2026");
  expect(commercialAlerts([q], [o], today, 15).unansweredCount).toBe(0);
  expect(
    commercialAlerts(
      [quote({ opportunityId: "o", validUntil: null })],
      [o],
      today,
      14,
    ).unansweredCount,
  ).toBe(0);
});
