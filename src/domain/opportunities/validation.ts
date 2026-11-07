import { z } from "zod";
import { civilDateSchema } from "@/domain/commerce/validation";
import { paginationSchema } from "@/domain/shared/pagination";
import { openStages } from "./types";
const id = z.string().trim().min(1).max(160);
const next = {
  nextAction: z.string().trim().min(1).max(500),
  nextContactDate: civilDateSchema,
};
export const opportunityFieldsSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    customerId: id,
    ownerId: id,
    stage: z.enum(openStages),
    ...next,
    pendingNotes: z.string().trim().max(4000),
  })
  .strict();
const key = { operationKey: z.string().min(8).max(160) };
const command = { ...key, expectedVersion: z.number().int().positive() };
const reason = z.string().trim().min(3).max(2000);
const trackedContact = {
  ...command,
  quoteId: id,
  quoteVersion: z.number().int().positive(),
  text: z.string().trim().min(1).max(4000),
};
export const opportunityCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("PROPOSAL_SENT"), ...trackedContact }).strict(),
  z.object({ action: z.literal("CUSTOMER_REPLY"), ...trackedContact }).strict(),
  z
    .object({
      action: z.literal("CREATE"),
      ...key,
      fields: opportunityFieldsSchema.extend({
        stage: z.enum(["CONTATO", "LEVANTAMENTO"]),
      }),
    })
    .strict(),
  z
    .object({
      action: z.literal("UPDATE"),
      ...command,
      fields: opportunityFieldsSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("INTERACTION"),
      ...command,
      text: z.string().trim().min(1).max(4000),
    })
    .strict(),
  z
    .object({ action: z.literal("LINK_QUOTE"), ...command, quoteId: id })
    .strict(),
  z
    .object({ action: z.literal("SET_PRIMARY"), ...command, quoteId: id })
    .strict(),
  z.object({ action: z.literal("LOSE"), ...command, reason }).strict(),
  z
    .object({ action: z.literal("REOPEN"), ...command, reason, ...next })
    .strict(),
]);
export type OpportunityCommand = z.infer<typeof opportunityCommandSchema>;
export const opportunityFilterSchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  owner: id.default("todos"),
  stage: z
    .enum(["abertas", "todas", ...openStages, "GANHO", "PERDIDO"])
    .default("abertas"),
  due: z.enum(["todas", "atrasadas", "hoje"]).default("todas"),
  customerId: id.optional(),
});
export type OpportunityFilter = z.infer<typeof opportunityFilterSchema>;
export const candidateFilterSchema = paginationSchema
  .extend({
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    customerId: id.optional(),
    opportunityId: id.optional(),
  })
  .refine(
    (v) => !!(v.customerId || v.opportunityId),
    "Informe o cliente ou oportunidade.",
  );
