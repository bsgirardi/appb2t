"use client";
import { useState, useRef, useId } from "react";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { api } from "@/lib/client-api";
import { calculatePricing } from "@/domain/pricing/calculate-fiscal";
import {
  resolveCatalogPricing,
  requestFromInput,
} from "@/domain/pricing/resolve";
import type {
  PricingCatalogDTO,
  PricingRequest,
  PricingV2Input,
  PricingChannelDTO,
} from "@/domain/pricing/types";
export type PricingDraftOptions = {
  catalog: PricingCatalogDTO;
  initialInput?: PricingV2Input;
  initialRequest?: PricingRequest;
  onApply: (request: PricingRequest) => Promise<void>;
  applyLabel?: string;
  fixedQuantity?: number;
  canManageChannels?: boolean;
};
const emptyRef = { id: "", version: 1 };
function initial(c: PricingCatalogDTO): PricingRequest {
  return {
    ...(c.tax
      ? {
          tax: {
            competence: todaySaoPaulo(new Date()).slice(0, 7),
            operation: "PRODUCT" as const,
            expectedVersion: c.tax.version,
          },
        }
      : {}),
    technology: "FDM",
    quantity: 1,
    materials: [{ ref: emptyRef, consumptionPerUnit: "", fixedWaste: "0" }],
    printerRef: emptyRef,
    machineFixedMinutes: "",
    machineMinutesPerUnit: "0",
    setupMinutes: "0",
    finishingMinutesPerUnit: "0",
    extras: [],
    channelRef: emptyRef,
    mode: "MARKUP",
    informedUnitPrice: "0",
    expectedSettingsVersion: c.settings?.version ?? 1,
  };
}
export function usePricingDraft({
  catalog,
  initialInput,
  initialRequest,
  onApply,
  fixedQuantity,
}: PricingDraftOptions) {
  const [current, setCurrent] = useState(catalog),
    [review, setReview] = useState<PricingCatalogDTO | null>(null);
  const [draftState, setDraft] = useState<PricingRequest>(
    () =>
      initialRequest ??
      (initialInput
        ? (() => {
            const r = requestFromInput(
              initialInput,
              catalog.settings?.version ?? 1,
            );
            if (r.tax) r.tax.expectedVersion = catalog.tax?.version ?? 0;
            return r;
          })()
        : initial(catalog)),
  );
  const draft =
    fixedQuantity === undefined
      ? draftState
      : { ...draftState, quantity: fixedQuantity };
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [touched, setTouched] = useState(!!initialInput || !!initialRequest);
  const lock = useRef(false);
  const errorPrefix = useId();
  const patch = (next: Partial<PricingRequest>) => {
    setTouched(true);
    setDraft((d) => ({ ...d, ...next }));
  };
  let input: PricingV2Input | null = null,
    result: ReturnType<typeof calculatePricing> | null = null;
  const fieldErrors: Record<string, string> = {};
  let validationMessage = "";
  try {
    input = resolveCatalogPricing(current, draft);
    result = calculatePricing(input);
  } catch (e) {
    if (e instanceof z.ZodError) {
      for (const issue of e.issues) {
        let path = issue.path
          .join(".")
          .replace(/^printer\.ref/, "printerRef")
          .replace(/^channel\.ref/, "channelRef")
          .replace(/\.(id|version)$/, "");
        if (path === "materials") path = "materials.0.consumptionPerUnit";
        const message =
          path.endsWith(".ref") ||
          path === "printerRef" ||
          path === "channelRef"
            ? "Selecione uma referência válida."
            : issue.code === "too_big"
              ? `Use um valor de até ${issue.maximum}.`
              : issue.code === "too_small"
                ? `Use um valor a partir de ${issue.minimum}.`
                : issue.code === "invalid_type"
                  ? "Informe um valor válido."
                  : issue.message;
        fieldErrors[path] = fieldErrors[path] ?? message;
      }
    } else if (e instanceof AppError && e.fields) {
      Object.assign(fieldErrors, e.fields);
    } else
      validationMessage =
        e instanceof Error
          ? e.message
          : "Não foi possível calcular. Revise os dados.";
  }
  const fieldProps = (path: string) => ({
    "aria-invalid": (touched && !!fieldErrors[path]) || undefined,
    hint: touched ? fieldErrors[path] : undefined,
  });
  const selectProps = (path: string) => ({
    "aria-invalid": (touched && !!fieldErrors[path]) || undefined,
    "aria-describedby":
      touched && fieldErrors[path] ? `${errorPrefix}-${path}` : undefined,
  });
  const hint = (path: string) =>
    touched && fieldErrors[path] ? (
      <small
        id={`${errorPrefix}-${path}`}
        className="text-destructive"
        role="alert"
      >
        {fieldErrors[path]}
      </small>
    ) : null;
  const unit = draft.technology === "FDM" ? "g" : "ml";
  const materials = current.materials.filter(
      (m) => m.technology === draft.technology,
    ),
    printers = current.printers.filter(
      (p) => p.technology === draft.technology,
    );
  async function apply() {
    if (lock.current || !result) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onApply(draft);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function refresh() {
    setError("");
    try {
      setReview(await api<PricingCatalogDTO>("/api/pricing/catalog"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function accept() {
    if (!review) return;
    const ref = (list: { id: string; version: number }[], id: string) => {
      const row = list.find((r) => r.id === id);
      return row ? { id: row.id, version: row.version } : emptyRef;
    };
    setDraft((d) => ({
      ...d,
      expectedSettingsVersion: review.settings?.version ?? 1,
      tax: {
        competence: d.tax?.competence ?? todaySaoPaulo(new Date()).slice(0, 7),
        operation: d.tax?.operation ?? "PRODUCT",
        expectedVersion: review.tax?.version ?? 0,
      },
      materials: d.materials.map((m) => ({
        ...m,
        ref: ref(review.materials, m.ref.id),
      })),
      printerRef: ref(review.printers, d.printerRef.id),
      extras: d.extras.map((e) => ({
        ...e,
        ref: ref(review.extras, e.ref.id),
      })),
      channelRef: ref(review.channels, d.channelRef.id),
    }));
    setCurrent(review);
    setReview(null);
  }
  let comparisonInput: PricingV2Input | null = null;
  try {
    comparisonInput = {
      ...resolveCatalogPricing(current, { ...draft, mode: "INFORMED" }),
      mode: draft.mode,
    };
  } catch {
    /* Keep the comparison editor mounted while productive fields are invalid. */
  }
  return {
    addChannel: (channel: PricingChannelDTO) => {
      setCurrent((c) => ({
        ...c,
        channels: [
          ...c.channels.filter((row) => row.id !== channel.id),
          channel,
        ],
      }));
      setReview(null);
      patch({ channelRef: { id: channel.id, version: channel.version } });
    },
    current,
    review,
    setReview,
    draft,
    busy,
    error,
    touched,
    patch,
    input,
    comparisonInput,
    result,
    fieldErrors,
    validationMessage,
    fieldProps,
    selectProps,
    hint,
    unit,
    materials,
    printers,
    apply,
    refresh,
    accept,
  };
}
