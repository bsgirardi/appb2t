"use client";
import { useRef, useState } from "react";
import { units } from "./shared";
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
  const loading = useRef(false);
  const [busy, setBusy] = useState(false);
  async function load(page: number) {
    if (loading.current) return;
    loading.current = true;
    setBusy(true);
    try {
      setResult(
        await api<Result>(
          `/api/stock/movements?itemId=${item.id}&page=${page}`,
        ),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      loading.current = false;
      setBusy(false);
    }
  }
  const rows = result?.items ?? item.movements;
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-busy={busy}>
      <h3>Razão de movimentos</h3>
      {error && <Notice>{error}</Notice>}
      {busy && <p role="status">Carregando movimentos…</p>}
      {rows.map((m) => (
        <div key={m.id} className="rounded border p-3">
          <div className="flex flex-wrap justify-between gap-2">
            <strong>
              {kinds[m.kind] ?? m.kind} · {m.quantity} {units[item.unit]}
            </strong>
            <span>{dateLabel(m.effectiveDate)}</span>
          </div>
          <p className="break-words">{m.reason || "Sem observação"}</p>
          {m.sourceId && <p>Vinculado a uma movimentação anterior.</p>}
          {result?.items
            .find((row) => row.id === m.id)
            ?.allocations.map((allocation, index) => (
              <p key={`${allocation.identityId ?? "none"}-${index}`}>
                Rolo/lote: {allocation.label} · {allocation.quantity}{" "}
                {units[item.unit]}
              </p>
            ))}
          <small className="break-all text-muted-foreground">
            Responsável: {m.actorId} ·{" "}
            {new Date(m.createdAt).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
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
          disabled={busy || !result || result.page === 1}
          onClick={() => void load((result?.page ?? 1) - 1)}
        >
          Anteriores
        </Button>
        <Button
          variant="outline"
          disabled={
            busy || (!!result && result.page * result.pageSize >= result.total)
          }
          onClick={() => void load(result ? result.page + 1 : 1)}
        >
          {result ? "Próximos" : "Consultar histórico paginado"}
        </Button>
      </div>
    </section>
  );
}
