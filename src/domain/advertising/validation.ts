import { z } from "zod";
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Preencha este campo.")
    .max(max)
    .refine((s) => !s.includes("\0"), "Remova caracteres inválidos.");
const id = text(100);
const version = z.number().int().positive();
export const adChannelSchema = z.enum(["INSTAGRAM", "WHATSAPP"]);
export const adFieldsSchema = z
  .object({
    internalName: text(120),
    title: text(120),
    body: text(5000),
    imageIds: z
      .array(id)
      .min(1)
      .max(10)
      .refine((ids) => new Set(ids).size === ids.length, "Fotos repetidas."),
  })
  .strict();
export const adCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("CREATE"),
      operationKey: z.string().regex(/^[a-zA-Z0-9_-]{16,100}$/),
      productId: id,
      channel: adChannelSchema,
      internalName: text(120),
    })
    .strict(),
  z
    .object({
      action: z.literal("UPDATE"),
      expectedVersion: version,
      fields: adFieldsSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("REVIEW"),
      expectedVersion: version,
      confirmed: z.literal(true),
    })
    .strict(),
  ...(["UNREVIEW", "ARCHIVE", "RESTORE", "REFRESH_KEEP"] as const).map(
    (action) =>
      z
        .object({ action: z.literal(action), expectedVersion: version })
        .strict(),
  ),
  z
    .object({
      action: z.literal("REFRESH_REGENERATE"),
      expectedVersion: version,
      confirmedReplacement: z.literal(true),
    })
    .strict(),
]);
export const adVersionSchema = z.object({ expectedVersion: version }).strict();
export const adQuerySchema = z
  .object({
    search: z.string().trim().max(100).default(""),
    channel: adChannelSchema.optional(),
    status: z.enum(["DRAFT", "REVIEWED", "ARCHIVED"]).optional(),
    page: z.coerce.number().int().min(1).max(99999).default(1),
  })
  .strict();
