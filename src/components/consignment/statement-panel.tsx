"use client";
import Link from "next/link";
import { useState } from "react";
import { Field, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type {
  StatementDTO,
  StatementPreviewDTO,
} from "@/server/consignment/statements";
import { api } from "@/lib/client-api";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { Section, CommandForm, money } from "./shared";
export function StatementPanel({
  partnerId,
  statements,
  onSaved,
}: {
  partnerId: string;
  statements: StatementDTO[];
  onSaved: () => void;
}) {
  const [competence, setCompetence] = useState(
      todaySaoPaulo(new Date()).slice(0, 7),
    ),
    [preview, setPreview] = useState<StatementPreviewDTO | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Section
      title="Acertos periódicos"
      description="Fechar agrupa as vendas e seus títulos. O dinheiro só entra ou sai quando você registra uma baixa no financeiro."
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Competência do acerto"
          disabled={busy}
          type="month"
          required
          value={competence}
          onChange={(e) => {
            setCompetence(e.target.value);
            setPreview(null);
          }}
        />
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              setPreview(
                await api(
                  `/api/consignment/statements/preview?partnerId=${encodeURIComponent(partnerId)}&competence=${encodeURIComponent(competence)}`,
                ),
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Conferir vendas do período
        </Button>
        {error && <Notice>{error}</Notice>}
        {preview && (
          <Section
            title="Conferência antes do fechamento"
            description={`${preview.lines.length} vendas elegíveis. Relatos posteriores formarão um acerto complementar.`}
          >
            <p>
              Bruto: {money(preview.totals.gross)} · Comissão:{" "}
              {money(preview.totals.commission)}
            </p>
            <p>
              Repasse: {money(preview.totals.receivable)} · Comissão separada a
              pagar: {money(preview.totals.payable)}
            </p>
            <ul>
              {preview.lines.map((l) => (
                <li key={l.id}>
                  {l.reference} · repasse{" "}
                  {money(l.finance?.expectedRepayment ?? "0")}
                </li>
              ))}
            </ul>
            {!!preview.lines.length && (
              <CommandForm
                area="statements"
                label="Confirmar fechamento do acerto"
                onSaved={() => {
                  setPreview(null);
                  onSaved();
                }}
                build={() => ({
                  type: "CLOSE",
                  partnerId,
                  competence: preview.competence,
                  fingerprint: preview.fingerprint,
                })}
              >
                <p>Os valores serão conferidos novamente no servidor.</p>
              </CommandForm>
            )}
          </Section>
        )}
        {statements.map((s) => (
          <Section
            key={s.id}
            title={`Acerto ${s.sequence} · ${s.competence}`}
            description={
              s.state === "QUITADO"
                ? "Quitado"
                : s.state === "PARCIAL"
                  ? "Parcialmente quitado"
                  : s.state === "CANCELADO"
                    ? "Cancelado"
                    : "Fechado com valores pendentes"
            }
          >
            <ul>
              {s.lines.map((l) => (
                <li key={l.id}>
                  {l.consignmentSale.reference}
                  {l.consignmentSale.saleId && (
                    <>
                      {" "}
                      ·{" "}
                      <Link href={`/vendas/${l.consignmentSale.saleId}`}>
                        Ver venda
                      </Link>
                    </>
                  )}
                  <ul>
                    {l.finance?.links.map((e) => (
                      <li key={e.id}>
                        <Link href={`/financeiro/lancamentos?entryId=${e.id}`}>
                          {e.role === "REPASSE" ? "Repasse" : "Comissão"}:{" "}
                          {money(e.amount)}
                        </Link>{" "}
                        · baixado {money(e.settled)} · pendente{" "}
                        {money(e.remaining)}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {s.status !== "CANCELED" && (
              <CommandForm
                area="statements"
                label="Cancelar fechamento"
                onSaved={onSaved}
                build={(d) => ({
                  type: "CANCEL",
                  id: s.id,
                  expectedVersion: s.version,
                  reason: String(d.get("reason")),
                })}
                description="Para corrigir uma venda, primeiro estorne as baixas e cancele seu fechamento. Os títulos continuam vinculados à venda."
              >
                <Field
                  label="Motivo do cancelamento do acerto"
                  name="reason"
                  minLength={3}
                  maxLength={2000}
                  required
                />
              </CommandForm>
            )}
          </Section>
        ))}
      </div>
    </Section>
  );
}
