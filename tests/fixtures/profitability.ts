import type {
  SaleProfitabilityInput,
  AdministrativePayload,
} from "@/domain/profitability/types";
export function adminPayload(): AdministrativePayload {
  return {
    channel: null,
    expectedShipping: { state: "UNKNOWN" },
    fees: { state: "UNKNOWN" },
    shipping: { state: "UNKNOWN" },
    extras: [],
    confirmations: [],
    lineReviews: [],
    commercialPending: false,
    commercialReason: "",
  };
}
export function profitabilityInput(): SaleProfitabilityInput {
  return {
    saleId: "sale",
    number: "1",
    version: 1,
    status: "ENTREGUE",
    confirmedAt: "2026-10-09T12:00:00.000Z",
    readAt: "2026-10-09T13:00:00.000Z",
    factsHash: "facts",
    totals: { subtotal: "200", discount: "0", shipping: "0", total: "200" },
    administrative: null,
    lines: [
      {
        key: "line",
        position: 0,
        productId: "product",
        description: "Peça",
        quantity: 1,
        grossRevenue: "200",
        expected: null,
        actual: {
          total: null,
          components: null,
          knownTotal: "0",
          reservedTotal: null,
          delivered: 0,
          provisional: false,
          missing: ["production"],
          sources: [],
        },
        sourceHash: "line-facts",
      },
    ],
  };
}
export function completeInput(): SaleProfitabilityInput {
  const input = profitabilityInput();
  input.administrative = {
    ...adminPayload(),
    expectedShipping: { state: "DECLARED", value: "20" },
    fees: { state: "DECLARED", value: "10" },
    shipping: { state: "DECLARED", value: "20" },
    lineReviews: [
      { lineKey: "line", sourceHash: "line-facts", complete: true },
    ],
  };
  input.lines[0].expected = {
    snapshotId: "snapshot",
    variable: "80",
    depreciation: "5",
    fixedFees: "0",
    feePercent: "5",
    extras: [],
    suggestedRevenue: "300",
  };
  input.lines[0].actual = {
    total: "85",
    knownTotal: "85",
    components: {
      material: "80",
      energy: "0",
      maintenance: "0",
      labor: "0",
      depreciation: "5",
    },
    reservedTotal: "0",
    delivered: 1,
    provisional: false,
    missing: [],
    sources: [],
  };
  return input;
}
