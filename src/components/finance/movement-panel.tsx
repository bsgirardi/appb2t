"use client";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
        <Button asChild variant="outline">
          <a href={`/api/finance/export?${new URLSearchParams(query)}`}>
            Exportar CSV
          </a>
        </Button>
      </div>
      <div className="finance-grid">
        {[
          ["Entradas", result.totals.incoming],
          ["Saídas", result.totals.outgoing],
          ["Transferências líquidas", result.totals.transfersNet],
          ["Ajustes líquidos", result.totals.adjustmentsNet],
        ].map(([name, value]) => (
          <Card key={name} asChild>
            <div className="finance-account" >
              <small>{name} · todos os registros filtrados</small>
              <strong className="finance-value">{money(value)}</strong>
            </div>
          </Card>
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
      <Card asChild>
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{dateLabel(m.effectiveDate)}</TableCell>
                  <TableCell>
                    {accounts.find((a) => a.id === m.accountId)?.name ??
                      "Conta"}
                  </TableCell>
                  <TableCell>{labels[m.kind]}</TableCell>
                  <TableCell>{m.description}</TableCell>
                  <TableCell>{money(m.amount)}</TableCell>
                  <TableCell>{m.actorName}</TableCell>
                  <TableCell>
                    {m.reversed && <span>Estornado</span>}
                    {m.kind === "ADJUSTMENT" && !m.reversed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className=""
                        onClick={() =>
                          setReversal(`/api/finance/movements/${m.id}/reverse`)
                        }
                      >
                        Estornar ajuste
                      </Button>
                    )}
                    {m.kind === "TRANSFER" && !m.reversed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className=""
                        onClick={() =>
                          setReversal(
                            `/api/finance/transfers/${m.transferId}/reverse`,
                          )
                        }
                      >
                        Estornar transferência completa
                      </Button>
                    )}
                    {m.settlementId && (
                      <span>Estorno pelo detalhe do lançamento</span>
                    )}
                    {m.kind === "REVERSAL" && <span>Registro de estorno</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!result.items.length && (
            <p className="commerce-form">Nenhum movimento encontrado.</p>
          )}
        </div>
      </Card>
      <Pagination result={result} base="/financeiro/movimentos" query={query} />
    </section>
  );
}
