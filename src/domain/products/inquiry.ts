import { z } from "zod";
import { catalogQuantitySchema, CATALOG_MAX_LINES } from "./quantity";
import {
  configurationAnswersSchema,
  normalizeConfigurationText,
} from "./configuration";
import type { ConfiguredPrice } from "./configuration-price";
export const seenPriceSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("REFERENCE"),
      unit: z.string().regex(/^\d{1,16}\.\d{2}$/),
      subtotal: z.string().regex(/^\d{1,16}\.\d{2}$/),
    })
    .strict(),
  z
    .object({ kind: z.literal("CONSULT"), unit: z.null(), subtotal: z.null() })
    .strict(),
]);
export const inquiryItemSchema = z
  .object({
    productId: z.string().min(1).max(100),
    color: z.string().max(60).default(""),
    size: z.string().max(60).default(""),
    quantity: catalogQuantitySchema,
    catalogContext: z
      .object({
        collection: z.string().max(100),
        search: z.string().max(100),
        order: z.enum(["nome", "recentes", "menor-preco", "maior-preco"]),
        page: z.number().int().min(1).max(99999),
      })
      .strict()
      .optional(),
    lineId: z.string().min(1).max(100).optional(),
    kitInstanceId: z.string().min(1).max(100).optional(),
    answers: configurationAnswersSchema.default([]),
    commercialRevision: z.number().int().positive().nullable().default(null),
    seenPrice: seenPriceSchema.nullable().default(null),
    answerLabels: z
      .array(
        z
          .object({
            fieldId: z.string().max(100),
            label: z.string().max(120),
            valueLabel: z.string().max(1000),
          })
          .strict(),
      )
      .max(8)
      .default([]),
  })
  .strict();
export type InquiryItem = z.infer<typeof inquiryItemSchema>;
export type InquiryInput = z.input<typeof inquiryItemSchema>;
export const inquiryKey = (
  item: Pick<
    InquiryInput,
    | "productId"
    | "color"
    | "size"
    | "answers"
    | "commercialRevision"
    | "kitInstanceId"
  >,
) =>
  JSON.stringify([
    item.productId,
    item.color ?? "",
    item.size ?? "",
    (item.answers ?? [])
      .map((a) => ({ ...a, value: normalizeConfigurationText(a.value) }))
      .filter((a) => a.value)
      .sort((a, b) => a.fieldId.localeCompare(b.fieldId, "en")),
    item.commercialRevision ?? null,
    item.kitInstanceId ?? null,
  ]);
export const inquiryItemsSchema = z
  .array(inquiryItemSchema)
  .max(CATALOG_MAX_LINES)
  .refine(
    (items) => new Set(items.map(inquiryKey)).size === items.length,
    "Itens repetidos.",
  )
  .refine((items) => {
    const ids = items.flatMap((i) => (i.lineId ? [i.lineId] : []));
    return new Set(ids).size === ids.length;
  }, "Linhas repetidas.");
export function mergeInquiryItem(
  items: InquiryInput[],
  added: InquiryInput,
): InquiryItem[] {
  const rows = items.map((i) => inquiryItemSchema.parse(i));
  const item = inquiryItemSchema.parse(added);
  const key = inquiryKey(item);
  const exists = rows.some((i) => inquiryKey(i) === key);
  const next = exists
    ? rows.map((i) =>
        inquiryKey(i) === key
          ? { ...i, quantity: i.quantity + item.quantity }
          : i,
      )
    : [...rows, item];
  const parsed = inquiryItemsSchema.safeParse(next);
  if (!parsed.success)
    throw new Error(
      "A lista permite até 20 combinações e até 99 unidades de cada combinação.",
    );
  return parsed.data;
}
export interface InquiryLine extends InquiryItem {
  minimumQuantity?: number;
  name: string;
  sku: string;
  path: string | null;
  imageUrl: string | null;
  price: string | null;
  subtotal: string | null;
  problem: string | null;
  configuredPrice?: ConfiguredPrice;
  currentRevision?: number;
  requiresConfirmation?: boolean;
  fieldErrors?: Record<string, string>;
}
export interface InquiryReview {
  groups?: import("@/domain/kits/types").KitGroupReview[];
  closedTotal?: string | null;
  lines: InquiryLine[];
  total: string;
  knownTotal?: string | null;
  consultCount?: number;
  ready: boolean;
  message: string;
  contact: string | null;
  channel: "whatsapp" | "email" | null;
  copyRequired?: boolean;
}
