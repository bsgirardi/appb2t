import type { Prisma } from "@prisma/client";
import type {
  CheckoutDraft,
  CheckoutReviewContent,
} from "@/domain/checkout/types";
import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { canonical } from "@/server/production/commands";
import { buildRequestSnapshot } from "@/server/catalog-requests/snapshot";
import { resolveCheckoutEligibility } from "@/domain/checkout/eligibility";
import { readCheckoutPolicy } from "@/domain/checkout/validation";
import { getPublicAppearance } from "@/server/appearance";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { AppError } from "@/lib/errors";
export function checkoutFingerprint(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
export async function reviewCheckout(
  tx: Prisma.TransactionClient,
  draft: CheckoutDraft,
): Promise<CheckoutReviewContent> {
  const snapshot = await buildRequestSnapshot(tx, {
    ...draft,
    attemptKey: "0".repeat(64),
    ...(draft.groups?.length ? { schemaVersion: 2 as const } : {}),
  });
  const products = await tx.product.findMany({
    where: { id: { in: snapshot.lines.map((l) => l.productId) } },
  });
  const kits = await tx.catalogKit.findMany({
    where: { id: { in: snapshot.groups.map((g) => g.kitId) } },
  });
  const rows = [
    ...products.map((p) => ({
      policy: p.checkoutPolicy,
      active: p.active && p.availability !== "UNAVAILABLE",
      consult: snapshot.lines.some(
        (l) => l.productId === p.id && l.priceKind === "CONSULT",
      ),
    })),
    ...kits.map((k) => ({
      policy: k.checkoutPolicy,
      active: k.active,
      consult: false,
    })),
  ];
  const eligibility = resolveCheckoutEligibility(rows);
  if (
    eligibility.blocked ||
    !eligibility.deliveryModes.includes(draft.delivery.mode)
  )
    throw new AppError(
      "CONFLICT",
      eligibility.reasons.join(" ") ||
        "Escolha uma modalidade de entrega disponível.",
    );
  const appearance = await getPublicAppearance(tx);
  const pickupAddress =
    draft.delivery.mode === "PICKUP" ? appearance.address : "";
  if (draft.delivery.mode === "PICKUP" && !pickupAddress.trim())
    throw new AppError(
      "CONFLICT",
      "A equipe precisa cadastrar o local de retirada.",
    );
  const reasons = [...eligibility.reasons];
  if (draft.delivery.mode !== "PICKUP")
    reasons.push("O frete será definido pela equipe antes da confirmação.");
  const instructions = [
    ...new Set(
      rows
        .map((r) => readCheckoutPolicy(r.policy).externalPaymentInstructions)
        .filter(Boolean),
    ),
  ].join("\n");
  const discount = snapshot.groups
    .reduce((sum, g) => sum.plus(g.price.discount ?? 0), new Decimal(0))
    .toFixed(2);
  const total = snapshot.consultCount
    ? null
    : snapshot.lines
        .reduce((sum, l) => sum.plus(l.subtotal ?? 0), new Decimal(0))
        .minus(discount)
        .toFixed(2);
  // Every commercial line must fit the existing document contract without truncation.
  if (snapshot.lines.some((l) => checkoutLineDescription(l).length > 1000))
    reasons.push("A equipe precisa revisar a descrição comercial.");
  const route = reasons.length ? "REVIEW" : "DIRECT";
  return {
    route,
    lines: snapshot.lines,
    groups: snapshot.groups,
    delivery: draft.delivery,
    pickupAddress,
    shipping: draft.delivery.mode === "PICKUP" ? "0.00" : null,
    discount,
    total: draft.delivery.mode === "PICKUP" ? total : null,
    paymentTerms: instructions,
    installments:
      route === "DIRECT" && total
        ? [{ number: 1, amount: total, dueDate: todaySaoPaulo(new Date()) }]
        : [],
    reasons,
    deliveryModes: eligibility.deliveryModes,
    contact: draft.contact,
  };
}
export function checkoutLineDescription(
  line: CheckoutReviewContent["lines"][number],
): string {
  return [
    line.name,
    line.color && `Cor: ${line.color}`,
    line.size && `Tamanho: ${line.size}`,
    ...line.answerLabels.map((a) => `${a.label}: ${a.valueLabel}`),
    line.included && `Inclui: ${line.included}`,
  ]
    .filter(Boolean)
    .join("\n");
}
