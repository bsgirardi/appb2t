"use client";
import { Alert } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  ArrowRight,
  Trash2,
  Copy,
  Check,
  MessageCircle,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInquiry, writeInquiry } from "@/lib/inquiry-store";
import { inquiryKey, type InquiryReview } from "@/domain/products/inquiry";
import { api } from "@/lib/client-api";
import { formatBRL } from "@/domain/calculation/calculate";
export function InquiryPanel() {
  const items = useInquiry();
  const stamp = JSON.stringify(items);
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const [result, setResult] = useState<{
    stamp: string;
    review?: InquiryReview;
    error?: string;
  }>();
  const [prepared, setPrepared] = useState<{
    stamp: string;
    review: InquiryReview;
  }>();
  const [busy, setBusy] = useState(false),
    [copyMessage, setCopyMessage] = useState("");
  useEffect(() => {
    let active = true;
    if (items.length)
      api<InquiryReview>("/api/portfolio/inquiry", { items })
        .then((review) => {
          if (active) setResult({ stamp, review });
        })
        .catch((e: Error) => {
          if (active) setResult({ stamp, error: e.message });
        });
    return () => {
      active = false;
    };
  }, [items, stamp]);
  const current = result?.stamp === stamp ? result : undefined;
  const preparedReview =
    prepared?.stamp === stamp ? prepared.review : undefined;
  const review = preparedReview ?? current?.review;
  async function prepare() {
    if (busy) return;
    setBusy(true);
    setPrepared(undefined);
    setCopyMessage("");
    try {
      const fresh = await api<InquiryReview>("/api/portfolio/inquiry", {
        items,
      });
      setResult({ stamp, review: fresh });
      setPrepared({ stamp, review: fresh });
    } catch (e) {
      setResult({ stamp, error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  if (!items.length)
    return (
      <section className="store-empty mx-auto max-w-2xl py-16">
        <ShoppingBag
          className="mx-auto mb-6 size-12 text-primary"
          aria-hidden="true"
        />
        <h1>Sua lista está vazia</h1>
        <p>
          Escolha os produtos, as opções e as quantidades para solicitar um
          orçamento.
        </p>
        <Button asChild className="mt-6 rounded-xl">
          <Link href="/#all-products">
            Explorar produtos <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    );
  return (
    <>
      <div className="store-heading">
        <div>
          <span className="store-kicker">SOLICITAÇÃO DE ORÇAMENTO</span>
          <h1>Minha lista</h1>
          <p>Confira os itens e prepare uma mensagem para a loja.</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/#all-products">
            Continuar escolhendo <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <ol
        aria-label="Etapas do orçamento"
        className="mb-6 grid list-none grid-cols-1 gap-3 p-0 text-sm sm:grid-cols-3"
      >
        {["Revise sua lista", "Prepare a mensagem", "Envie para a loja"].map(
          (label, index) => (
            <li
              key={label}
              aria-current={
                index === (busy ? 1 : preparedReview?.ready ? 2 : 0)
                  ? "step"
                  : undefined
              }
              className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 aria-[current=step]:border-primary aria-[current=step]:bg-accent"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-primary">
                {index + 1}
              </span>
              {label}
            </li>
          ),
        )}
      </ol>
      <p className="store-note mb-6">
        A lista fica salva neste navegador. Valores de referência, sem frete.
        Disponibilidade e prazo serão confirmados pela loja.
      </p>
      {current?.error && (
        <Alert
          role="alert"
          className="mb-6 rounded-xl border border-border bg-accent p-4"
        >
          {current.error} Sua lista foi mantida. Use “Conferir e preparar
          contato” para tentar novamente.
        </Alert>
      )}
      {!current && <p role="status">Conferindo preços e disponibilidade…</p>}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4" aria-label="Itens do orçamento">
          {items.map((item, index) => {
            const line = review?.lines.find(
              (line) => inquiryKey(line) === inquiryKey(item),
            );
            return (
              <article
                className="rounded-2xl border border-border bg-background p-5"
                key={inquiryKey(item)}
              >
                <div className="flex items-start gap-4">
                  {line?.imageUrl ? (
                    <Image
                      src={line.imageUrl}
                      alt=""
                      width={96}
                      height={96}
                      unoptimized
                      className="size-20 shrink-0 rounded-xl bg-white object-contain sm:size-24"
                    />
                  ) : (
                    <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                      <Package aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="mb-2 text-base font-semibold break-words">
                      {line?.path ? (
                        <Link href={line.path}>{line.name}</Link>
                      ) : (
                        (line?.name ?? `Produto ${index + 1}`)
                      )}
                    </h2>
                    {line?.sku && (
                      <p className="store-sku">Código: {line.sku}</p>
                    )}
                    {item.color && (
                      <p className="text-sm text-muted-foreground">
                        Cor: {item.color}
                      </p>
                    )}
                    {item.size && (
                      <p className="text-sm text-muted-foreground">
                        Tamanho: {item.size}
                      </p>
                    )}
                    {line?.price && (
                      <p className="mt-3 text-sm">
                        Preço unitário: {formatBRL(line.price)}
                      </p>
                    )}
                    {line?.problem && (
                      <Alert
                        role="alert"
                        className="mt-3 rounded-lg bg-accent p-3 text-sm font-semibold"
                      >
                        {line.problem}
                      </Alert>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <Label htmlFor={`quantity-${index}`}>Quantidade</Label>
                  <NativeSelect
                    className="min-h-11 rounded-lg border border-solid border-border bg-background px-3 text-base text-foreground"
                    id={`quantity-${index}`}
                    aria-label={`Quantidade de ${line?.name ?? `produto ${index + 1}`}, item ${index + 1}`}
                    value={item.quantity}
                    disabled={busy}
                    onChange={(e) => {
                      setPrepared(undefined);
                      setCopyMessage("");
                      writeInquiry(
                        items.map((row, i) =>
                          i === index
                            ? { ...row, quantity: Number(e.target.value) }
                            : row,
                        ),
                      );
                    }}
                  >
                    {Array.from({ length: 99 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </NativeSelect>
                  {line?.subtotal && (
                    <strong className="ml-auto text-lg">
                      {formatBRL(line.subtotal)}
                    </strong>
                  )}
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={busy}
                    className="rounded-lg text-muted-foreground"
                    aria-label={`Remover item ${index + 1}`}
                    onClick={() => {
                      setPrepared(undefined);
                      setCopyMessage("");
                      writeInquiry(items.filter((_, i) => i !== index));
                    }}
                  >
                    <Trash2 aria-hidden="true" /> Remover
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        <aside
          className="min-w-0 rounded-2xl border border-border bg-accent p-6 lg:sticky lg:top-6"
          aria-label="Resumo da solicitação"
        >
          <h2 className="mb-4 text-xl font-semibold">Resumo da solicitação</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {units} {units === 1 ? "unidade" : "unidades"} · {items.length}{" "}
            {items.length === 1 ? "item" : "itens"}
          </p>
          {review && (
            <>
              <p>
                {review.ready
                  ? "Total de referência"
                  : "Subtotal dos itens válidos"}
              </p>
              <strong className="my-3 block text-3xl font-bold">
                {formatBRL(review.total)}
              </strong>
            </>
          )}
          <p className="store-note">
            Frete e condições finais a combinar. Esta lista não reserva estoque
            nem confirma um pedido.
          </p>
          {review && !review.ready && (
            <Alert role="alert">
              Revise os itens sinalizados antes de continuar.
            </Alert>
          )}
          <Button
            type="button"
            className="mt-5 w-full rounded-xl"
            disabled={busy || !items.length}
            onClick={prepare}
          >
            {busy
              ? "Conferindo…"
              : preparedReview
                ? "Conferir novamente"
                : "Conferir e preparar contato"}
          </Button>
          {preparedReview?.ready && (
            <div className="mt-6 grid gap-4 border-t border-border pt-6">
              <p role="status" className="text-sm">
                <Check className="mr-2 inline size-4" aria-hidden="true" />{" "}
                Valores atualizados. Confira o resumo abaixo antes de abrir o
                contato.
              </p>
              <Textarea
                className="min-h-60 w-full min-w-0 resize-y rounded-xl border border-solid border-border bg-background p-3 text-sm leading-6 text-foreground"
                aria-label="Mensagem de orçamento"
                readOnly
                value={preparedReview.message}
                rows={12}
              />
              {preparedReview.contact ? (
                <Button asChild className="w-full rounded-xl">
                  <a
                    href={preparedReview.contact}
                    target={
                      preparedReview.channel === "whatsapp"
                        ? "_blank"
                        : undefined
                    }
                    rel={
                      preparedReview.channel === "whatsapp"
                        ? "noopener noreferrer"
                        : undefined
                    }
                  >
                    <MessageCircle aria-hidden="true" />
                    {preparedReview.channel === "whatsapp"
                      ? "Abrir WhatsApp ↗"
                      : "Abrir e-mail"}
                  </a>
                </Button>
              ) : (
                <p>
                  Contato da loja ainda não informado. Você pode copiar a lista.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(preparedReview.message);
                    setCopyMessage("Lista copiada.");
                  } catch {
                    setCopyMessage(
                      "Selecione e copie o texto da mensagem acima.",
                    );
                  }
                }}
              >
                <Copy aria-hidden="true" /> Copiar lista
              </Button>
              {copyMessage && <p role="status">{copyMessage}</p>}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
