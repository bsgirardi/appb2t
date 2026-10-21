import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ZodError } from "zod";
import type { InquiryReview } from "@/domain/products/inquiry";
import { parseKitSelection } from "@/domain/kits/selection";
import { lockKitCatalog } from "./kits/locks";
import { reviewProductLinesWithClient } from "./inquiry-lines";
import { reviewKitSelectionWithClient } from "./kits/review";
export async function reviewInquiry(raw: unknown): Promise<InquiryReview> {
  return db.$transaction((tx) => reviewInquiryWithClient(tx, raw), {
    timeout: 20000,
  });
}
export async function reviewInquiryWithClient(
  tx: Prisma.TransactionClient,
  raw: unknown,
): Promise<InquiryReview> {
  let selection;
  try {
    selection = parseKitSelection(raw);
  } catch (error) {
    if (error instanceof ZodError) throw error;
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Montagem inválida.",
    );
  }
  await lockKitCatalog(
    tx,
    selection.items.map((i) => i.productId),
    selection.groups.map((g) => g.kitId),
  );
  if (!selection.groups.length)
    return reviewProductLinesWithClient(tx, { items: selection.items });
  const review = await reviewKitSelectionWithClient(tx, selection);
  const hasKnown =
    review.lines.some(
      (l) => !l.kitInstanceId && !l.problem && l.subtotal !== null,
    ) || review.groups.some((g) => !g.problem && g.price?.kind === "REFERENCE");
  return {
    lines: review.lines,
    groups: review.groups,
    total: review.knownTotal,
    closedTotal: review.total,
    knownTotal: hasKnown ? review.knownTotal : null,
    consultCount: review.consultCount,
    ready: review.ready,
    message: "",
    contact: null,
    channel: null,
  };
}
