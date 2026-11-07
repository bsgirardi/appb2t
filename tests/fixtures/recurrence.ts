import { calculateSale } from "@/domain/profitability/calculate";
import type { RecurrenceCandidate } from "@/domain/profitability/recurrence";
import { completeInput } from "./profitability";
import { lotFixture } from "./pricing";

export const recurrencePeriod = { from: "2026-08-09", to: "2026-11-06" };
export function recurrenceCandidate(
  id: number,
  actual = "55",
): RecurrenceCandidate {
  const input = completeInput();
  input.saleId = `sale-${id}`;
  input.number = String(id);
  input.lines[0].expected = {
    ...input.lines[0].expected!,
    variable: "50",
    components: {
      material: "50",
      energy: "0",
      labor: "0",
      maintenance: "0",
      extras: "0",
      failure: "0",
    },
  };
  input.lines[0].actual.total = actual;
  input.lines[0].actual.knownTotal = actual;
  input.lines[0].actual.components = {
    material: actual,
    energy: "0",
    labor: "0",
    maintenance: "0",
    depreciation: "0",
  };
  input.lines[0].actual.sources = [
    {
      id: `delivery-${id}`,
      kind: "DELIVERED",
      label: "Entrega",
      value: actual,
    },
  ];
  const sale = calculateSale(input);
  return {
    sale,
    line: sale.lines[0],
    configuration: { ...structuredClone(lotFixture), quantity: 1 },
    productionKeys: [`production-${id}`],
    provenanceComplete: true,
  };
}
export function recurrencePopulation() {
  return [1, 2, 3, 4, 5].map((id) =>
    recurrenceCandidate(id, id <= 3 ? "55" : "50"),
  );
}
