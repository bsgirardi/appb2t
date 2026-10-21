"use client";
import { useMemo, useSyncExternalStore } from "react";
import { mergeInquiryItem, type InquiryInput } from "@/domain/products/inquiry";
import {
  byteLength,
  INQUIRY_MAX_BYTES,
  ensureInquiryLineIds,
} from "@/domain/products/inquiry-draft";
import {
  parseKitDraft,
  migrateKitDraft,
  kitDraftSchema,
  type KitDraft,
} from "@/domain/kits/draft";
import type { KitSelection } from "@/domain/kits/types";
const key = "b2t:inquiry:v3",
  oldKey = "b2t:inquiry:v2",
  legacyKey = "b2t:inquiry:v1",
  event = "b2t:inquiry-change";
const empty = JSON.stringify({
  formatVersion: 3,
  revision: "empty",
  selection: { schemaVersion: 2, items: [], groups: [] },
});
let fallback = empty,
  activeRaw: string | null = null,
  warning = "",
  memoryOnly = false,
  invalidRaw: string | null = null;
let conflictRaw: string | undefined;
const emit = () => window.dispatchEvent(new Event(event));
function noteConflict(remote: string) {
  conflictRaw = remote;
  warning =
    "Outra aba alterou a montagem. Escolha qual versão manter antes de continuar.";
}
function snapshot(): string {
  if (memoryOnly || conflictRaw !== undefined) return activeRaw ?? fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      if (activeRaw !== null && raw !== activeRaw) {
        noteConflict(raw);
        return activeRaw;
      }
      activeRaw = raw;
      fallback = raw;
      return raw;
    }
    const legacy =
      localStorage.getItem(oldKey) ?? localStorage.getItem(legacyKey);
    if (legacy !== null) {
      let migrated: string;
      try {
        migrated = JSON.stringify(
          migrateKitDraft(legacy, () => crypto.randomUUID()),
        );
      } catch {
        activeRaw = legacy;
        return legacy;
      }
      const simultaneous = localStorage.getItem(key);
      if (simultaneous !== null) {
        activeRaw = simultaneous;
        fallback = simultaneous;
        return simultaneous;
      }
      activeRaw = migrated;
      fallback = migrated;
      try {
        localStorage.setItem(key, migrated);
        const after = localStorage.getItem(key);
        if (after !== null && after !== migrated) noteConflict(after);
      } catch {
        memoryOnly = true;
        warning =
          "Sua lista está apenas na memória. Ela pode não sobreviver à recarga.";
      }
      return migrated;
    }
    activeRaw = empty;
    fallback = empty;
    return empty;
  } catch {
    memoryOnly = true;
    warning =
      "Não foi possível acessar a lista salva. Os dados desta aba foram preservados na memória.";
    return activeRaw ?? fallback;
  }
}
function statusSnapshot() {
  const raw = snapshot();
  invalidRaw = parseKitDraft(raw).status === "invalid" ? raw : null;
  return invalidRaw !== null
    ? "Não foi possível ler sua lista salva. Copie a recuperação antes de reiniciar."
    : warning;
}
function subscribe(listener: () => void) {
  const storage = (e: StorageEvent) => {
    if (e.key === oldKey || e.key === legacyKey) {
      warning =
        "Uma aba antiga alterou a lista. Atualize essa aba para usar a versão atual.";
      listener();
    } else if (e.key === key || e.key === null) {
      const raw = e.key === null ? empty : (e.newValue ?? empty);
      if (activeRaw !== null && raw !== activeRaw) noteConflict(raw);
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
export function readKitDraft(): KitDraft {
  const parsed = parseKitDraft(snapshot());
  if (parsed.status !== "valid")
    throw new Error("Lista salva inválida. Use a recuperação.");
  return parsed.value;
}
export function readKitSelection(): KitSelection {
  return readKitDraft().selection;
}
function persist(selection: KitSelection) {
  const draft = kitDraftSchema.parse({
      formatVersion: 3,
      revision: crypto.randomUUID(),
      selection,
    }),
    value = JSON.stringify(draft);
  if (byteLength(value) > INQUIRY_MAX_BYTES)
    throw new Error("A lista excede o espaço permitido. Reduza os textos.");
  activeRaw = value;
  fallback = value;
  try {
    localStorage.setItem(key, value);
    memoryOnly = false;
    warning = "";
    const after = localStorage.getItem(key);
    if (after !== null && after !== value) noteConflict(after);
  } catch {
    memoryOnly = true;
    warning =
      "Sua lista está apenas na memória. Ela pode não sobreviver à recarga.";
  }
  emit();
}
export function writeKitSelection(
  selection: KitSelection,
  expectedRevision?: string,
) {
  const current = readKitDraft();
  if (conflictRaw !== undefined)
    throw new Error(
      "Outra aba alterou a montagem. Escolha uma versão antes de continuar.",
    );
  if (expectedRevision !== undefined && current.revision !== expectedRevision)
    throw new Error(
      "A montagem mudou nesta aba. Confira a versão atual antes de continuar.",
    );
  persist(selection);
}
export function writeInquiry(items: InquiryInput[]) {
  const current = readKitDraft(),
    rows = ensureInquiryLineIds(items, () => crypto.randomUUID());
  const groups = current.selection.groups.flatMap((group) => {
    const members = rows.filter((i) => i.kitInstanceId === group.instanceId);
    if (!members.length) return [];
    const placements = members.map(
      (i, index) =>
        group.placements.find((p) => p.lineId === i.lineId) ?? {
          lineId: i.lineId!,
          x: 0.5,
          y: 0.5,
          z: index,
        },
    );
    const before = current.selection.items.filter(
      (i) => i.kitInstanceId === group.instanceId,
    );
    return [
      {
        ...group,
        placements,
        seenPrice:
          JSON.stringify(before) === JSON.stringify(members)
            ? group.seenPrice
            : null,
      },
    ];
  });
  writeKitSelection(
    { schemaVersion: 2, items: rows, groups },
    current.revision,
  );
}
export function readInquiry() {
  return readKitSelection().items;
}
export function addInquiry(item: InquiryInput) {
  writeInquiry(mergeInquiryItem(readInquiry(), item));
}
export function resetInquiry() {
  for (const storageKey of [key, oldKey, legacyKey])
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  activeRaw = empty;
  fallback = empty;
  conflictRaw = undefined;
  invalidRaw = null;
  warning = "";
  memoryOnly = true;
  persist({ schemaVersion: 2, items: [], groups: [] });
}
export function inquiryRecoveryText() {
  return invalidRaw ?? snapshot();
}
export function inquiryConflictText() {
  snapshot();
  return conflictRaw === undefined
    ? null
    : { local: activeRaw ?? fallback, remote: conflictRaw };
}
export function resolveInquiryConflict(choice: "local" | "remote") {
  if (conflictRaw === undefined) return;
  const raw = choice === "local" ? (activeRaw ?? fallback) : conflictRaw,
    parsed = parseKitDraft(raw);
  if (parsed.status !== "valid")
    throw new Error(
      "Esta versão não pôde ser lida. Copie a recuperação antes de reiniciar.",
    );
  conflictRaw = undefined;
  invalidRaw = null;
  warning = "";
  if (choice === "local") persist(parsed.value.selection);
  else {
    activeRaw = raw;
    fallback = raw;
    memoryOnly = false;
    emit();
  }
}
export function useKitSelection() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => empty);
  return useMemo(() => {
    const parsed = parseKitDraft(raw);
    return parsed.status === "valid"
      ? parsed.value.selection
      : { schemaVersion: 2 as const, items: [], groups: [] };
  }, [raw]);
}
export function useInquiry() {
  return useKitSelection().items;
}
export function useInquiryStorageStatus() {
  return useSyncExternalStore(subscribe, statusSnapshot, () => "");
}
