"use client";
import { replaceInquiryItem } from "@/domain/products/inquiry-draft";

import { productBrowsePath } from "@/domain/products/catalog-navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { RequestSubmit } from "./request-submit";
import { clearSubmittedLines } from "@/lib/catalog-request-attempt";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import {
  useInquiry,
  readInquiry,
  writeInquiry,
  useInquiryStorageStatus,
  inquiryRecoveryText,
  resetInquiry,
} from "@/lib/inquiry-store";
import {
  inquiryKey,
  type InquiryLine,
  type InquiryReview,
} from "@/domain/products/inquiry";
import { api } from "@/lib/client-api";
import { formatBRL } from "@/domain/calculation/calculate";
export function InquiryPanel() {
  const items = useInquiry();
  const storageStatus = useInquiryStorageStatus();
  const stamp = JSON.stringify(items);
  const [result, setResult] = useState<{
    stamp: string;
    review?: InquiryReview;
    error?: string;
  }>();
  const [prepared, setPrepared] = useState<{
    stamp: string;
    review: InquiryReview;
  }>();
  const [mergeLine, setMergeLine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [recovery, setRecovery] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  useEffect(() => {
    let active = true;
    if (items.length)
      api<InquiryReview>("/api/portfolio/inquiry", { items })
        .then((review) => {
          if (active) setResult({ stamp, review });
        })
        .catch((error: Error) => {
          if (active) setResult({ stamp, error: error.message });
        });
    return () => {
      active = false;
    };
  }, [items, stamp]);
  const current = result?.stamp === stamp ? result : undefined;
  const preparedReview =
    prepared?.stamp === stamp ? prepared.review : undefined;
  const review = preparedReview ?? current?.review;
  function update(next: typeof items) {
    try {
      writeInquiry(next);
      setPrepared(undefined);
      setNotice("");
    } catch (error) {
      setNotice((error as Error).message);
    }
  }
  function confirmLine(line: InquiryLine, index: number, combine = false) {
    const original = items[index];
    if (!original?.lineId) return;
    const replacement = {
      ...original,
      answers: line.answers,
      answerLabels: line.answerLabels,
      commercialRevision: line.currentRevision ?? null,
      seenPrice: line.configuredPrice ?? null,
    };
    if (
      !combine &&
      items.some(
        (row, i) => i !== index && inquiryKey(row) === inquiryKey(replacement),
      )
    ) {
      setMergeLine(original.lineId);
      return;
    }
    try {
      update(replaceInquiryItem(items, original.lineId, replacement));
      setMergeLine(null);
    } catch (error) {
      setNotice((error as Error).message);
    }
  }
  async function prepare() {
    if (busy) return;
    setBusy(true);
    setPrepared(undefined);
    setResult(undefined);
    setNotice("");
    try {
      const fresh = await api<InquiryReview>("/api/portfolio/inquiry", {
        items,
      });
      setResult({ stamp, review: fresh });
      if (fresh.ready) setPrepared({ stamp, review: fresh });
    } catch (error) {
      setResult({ stamp, error: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Mensagem copiada.");
    } catch {
      setNotice("Selecione e copie o texto abaixo.");
    }
  }
  const storage = storageStatus ? (
    <Alert role="alert">
      <p>{storageStatus}</p>
      <Button
        type="button"
        variant="outline"
        onClick={() => setRecovery(inquiryRecoveryText())}
      >
        Mostrar recuperação
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setResetConfirm(true)}
      >
        Reiniciar lista
      </Button>
      {recovery && (
        <Textarea aria-label="Recuperação da lista" readOnly value={recovery} />
      )}
      {resetConfirm && (
        <>
          <p>
            Isso remove a lista deste navegador. Guarde o texto de recuperação
            antes de continuar.
          </p>
          <Button
            type="button"
            onClick={() => {
              resetInquiry();
              setResetConfirm(false);
              setRecovery("");
            }}
          >
            Confirmar reinício
          </Button>
        </>
      )}
    </Alert>
  ) : null;
  if (!items.length)
    return (
      <section className="store-empty">
        {storage}
        <h1>Sua lista está vazia</h1>
        <p>
          Escolha produtos e personalize cada item para preparar seu orçamento.
        </p>
        <Button asChild>
          <Link href="/#all-products">Explorar produtos</Link>
        </Button>
        <RequestSubmit
          items={items}
          review={review}
          onReviewRequired={prepare}
          onClearSubmitted={(sent) =>
            update(clearSubmittedLines(readInquiry(), sent))
          }
        />
      </section>
    );
  const knownTotal =
    review?.knownTotal === undefined ? review?.total : review.knownTotal;
  return (
    <>
      <div className="store-heading">
        <div>
          <h1>Minha lista</h1>
          <p>
            Confira cada detalhe antes de enviar sua solicitação para a equipe.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/#all-products">Continuar escolhendo</Link>
        </Button>
      </div>
      {storage}
      <p className="store-note">
        A lista fica salva neste navegador. Preparar contato não envia a
        solicitação nem reserva estoque.
      </p>
      {current?.error && (
        <Alert role="alert">
          {current.error} Sua lista foi mantida. Use “Conferir e preparar
          contato” para tentar novamente.
        </Alert>
      )}
      {!current && <p role="status">Conferindo preços e disponibilidade…</p>}
      <div className="store-inquiry-layout">
        <div className="store-inquiry-lines">
          {items.map((item, index) => {
            const line = review?.lines.find((l) =>
              l.lineId && item.lineId
                ? l.lineId === item.lineId
                : inquiryKey(l) === inquiryKey(item),
            );
            return (
              <article
                key={item.lineId ?? inquiryKey(item)}
                className="store-inquiry-line"
              >
                <div className="store-inquiry-line-header">
                  {line?.imageUrl && (
                    <Image
                      src={line.imageUrl}
                      alt=""
                      width={96}
                      height={96}
                      unoptimized
                    />
                  )}
                  <div>
                    <h2>
                      {line?.path ? (
                        <Link href={line.path}>{line.name}</Link>
                      ) : (
                        (line?.name ?? `Produto ${index + 1}`)
                      )}
                    </h2>
                    {item.color && <p>Cor: {item.color}</p>}
                    {item.size && <p>Tamanho: {item.size}</p>}
                    {(line?.answerLabels ?? item.answerLabels).map((a) => (
                      <p key={a.fieldId}>
                        <strong>{a.label}:</strong>{" "}
                        <span className="store-answer">{a.valueLabel}</span>
                      </p>
                    ))}
                    {line?.price ? (
                      <p>Referência por unidade: {formatBRL(line.price)}</p>
                    ) : line?.configuredPrice?.kind === "CONSULT" ? (
                      <p>Valor sob consulta</p>
                    ) : null}
                  </div>
                </div>
                {line?.problem && (
                  <Alert role="alert">
                    {line.problem}
                    {Object.entries(line.fieldErrors ?? {}).map(
                      ([key, message]) => (
                        <p key={key}>{message}</p>
                      ),
                    )}
                  </Alert>
                )}
                {line?.requiresConfirmation && (
                  <Alert role="alert">
                    <p>As condições deste item precisam da sua confirmação.</p>
                    {item.seenPrice?.unit && (
                      <p>
                        Referência anterior: {formatBRL(item.seenPrice.unit)}
                      </p>
                    )}
                    {line.price && (
                      <p>Referência atual: {formatBRL(line.price)}</p>
                    )}
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => confirmLine(line, index)}
                    >
                      Confirmar atualização do item {index + 1}
                    </Button>
                    {mergeLine === item.lineId && (
                      <>
                        <p>
                          A configuração atualizada coincide com outra linha.
                          Deseja somar as quantidades?
                        </p>
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => confirmLine(line, index, true)}
                        >
                          Confirmar atualização e combinar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setMergeLine(null)}
                        >
                          Cancelar combinação
                        </Button>
                      </>
                    )}
                  </Alert>
                )}
                <div className="store-inquiry-line-actions">
                  <Label htmlFor={`quantity-${index}`}>Quantidade</Label>
                  <NativeSelect
                    id={`quantity-${index}`}
                    aria-label={`Quantidade de ${line?.name ?? `produto ${index + 1}`}, item ${index + 1}`}
                    value={item.quantity}
                    disabled={busy}
                    onChange={(e) =>
                      update(
                        items.map((row, i) =>
                          i === index
                            ? { ...row, quantity: Number(e.target.value) }
                            : row,
                        ),
                      )
                    }
                  >
                    {Array.from({ length: 99 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </NativeSelect>
                  {line?.subtotal && (
                    <strong>{formatBRL(line.subtotal)}</strong>
                  )}
                  {line?.path && item.lineId && (
                    <Button asChild variant="outline">
                      <Link
                        href={`${productBrowsePath({ id: item.productId, name: line.name }, item.catalogContext)}${item.catalogContext && (item.catalogContext.collection || item.catalogContext.search || item.catalogContext.order !== "nome" || item.catalogContext.page > 1) ? "&" : "?"}editar=${encodeURIComponent(item.lineId)}`}
                      >
                        Editar configuração
                      </Link>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    aria-label={`Remover item ${index + 1}`}
                    onClick={() => update(items.filter((_, i) => i !== index))}
                  >
                    Remover
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        <aside className="store-inquiry-summary">
          <h2>Resumo da seleção</h2>
          <p>
            {items.reduce((sum, i) => sum + i.quantity, 0)} unidades em{" "}
            {items.length} linhas
          </p>
          {review && (
            <>
              {knownTotal !== null && knownTotal !== undefined ? (
                <>
                  <p>
                    {review.consultCount
                      ? "Soma dos itens com referência"
                      : review.ready
                        ? "Total de referência"
                        : "Subtotal dos itens válidos"}
                  </p>
                  <strong className="store-price">
                    {formatBRL(knownTotal)}
                  </strong>
                </>
              ) : (
                <strong>Valor a confirmar</strong>
              )}
              {!!review.consultCount && (
                <p>
                  {review.consultCount} linha(s) sob consulta. Não há total
                  fechado.
                </p>
              )}
            </>
          )}
          <p className="store-note">
            Frete e condições finais a combinar. Esta lista não confirma um
            pedido.
          </p>
          <RequestSubmit
            items={items}
            review={review}
            onReviewRequired={prepare}
            onClearSubmitted={(sent) =>
              update(clearSubmittedLines(readInquiry(), sent))
            }
          />
          {review && !review.ready && (
            <Alert>
              Revise ou confirme os itens sinalizados para continuar.
            </Alert>
          )}
          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={prepare}
          >
            {busy
              ? "Conferindo…"
              : preparedReview
                ? "Conferir novamente"
                : "Conferir e preparar contato"}
          </Button>
          {preparedReview?.ready && (
            <div className="store-prepared">
              <p role="status">
                Mensagem preparada. Confira os detalhes e envie pelo seu canal
                de contato.
              </p>
              <Textarea
                aria-label="Mensagem de orçamento"
                readOnly
                value={preparedReview.message}
                rows={12}
              />
              {preparedReview.copyRequired && (
                <Alert>
                  Copie a mensagem completa, abra o contato e cole o texto antes
                  de enviar.
                </Alert>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => copy(preparedReview.message)}
              >
                Copiar mensagem
              </Button>
              {preparedReview.contact ? (
                <Button asChild>
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
                    {preparedReview.channel === "whatsapp"
                      ? "Abrir WhatsApp ↗"
                      : "Abrir e-mail"}
                  </a>
                </Button>
              ) : (
                <p>
                  Contato de atendimento ainda não informado. Você pode copiar a
                  mensagem.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
      {notice && <p role="status">{notice}</p>}
    </>
  );
}
