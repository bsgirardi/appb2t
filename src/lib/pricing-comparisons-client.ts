import { api } from "./client-api";
import type {
  ComparisonDraft,
  ComparisonPage,
  SavedComparison,
} from "@/domain/pricing/comparisons/types";
export function saveComparison(
  draft: ComparisonDraft,
  key: string,
): Promise<SavedComparison> {
  return api("/api/pricing/comparisons", { draft, operationKey: key });
}
export function fetchComparisons(
  query: { search?: string; cursor?: string } = {},
): Promise<ComparisonPage> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.cursor) params.set("cursor", query.cursor);
  return api(`/api/pricing/comparisons?${params}`);
}
export function fetchComparison(id: string): Promise<SavedComparison> {
  return api(`/api/pricing/comparisons/${encodeURIComponent(id)}`);
}
