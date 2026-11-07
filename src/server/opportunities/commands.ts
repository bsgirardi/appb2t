import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { lockOperation } from "@/server/commerce/locks";
import { lockPlanning } from "@/server/planning/coordination";
import { civilDateToDb } from "@/domain/commerce/dates";
import { opportunityCommandSchema } from "@/domain/opportunities/validation";
import {
  assertOpportunityTransition,
  isOpportunityOpen,
} from "@/domain/opportunities/states";
import { readOpportunity } from "./read";
import { opportunityEvent } from "./audit";
import {
  linkOpportunityQuote,
  assertNoActiveOpportunityOffers,
} from "./commerce";
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value));
export async function executeOpportunityCommand(
  actor: Actor,
  id: string | undefined,
  raw: unknown,
) {
  const input = opportunityCommandSchema.parse(raw);
  if ((input.action === "CREATE") !== !id)
    throw new AppError(
      "VALIDATION",
      "Comando incompatível com a oportunidade.",
    );
  // Parsed schemas supply stable property ordering; type and target participate in the hash.
  const payloadHash = createHash("sha256")
    .update(JSON.stringify({ id: id ?? null, input }))
    .digest("hex");
  const key = `opportunity:${actor.id}:${input.operationKey}`;
  return db.$transaction(
    async (tx) => {
      await lockOperation(tx, key);
      await lockPlanning(tx);
      if (
        !(await tx.user.findFirst({
          where: {
            id: actor.id,
            active: true,
            role: { in: ["ADMIN", "OPERATOR"] },
          },
        }))
      )
        throw new AppError("FORBIDDEN", "Usuário inativo.");
      const prior = await tx.opportunityOperation.findUnique({
        where: { key },
      });
      if (prior) {
        if (prior.type !== input.action || prior.payloadHash !== payloadHash)
          throw conflict();
        return prior.result as unknown as Awaited<
          ReturnType<typeof readOpportunity>
        >;
      }
      let opportunityId = id;
      let before: Awaited<ReturnType<typeof readOpportunity>> | null = null;
      if (id) {
        await tx.$queryRaw`SELECT id FROM "Opportunity" WHERE id=${id} FOR UPDATE`;
        before = await readOpportunity(tx, id);
        if (
          input.action === "CREATE" ||
          before.version !== input.expectedVersion
        )
          throw conflict();
      }
      if (input.action === "CREATE" || input.action === "UPDATE") {
        const f = input.fields;
        if (
          (!before || before.customerId !== f.customerId) &&
          !(await tx.customer.findFirst({
            where: { id: f.customerId, active: true },
          }))
        )
          throw new AppError("VALIDATION", "Selecione um cliente ativo.");
        if (
          (!before || before.ownerId !== f.ownerId) &&
          !(await tx.user.findFirst({
            where: {
              id: f.ownerId,
              active: true,
              role: { in: ["ADMIN", "OPERATOR"] },
            },
          }))
        )
          throw new AppError("VALIDATION", "Selecione um responsável ativo.");
        if (before) {
          assertOpportunityTransition(
            before.stage,
            f.stage,
            !!before.principalQuoteId,
          );
          if (before.quotes.length && before.customerId !== f.customerId)
            throw new AppError(
              "CONFLICT",
              "O cliente não pode mudar após vincular um orçamento.",
            );
        }
        const data = {
          ...f,
          nextContactDate: civilDateToDb(f.nextContactDate),
        };
        if (input.action === "CREATE")
          opportunityId = (await tx.opportunity.create({ data })).id;
        else
          await tx.opportunity.update({ where: { id: opportunityId! }, data });
      } else {
        if (!before || !opportunityId) throw conflict();
        if (
          input.action !== "INTERACTION" &&
          input.action !== "REOPEN" &&
          !isOpportunityOpen(before.stage)
        )
          throw new AppError("CONFLICT", "A oportunidade está encerrada.");
        switch (input.action) {
          case "PROPOSAL_SENT":
          case "CUSTOMER_REPLY": {
            const quote = before.quotes.find((q) => q.id === input.quoteId);
            if (
              before.principalQuoteId !== input.quoteId ||
              !quote ||
              quote.version !== input.quoteVersion
            )
              throw new AppError(
                "CONFLICT",
                "O orçamento principal ou sua versão mudou. Recarregue a negociação.",
              );
            if (
              input.action === "PROPOSAL_SENT" &&
              !["ENVIADO", "APROVADO"].includes(quote.status)
            )
              throw new AppError(
                "VALIDATION",
                "Registre envio somente de proposta principal emitida e vigente.",
              );
            break;
          }
          case "INTERACTION":
            break;
          case "REOPEN":
            if (before.stage !== "PERDIDO") throw conflict();
            await tx.opportunity.update({
              where: { id: opportunityId },
              data: {
                stage: "LEVANTAMENTO",
                lossReason: null,
                nextAction: input.nextAction,
                nextContactDate: civilDateToDb(input.nextContactDate),
              },
            });
            break;
          case "LOSE":
            await assertNoActiveOpportunityOffers(tx, opportunityId);
            await tx.opportunity.update({
              where: { id: opportunityId },
              data: {
                stage: "PERDIDO",
                lossReason: input.reason,
                nextAction: null,
                nextContactDate: null,
              },
            });
            break;
          case "LINK_QUOTE":
            await linkOpportunityQuote(tx, actor, opportunityId, input.quoteId);
            break;
          case "SET_PRIMARY":
            if (!before.quotes.some((q) => q.id === input.quoteId))
              throw new AppError(
                "VALIDATION",
                "O orçamento principal precisa estar vinculado.",
              );
            await tx.opportunity.update({
              where: { id: opportunityId },
              data: { principalQuoteId: input.quoteId },
            });
            break;
        }
      }
      if (before)
        await tx.opportunity.update({
          where: { id: opportunityId! },
          data: { version: { increment: 1 } },
        });
      const result = await readOpportunity(tx, opportunityId!);
      const editable = (o: typeof result | null) =>
        o
          ? {
              title: o.title,
              customerId: o.customerId,
              customerName: o.customer.name,
              ownerId: o.ownerId,
              ownerName: o.owner.name,
              stage: o.stage,
              nextAction: o.nextAction,
              nextContactDate: o.nextContactDate,
              pendingNotes: o.pendingNotes,
              lossReason: o.lossReason,
              principalQuoteId: o.principalQuoteId,
              wonSaleId: o.wonSale?.id ?? null,
            }
          : null;
      await opportunityEvent(
        tx,
        actor,
        opportunityId!,
        input.action,
        json({
          before: editable(before),
          after: editable(result),
          ...("text" in input ? { text: input.text } : {}),
          ...("quoteVersion" in input
            ? { quoteVersion: input.quoteVersion }
            : {}),
          ...("reason" in input ? { reason: input.reason } : {}),
          ...("quoteId" in input ? { quoteId: input.quoteId } : {}),
        }),
      );
      await tx.opportunityOperation.create({
        data: { key, type: input.action, payloadHash, result: json(result) },
      });
      return result;
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
