"use client";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import type { AssessmentDTO } from "@/domain/profitability/types";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Comparison, moneyText } from "./detail";
export function AssessmentHistory({
  saleId,
  items,
  currentHash,
  onDone,
}: {
  saleId: string;
  items: AssessmentDTO[];
  currentHash: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    key = useRef<string | null>(null);
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    key.current ??= crypto.randomUUID();
    try {
      await api("/api/profitability/assessments", {
        saleId,
        operationKey: key.current,
      });
      key.current = null;
      onDone();
    } catch (e) {
      if (e instanceof ApiError && !["NETWORK", "INTERNAL"].includes(e.code))
        key.current = null;
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Apurações registradas</CardTitle>
        <CardDescription>
          A visão atual acompanha novas correções. Cada apuração preserva os
          dados observados no momento do registro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={save} disabled={busy}>
          {busy ? "Registrando…" : "Registrar apuração"}
        </Button>
        {error ? <Notice>{error}</Notice> : null}
        {!items.length ? (
          <p>Nenhuma apuração registrada.</p>
        ) : (
          items.map((i) => (
            <details key={i.id} className="py-3">
              <summary>
                {new Date(i.createdAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}{" "}
                · contribuição {moneyText(i.result.actual.contribution.value)} ·{" "}
                {i.factsHash === currentHash
                  ? "Fontes atuais"
                  : "Fontes anteriores"}
              </summary>
              <p>
                Dados observados em{" "}
                {new Date(i.input.readAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
              <Comparison
                expected={i.result.expected}
                actual={i.result.actual}
                compositionMissing={i.result.compositionMissing}
              />
            </details>
          ))
        )}
      </CardContent>
    </Card>
  );
}
