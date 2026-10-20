"use client";
import {
  inquiryItemSchema,
  type InquiryInput,
} from "@/domain/products/inquiry";
import { byteLength, INQUIRY_MAX_BYTES } from "@/domain/products/inquiry-draft";
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
    return inquiryItemSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
export function writeConfigurationDraft(id: string, draft: InquiryInput) {
  const raw = JSON.stringify(inquiryItemSchema.parse(draft));
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
