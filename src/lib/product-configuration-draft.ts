"use client";
import { z } from "zod";
import { configurationAnswerSchema } from "@/domain/products/configuration";
import {
  inquiryItemSchema,
  type InquiryInput,
} from "@/domain/products/inquiry";
import { byteLength, INQUIRY_MAX_BYTES } from "@/domain/products/inquiry-draft";
// Incomplete form state is recoverable; commercial validation happens on save.
const draftSchema = inquiryItemSchema
  .omit({ quantity: true, answers: true })
  .extend({
    quantity: z.number().finite().nullable(),
    answers: z
      .array(
        z
          .object({
            fieldId: configurationAnswerSchema.shape.fieldId,
            value: z.string(),
          })
          .strict(),
      )
      .max(8)
      .default([]),
  });
const memory = new Map<string, string>();
const memoryOnly = new Set<string>();
const key = (id: string) => `b2t:configuration:v1:${id}`;
export function readConfigurationDraft(id: string) {
  let raw: string | null;
  try {
    raw = memoryOnly.has(id)
      ? (memory.get(id) ?? null)
      : (sessionStorage.getItem(key(id)) ?? memory.get(id) ?? null);
  } catch {
    raw = memory.get(id) ?? null;
  }
  if (!raw) return null;
  try {
    if (byteLength(raw) > INQUIRY_MAX_BYTES) return null;
    const draft = draftSchema.parse(JSON.parse(raw));
    return { ...draft, quantity: draft.quantity ?? Number.NaN };
  } catch {
    return null;
  }
}
export function writeConfigurationDraft(id: string, draft: InquiryInput) {
  const raw = JSON.stringify(
    draftSchema.parse({
      ...draft,
      quantity: Number.isFinite(draft.quantity) ? draft.quantity : null,
    }),
  );
  if (byteLength(raw) > INQUIRY_MAX_BYTES)
    throw new Error("Rascunho muito grande.");
  memory.set(id, raw);
  try {
    sessionStorage.setItem(key(id), raw);
    memoryOnly.delete(id);
    return "";
  } catch {
    memoryOnly.add(id);
    return "Rascunho apenas na memória; pode ser perdido ao recarregar.";
  }
}
export function clearConfigurationDraft(id: string) {
  memory.delete(id);
  try {
    sessionStorage.removeItem(key(id));
  } catch {
    memory.set(id, "");
    memoryOnly.add(id);
  }
}
