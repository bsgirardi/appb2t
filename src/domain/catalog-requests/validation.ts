import { z } from "zod";
import { inquiryItemsSchema } from "@/domain/products/inquiry";
import type { CatalogSubmission } from "./types";
export const attemptKeySchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Tentativa inválida.");
const phone = z
  .string()
  .trim()
  .max(40)
  .transform((value, ctx) => {
    if (!value) return "";
    if (!/^\+?[\d ()-]+$/.test(value)) {
      ctx.addIssue({ code: "custom", message: "Informe um WhatsApp válido." });
      return z.NEVER;
    }
    let digits = value.replace(/\D/g, "");
    if (!value.startsWith("+") && [10, 11].includes(digits.length))
      digits = `55${digits}`;
    if (!/^[1-9]\d{7,14}$/.test(digits)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe um WhatsApp com DDI válido.",
      });
      return z.NEVER;
    }
    return digits;
  });
export const catalogContactSchema = z
  .object({
    name: z.string().trim().normalize("NFC").min(2).max(120),
    preferredChannel: z.enum(["whatsapp", "email"]),
    phone,
    email: z
      .union([z.literal(""), z.email().max(254)])
      .transform((v) => v.trim()),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.preferredChannel === "whatsapp" && !value.phone)
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Informe seu WhatsApp.",
      });
    if (value.preferredChannel === "email" && !value.email)
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Informe seu e-mail.",
      });
  });
export const catalogSubmissionSchema = z
  .object({
    attemptKey: attemptKeySchema,
    contact: catalogContactSchema,
    items: inquiryItemsSchema.refine(
      (items) => items.length > 0,
      "Adicione ao menos um item.",
    ),
  })
  .strict();
export function parseCatalogSubmission(raw: unknown): CatalogSubmission {
  return catalogSubmissionSchema.parse(raw);
}
const version = z.number().int().positive();
const assigneeId = z.string().min(1).max(100);
const note = z.string().trim().min(1).max(2000);
export const requestChangeSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("START"),
      expectedVersion: version,
      assigneeId,
    })
    .strict(),
  z
    .object({
      action: z.literal("REASSIGN"),
      expectedVersion: version,
      assigneeId,
    })
    .strict(),
  z
    .object({
      action: z.literal("REOPEN"),
      expectedVersion: version,
      assigneeId,
    })
    .strict(),
  z
    .object({ action: z.literal("NOTE"), expectedVersion: version, note })
    .strict(),
  z
    .object({ action: z.literal("CLOSE"), expectedVersion: version, note })
    .strict(),
]);
