import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import type {
  CatalogLineOrigin,
  CatalogRequestDTO,
} from "@/domain/catalog-requests/types";
import type { QuoteDTO } from "@/domain/commerce/types";
import { quoteSchema } from "@/domain/commerce/validation";
import { saveQuoteWithClient } from "@/server/commerce/quote-write";
import { getQuote } from "@/server/quotes";
import { getCatalogRequestWithClient } from "./queries";
import { lockCatalogRequest } from "./service";
const schema = z
  .object({
    expectedVersion: z.number().int().positive(),
    document: quoteSchema,
    sources: z
      .array(
        z
          .object({
            lineId: z.string().min(1).max(100),
            sourceLineId: z.string().min(1).max(100),
            standalone: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();
export async function prepareRequestQuote(
  actor: Actor,
  id: string,
  raw: unknown,
): Promise<{ request: CatalogRequestDTO; quote: QuoteDTO }> {
  const result = await db.$transaction(
    async (tx) => {
      const row = await lockCatalogRequest(tx, id);
      if (row.quoteId)
        return {
          quoteId: row.quoteId,
          request: await getCatalogRequestWithClient(tx, id),
          quote: null,
        };
      const input = schema.parse(raw);
      if (row.version !== input.expectedVersion) throw conflict();
      if (row.state !== "EM_ATENDIMENTO" || !row.assigneeId)
        throw new AppError(
          "CONFLICT",
          "Inicie o atendimento antes de preparar o orçamento.",
        );
      const attendants = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "User" WHERE id=${row.assigneeId} AND active=true FOR SHARE`;
      if (!attendants.length)
        throw new AppError(
          "VALIDATION",
          "O responsável foi desativado. Escolha uma pessoa ativa antes de preparar.",
        );
      const detail = await getCatalogRequestWithClient(tx, id);
      if (
        input.sources.length !== detail.lines.length ||
        input.document.items.length !== detail.lines.length ||
        new Set(input.sources.map((s) => s.sourceLineId)).size !==
          detail.lines.length ||
        new Set(input.sources.map((s) => s.lineId)).size !== detail.lines.length
      )
        throw new AppError(
          "VALIDATION",
          "Revise a origem de cada linha recebida, sem omitir ou repetir itens.",
        );
      const ids = [
        ...new Set(detail.lines.map((line) => line.productId)),
      ].sort();
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "Product" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`,
      );
      const activeProducts = await tx.product.findMany({
        where: { id: { in: ids }, active: true },
        select: { id: true },
      });
      const items = input.document.items.map((item) => {
        const source = input.sources.find((s) => s.lineId === item.lineId);
        const line = detail.lines.find(
          (line) => line.lineId === source?.sourceLineId,
        );
        if (!source || !line)
          throw new AppError("VALIDATION", "Origem da linha não encontrada.");
        const active = activeProducts.some(
          (product) => product.id === line.productId,
        );
        if (
          active
            ? item.productId !== line.productId || source.standalone
            : !!item.productId || !source.standalone
        )
          throw new AppError(
            "VALIDATION",
            "Produto retirado exige confirmação de item avulso; revise o vínculo de cada linha.",
          );
        const catalogOrigin: CatalogLineOrigin = {
          schemaVersion: 1,
          requestId: id,
          sourceLineId: line.lineId,
          snapshot: line,
        };
        return { ...item, catalogOrigin };
      });
      const quote = await saveQuoteWithClient(tx, actor, undefined, {
        ...input.document,
        items,
      });
      await tx.catalogRequest.update({
        where: { id },
        data: {
          quoteId: quote.id,
          state: "ORCAMENTO_PREPARADO",
          version: { increment: 1 },
          events: {
            create: {
              action: "PREPARE_QUOTE",
              note: quote.number,
              actorId: actor.id,
              actorName: actor.name,
            },
          },
        },
      });
      return {
        quoteId: quote.id,
        request: await getCatalogRequestWithClient(tx, id),
        quote,
      };
    },
    { timeout: 20000 },
  );
  return {
    request: result.request,
    quote: result.quote ?? (await getQuote(actor, result.quoteId)),
  };
}
