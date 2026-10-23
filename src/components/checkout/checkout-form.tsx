"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Alert } from "@/components/ui/alert";
import { RequestContactForm } from "@/components/products/request-contact-form";
import {
  useKitSelection,
  readKitSelection,
  writeKitSelection,
} from "@/lib/inquiry-store";
import { clearSubmittedSelection } from "@/lib/catalog-request-attempt";
import { api, ApiError } from "@/lib/client-api";
import type {
  CheckoutDraft,
  CheckoutReview,
  CheckoutReceipt,
  CheckoutPublicDetail,
} from "@/domain/checkout/types";
import type { KitSelection } from "@/domain/kits/types";
import { checkoutDraftSchema } from "@/domain/checkout/validation";
import {
  newCheckoutKey,
  saveCheckoutAttempt,
  clearCheckoutAttempt,
  readCheckoutAttempt,
} from "@/domain/checkout/attempt";
import { CheckoutSummary } from "./checkout-summary";
import { CheckoutContinuation } from "./checkout-continuation";
const emptyAddress = {
  recipient: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};
export function CheckoutForm({
  initialDraft,
}: {
  initialDraft?: CheckoutDraft;
}) {
  const selection = useKitSelection();
  const [contact, setContact] = useState<CheckoutDraft["contact"]>(
    initialDraft?.contact ?? {
      name: "",
      phone: "",
      email: "",
      preferredChannel: "whatsapp",
    },
  );
  const [mode, setMode] = useState<"PICKUP" | "TEAM_SHIPPING">(
    initialDraft?.delivery.mode === "TEAM_SHIPPING"
      ? "TEAM_SHIPPING"
      : "PICKUP",
  );
  const [address, setAddress] = useState(
    initialDraft?.delivery.mode !== "PICKUP" && initialDraft?.delivery.address
      ? initialDraft.delivery.address
      : emptyAddress,
  );
  const [review, setReview] = useState<CheckoutReview>();
  const [stamp, setStamp] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutReceipt>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [existing, setExisting] = useState(false);
  const [existingId, setExistingId] = useState("");
  const sent = useRef<KitSelection | null>(null);
  const decisionKey = useRef("");
  const current = JSON.stringify({ selection, contact, mode, address });
  const validReview = stamp === current ? review : undefined;
  useEffect(() => {
    let active = true;
    const attempt = readCheckoutAttempt();
    api<CheckoutPublicDetail>(
      `/api/portfolio/checkout/detail${attempt ? `?checkoutId=${encodeURIComponent(attempt.checkoutId)}` : ""}`,
    )
      .then((d) => {
        if (active && d.receipt) {
          clearCheckoutAttempt();
          setExistingId(d.review.id);
          setExisting(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  async function prepare() {
    setBusy(true);
    setError("");
    setAgreed(false);
    try {
      const draft = checkoutDraftSchema.parse({
        ...selection,
        contact,
        delivery: mode === "PICKUP" ? { mode } : { mode, address },
      });
      await api("/api/portfolio/checkout/session", {});
      const r = await api<CheckoutReview>("/api/portfolio/checkout/review", {
        draft,
        operationKey: newCheckoutKey(),
      });
      sent.current = readKitSelection();
      decisionKey.current = newCheckoutKey();
      setReview(r);
      setStamp(current);
      setUncertain(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revise os dados.");
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!validReview || !agreed) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        operationKey: decisionKey.current,
        expectedVersion: validReview.version,
        fingerprint: validReview.fingerprint,
        name: contact.name,
        agreed: true,
      };
      saveCheckoutAttempt({
        checkoutId: validReview.id,
        operationKey: payload.operationKey,
        expectedVersion: payload.expectedVersion,
        fingerprint: payload.fingerprint,
      });
      const r = await api<CheckoutReceipt>(
        `/api/portfolio/checkout/confirm?checkoutId=${encodeURIComponent(validReview.id)}`,
        payload,
      );
      setReceipt(r);
      setUncertain(false);
      clearCheckoutAttempt();
    } catch (e) {
      const uncertain =
        !(e instanceof ApiError) || ["NETWORK", "INTERNAL"].includes(e.code);
      setUncertain(uncertain);
      setError(
        uncertain
          ? "Não sabemos se a confirmação foi concluída. Consulte o resultado antes de tentar outra compra."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    setBusy(true);
    try {
      const d = await api<CheckoutPublicDetail>(
        `/api/portfolio/checkout/detail?checkoutId=${encodeURIComponent(review!.id)}`,
      );
      if (d.receipt) {
        setReceipt(d.receipt);
        clearCheckoutAttempt();
        setUncertain(false);
      } else
        setError(
          "Ainda sem confirmação registrada. Você pode repetir a tentativa original.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (existing)
    return (
      <section className="flex flex-col gap-6">
        <CheckoutContinuation checkoutId={existingId} />
        <Button
          variant="outline"
          onClick={async () => {
            await api("/api/portfolio/checkout/session", { newPurchase: true });
            clearCheckoutAttempt();
            setExisting(false);
          }}
        >
          Iniciar outra compra
        </Button>
      </section>
    );
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold">Concluir pedido</h1>
        <p>Confira suas escolhas, entrega e condições antes de confirmar.</p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/portfolio/orcamento">Editar itens ou separar pedidos</Link>
      </Button>
      {error && <Alert role="alert">{error}</Alert>}
      {receipt ? (
        <div className="flex flex-col gap-4" role="status">
          <h2 className="text-2xl font-semibold">
            {receipt.state === "CONFIRMED"
              ? "Compra confirmada"
              : "Pedido enviado para conferência"}
          </h2>
          <p>
            {receipt.protocol}
            {receipt.saleNumber && ` · ${receipt.saleNumber}`}
          </p>
          <p>
            {receipt.state === "CONFIRMED"
              ? "Pagamento pendente de registro pela equipe."
              : "A equipe vai conferir as condições. Você confirmará a compra depois de receber o total completo."}
          </p>
          <Button asChild>
            <Link href={`/portfolio/compra?checkoutId=${receipt.checkoutId}`}>
              Acompanhar pedido
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (sent.current)
                writeKitSelection(
                  clearSubmittedSelection(readKitSelection(), sent.current),
                );
            }}
          >
            Limpar somente os itens enviados que não foram alterados
          </Button>
        </div>
      ) : (
        <>
          <div className="grid min-w-0 gap-8 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-5">
              <h2 className="text-xl font-semibold">Contato e entrega</h2>
              <RequestContactForm
                contact={contact}
                onChange={setContact}
                errors={{}}
              />
              <Label htmlFor="checkout-delivery">Como quer receber?</Label>
              <NativeSelect
                id="checkout-delivery"
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <option value="PICKUP">Retirada na loja</option>
                <option value="TEAM_SHIPPING">
                  Entrega com frete pela equipe
                </option>
              </NativeSelect>
              <small>
                As modalidades precisam ser permitidas por todos os itens.
                Cálculo automático depende de integração futura.
              </small>
              {mode !== "PICKUP" && (
                <fieldset className="flex flex-col gap-3">
                  <legend>Endereço de entrega</legend>
                  {(
                    Object.keys(emptyAddress) as (keyof typeof emptyAddress)[]
                  ).map((key) => (
                    <Field
                      key={key}
                      id={`checkout-${key}`}
                      label={
                        {
                          recipient: "Destinatário",
                          postalCode: "CEP (8 dígitos)",
                          street: "Rua",
                          number: "Número",
                          complement: "Complemento",
                          district: "Bairro",
                          city: "Cidade",
                          state: "UF",
                        }[key]
                      }
                      value={address[key]}
                      maxLength={key === "state" ? 2 : 160}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          [key]:
                            key === "state"
                              ? e.target.value.toUpperCase()
                              : e.target.value,
                        })
                      }
                    />
                  ))}
                </fieldset>
              )}
              <Button
                disabled={busy || !selection.items.length || uncertain}
                onClick={prepare}
              >
                {busy ? "Aguarde…" : "Revisar condições"}
              </Button>
            </div>
            <div className="min-w-0">
              {validReview ? (
                <CheckoutSummary review={validReview} />
              ) : (
                <Alert>
                  Revise as condições para consultar o total e a modalidade
                  disponível.
                </Alert>
              )}
            </div>
          </div>
          {validReview && (
            <div className="flex flex-col gap-4">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                {validReview.route === "DIRECT"
                  ? "Li e concordo com os itens, total, entrega e condições de pagamento."
                  : "Quero enviar estes itens para conferência; isso ainda não confirma a compra."}
              </label>
              <Button disabled={busy || !agreed || uncertain} onClick={confirm}>
                {validReview.route === "DIRECT"
                  ? "Confirmar compra"
                  : "Enviar para conferência"}
              </Button>
            </div>
          )}
          {uncertain && (
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={recover}>
                Consultar resultado
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setUncertain(false);
                  void confirm();
                }}
              >
                Repetir a mesma tentativa
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
