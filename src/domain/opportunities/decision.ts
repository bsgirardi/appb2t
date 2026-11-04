import Decimal from "decimal.js";
import type { DocumentItemInput } from "@/domain/commerce/types";
import type { DocumentCostsDTO, PricingV2Result } from "@/domain/pricing/types";
import {
  compareLineCost,
  lineFingerprint,
} from "@/domain/pricing/document-costs";

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

// Read-only projection: never resolves current catalog values or changes snapshots.
export function quoteDecisionLines(
  items: DocumentItemInput[],
  costs?: DocumentCostsDTO | null,
) {
  return items.map((item) => {
    const binding = item.lineId
      ? costs?.bindings.find((b) => b.lineId === item.lineId)
      : undefined;
    const snapshot = costs?.snapshots.find((s) => s.id === binding?.snapshotId);
    let result: PricingV2Result | null = null;
    let machineMinutes: string | null = null;
    if (binding && snapshot && binding.fingerprint === lineFingerprint(item)) {
      try {
        result = compareLineCost(item, snapshot, binding.state);
        if (result)
          machineMinutes = new D(snapshot.input.machineFixedMinutes)
            .plus(
              new D(snapshot.input.machineMinutesPerUnit).times(item.quantity),
            )
            .toFixed();
      } catch {
        // Invalid legacy assumptions must not appear as complete cost coverage.
        result = null;
      }
    }
    return {
      item,
      result,
      machineMinutes,
      snapshot: result ? snapshot : undefined,
    };
  });
}
