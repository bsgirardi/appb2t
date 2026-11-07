import { describe, expect, it } from "vitest";
import {
  buildRecurrence,
  productiveConfigurationKey,
} from "@/domain/profitability/recurrence";
import {
  recurrenceCandidate,
  recurrencePeriod as period,
  recurrencePopulation,
} from "../fixtures/recurrence";

describe("recorrência produtiva", () => {
  it("suggests human review at exactly five independent orders, three at both material limits", () => {
    const candidates = recurrencePopulation(),
      before = structuredClone(candidates);
    const result = buildRecurrence(candidates, period);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      eligibleCount: 5,
      materialCount: 3,
      suggestReview: true,
      candidateCount: 5,
    });
    expect(result.groups[0].evidence[0]).toMatchObject({
      difference: "5",
      differencePercent: "10",
      eligible: true,
      material: true,
    });
    expect(candidates).toEqual(before);
  });
  it.each([
    [4, 3],
    [5, 2],
    [6, 3],
  ])(
    "does not suggest from %i observations and %i material deviations",
    (n, k) => {
      const result = buildRecurrence(
        Array.from({ length: n }, (_, i) =>
          recurrenceCandidate(i, i < k ? "55" : "50"),
        ),
        period,
      );
      expect(result.groups[0].suggestReview).toBe(false);
    },
  );
  it.each(["54.999999", "54", "49", "0"])(
    "does not round %s to the monetary/percentage boundary",
    (actual) => {
      const rows = recurrencePopulation();
      rows[0] = recurrenceCandidate(1, actual);
      expect(buildRecurrence(rows, period).groups[0].materialCount).toBe(2);
    },
  );
  it("requires the percentage too, even above five reais", () => {
    const rows = recurrencePopulation();
    rows[0].line.expected!.variable = "100";
    rows[0].line.expected!.components!.material = "100";
    rows[0].line.expectedScenario.productive.value = "100";
    rows[0].line.actualScenario.productive.value = "105";
    rows[0].line.actual.components!.material = "105";
    expect(buildRecurrence(rows, period).groups[0].materialCount).toBe(2);
  });
  it("requires five reais even when the percentage is well above ten", () => {
    const c = recurrenceCandidate(1, "14.99");
    c.line.expected!.variable = "10";
    c.line.expected!.components!.material = "10";
    c.line.expectedScenario.productive.value = "10";
    const group = buildRecurrence([c], period).groups[0];
    expect(group.eligibleCount).toBe(1);
    expect(group.materialCount).toBe(0);
    expect(group.evidence[0].differencePercent).toBe("49.9");
  });
  it.each([
    "zero",
    "provisional",
    "partial",
    "stale",
    "residue",
    "cancelled",
    "commercialPending",
    "provenance",
    "consignmentReview",
  ])("keeps %s visible outside the eligible denominator", (reason) => {
    const rows = recurrencePopulation(),
      c = rows[0];
    if (reason === "zero") {
      c.line.expected!.variable = "0";
      c.line.expected!.components!.material = "0";
      c.line.expectedScenario.productive.value = "0";
    }
    if (reason === "provisional") c.line.actual.provisional = true;
    if (reason === "partial") c.line.actual.delivered = 0;
    if (reason === "stale")
      c.sale.administrative!.lineReviews[0].sourceHash = "old";
    if (reason === "residue") c.line.actual.components!.material = "54.999999";
    if (reason === "cancelled") c.sale.status = "CANCELADA";
    if (reason === "commercialPending")
      c.sale.administrative!.commercialPending = true;
    if (reason === "provenance") c.provenanceComplete = false;
    if (reason === "consignmentReview") {
      c.sale.consignment = true;
      c.sale.administrative!.lineReviews = [];
    }
    const group = buildRecurrence(rows, period).groups[0];
    expect(group).toMatchObject({
      candidateCount: 5,
      eligibleCount: 4,
      materialCount: 2,
      suggestReview: false,
    });
    expect(group.evidence[0].reasons.length).toBeGreaterThan(0);
  });
  it("does not count shared production across different finished origins or configurations", () => {
    const rows = recurrencePopulation();
    rows[1].productionKeys = rows[0].productionKeys;
    rows[1].configuration!.quantity = rows[1].line.quantity = 2;
    const result = buildRecurrence(rows, period);
    expect(result.groups.reduce((n, g) => n + g.eligibleCount, 0)).toBe(3);
    expect(result.groups.every((g) => !g.suggestReview)).toBe(true);
  });
  it("excludes transitive dependence and multiple lines of the same order", () => {
    const rows = recurrencePopulation();
    rows[0].productionKeys = ["x"];
    rows[1].productionKeys = ["x", "y"];
    rows[2].productionKeys = ["y"];
    rows[4].sale.saleId = rows[3].sale.saleId;
    rows[4].line.key = "other-line";
    expect(buildRecurrence(rows, period).groups[0].eligibleCount).toBe(0);
  });
  it("does not hide dependence when the shared row has incomplete cost", () => {
    const rows = recurrencePopulation();
    rows[1].productionKeys = rows[0].productionKeys;
    rows[1].line.actual.provisional = true;
    expect(buildRecurrence(rows, period).groups[0].eligibleCount).toBe(3);
  });
  it("uses inclusive civil boundaries in São Paulo and does not treat missing date as zero", () => {
    const rows = recurrencePopulation();
    rows[0].sale.confirmedAt = "2026-08-09T02:59:59.999Z";
    rows[1].sale.confirmedAt = "2026-08-09T03:00:00.000Z";
    rows[2].sale.confirmedAt = "2026-11-07T02:59:59.999Z";
    rows[3].sale.confirmedAt = "2026-11-07T03:00:00.000Z";
    rows[4].sale.confirmedAt = null;
    expect(buildRecurrence(rows, period).groups[0].eligibleCount).toBe(2);
  });
  it("keeps malformed/missing configuration and product in ungrouped evidence", () => {
    const rows = recurrencePopulation();
    rows[0].configuration = null;
    rows[1].line.productId = null;
    rows[2].configuration!.materials[0].pricePerBase = "NaN";
    const result = buildRecurrence(rows, period);
    expect(result.ungrouped).toHaveLength(3);
    expect(result.groups[0].eligibleCount).toBe(2);
    expect(
      result.ungrouped.every((e) => !e.eligible && e.reasons.length > 0),
    ).toBe(true);
  });
  it("does not include commercial costs or add losses/reservations twice", () => {
    const rows = recurrencePopulation();
    for (const { sale, line } of rows) {
      sale.revenue = "9000";
      sale.administrative!.fees = sale.administrative!.shipping = {
        state: "UNKNOWN",
      };
      line.frozenCommission = "999";
      line.actual.reservedTotal = "1000";
      line.actual.sources.push({
        id: "loss",
        kind: "LOSS",
        label: "Perda já incluída",
        value: "20",
      });
    }
    const group = buildRecurrence(rows, period).groups[0];
    expect(group).toMatchObject({
      eligibleCount: 5,
      materialCount: 3,
      suggestReview: true,
    });
    expect(group.evidence[0].difference).toBe("5");
  });
});

