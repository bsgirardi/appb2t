import { z } from "zod";
import {
  inquiryItemsSchema,
  inquiryItemSchema,
  inquiryKey,
  mergeInquiryItem,
  type InquiryItem,
  type InquiryInput,
} from "./inquiry";
export const INQUIRY_MAX_BYTES = 256 * 1024;
export const byteLength = (value: string) =>
  new TextEncoder().encode(value).length;
export const inquiryEnvelopeSchema = z
  .object({
    formatVersion: z.literal(2),
    items: inquiryItemsSchema.refine(
      (items) => items.every((i) => !!i.lineId),
      "Identificador da linha ausente.",
    ),
  })
  .strict();
export type InquiryEnvelope = z.infer<typeof inquiryEnvelopeSchema>;
export function ensureInquiryLineIds(
  items: InquiryInput[],
  createId: () => string,
): InquiryItem[] {
  const rows = inquiryItemsSchema.parse(items),
    occupied = new Set(rows.flatMap((i) => (i.lineId ? [i.lineId] : [])));
  return rows.map((item) => {
    if (item.lineId) return item;
    const base = z.string().min(1).max(100).parse(createId());
    let lineId = base,
      suffix = 1;
    while (occupied.has(lineId)) {
      const end = `-${suffix++}`;
      lineId = base.slice(0, 100 - end.length) + end;
    }
    occupied.add(lineId);
    return { ...item, lineId };
  });
}
export function parseInquiryDraft(
  raw: string,
):
  | { status: "valid"; envelope: InquiryEnvelope }
  | { status: "invalid"; raw: string } {
  try {
    if (byteLength(raw) > INQUIRY_MAX_BYTES) throw new Error();
    return {
      status: "valid",
      envelope: inquiryEnvelopeSchema.parse(JSON.parse(raw)),
    };
  } catch {
    return { status: "invalid", raw };
  }
}
export function migrateInquiryV1(
  raw: string,
  createId: () => string,
): InquiryEnvelope {
  if (byteLength(raw) > 16384) throw new Error("Lista antiga inválida.");
  const legacy = z
    .array(
      z
        .object({
          productId: z.string().min(1).max(100),
          color: z.string().max(60).default(""),
          size: z.string().max(60).default(""),
          quantity: z.number().int().min(1).max(99),
        })
        .strict(),
    )
    .max(20)
    .parse(JSON.parse(raw));
  return inquiryEnvelopeSchema.parse({
    formatVersion: 2,
    items: ensureInquiryLineIds(legacy, createId),
  });
}
export function replaceInquiryItem(
  items: InquiryItem[],
  lineId: string,
  replacement: InquiryInput,
): InquiryItem[] {
  if (!items.some((i) => i.lineId === lineId))
    throw new Error("Esta linha não está mais na lista. Adicione novamente.");
  const next = inquiryItemSchema.parse({ ...replacement, lineId });
  const other = items.filter((i) => i.lineId !== lineId);
  if (other.some((i) => inquiryKey(i) === inquiryKey(next)))
    return mergeInquiryItem(other, next);
  return inquiryItemsSchema.parse(
    items.map((i) => (i.lineId === lineId ? next : i)),
  );
}
