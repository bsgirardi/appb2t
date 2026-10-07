"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/field";
import { api } from "@/lib/client-api";
import type { StockItemDTO, listMovements } from "@/server/stock/queries";
import { kinds, dateLabel } from "./ledger-labels";
type Result = Awaited<ReturnType<typeof listMovements>>;
export function Ledger({
  item,
  admin,
  onCorrect,
}: {
  item: StockItemDTO;
  admin: boolean;
  onCorrect: (source: { id: string; kind: string }) => void;
}) {
  const [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState("");
  async function load(page: number) {
    try {
      setResult(
        await api<Result>(
          `/api/stock/movements?itemId=${item.id}&page=${page}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const rows = result?.items ?? item.movements;
  return (
    <section className="space-y-3">
      <h3>Razão de movimentos</h3>
      {error && <Notice>{error}</Notice>}
      {rows.map((m) => (
        <div key={m.id} className="rounded border p-3">
          <div className="flex flex-wrap justify-between gap-2">
            <strong>
              {kinds[m.kind] ?? m.kind} · {m.quantity}
            </strong>
            <span>{dateLabel(m.effectiveDate)}</span>
          </div>
          <p className="break-words">{m.reason || "Sem observação"}</p>
          <small className="break-all text-muted-foreground">
            Responsável: {m.actorId} ·{" "}
            {new Date(m.createdAt).toLocaleString("pt-BR")}
          </small>
          {(m.kind === "CONSUMPTION" || (admin && m.kind === "RECEIPT")) && (
            <div>
              <Button variant="outline" onClick={() => onCorrect(m)}>
                Registrar devolução
              </Button>
            </div>
          )}
        </div>
      ))}
      {rows.length === 0 && <p>Nenhum movimento registrado.</p>}
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={!result || result.page === 1}
          onClick={() => void load((result?.page ?? 1) - 1)}
        >
          Anteriores
        </Button>
        <Button
          variant="outline"
          disabled={!!result && result.page * result.pageSize >= result.total}
          onClick={() => void load(result ? result.page + 1 : 1)}
        >
          {result ? "Próximos" : "Consultar histórico paginado"}
        </Button>
      </div>
    </section>
  );
}
