"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client-api";
import type { OpportunityDTO } from "@/domain/opportunities/types";
import { Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
export function useOpportunityCommand(id?: string) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false);
  const pending = useRef(false),
    retry = useRef<{ payload: string; key: string } | null>(null);
  async function run(
    payload: Record<string, unknown>,
  ): Promise<OpportunityDTO | null> {
    if (pending.current) return null;
    pending.current = true;
    setBusy(true);
    setError("");
    setConflict(false);
    const signature = JSON.stringify({ id: id ?? null, payload });
    if (retry.current?.payload !== signature)
      retry.current = { payload: signature, key: crypto.randomUUID() };
    try {
      const result = await api<OpportunityDTO>(
        id ? `/api/opportunities/${id}/commands` : "/api/opportunities",
        { ...payload, operationKey: retry.current.key },
      );
      retry.current = null;
      return result;
    } catch (e) {
      setError((e as Error).message);
      setConflict(e instanceof ApiError && e.code === "CONFLICT");
      return null;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { run, busy, error, conflict };
}
export function CommandError({
  error,
  conflict,
}: {
  error: string;
  conflict: boolean;
}) {
  const router = useRouter();
  return error ? (
    <div
      tabIndex={-1}
      ref={(node) => {
        node?.focus();
      }}
    >
      <Notice>{error}</Notice>
      {conflict ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => router.refresh()}
        >
          Recarregar dados atuais
        </Button>
      ) : null}
    </div>
  ) : null;
}
