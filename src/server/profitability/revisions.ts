import { Prisma, type ProfitabilityRevision } from "@prisma/client";
import { AppError, conflict } from "@/lib/errors";
import { revisionSchema } from "@/domain/profitability/validation";
import type {
  AdministrativePayload,
  RevisionDTO,
} from "@/domain/profitability/types";
import { civilDateToDb, civilDateFromDb } from "@/domain/commerce/dates";
import type { Actor } from "@/server/auth/session";
import { lockCommerce } from "@/server/commerce/locks";
import { runProfitabilityCommand } from "./commands";
import { StockDecimal as D } from "@/domain/stock/quantities";
export const revisionDTO = (r: ProfitabilityRevision): RevisionDTO => ({
  ...r,
  payload: r.payload as unknown as AdministrativePayload,
  createdAt: r.createdAt.toISOString(),
  effectiveDate: civilDateFromDb(r.effectiveDate),
});
export async function saveProfitabilityRevision(
  actor: Actor,
  raw: unknown,
): Promise<RevisionDTO> {
  const v = revisionSchema.parse(raw);
  return runProfitabilityCommand(actor, "REVISION", v, async (tx) => {
    await lockCommerce(tx, { saleId: v.saleId });
    const sale = await tx.sale.findUnique({
      where: { id: v.saleId },
      include: { items: true },
    });
    if (!sale) throw new AppError("NOT_FOUND", "Venda não encontrada.");
    if (sale.status === "RASCUNHO")
      throw new AppError(
        "VALIDATION",
        "Confirme a venda antes da conferência.",
      );
    const previous = await tx.profitabilityState.findUnique({
      where: { saleId: v.saleId },
    });
    if ((previous?.version ?? 0) !== v.expectedVersion) throw conflict();
    const keys = new Set(sale.items.map((i) => i.lineKey ?? `legacy:${i.id}`));
    if (
      [
        ...v.payload.extras,
        ...v.payload.confirmations,
        ...v.payload.lineReviews,
      ].some((x) => !keys.has(x.lineKey))
    )
      throw new AppError("VALIDATION", "A linha não pertence à venda.");
    if (v.payload.channel) {
      const c = await tx.pricingChannel.findUnique({
        where: { id: v.payload.channel.id },
      });
      if (!c || c.version !== v.payload.channel.version) throw conflict();
      v.payload.channel = { id: c.id, version: c.version, name: c.name };
    }
    if (v.payload.confirmations.length || v.payload.lineReviews.length) {
      const { readSaleSources } = await import("./sources");
      const [source] = await readSaleSources(tx, [v.saleId]);
      const portions = new Map<string, InstanceType<typeof D>>();
      const complements = new Set<string>();
      for (const review of v.payload.lineReviews) {
        if (
          review.complete &&
          source.lines.find((l) => l.key === review.lineKey)?.sourceHash !==
            review.sourceHash
        )
          throw conflict();
      }
      for (const c of v.payload.confirmations) {
        const line = source.lines.find((l) => l.key === c.lineKey)!;
        if (!line.expected?.extras.some((e) => e.key === c.extraKey))
          throw new AppError(
            "VALIDATION",
            "Extra não pertence à memória desta linha.",
          );
        if (c.kind === "U3_SOURCE") {
          const used = (portions.get(c.sourceId) ?? new D(0)).plus(c.value);
          const available = line.actual.sources.find(
            (s) => s.id === c.sourceId && s.kind === "DELIVERED",
          )?.value;
          if (available == null || used.gt(available))
            throw new AppError(
              "VALIDATION",
              "A parcela excede o custo produtivo da fonte.",
            );
          portions.set(c.sourceId, used);
        }
        if (c.kind === "COMPLEMENT") {
          if (complements.has(c.complementId))
            throw new AppError(
              "VALIDATION",
              "Complemento já utilizado em outra conferência.",
            );
          complements.add(c.complementId);
        }
      }
    }
    for (const c of v.payload.confirmations) {
      if (
        c.kind === "COMPLEMENT" &&
        !v.payload.extras.some(
          (e) => e.id === c.complementId && e.lineKey === c.lineKey,
        )
      )
        throw new AppError("VALIDATION", "Complemento não pertence à linha.");
      if (c.kind === "U3_SOURCE") {
        const source = await tx.productionDeliveryLine.findFirst({
          where: {
            id: c.sourceId,
            lineKey: c.lineKey,
            delivery: { saleId: v.saleId },
          },
        });
        if (!source)
          throw new AppError(
            "VALIDATION",
            "Fonte produtiva não pertence à linha.",
          );
      }
    }
    const r = await tx.profitabilityRevision.create({
      data: {
        saleId: v.saleId,
        version: v.expectedVersion + 1,
        predecessorId: previous?.currentRevisionId,
        actorId: actor.id,
        effectiveDate: civilDateToDb(v.effectiveDate),
        reason: v.reason,
        payload: v.payload as Prisma.InputJsonValue,
      },
    });
    await tx.profitabilityState.upsert({
      where: { saleId: v.saleId },
      create: { saleId: v.saleId, version: r.version, currentRevisionId: r.id },
      update: { version: r.version, currentRevisionId: r.id },
    });
    return revisionDTO(r);
  });
}
