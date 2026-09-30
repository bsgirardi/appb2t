"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MovementDTO,
  MovementTotals,
  AccountDTO,
} from "@/domain/finance/types";
import type { Page } from "@/domain/shared/pagination";
import { money, dateLabel, Pagination, ReversalForm } from "./shared";
export function MovementPanel({
  result,
  accounts,
  query,
}: {
  result: Page<MovementDTO> & { totals: MovementTotals };
  accounts: AccountDTO[];
  query: Record<string, string>;
}) {
  const router = useRouter(),
    [reversal, setReversal] = useState<string | null>(null);
  const labels = {
    RECEIPT: "Recebimento",
    PAYMENT: "Pagamento",
    TRANSFER: "Transferência",
    ADJUSTMENT: "Ajuste",
    REVERSAL: "Estorno",
  };
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Movimentos realizados</h1>
          <p>Histórico preservado. Correções são registradas por estorno.</p>
        </div>
        <a
          className="button secondary"
          href={`/api/finance/export?${new URLSearchParams(query)}`}
        >
          Exportar CSV
        </a>
      </div>
      <div className="finance-grid">
        {[
          ["Entradas", result.totals.incoming],
          ["Saídas", result.totals.outgoing],
          ["Transferências líquidas", result.totals.transfersNet],
          ["Ajustes líquidos", result.totals.adjustmentsNet],
        ].map(([name, value]) => (
          <div className="card finance-account" key={name}>
            <small>{name} · todos os registros filtrados</small>
            <strong className="finance-value">{money(value)}</strong>
          </div>
        ))}
      </div>
      {reversal && (
        <ReversalForm
          url={reversal}
          onCancel={() => setReversal(null)}
          onDone={() => {
            setReversal(null);
            router.refresh();
          }}
        />
      )}
      <div className="card table-scroll">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Conta</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Autor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((m) => (
              <tr key={m.id}>
                <td>{dateLabel(m.effectiveDate)}</td>
                <td>
                  {accounts.find((a) => a.id === m.accountId)?.name ?? "Conta"}
                </td>
                <td>{labels[m.kind]}</td>
                <td>{m.description}</td>
                <td>{money(m.amount)}</td>
                <td>{m.actorName}</td>
                <td>
                  {m.reversed && <span>Estornado</span>}
                  {m.kind === "ADJUSTMENT" && !m.reversed && (
                    <button
                      className="button secondary"
                      onClick={() =>
                        setReversal(`/api/finance/movements/${m.id}/reverse`)
                      }
                    >
                      Estornar ajuste
                    </button>
                  )}
                  {m.kind === "TRANSFER" && !m.reversed && (
                    <button
                      className="button secondary"
                      onClick={() =>
                        setReversal(
                          `/api/finance/transfers/${m.transferId}/reverse`,
                        )
                      }
                    >
                      Estornar transferência completa
                    </button>
                  )}
                  {m.settlementId && (
                    <span>Estorno pelo detalhe do lançamento</span>
                  )}
                  {m.kind === "REVERSAL" && <span>Registro de estorno</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.items.length && (
          <p className="commerce-form">Nenhum movimento encontrado.</p>
        )}
      </div>
      <Pagination result={result} base="/financeiro/movimentos" query={query} />
    </section>
  );
}
