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
export function readRequestAttempt(): PendingAttempt | ConfirmedAttempt | null {
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
  memory = attempt;
  try {
    sessionStorage.setItem(key, JSON.stringify(attempt));
    return { storage: "session" };
  } catch {
    if (attempt.kind === "confirmed") {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Browser denied erasure too. */
      }
    }
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
    canonicalSubmission({ attemptKey: "", contact, items: [item] });
  const sent = new Set(submitted.map(identity));
  return current.filter((item) => !sent.has(identity(item)));
}
