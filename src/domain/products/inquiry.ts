import { z } from "zod";
export const inquiryItemSchema = z
  .object({
    productId: z.string().min(1).max(100),
    color: z.string().max(60).default(""),
    size: z.string().max(60).default(""),
    quantity: z.number().int().min(1).max(99),
  })
  .strict();
export type InquiryItem = z.infer<typeof inquiryItemSchema>;
export const inquiryKey = (
  item: Pick<InquiryItem, "productId" | "color" | "size">,
) => JSON.stringify([item.productId, item.color, item.size]);
export const inquiryItemsSchema = z
  .array(inquiryItemSchema)
  .max(20)
  .refine(
    (items) => new Set(items.map(inquiryKey)).size === items.length,
    "Itens repetidos.",
  );
export function mergeInquiryItem(items: InquiryItem[], added: InquiryItem) {
  const key = inquiryKey(added);
  const exists = items.some((item) => inquiryKey(item) === key);
  const next = exists
    ? items.map((item) =>
        inquiryKey(item) === key
          ? { ...item, quantity: item.quantity + added.quantity }
          : item,
      )
    : [...items, added];
  const result = inquiryItemsSchema.safeParse(next);
  if (!result.success)
    throw new Error(
      "A lista permite até 20 combinações de produtos e até 99 unidades de cada combinação.",
    );
  return result.data;
}
export interface InquiryLine extends InquiryItem {
  name: string;
  sku: string;
  path: string | null;
  imageUrl: string | null;
  price: string | null;
  subtotal: string | null;
  problem: string | null;
}
export interface InquiryReview {
  lines: InquiryLine[];
  total: string;
  ready: boolean;
  message: string;
  contact: string | null;
  channel: "whatsapp" | "email" | null;
}
