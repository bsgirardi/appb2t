import { completeInput } from "./profitability";
export function productiveInput() {
  const input = completeInput();
  const line = input.lines[0];
  line.expected!.variable = "96";
  line.expected!.components = { material: "50", energy: "5", maintenance: "5", labor: "20", extras: "10", failure: "6" };
  line.actual.total = line.actual.knownTotal = "100";
  line.actual.components = { material: "60", energy: "6", maintenance: "6", labor: "24", depreciation: "4" };
  line.actual.sources = [{ id: "delivery", kind: "DELIVERED", label: "Peças entregues", value: "100" }];
  input.administrative!.extras = [{ id: "complement", lineKey: line.key, reference: "Embalagem", description: "Embalagem confirmada", value: "10", effectiveDate: "2026-10-30", notInProduction: true }];
  return input;
}
