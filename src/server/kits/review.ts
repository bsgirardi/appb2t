import Decimal from "decimal.js";
import { AppError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";
import { calculateKitPrice } from "@/domain/kits/pricing";
import { kitDiscountTiersSchema } from "@/domain/kits/validation";
import type {
  KitSelection,
  KitSelectionReview,
  KitGroupReview,
} from "@/domain/kits/types";
import { reviewProductLinesWithClient } from "@/server/inquiry-lines";
import { lockKitCatalog } from "./locks";
import { kitInclude } from "./queries";
export async function reviewKitSelectionWithClient(
  tx: Prisma.TransactionClient,
  selection: KitSelection,
): Promise<KitSelectionReview> {
  await lockKitCatalog(
    tx,
    selection.items.map((i) => i.productId),
    selection.groups.map((g) => g.kitId),
  );
  const base = await reviewProductLinesWithClient(tx, {
    items: selection.items,
  });
  const kits = await tx.catalogKit.findMany({
    where: { id: { in: selection.groups.map((g) => g.kitId) } },
    include: kitInclude,
  });
  const groups = selection.groups.map((group): KitGroupReview => {
    const kit = kits.find((k) => k.id === group.kitId),
      lines = base.lines.filter((l) => l.kitInstanceId === group.instanceId);
    let problem =
      !kit || !kit.active
        ? "Este kit foi retirado do catálogo. Revise a montagem."
        : lines.some(
              (l) => !kit.products.some((p) => p.productId === l.productId),
            )
          ? "Uma peça não é mais permitida neste kit."
          : lines.some((l) => l.problem || !l.configuredPrice)
            ? "Revise os componentes deste kit."
            : null;
    let price = null;
    if (!problem && kit)
      try {
        price = calculateKitPrice(
          lines.map((l) => ({
            quantity: l.quantity,
            price: l.configuredPrice!,
          })),
          kitDiscountTiersSchema.parse(kit.tiers),
        );
      } catch (error) {
        problem =
          error instanceof Error ? error.message : "Revise os valores do kit.";
      }
    return {
      ...group,
      name: kit?.name ?? "Kit indisponível",
      currentRevision: kit?.commercialRevision ?? null,
      price,
      problem,
      requiresConfirmation:
        !problem &&
        (group.commercialRevision !== kit?.commercialRevision ||
          JSON.stringify(group.seenPrice) !== JSON.stringify(price)),
    };
  });
  let known = new Decimal(0);
  for (const line of base.lines)
    if (!line.kitInstanceId && !line.problem && line.subtotal !== null)
      known = known.plus(line.subtotal);
  for (const group of groups)
    if (
      !group.problem &&
      group.price?.total !== null &&
      group.price?.total !== undefined
    )
      known = known.plus(group.price.total);
  if (known.gt("9999999999999999.99"))
    throw new AppError(
      "CONFLICT",
      "O valor excede o limite permitido. Reduza a seleção.",
    );
  const consultCount = base.consultCount ?? 0;
  return {
    lines: base.lines,
    groups,
    knownTotal: known.toFixed(2),
    total:
      consultCount ||
      groups.some((g) => g.problem) ||
      base.lines.some((l) => l.problem)
        ? null
        : known.toFixed(2),
    consultCount,
    ready:
      base.ready && groups.every((g) => !g.problem && !g.requiresConfirmation),
  };
}
