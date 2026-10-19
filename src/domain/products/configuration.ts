import { z } from "zod";
import Decimal from "decimal.js";
export const normalizeConfigurationText = (value: string) =>
  value.normalize("NFC").trim();
const text = (max: number) =>
  z
    .string()
    .transform(normalizeConfigurationText)
    .refine((v) => [...v].length <= max, `Use até ${max} caracteres.`);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const amount = z
  .string()
  .regex(/^\d{1,16}(\.\d{1,2})?$/)
  .refine((v) => new Decimal(v).lte("9999999999999999.99"))
  .transform((v) => new Decimal(v).toFixed(2));
export const priceModeSchema = z.enum(["REFERENCE", "CONSULT"]);
export type PriceMode = z.infer<typeof priceModeSchema>;
export const priceEffectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("NONE") }).strict(),
  z.object({ kind: z.literal("ADD"), amount }).strict(),
  z.object({ kind: z.literal("CONSULT") }).strict(),
]);
export type PriceEffect = z.infer<typeof priceEffectSchema>;
const base = {
  id,
  label: text(60).refine(Boolean, "Informe o rótulo."),
  help: text(160),
  required: z.boolean(),
};
const option = z
  .object({
    id,
    label: base.label,
    effect: priceEffectSchema,
    imageId: id.nullable(),
  })
  .strict();
export const configurationFieldSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...base,
      type: z.literal("SHORT_TEXT"),
      maxLength: z.number().int().min(1).max(120),
      effect: priceEffectSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("LONG_TEXT"),
      maxLength: z.number().int().min(1).max(500),
      effect: priceEffectSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("SINGLE_CHOICE"),
      options: z
        .array(option)
        .min(1)
        .max(20)
        .refine(
          (v) => new Set(v.map((o) => o.id)).size === v.length,
          "Opções repetidas.",
        ),
    })
    .strict(),
]);
export const productConfigurationSchema = z
  .object({
    formatVersion: z.literal(1),
    included: text(1000),
    leadTimeCondition: text(240),
    fields: z
      .array(configurationFieldSchema)
      .max(8)
      .refine(
        (v) => new Set(v.map((f) => f.id)).size === v.length,
        "Campos repetidos.",
      ),
  })
  .strict();
export type ConfigurationField = z.infer<typeof configurationFieldSchema>;
export type ProductConfiguration = z.infer<typeof productConfigurationSchema>;
export const emptyProductConfiguration: ProductConfiguration = {
  formatVersion: 1,
  included: "",
  leadTimeCondition: "",
  fields: [],
};
export function readProductConfiguration(raw: unknown): ProductConfiguration {
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    Object.keys(raw).length === 0
  )
    return productConfigurationSchema.parse(emptyProductConfiguration);
  return productConfigurationSchema.parse(raw ?? emptyProductConfiguration);
}
export const configurationAnswerSchema = z
  .object({ fieldId: id, value: text(500) })
  .strict();
export const configurationAnswersSchema = z
  .array(configurationAnswerSchema)
  .max(8)
  .refine(
    (v) => new Set(v.map((a) => a.fieldId)).size === v.length,
    "Respostas repetidas.",
  );
export type ConfigurationAnswer = z.infer<typeof configurationAnswerSchema>;
export function validateAnswers(
  definition: ProductConfiguration,
  raw: unknown,
): ConfigurationAnswer[] {
  const config = productConfigurationSchema.parse(definition);
  const answers = configurationAnswersSchema.parse(raw);
  const issues: z.core.$ZodIssue[] = [];
  for (const a of answers)
    if (!config.fields.some((f) => f.id === a.fieldId))
      issues.push({
        code: "custom",
        path: [a.fieldId],
        message: "Campo não disponível.",
      });
  for (const field of config.fields) {
    const value = answers.find((a) => a.fieldId === field.id)?.value ?? "";
    const message = !value
      ? field.required
        ? "Preencha este campo."
        : null
      : field.type === "SINGLE_CHOICE"
        ? !field.options.some((o) => o.id === value)
          ? "Escolha uma opção disponível."
          : null
        : [...value].length > field.maxLength
          ? `Use até ${field.maxLength} caracteres.`
          : null;
    if (message) issues.push({ code: "custom", path: [field.id], message });
  }
  if (issues.length) throw new z.ZodError(issues);
  return answers
    .filter((a) => a.value)
    .sort((a, b) => a.fieldId.localeCompare(b.fieldId, "en"));
}
export function answerLabels(
  configuration: ProductConfiguration,
  answers: ConfigurationAnswer[],
) {
  return answers.map((a) => {
    const f = configuration.fields.find((f) => f.id === a.fieldId)!;
    return {
      fieldId: a.fieldId,
      label: f.label,
      valueLabel:
        f.type === "SINGLE_CHOICE"
          ? f.options.find((o) => o.id === a.value)!.label
          : a.value,
    };
  });
}
