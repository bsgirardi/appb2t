"use client";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import {
  catalogSubmissionSchema,
  attemptKeySchema,
} from "@/domain/catalog-requests/validation";
import { canonicalSubmission } from "@/domain/catalog-requests/identity";
import type {
  CatalogReceipt,
  CatalogSubmission,
} from "@/domain/catalog-requests/types";
import type { InquiryItem } from "@/domain/products/inquiry";
import { parseKitSelection } from "@/domain/kits/selection";
import type { KitSelection } from "@/domain/kits/types";
export type PendingAttempt = {
  kind: "pending";
  payload: CatalogSubmission;
  createdAt: string;
};
export type ConfirmedAttempt = {
  kind: "confirmed";
  attemptKey: string;
  receipt: CatalogReceipt;
};
const key = "b2t:request:attempt:v1";
let memory: PendingAttempt | ConfirmedAttempt | null | undefined;
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((listener) => listener());
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function snapshot() {
  try {
    return readStoredRequestAttempt();
  } catch {
    return "corrupt" as const;
  }
}
export function useRequestAttempt() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
const schema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("pending"),
      payload: catalogSubmissionSchema,
      createdAt: z.iso.datetime(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("confirmed"),
      attemptKey: attemptKeySchema,
      receipt: z
        .object({
          protocol: z.string().regex(/^SOL-\d{6,}$/),
          acceptedAt: z.iso.datetime(),
          received: z.literal(true),
        })
        .strict(),
    })
    .strict(),
]);
function readStoredRequestAttempt(): PendingAttempt | ConfirmedAttempt | null {
  if (memory !== undefined) return memory;
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  const parsed = schema.safeParse(
    (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success)
    throw Error(
      "Não foi possível ler a recuperação desta aba. Não a substituímos.",
    );
  memory = parsed.data;
  return memory;
}
export function readRequestAttempt(): PendingAttempt | ConfirmedAttempt | null {
  const stored = readStoredRequestAttempt();
  return stored ? structuredClone(stored) : null;
}
export function createRequestAttempt(
  input: Omit<CatalogSubmission, "attemptKey">,
): PendingAttempt {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const attemptKey = Array.from(bytes, (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return {
    kind: "pending",
    payload: catalogSubmissionSchema.parse({ ...input, attemptKey }),
    createdAt: new Date().toISOString(),
  };
}
function persist(attempt: PendingAttempt | ConfirmedAttempt): {
  storage: "session" | "memory";
} {
  const copy = schema.parse(attempt);
  memory = copy;
  try {
    sessionStorage.setItem(key, JSON.stringify(copy));
    publish();
    return { storage: "session" };
  } catch {
    if (attempt.kind === "confirmed") {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Browser denied erasure too. */
      }
    }
    publish();
    return { storage: "memory" };
  }
}
export function writeRequestAttempt(attempt: PendingAttempt): {
  storage: "session" | "memory";
} {
  const existing = readRequestAttempt();
  if (existing && JSON.stringify(existing) !== JSON.stringify(attempt))
    throw Error(
      "Há uma tentativa nesta aba. Verifique seu recebimento antes de iniciar outra.",
    );
  return persist(attempt);
}
export function confirmRequestAttempt(receipt: CatalogReceipt): void {
  const existing = readRequestAttempt();
  if (!existing) throw Error("Tentativa não encontrada.");
  persist({
    kind: "confirmed",
    attemptKey:
      existing.kind === "pending"
        ? existing.payload.attemptKey
        : existing.attemptKey,
    receipt,
  });
}
export function discardRequestAttempt(): void {
  memory = null;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Current session continues in memory. */
  }
  publish();
}
export function clearSubmittedLines(
  current: InquiryItem[],
  submitted: InquiryItem[],
): InquiryItem[] {
  const contact = {
    name: "Selection",
    preferredChannel: "email" as const,
    email: "",
    phone: "",
  };
  const identity = (item: InquiryItem) =>
    JSON.stringify([
      item.kitInstanceId ?? null,
      canonicalSubmission({ attemptKey: "", contact, items: [item] }),
    ]);
  const sent = new Set(submitted.map(identity));
  return current.filter(
    (item) => !!item.kitInstanceId || !sent.has(identity(item)),
  );
}
export function clearSubmittedSelection(
  current: KitSelection,
  submitted: KitSelection,
): KitSelection {
  const now = parseKitSelection(current),
    sent = parseKitSelection(submitted);
  const contact = {
    name: "Selection",
    preferredChannel: "email" as const,
    email: "",
    phone: "",
  };
  const groupIdentity = (selection: KitSelection, id: string) =>
    canonicalSubmission({
      attemptKey: "",
      contact,
      schemaVersion: 2,
      items: selection.items.filter((i) => i.kitInstanceId === id),
      groups: selection.groups.filter((g) => g.instanceId === id),
    });
  const removed = new Set(
    now.groups
      .filter(
        (g) =>
          sent.groups.some((s) => s.instanceId === g.instanceId) &&
          groupIdentity(now, g.instanceId) ===
            groupIdentity(sent, g.instanceId),
      )
      .map((g) => g.instanceId),
  );
  const items = clearSubmittedLines(
    now.items,
    sent.items.filter((i) => !i.kitInstanceId),
  ).filter((i) => !i.kitInstanceId || !removed.has(i.kitInstanceId));
  return parseKitSelection({
    schemaVersion: 2,
    items,
    groups: now.groups.filter((g) => !removed.has(g.instanceId)),
  });
}
