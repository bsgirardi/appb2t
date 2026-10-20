"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/ui/field";
import { api } from "@/lib/client-api";
import { formatBRL } from "@/domain/calculation/calculate";
import type {
  CatalogRequestDTO,
  RequestChange,
} from "@/domain/catalog-requests/types";
import type { CustomerDTO } from "@/domain/customers/types";
import { RequestQuoteForm } from "./request-quote-form";
import { requestStateLabels } from "./request-panel";
const actionLabels: Record<string, string> = {
  RECEIVED: "Solicitação recebida",
  START: "Atendimento iniciado",
  REASSIGN: "Responsável alterado",
  NOTE: "Nota registrada",
  CLOSE: "Atendimento encerrado",
  REOPEN: "Atendimento reaberto",
  PREPARE_QUOTE: "Orçamento preparado",
};
export function RequestDetail({
  initial,
  users,
  actorId,
  customers,
}: {
  initial: CatalogRequestDTO;
  users: { id: string; name: string }[];
  actorId: string;
  customers: CustomerDTO[];
}) {
  const [request, setRequest] = useState(initial);
  const [assigneeId, setAssigneeId] = useState(initial.assigneeId ?? actorId);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const pending = useRef(false);
  const noteControl = useRef<HTMLTextAreaElement>(null);
  async function change(action: RequestChange["action"]) {
    if (pending.current) return;
    if (["NOTE", "CLOSE"].includes(action) && !note.trim()) {
      setError("Informe a nota ou o motivo antes de continuar.");
      noteControl.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = {
        action,
        expectedVersion: request.version,
        ...(["NOTE", "CLOSE"].includes(action) ? { note } : { assigneeId }),
      };
      setRequest(
        await api<CatalogRequestDTO>(
          `/api/requests/${request.id}/change`,
          payload,
        ),
      );
      if (["NOTE", "CLOSE"].includes(action)) setNote("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    try {
      const latest = await api<CatalogRequestDTO>(
        `/api/requests/${request.id}`,
      );
      setRequest(latest);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="commerce-page request-detail">
      <Link href="/solicitacoes">← Solicitações</Link>
      <h1>{request.protocol}</h1>
      <p>
        Estado: <strong>{requestStateLabels[request.state]}</strong>
      </p>
      <p>
        Recebida em{" "}
        {new Date(request.createdAt).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })}
        . Não confirma venda, pagamento ou reserva.
      </p>
      {error && <Notice>{error}</Notice>}
      <Button type="button" variant="outline" disabled={busy} onClick={refresh}>
        Atualizar estado
      </Button>
      <section>
        <h2>Contato recebido</h2>
        <p>{request.contact.name}</p>
        <p>
          Canal preferido:{" "}
          {request.contact.preferredChannel === "email" ? "E-mail" : "WhatsApp"}
        </p>
        <p>
          {request.contact.phone || "WhatsApp não informado"} ·{" "}
          {request.contact.email || "E-mail não informado"}
        </p>
      </section>
      <section>
        <h2>Seleção recebida</h2>
        <p>
          O registro abaixo preserva o que foi recebido, mesmo se o catálogo
          mudar.
        </p>
        {request.lines.map((line, index) => {
          const current = request.currentProducts.find(
            (product) => product.id === line.productId,
          );
          return (
            <article key={line.lineId} className="request-received-line">
              <h3>
                {index + 1}. {line.name}
              </h3>
              {line.sku && <p>Código: {line.sku}</p>}
              <p>
                Quantidade recebida: {line.quantity} · Cor:{" "}
                {line.color || "Não informada"} · Tamanho:{" "}
                {line.size || "Não informado"}
              </p>
              <dl>
                {line.answerLabels.map((a) => (
                  <div key={a.fieldId}>
                    <dt>{a.label}</dt>
                    <dd>{a.valueLabel}</dd>
                  </div>
                ))}
              </dl>
              <p>
                {line.unitPrice === null
                  ? "Sob consulta"
                  : `Referência unitária recebida: ${formatBRL(line.unitPrice)}`}
              </p>
              {line.subtotal !== null && (
                <p>Subtotal recebido: {formatBRL(line.subtotal)}</p>
              )}
              {line.included && <p>Incluído: {line.included}</p>}
              {line.leadTimeCondition && (
                <p>Condição de produção: {line.leadTimeCondition}</p>
              )}
              <p>Condição de pagamento recebida: {line.paymentTerms}</p>
              <p>
                Situação atual:{" "}
                {!current?.active
                  ? "Produto retirado do catálogo; exige revisão como item avulso."
                  : current.commercialRevision !== line.commercialRevision
                    ? "O catálogo mudou desde o recebimento. Revise os valores e condições."
                    : `${current.name} · ${current.availability === "UNAVAILABLE" ? "Indisponível" : "Publicado"}`}
              </p>
            </article>
          );
        })}
        <p>
          {request.knownTotal === null
            ? "Sem soma conhecida"
            : `Soma das referências recebidas: ${formatBRL(request.knownTotal)}`}
          {request.consultCount > 0 &&
            ` · ${request.consultCount} linha(s) sob consulta; sem total fechado.`}
        </p>
      </section>
      <section>
        <h2>Atendimento</h2>
        <p>Responsável atual: {request.assigneeName ?? "Não atribuído"}</p>
        {request.state !== "ORCAMENTO_PREPARADO" && (
          <Label>
            Responsável
            <NativeSelect
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Selecione</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </NativeSelect>
          </Label>
        )}
        <Label>
          Nota ou motivo
          <Textarea
            ref={noteControl}
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
          />
        </Label>
        <div className="form-actions">
          {request.state === "RECEBIDA" && (
            <Button
              type="button"
              disabled={busy}
              onClick={() => change("START")}
            >
              Iniciar atendimento
            </Button>
          )}
          {request.state === "EM_ATENDIMENTO" && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => change("REASSIGN")}
            >
              Trocar responsável
            </Button>
          )}
          {request.state === "ENCERRADA" && (
            <Button
              type="button"
              disabled={busy}
              onClick={() => change("REOPEN")}
            >
              Reabrir atendimento
            </Button>
          )}
          {["RECEBIDA", "EM_ATENDIMENTO"].includes(request.state) && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => change("CLOSE")}
            >
              Encerrar com motivo
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => change("NOTE")}
          >
            Registrar nota
          </Button>
        </div>
        {request.quoteId ? (
          <Button asChild>
            <Link href={`/orcamentos/${request.quoteId}`}>
              Abrir orçamento vinculado
            </Link>
          </Button>
        ) : request.state === "EM_ATENDIMENTO" && !preparing ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => setPreparing(true)}
          >
            Revisar para preparar orçamento
          </Button>
        ) : null}
        {preparing &&
          request.state === "EM_ATENDIMENTO" &&
          !request.quoteId && (
            <RequestQuoteForm
              request={request}
              initialCustomers={customers}
              onPrepared={(next) => {
                setRequest(next);
                setPreparing(false);
              }}
              onCancel={() => setPreparing(false)}
            />
          )}
      </section>
      <section>
        <h2>Histórico do atendimento</h2>
        <ol>
          {request.events.map((event) => (
            <li key={event.id}>
              {new Date(event.createdAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              · {event.actorName} ·{" "}
              {actionLabels[event.action] ?? "Atualização do atendimento"}
              {event.note && <p>{event.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
