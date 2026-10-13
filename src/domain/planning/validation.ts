import { z } from "zod";
import { stockQuantity, commandMeta } from "@/domain/stock/validation";
import { civilDateSchema } from "@/domain/commerce/validation";
export const planningMeta = {
  ...commandMeta,
  expectedRevision: z.number().int().nonnegative(),
};
const id = z.string().min(1).max(100);
export const batchStateSchema = z.enum([
  "DRAFT",
  "PENDING",
  "SCHEDULED",
  "PREPARING",
  "PRINTING",
  "AWAITING_REMOVAL",
  "CLOSED",
  "CANCELED",
]);
export const batchSchema = z
  .object({
    ...planningMeta,
    id: id.optional(),
    printerId: id,
    participants: z
      .array(
        z
          .object({
            lineId: id,
            units: z.number().int().min(1).max(2147483647),
          })
          .strict(),
      )
      .min(1)
      .max(100)
      .refine((v) => new Set(v.map((x) => x.lineId)).size === v.length),
    materialItemId: id,
    colorLabel: z.string().trim().min(1).max(100),
    profileConfirmed: z.boolean().default(false),
    fitConfirmed: z.boolean().default(false),
    durationMinutes: stockQuantity.nullable(),
    durationConfirmed: z.boolean().default(false),
    prepareMinutes: stockQuantity,
    removeMinutes: stockQuantity,
  })
  .strict();
const interval = z
  .object({
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .strict()
  .refine((v) => v.endMinute > v.startMinute);
const intervals = z
  .array(interval)
  .max(24)
  .refine((v) => {
    const sorted = [...v].sort((a, b) => a.startMinute - b.startMinute);
    return sorted.every(
      (x, i) => !i || x.startMinute >= sorted[i - 1].endMinute,
    );
  }, "Horários sobrepostos.");
export const calendarSchema = z
  .object({
    ...planningMeta,
    resource: z.enum(["TEAM", "PRINTER"]),
    printerId: id.nullable(),
    weekly: z
      .array(
        z
          .object({
            weekday: z.number().int().min(1).max(7),
            startMinute: z.number().int().min(0).max(1439),
            endMinute: z.number().int().min(1).max(1440),
          })
          .strict(),
      )
      .max(168),
    exceptions: z
      .array(z.object({ date: civilDateSchema, intervals }).strict())
      .max(1000),
  })
  .strict()
  .refine(
    (v) => (v.resource === "PRINTER") === Boolean(v.printerId),
    "Confira o recurso do calendário.",
  )
  .refine(
    (v) =>
      Array.from({ length: 7 }, (_, i) => i + 1).every(
        (day) =>
          intervals.safeParse(
            v.weekly
              .filter((w) => w.weekday === day)
              .map(({ startMinute, endMinute }) => ({
                startMinute,
                endMinute,
              })),
          ).success,
      ),
    "Horários sobrepostos ou inválidos.",
  )
  .refine(
    (v) =>
      new Set(v.exceptions.map((e) => e.date)).size === v.exceptions.length,
    "Data repetida.",
  );
export type BatchInput = z.infer<typeof batchSchema>;
export type CalendarInput = z.infer<typeof calendarSchema>;
