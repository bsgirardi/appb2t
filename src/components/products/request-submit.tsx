"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api, ApiError } from "@/lib/client-api";
import { catalogContactSchema } from "@/domain/catalog-requests/validation";
import type {
  CatalogContact,
  CatalogReceipt,
} from "@/domain/catalog-requests/types";
import type { InquiryItem, InquiryReview } from "@/domain/products/inquiry";
import {
  confirmRequestAttempt,
  createRequestAttempt,
  discardRequestAttempt,
  useRequestAttempt,
  writeRequestAttempt,
  type PendingAttempt,
} from "@/lib/catalog-request-attempt";
import { RequestContactForm } from "./request-contact-form";
import { RequestReceipt } from "./request-receipt";
const emptyContact: CatalogContact = {
  name: "",
  phone: "",
  email: "",
  preferredChannel: "whatsapp",
};
export function RequestSubmit({
  items,
  review,
  onClearSubmitted,
}: {
  items: InquiryItem[];
  review?: InquiryReview;
  onClearSubmitted: (submitted: InquiryItem[]) => void;
}) {
  const recovery = useRequestAttempt();
  const corrupt = recovery === "corrupt";
  const attempt = corrupt ? null : recovery;
  const [contact, setContact] = useState(emptyContact);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [rejected, setRejected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<InquiryItem[] | null>(null);
  const form = useRef<HTMLFormElement>(null);
  function accepted(receipt: CatalogReceipt, pending: PendingAttempt) {
    confirmRequestAttempt(receipt);
    setSubmitted(pending.payload.items);
    setContact(emptyContact);
    setNotice("");
    setRejected(false);
  }
  async function send(pending: PendingAttempt) {
    setBusy(true);
    setNotice("");
    setRejected(false);
    try {
      await api("/api/portfolio/requests/browser", {});
      const receipt = await api<CatalogReceipt>(
        "/api/portfolio/requests",
        pending.payload,
      );
      accepted(receipt, pending);
    } catch (error) {
      if (error instanceof ApiError && error.code === "RATE_LIMIT") {
        setNotice(
          `${error.message} Sua tentativa foi mantida; você também pode verificar o recebimento.`,
        );
        return;
      }
      if (
        error instanceof ApiError &&
        ["CONFLICT", "VALIDATION"].includes(error.code)
      ) {
        try {
          const receipt = await api<CatalogReceipt | null>(
            "/api/portfolio/requests/receipt",
            { attemptKey: pending.payload.attemptKey },
          );
          if (receipt) {
            accepted(receipt, pending);
            return;
          }
          setRejected(true);
          setNotice(error.message);
          return;
        } catch {
          /* An uncertain response must retain the original attempt. */
        }
      }
      setNotice(
        "Ainda não foi possível confirmar o recebimento. Sua seleção foi mantida. Verifique o recebimento ou tente novamente com a mesma tentativa.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify(pending: PendingAttempt) {
    setBusy(true);
    try {
      const receipt = await api<CatalogReceipt | null>(
        "/api/portfolio/requests/receipt",
        { attemptKey: pending.payload.attemptKey },
      );
      if (receipt) accepted(receipt, pending);
      else
        setNotice(
          "Ainda não foi possível confirmar o recebimento. Tente novamente com a mesma tentativa.",
        );
    } catch {
      setNotice(
        "Ainda não foi possível confirmar o recebimento. Sua tentativa foi mantida nesta aba.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || attempt || !review?.ready || !items.length) return;
    const parsed = catalogContactSchema.safeParse(contact);
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      );
      setErrors(fields);
      const first = ["name", "phone", "email"].find((k) => fields[k]);
      form.current
        ?.querySelector<HTMLInputElement>(`#request-${first}`)
        ?.focus();
      return;
    }
    setErrors({});
    try {
      const pending = createRequestAttempt({ contact: parsed.data, items });
      const status = writeRequestAttempt(pending);
      if (status.storage === "memory")
        setWarning(
          "A recuperação está somente na memória. Fechar ou recarregar esta aba pode perder a confirmação pendente.",
        );
      await send(pending);
    } catch (error) {
      setNotice((error as Error).message);
    }
  }
  function startAgain() {
    setContact(
      attempt?.kind === "pending" ? attempt.payload.contact : emptyContact,
    );
    discardRequestAttempt();
    setNotice("");
    setRejected(false);
    setSubmitted(null);
  }
  return (
    <section className="store-request" aria-label="Solicitação para a equipe">
      <h2>Enviar para a equipe</h2>
      <p>
        Enviaremos os itens desta lista e seu contato para preparar o
        atendimento. Referências e itens sob consulta serão revisados pela
        equipe.
      </p>
      {warning && <Alert>{warning}</Alert>}
      {notice && <Alert role="alert">{notice}</Alert>}
      {corrupt && (
        <Alert role="alert">
          Não foi possível ler a recuperação desta aba. Não a substituímos.
        </Alert>
      )}
      {corrupt ? (
        <Button type="button" variant="outline" onClick={startAgain}>
          Descartar recuperação inválida desta aba
        </Button>
      ) : attempt?.kind === "confirmed" ? (
        <>
          <RequestReceipt receipt={attempt.receipt} />
          {submitted && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClearSubmitted(submitted);
                setSubmitted(null);
              }}
            >
              Limpar seleção enviada
            </Button>
          )}
          <Button type="button" variant="outline" onClick={startAgain}>
            Nova solicitação
          </Button>
        </>
      ) : attempt?.kind === "pending" ? (
        <>
          <p>
            Uma tentativa está preservada nesta aba. Alterar a lista não altera
            o conteúdo dessa tentativa.
          </p>
          {rejected ? (
            <Button type="button" variant="outline" onClick={startAgain}>
              Revisar seleção e contato
            </Button>
          ) : (
            <>
              <Button
                type="button"
                disabled={busy}
                onClick={() => verify(attempt)}
              >
                Verificar recebimento
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => send(attempt)}
              >
                Tentar novamente
              </Button>
            </>
          )}
        </>
      ) : (
        <form ref={form} onSubmit={submit} noValidate>
          <RequestContactForm
            contact={contact}
            onChange={setContact}
            errors={errors}
          />
          <p className="store-note">
            Os dados desta tentativa ficam nesta aba até a confirmação, para
            recuperar um envio interrompido. Não criaremos uma conta nem
            enviaremos publicidade.
          </p>
          <Button
            type="submit"
            disabled={busy || !review?.ready || !items.length}
          >
            Enviar solicitação
          </Button>
        </form>
      )}
      {busy && <p role="status">Conferindo recebimento…</p>}
    </section>
  );
}
