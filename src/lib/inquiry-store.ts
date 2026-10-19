"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  inquiryItemsSchema,
  mergeInquiryItem,
  type InquiryInput,
} from "@/domain/products/inquiry";
import {
  parseInquiryDraft,
  migrateInquiryV1,
  INQUIRY_MAX_BYTES,
  byteLength,
  inquiryEnvelopeSchema,
} from "@/domain/products/inquiry-draft";
const key = "b2t:inquiry:v2",
  legacyKey = "b2t:inquiry:v1",
  event = "b2t:inquiry-change";
const empty = '{"formatVersion":2,"items":[]}';
let fallback = empty;
let warning = "";
let invalidRaw: string | null = null;
let memoryOnly = false;
function emit() {
  window.dispatchEvent(new Event(event));
}
function snapshot() {
  if (memoryOnly) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return raw;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      let migrated: string;
      try {
        migrated = JSON.stringify(
          migrateInquiryV1(legacy, () => crypto.randomUUID()),
        );
      } catch {
        return legacy;
      }
      fallback = migrated;
      try {
        localStorage.setItem(key, migrated);
      } catch {
        memoryOnly = true;
        warning =
          "Sua lista está apenas na memória. Ela pode não sobreviver à recarga.";
      }
      return migrated;
    }
    return fallback;
  } catch {
    warning =
      "Não foi possível acessar a lista salva. Ela foi preservada; use a recuperação ou tente novamente.";
    return fallback;
  }
}
function statusSnapshot() {
  const raw = snapshot();
  const parsed = parseInquiryDraft(raw);
  invalidRaw = parsed.status === "invalid" ? raw : null;
  return invalidRaw !== null
    ? "Não foi possível ler sua lista salva. Copie a recuperação antes de reiniciar."
    : warning;
}
function subscribe(listener: () => void) {
  const storage = (e: StorageEvent) => {
    if (e.key === legacyKey) {
      warning =
        "Uma aba antiga alterou a lista. Atualize essa aba para usar a versão atual.";
      listener();
    } else if (e.key === key || e.key === null) {
      fallback = empty;
      memoryOnly = false;
      listener();
    }
  };
  window.addEventListener("storage", storage);
  window.addEventListener(event, listener);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(event, listener);
  };
}
export function writeInquiry(items: InquiryInput[]) {
  const raw = snapshot();
  if (parseInquiryDraft(raw).status === "invalid")
    throw new Error("Recupere ou reinicie a lista salva antes de alterá-la.");
  const rows = inquiryItemsSchema
    .parse(items)
    .map((i) => ({ ...i, lineId: i.lineId ?? crypto.randomUUID() }));
  const value = JSON.stringify(
    inquiryEnvelopeSchema.parse({ formatVersion: 2, items: rows }),
  );
  if (byteLength(value) > INQUIRY_MAX_BYTES)
    throw new Error("A lista excede o espaço permitido. Reduza os textos.");
  fallback = value;
  try {
    localStorage.setItem(key, value);
    warning = "";
  } catch {
    memoryOnly = true;
    warning =
      "Sua lista está apenas na memória. Ela pode não sobreviver à recarga.";
  }
  emit();
}
export function readInquiry() {
  const raw = snapshot();
  const parsed = parseInquiryDraft(raw);
  if (parsed.status === "invalid")
    throw new Error("Lista salva inválida. Use a recuperação.");
  return parsed.envelope.items;
}
export function addInquiry(item: InquiryInput) {
  writeInquiry(mergeInquiryItem(readInquiry(), item));
}
export function resetInquiry() {
  try {
    localStorage.removeItem(legacyKey);
  } catch {}
  try {
    localStorage.removeItem(key);
  } catch {}
  fallback = empty;
  memoryOnly = true;
  invalidRaw = null;
  warning = "";
  writeInquiry([]);
}
export function inquiryRecoveryText() {
  return invalidRaw ?? snapshot();
}
export function useInquiry() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => empty);
  return useMemo(() => {
    const p = parseInquiryDraft(raw);
    return p.status === "valid" ? p.envelope.items : [];
  }, [raw]);
}
export function useInquiryStorageStatus() {
  return useSyncExternalStore(subscribe, statusSnapshot, () => "");
}
