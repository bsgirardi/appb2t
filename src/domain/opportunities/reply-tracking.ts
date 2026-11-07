import { z } from "zod";
import { todaySaoPaulo } from "@/domain/commerce/dates";
export const defaultCommercialSettings = { replyWaitDays: 14, version: 0 };
export const commercialSettingsSchema = z
  .object({
    replyWaitDays: z.number().int().min(1).max(365),
    expectedVersion: z.number().int().min(0),
  })
  .strict();
export type CommercialSettingsDTO = { replyWaitDays: number; version: number };
export type ReplyEvent = {
  id: string;
  type: string;
  createdAt: string;
  data: unknown;
};
export function replyWaitingSince(
  events: ReplyEvent[],
  quoteId: string,
  quoteVersion: number,
): string | null {
  let since: string | null = null;
  const sorted = [...events].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  for (const event of sorted) {
    const data = event.data as Record<string, unknown> | null;
    const before = data?.before as Record<string, unknown> | undefined;
    const after = data?.after as Record<string, unknown> | undefined;
    if (
      event.type === "REOPEN" ||
      (event.type === "SET_PRIMARY" &&
        before?.principalQuoteId !== after?.principalQuoteId)
    ) {
      since = null;
      continue;
    }
    if (!data || data.quoteId !== quoteId || data.quoteVersion !== quoteVersion)
      continue;
    if (event.type === "CUSTOMER_REPLY") since = null;
    if (event.type === "PROPOSAL_SENT" && !since)
      since = todaySaoPaulo(new Date(event.createdAt));
  }
  return since;
}
