import Decimal from "decimal.js";
import { validateProductQuantity } from "@/domain/products/quantity";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { appUrl } from "@/lib/env";
import { getPublicAppearance } from "./appearance";
import {
  inquiryItemsSchema,
  type InquiryReview,
  type InquiryLine,
} from "@/domain/products/inquiry";
import { productPath } from "@/domain/products/storefront";
import {
  readProductConfiguration,
  validateAnswers,
  answerLabels,
  priceModeSchema,
} from "@/domain/products/configuration";
import {
  configuredPrice,
  type ConfiguredPrice,
} from "@/domain/products/configuration-price";
import { buildInquiryMessage } from "@/domain/products/inquiry-message";
import { quantityTiersSchema } from "@/domain/products/quantity-pricing";
const schema = z.object({ items: inquiryItemsSchema }).strict();
export async function reviewProductLinesWithClient(
  tx: Prisma.TransactionClient,
  raw: unknown,
): Promise<InquiryReview> {
  const { items } = schema.parse(raw);
  const [products, identity] = await Promise.all([
    tx.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, active: true },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        availability: true,
        colors: true,
        sizes: true,
        configuration: true,
        publicPriceMode: true,
        commercialRevision: true,
        quantityTiers: true,
        minimumQuantity: true,
      },
    }),
    getPublicAppearance(tx),
  ]);
  const lines: InquiryLine[] = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    let problem = !product
      ? "Produto retirado do catálogo. Remova este item para continuar."
      : product.availability === "UNAVAILABLE"
        ? "Produto indisponível. Remova este item ou consulte a loja separadamente."
        : (product.colors.length
              ? !product.colors.includes(item.color)
              : !!item.color) ||
            (product.sizes.length
              ? !product.sizes.includes(item.size)
              : !!item.size)
          ? "As opções deste produto mudaram. Edite a configuração."
          : null;
    let price: ConfiguredPrice | undefined;
    let labels = item.answerLabels;
    let answers = item.answers;
    const fieldErrors: Record<string, string> = {};
    if (product && !problem)
      try {
        validateProductQuantity(item.quantity, product.minimumQuantity);
        const definition = readProductConfiguration(product.configuration);
        answers = validateAnswers(definition, item.answers);
        labels = answerLabels(definition, answers);
        price = configuredPrice({
          mode: priceModeSchema.parse(product.publicPriceMode),
          basePrice:
            product.publicPriceMode === "CONSULT"
              ? null
              : product.price.toFixed(2),
          configuration: definition,
          answers,
          quantity: item.quantity,
          quantityTiers: item.kitInstanceId
            ? []
            : quantityTiersSchema.parse(product.quantityTiers),
        });
      } catch (error) {
        problem = "A configuração mudou. Revise os campos indicados.";
        if (error instanceof z.ZodError)
          for (const issue of error.issues)
            fieldErrors[String(issue.path[0])] = issue.message;
        else problem = error instanceof Error ? error.message : problem;
      }
    const requiresConfirmation =
      !!product &&
      !problem &&
      (item.commercialRevision !== product.commercialRevision ||
        !item.seenPrice ||
        item.seenPrice.kind !== price?.kind ||
        item.seenPrice.unit !== price?.unit);
    return {
      ...item,
      minimumQuantity: product?.minimumQuantity ?? 1,
      answers,
      answerLabels: labels,
      name: product?.name ?? "Produto não disponível",
      sku: product?.sku ?? "",
      path: product ? productPath(product) : null,
      imageUrl: product ? `/api/products/${product.id}/image` : null,
      price: price?.unit ?? null,
      subtotal: price?.subtotal ?? null,
      problem,
      configuredPrice: price,
      currentRevision: product?.commercialRevision,
      requiresConfirmation,
      fieldErrors,
    };
  });
  const ready =
    lines.length > 0 &&
    lines.every((l) => !l.problem && !l.requiresConfirmation);
  const known = lines.filter((l) => !l.problem && l.subtotal !== null);
  const total = known
    .reduce((sum, l) => sum.plus(l.subtotal!), new Decimal(0))
    .toFixed(2);
  const knownTotal = known.length ? total : null;
  const consultCount = lines.filter(
    (l) => !l.problem && l.configuredPrice?.kind === "CONSULT",
  ).length;
  const contact = ready
    ? buildInquiryMessage(
        lines,
        { knownTotal, consultCount },
        { ...identity, origin: appUrl().href },
      )
    : { message: "", contact: null, channel: null, copyRequired: false };
  return { lines, total, knownTotal, consultCount, ready, ...contact };
}