describe("configuração congelada", () => {
  it("ignores names/commercial terms and canonicalizes decimals and material order", () => {
    const c = recurrenceCandidate(1),
      a = c.configuration!,
      b = structuredClone(a);
    b.materials.reverse();
    b.materials[0].pricePerBase += ".00";
    b.materials[0].name = "Novo nome";
    b.printer.name = "Renomeada";
    b.channel.fixedCost = "99";
    b.informedUnitPrice = "999";
    b.mode = "INFORMED";
    b.markupPercent = "80";
    b.targetMarginPercent = "20";
    expect(productiveConfigurationKey("p", a)).toBe(
      productiveConfigurationKey("p", b),
    );
  });
  it.each(["quantity", "version", "waste", "extra", "printer"])(
    "separates differing productive %s",
    (kind) => {
      const a = recurrenceCandidate(1).configuration!,
        b = structuredClone(a);
      if (kind === "quantity") b.quantity++;
      if (kind === "version") b.materials[0].ref.version++;
      if (kind === "waste") b.materials[0].fixedWaste = "11";
      if (kind === "extra") b.extras.push(structuredClone(b.extras[0]));
      if (kind === "printer") b.printer.ref.id = "other";
      expect(productiveConfigurationKey("p", a)).not.toBe(
        productiveConfigurationKey("p", b),
      );
    },
  );
});
