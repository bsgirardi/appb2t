"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Decision {
  action: string;
  name: string;
  comment: string;
  decidedAt: string;
}
interface Review {
  id: string;
  number: number;
  state: string;
  instructions: string;
  manifestHash: string | null;
  lines: {
    sourceLineId: string;
    name: string;
    quantity: number;
    color: string;
    size: string;
    personalizations: { label: string; value: string }[];
  }[];
  files: {
    id: string;
    name: string;
    purpose: string;
    mimeType: string;
    byteLength: number;
  }[];
  decision: Decision | null;
}
interface DecisionInput {
  operationKey: string;
  action: "APPROVE" | "REQUEST_CHANGES";
  name: string;
  comment: string;
  confirmedManifestHash: string;
}

export function ArtDecisionForm({
  review,
  onDecide,
}: {
  review: Review;
  onDecide: (input: DecisionInput) => Promise<Decision>;
}) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Decision | null>(null);
  const pending = useRef(false);
  const attempt = useRef<{ hash: string; key: string } | null>(null);
  const decision = saved ?? review.decision;
  async function decide(action: "APPROVE" | "REQUEST_CHANGES") {
    if (
      pending.current ||
      !name.trim() ||
      (action === "APPROVE" ? !confirmed : !comment.trim()) ||
      !review.manifestHash
    )
      return;
    const payload = {
      action,
      name: name.trim(),
      comment: comment.trim(),
      confirmedManifestHash: review.manifestHash,
    };
    const hash = JSON.stringify(payload);
    if (attempt.current?.hash !== hash)
      attempt.current = { hash, key: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      setSaved(
        await onDecide({ ...payload, operationKey: attempt.current.key }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (decision)
    return (
      <section className="art-decision" aria-label="Recibo da decisão">
        <h2>
          {decision.action === "APPROVE"
            ? "Aprovação registrada"
            : "Pedido de ajustes registrado"}
        </h2>
        <p>
          Versão {review.number} · {decision.name}
        </p>
        <p>
          {new Date(decision.decidedAt).toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}
        </p>
        {decision.comment && <p className="art-preserve">{decision.comment}</p>}
        <p>A equipe recebeu sua decisão sobre esta arte.</p>
      </section>
    );
  if (review.state !== "AWAITING_CUSTOMER")
    return (
      <Notice kind="info">
        Esta versão não está disponível para uma nova decisão. Peça à equipe o
        link atual.
      </Notice>
    );
  return (
    <section className="art-decision" aria-label="Decidir sobre a arte">
      <h2>Sua revisão</h2>
      <p>
        A aprovação vale para todos os arquivos finais desta versão. Ela não
        confirma compra, pagamento ou início da produção.
      </p>
      <Field
        label="Seu nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={160}
        autoComplete="name"
        disabled={busy}
      />
      <Label className="art-confirm">
        <Checkbox
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={busy}
        />
        Revisei todos os arquivos finais e aprovo esta versão da arte.
      </Label>
      <Button
        type="button"
        disabled={busy || !confirmed || !name.trim()}
        onClick={() => void decide("APPROVE")}
      >
        {busy ? "Registrando…" : "Aprovar esta versão"}
      </Button>
      <Label htmlFor="art-comment">Ajustes desejados</Label>
      <Textarea
        id="art-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={4000}
        disabled={busy}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy || !name.trim() || !comment.trim()}
        onClick={() => void decide("REQUEST_CHANGES")}
      >
        Pedir ajustes
      </Button>
      {error && (
        <Notice>
          {error} Mantenha esta página e tente novamente; a mesma decisão não
          será duplicada.
        </Notice>
      )}
      <small>
        Qualquer pessoa com este link pode responder. Seu nome é declarado por
        você, sem verificação de identidade.
      </small>
    </section>
  );
}

export function PublicArtReview() {
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const started = useRef(false);
  const loadVersion = useRef(0);
  async function load() {
    const version = ++loadVersion.current;
    setBusy(true);
    setError("");
    try {
      const url = new URL(window.location.href);
      let revisionId = url.searchParams.get("revisao");
      if (url.hash) {
        const access = await api<{ revisionId: string }>(
          "/api/portfolio/art/access",
          { token: url.hash.slice(1) },
        );
        if (version !== loadVersion.current) return;
        revisionId = access.revisionId;
        url.hash = "";
        url.searchParams.set("revisao", revisionId);
        window.history.replaceState(null, "", `${url.pathname}${url.search}`);
      }
      if (!revisionId)
        throw new Error(
          "Abra o link privado enviado pela equipe para revisar sua arte.",
        );
      const current = await api<Review>(
        `/api/portfolio/art/review?revision=${encodeURIComponent(revisionId)}`,
      );
      if (version === loadVersion.current) setReview(current);
    } catch (e) {
      if (version === loadVersion.current) setError((e as Error).message);
    } finally {
      if (version === loadVersion.current) setBusy(false);
    }
  }
  useEffect(() => {
    const changed = () => {
      setReview(null);
      void load();
    };
    window.addEventListener("hashchange", changed);
    if (!started.current) {
      started.current = true;
      void load();
    }
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  return (
    <main className="art-public">
      <header className="art-public-header">
        <p>B2T · Revisão de arte</p>
        <h1>
          {review ? `Sua arte, versão ${review.number}` : "Confira sua arte"}
        </h1>
        <p>Confira os detalhes e cada arquivo final antes de responder.</p>
      </header>
      {busy && <p role="status">Abrindo sua revisão…</p>}
      {error && <Notice>{error}</Notice>}
      {!busy && (
        <Button variant="outline" onClick={() => void load()}>
          Reconsultar versão
        </Button>
      )}
      {review && !error && (
        <div className="art-public-layout">
          <section aria-label="Arquivos e personalizações">
            <h2>O que estamos preparando</h2>
            <ul>
              {review.lines.map((line) => (
                <li key={line.sourceLineId}>
                  <strong>{line.name}</strong> · {line.quantity} unidade(s)
                  {line.color && ` · ${line.color}`}
                  {line.size && ` · ${line.size}`}
                  <ul>
                    {line.personalizations.map((a, i) => (
                      <li key={i}>
                        {a.label}: {a.value}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="art-preserve">{review.instructions}</p>
            {(["FINAL", "REFERENCE"] as const).map((purpose) => (
              <section key={purpose} className="art-files-section">
                <h2>
                  {purpose === "FINAL"
                    ? "Arquivos finais para aprovação"
                    : "Referências de apoio"}
                </h2>
                {purpose === "REFERENCE" && (
                  <p>
                    As referências orientam a criação; não são a arte final
                    aprovada.
                  </p>
                )}
                {review.files
                  .filter((f) => f.purpose === purpose)
                  .map((file) => {
                    const href = `/api/portfolio/art/files/${file.id}?revision=${review.id}`;
                    return (
                      <figure key={file.id} className="art-file">
                        {file.mimeType.startsWith("image/") && (
                          <Image
                            unoptimized
                            src={`${href}&preview=1`}
                            alt={`Prévia de ${file.name}`}
                            width={1000}
                            height={750}
                            className="art-preview"
                          />
                        )}
                        <figcaption>
                          <a href={href}>
                            {file.mimeType === "application/pdf"
                              ? "Baixar PDF"
                              : "Baixar original"}
                            : {file.name}
                          </a>
                          <small>
                            {(file.byteLength / 1024).toFixed(1)} KiB
                          </small>
                        </figcaption>
                      </figure>
                    );
                  })}
              </section>
            ))}
          </section>
          <ArtDecisionForm
            key={review.id}
            review={review}
            onDecide={(decision) =>
              api<Decision>("/api/portfolio/art/decision", {
                revisionId: review.id,
                decision,
              })
            }
          />
        </div>
      )}
    </main>
  );
}
