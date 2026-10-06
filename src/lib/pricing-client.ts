import { api } from "./client-api";
import type {
  PricingRequest,
  PricingSnapshotDTO,
} from "@/domain/pricing/types";
export function createEstimate(
  request: PricingRequest,
  key: string,
): Promise<PricingSnapshotDTO> {
  return api("/api/pricing/estimates", { request, operationKey: key });
}
