import { AppError } from "@/lib/errors";
import type {
  AdCommand,
  AdReviewState,
  AdSourceSnapshot,
  AdStatus,
} from "./types";
export function reviewIssues(d: AdReviewState, s: AdSourceSnapshot) {
  const productChanged = d.source.productVersion !== s.productVersion;
  const missingPhotoIds = d.imageIds.filter(
    (id) => !s.images.some((i) => i.id === id),
  );
  return {
    productChanged,
    missingPhotoIds,
    reviewIsCurrent:
      d.status === "REVIEWED" &&
      d.reviewedVersion === d.version &&
      !productChanged &&
      !missingPhotoIds.length &&
      d.imageIds.length > 0,
  };
}
export function assertAdTransition(
  status: AdStatus,
  action: AdCommand["action"],
) {
  if (
    (status === "ARCHIVED" && action !== "RESTORE") ||
    (status !== "ARCHIVED" && action === "RESTORE")
  )
    throw new AppError(
      "CONFLICT",
      "A ação não está disponível no estado atual.",
    );
}
