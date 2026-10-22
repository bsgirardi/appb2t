import Decimal from "decimal.js";
import { z } from "zod";
import type { DocumentItemInput } from "@/domain/commerce/types";
import type { RequestQuoteInput } from "@/domain/catalog-requests/types";
import type { KitGroupSnapshot } from "./types";
import { calculateKitPrice } from "./pricing";
import { kitGroupSnapshotSchema } from "./snapshot";
import { kitDiscountTierSchema } from "./validation";
import { positiveCatalogMoney } from "@/domain/products/quantity-pricing";
import { catalogLineSnapshotSchema } from "@/domain/catalog-requests/snapshot";
const id = z.string().min(1).max(100),
  money = z.string().regex(/^\d{1,16}\.\d{2}$/);
export const preparedKitCalculationSchema = z
  .object({
    instanceId: id,
    lineIds: z.array(id).min(1).max(20),
    quantity: z.number().int().min(1).max(1980),
    subtotal: positiveCatalogMoney,
    discount: money,
    total: positiveCatalogMoney,
    tier: kitDiscountTierSchema.nullable(),
  })
  .strict();
export type PreparedKitCalculation = z.infer<
  typeof preparedKitCalculationSchema
>;
export const catalogKitDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: id,
    receivedLines: z.array(catalogLineSnapshotSchema).min(1).max(20).optional(),
    groups: z.array(kitGroupSnapshotSchema).min(1).max(20),
    preparation: z
      .object({
        groups: z.array(preparedKitCalculationSchema).min(1).max(20),
        sources: z
          .array(z.object({ lineId: id, sourceLineId: id }).strict())
          .min(1)
          .max(20),
        kitDiscount: money,
        additionalDiscount: money,
        totalDiscount: money,
      })
      .strict(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const p = v.preparation;
    if (
      v.receivedLines &&
      (new Set(v.receivedLines.map((l) => l.lineId)).size !==
        v.receivedLines.length ||
        p.sources.length !== v.receivedLines.length ||
        p.sources.some(
          (s) => !v.receivedLines!.some((l) => l.lineId === s.sourceLineId),
        ) ||
        v.groups.some((g) =>
          g.lineIds.some(
            (id) =>
              !v.receivedLines!.some(
                (l) => l.lineId === id && l.kitInstanceId === g.instanceId,
              ),
          ),
        ))
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Linhas recebidas não correspondem aos grupos e às origens do histórico.",
      });
    if (
      new Set(v.groups.map((g) => g.instanceId)).size !== v.groups.length ||
      new Set(p.groups.map((g) => g.instanceId)).size !== p.groups.length ||
      p.groups.length !== v.groups.length ||
      p.groups.some((g) => !v.groups.some((s) => s.instanceId === g.instanceId))
    )
      ctx.addIssue({
        code: "custom",
        message: "Histórico de grupos inválido.",
      });
    if (
      new Set(p.sources.map((s) => s.lineId)).size !== p.sources.length ||
      new Set(p.sources.map((s) => s.sourceLineId)).size !== p.sources.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Origem repetida no histórico.",
      });
    const sum = p.groups.reduce((s, g) => s.plus(g.discount), new Decimal(0));
    if (
      !sum.eq(p.kitDiscount) ||
      !sum.plus(p.additionalDiscount).eq(p.totalDiscount) ||
      p.groups.some(
        (g) => !new Decimal(g.subtotal).minus(g.discount).eq(g.total),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Cálculo histórico inconsistente.",
      });
  });
export type CatalogKitDocument = z.infer<typeof catalogKitDocumentSchema>;
export function calculatePreparedKitDiscount(
  groups: KitGroupSnapshot[],
  items: DocumentItemInput[],
  sources: RequestQuoteInput["sources"],
): { groups: PreparedKitCalculation[]; discount: string } {
  const snapshots = z.array(kitGroupSnapshotSchema).max(20).parse(groups);
  if (
    new Set(items.map((i) => i.lineId)).size !== items.length ||
    items.some((i) => !i.lineId) ||
    new Set(sources.map((s) => s.lineId)).size !== sources.length ||
    new Set(sources.map((s) => s.sourceLineId)).size !== sources.length
  )
    throw new Error("Revise a origem de cada componente, sem repetir linhas.");
  const occupied = new Set<string>();
  const calculated = snapshots.map((group) => {
    const selected = group.lineIds.map((sourceId) => {
      if (occupied.has(sourceId))
        throw new Error("Uma linha recebida não pode pertencer a dois kits.");
      occupied.add(sourceId);
      const source = sources.find((s) => s.sourceLineId === sourceId),
        item = items.find((i) => i.lineId === source?.lineId);
      if (!item)
        throw new Error("Um componente recebido não está no orçamento.");
      const quantity = z.number().int().min(1).max(99).parse(item.quantity),
        unit = positiveCatalogMoney.parse(
          item.unitPrice.trim().replace(",", "."),
        );
      return {
        item,
        quantity,
        price: {
          kind: "REFERENCE" as const,
          unit,
          subtotal: new Decimal(unit).times(quantity).toFixed(2),
        },
      };
    });
    const result = calculateKitPrice(selected, group.tiers);
    return preparedKitCalculationSchema.parse({
      instanceId: group.instanceId,
      lineIds: selected.map((s) => s.item.lineId),
      quantity: result.quantity,
      subtotal: result.subtotal,
      discount: result.discount,
      total: result.total,
      tier: result.tier,
    });
  });
  const sum = calculated.reduce((s, g) => s.plus(g.discount), new Decimal(0));
  if (sum.gt("9999999999999999.99"))
    throw new Error("O desconto excede o limite permitido.");
  return { groups: calculated, discount: sum.toFixed(2) };
}
export function kitPreparationReview(
  items: DocumentItemInput[],
  sources: RequestQuoteInput["sources"],
  discount: string,
): string {
  return JSON.stringify([
    items
      .map((i) => [
        i.lineId ?? "",
        i.productId ?? "",
        i.description.trim(),
        i.quantity,
        positiveCatalogMoney.parse(i.unitPrice.trim().replace(",", ".")),
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    sources
      .map((s) => [s.lineId, s.sourceLineId, s.standalone])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    discount,
  ]);
}
export function assertKitDocumentBytes(value: unknown) {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 16 * 1024 * 1024)
    throw new Error(
      "O orçamento excede o limite permitido. Reduza o conteúdo sem perder o histórico.",
    );
}
export type KitDiscountReview = { fingerprint: string };
export const kitDiscountReviewSchema = z
  .object({
    fingerprint: z
      .string()
      .min(1)
      .max(256 * 1024),
  })
  .strict();
export function discountReviewFingerprint(
  items: DocumentItemInput[],
  discount: string,
): string {
  return kitPreparationReview(
    items,
    [],
    new Decimal(discount.trim().replace(",", ".")).toFixed(2),
  );
}
