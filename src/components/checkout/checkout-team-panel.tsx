"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { newCheckoutKey } from "@/domain/checkout/attempt";
import { splitInstallments } from "@/domain/commerce/installments";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import type { CheckoutTeamDTO } from "@/server/checkout/team";
import type { CheckoutDraft } from "@/domain/checkout/types";
export function CheckoutTeamPanel({ checkoutId }: { checkoutId: string }) {
  const [data, setData] = useState<CheckoutTeamDTO>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [reason, setReason] = useState("");
  const [count, setCount] = useState(1);
  const [due, setDue] = useState(() => todaySaoPaulo(new Date()));
  const [delivery, setDelivery] = useState<CheckoutDraft["delivery"]>();
  const issueKey = useRef("");
  async function refresh() {
    const d = await api<CheckoutTeamDTO>(`/api/checkouts/${checkoutId}`);
    setData(d);
    setDelivery(d.review.delivery);
  }
  useEffect(() => {
    let active = true;
    api<CheckoutTeamDTO>(`/api/checkouts/${checkoutId}`)
      .then((d) => {
        if (active) {
          setData(d);
          setDelivery(d.review.delivery);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [checkoutId]);
  async function action(path: string, body: unknown, method = "POST") {
    setBusy(true);
    setError("");
    try {
      await api(`/api/checkouts/${checkoutId}${path}`, body, method);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function issue() {
    setBusy(true);
    setError("");
    try {
      if (!issueKey.current) issueKey.current = newCheckoutKey();
      const result = await api<{ url: string }>(
        `/api/checkouts/${checkoutId}/access`,
        {
          action: "ISSUE",
          expectedVersion: data!.version,
          operationKey: issueKey.current,
        },
      );
      setLink(result.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function publish() {
    if (!data?.quote) return;
    try {
      const total = (data.quote.totals as { total: string }).total;
      void action("/offer", {
        expectedQuoteVersion: data.quote.version,
        operationKey: newCheckoutKey(),
        installments: splitInstallments(total, count, due),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Checkout do catálogo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <Alert role="alert">{error}</Alert>}
        {data && (
          <>
            <p>
              Estado: {data.state} · {data.receipt?.protocol}
            </p>
            <p>
              Possíveis cadastros com o mesmo contato: {data.possibleDuplicates}
              . Confira o cliente antes de preparar o orçamento.
            </p>
            {data.saleId && (
              <Link href={`/vendas/${data.saleId}`}>Abrir venda vinculada</Link>
            )}
            {data.requestId && (
              <Link href={`/solicitacoes/${data.requestId}`}>
                Abrir atendimento
              </Link>
            )}
            {data.quote && (
              <Link href={`/orcamentos/${data.quote.id}`}>
                Revisar preço, frete, prazo, condições e emissão do orçamento
              </Link>
            )}
            <p className="break-words">
              Entrega solicitada:{" "}
              {data.review.delivery.mode === "PICKUP"
                ? data.review.pickupAddress
                : Object.values(data.review.delivery.address)
                    .filter(Boolean)
                    .join(", ")}
            </p>
            {!data.saleId && data.state !== "CLOSED" && delivery && (
              <fieldset className="flex flex-col gap-3">
                <legend>Conferir entrega com o cliente</legend>
                <Label htmlFor={`team-mode-${checkoutId}`}>Modalidade</Label>
                <NativeSelect
                  id={`team-mode-${checkoutId}`}
                  value={delivery.mode}
                  onChange={(e) =>
                    setDelivery(
                      e.target.value === "PICKUP"
                        ? { mode: "PICKUP" }
                        : {
                            mode: "TEAM_SHIPPING",
                            address: {
                              recipient: data.review.contact.name,
                              postalCode: "",
                              street: "",
                              number: "",
                              complement: "",
                              district: "",
                              city: "",
                              state: "",
                            },
                          },
                    )
                  }
                >
                  {data.review.deliveryModes
                    .filter((m) => m !== "AUTOMATIC")
                    .map((m) => (
                      <option key={m} value={m}>
                        {m === "PICKUP" ? "Retirada" : "Frete pela equipe"}
                      </option>
                    ))}
                </NativeSelect>
                {delivery.mode !== "PICKUP" &&
                  (
                    Object.keys(
                      delivery.address,
                    ) as (keyof typeof delivery.address)[]
                  ).map((k) => (
                    <Field
                      key={k}
                      label={
                        {
                          recipient: "Destinatário",
                          postalCode: "CEP",
                          street: "Rua",
                          number: "Número",
                          complement: "Complemento",
                          district: "Bairro",
                          city: "Cidade",
                          state: "UF",
                        }[k]
                      }
                      value={delivery.address[k]}
                      onChange={(e) =>
                        setDelivery({
                          ...delivery,
                          address: { ...delivery.address, [k]: e.target.value },
                        })
                      }
                    />
                  ))}
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void action(
                      "",
                      { expectedVersion: data.version, delivery },
                      "PATCH",
                    )
                  }
                >
                  Salvar entrega e retirar oferta anterior
                </Button>
              </fieldset>
            )}
            {data.quote && !data.saleId && data.state !== "CLOSED" && (
              <fieldset className="flex flex-col gap-3">
                <legend>Disponibilizar orçamento revisado ao cliente</legend>
                <p>
                  Confira frete e entrega antes de publicar. O orçamento deve
                  estar emitido e vigente.
                </p>
                <Field
                  label="Quantidade de parcelas"
                  type="number"
                  min={1}
                  max={120}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
                <Field
                  label="Primeiro vencimento"
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
                <Button disabled={busy} onClick={publish}>
                  Publicar total e parcelas para aceite
                </Button>
              </fieldset>
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" disabled={busy} onClick={issue}>
                Emitir link privado
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  issueKey.current = "";
                  setLink("");
                  void action("/access", {
                    action: "REVOKE",
                    expectedVersion: data.version,
                    operationKey: newCheckoutKey(),
                  });
                }}
              >
                Revogar links
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void refresh().catch((e) => setError(e.message))}
              >
                Atualizar checkout
              </Button>
            </div>
            {link && (
              <div className="flex flex-col gap-3">
                <Field
                  label="Link privado para compartilhar manualmente"
                  value={link}
                  readOnly
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(link)
                      .catch(() => setError("Selecione e copie o link."))
                  }
                >
                  Copiar link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    issueKey.current = "";
                    void issue();
                  }}
                >
                  Renovar link e revogar o anterior
                </Button>
              </div>
            )}
            <Field
              label="Motivo ou resposta ao cliente"
              value={reason}
              maxLength={2000}
              onChange={(e) => setReason(e.target.value)}
            />
            {data.state === "OFFERED" && (
              <Button
                variant="outline"
                disabled={busy || reason.trim().length < 3}
                onClick={() =>
                  void action("/withdrawal", {
                    expectedVersion: data.version,
                    reason,
                  })
                }
              >
                Retirar oferta de confirmação
              </Button>
            )}
            {data.cancellation && (
              <Alert>
                Solicitação de cancelamento: {data.cancellation.reason} ·{" "}
                {data.cancellation.state} {data.cancellation.response}
              </Alert>
            )}
            {data.cancellation?.state === "PENDING" && (
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy || reason.trim().length < 3}
                  onClick={() =>
                    void action("/cancellation", {
                      expectedVersion: data.version,
                      decision: "COMPLETE",
                      reason,
                    })
                  }
                >
                  Concluir cancelamento após conferência
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || reason.trim().length < 3}
                  onClick={() =>
                    void action("/cancellation", {
                      expectedVersion: data.version,
                      decision: "DECLINE",
                      reason,
                    })
                  }
                >
                  Responder sem cancelar
                </Button>
              </div>
            )}
            <details>
              <summary>Histórico do checkout</summary>
              <ul>
                {data.events.map((e, i) => (
                  <li key={i} className="break-words">
                    {e.action} · {e.actorName} · {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
