"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { api, ApiError } from "@/lib/client-api";
import type {
  AdDraftDTO,
  AdFields,
  AdCommand,
} from "@/domain/advertising/types";
import { adFieldsSchema } from "@/domain/advertising/validation";
import { suggestAd } from "@/domain/advertising/suggestions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  TextareaField,
  Notice,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ContextEditor } from "@/components/admin/context-editor";
import { AdPhotoSelector } from "./ad-photo-selector";
import { AdSourceReview } from "./ad-source-review";
import {
  adChannels,
  adStatuses,
  copyDraftText,
  downloadDraft,
} from "./ad-client";
const fieldsOf = (d: AdDraftDTO): AdFields => ({
  internalName: d.internalName,
  title: d.title,
  body: d.body,
  imageIds: d.imageIds,
});
type Confirm = "regenerate" | "archive" | "leave" | null;
export function AdEditor({ initial }: { initial: AdDraftDTO }) {
  const [draft, setDraft] = useState(initial),
    [fields, setFields] = useState(() => fieldsOf(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [conflict, setConflict] = useState(false),
    [remote, setRemote] = useState<AdDraftDTO | null>(null),
    [confirm, setConfirm] = useState<Confirm>(null),
    [errors, setErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(fields) !== JSON.stringify(fieldsOf(draft)),
    archived = draft.status === "ARCHIVED";
  const ready = !busy && !dirty && draft.reviewIsCurrent;
  const suggestion = suggestAd(draft.currentSource, draft.channel);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function updateField<K extends keyof AdFields>(name: K, value: AdFields[K]) {
    setFields((f) => ({ ...f, [name]: value }));
    setConfirmed(false);
    setNotice("");
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
      if (e instanceof ApiError && e.code === "CONFLICT") setConflict(true);
    } finally {
      setBusy(false);
    }
  }
  async function command(input: AdCommand) {
    await run(async () => {
      const next = await api<AdDraftDTO>(
        `/api/anuncios/${draft.id}/comandos`,
        input,
      );
      setDraft(next);
      setFields(fieldsOf(next));
      setConfirmed(false);
      setConflict(false);
      setRemote(null);
      setConfirm(null);
      setNotice("Rascunho atualizado.");
    });
  }
  function save() {
    const parsed = adFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      );
      setError("Confira os campos e a seleção de fotos.");
      return;
    }
    setErrors({});
    void command({
      action: "UPDATE",
      expectedVersion: draft.version,
      fields: parsed.data,
    });
  }
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="page-heading">
        <div>
          <h1>Revisar anúncio</h1>
          <p>
            {draft.currentSource.name} · {adChannels[draft.channel]}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link
            href="/anuncios"
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                setConfirm("leave");
              }
            }}
          >
            Voltar à biblioteca
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{adStatuses[draft.status]}</Badge>
        {dirty && <Badge variant="secondary">Alterações não salvas</Badge>}
        {draft.productChanged && (
          <Badge variant="secondary">Ficha alterada</Badge>
        )}
      </div>
      {error && (
        <div ref={errorRef} tabIndex={-1}>
          <Notice>{error}</Notice>
        </div>
      )}
      {notice && <Notice kind="success">{notice}</Notice>}
      {conflict && (
        <Card>
          <CardHeader>
            <CardTitle>Compare antes de salvar novamente</CardTitle>
            <CardDescription>
              Sua edição foi mantida. Confira a versão atual e escolha como
              continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              disabled={busy}
              variant="outline"
              onClick={() =>
                void run(async () =>
                  setRemote(await api<AdDraftDTO>(`/api/anuncios/${draft.id}`)),
                )
              }
            >
              Ver versão atual
            </Button>
            {remote && (
              <>
                <p className="whitespace-pre-wrap break-words">{remote.body}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraft(remote);
                      setRemote(null);
                      setConflict(false);
                      setError("");
                    }}
                  >
                    Manter minha edição sobre a versão atual
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraft(remote);
                      setFields(fieldsOf(remote));
                      setRemote(null);
                      setConflict(false);
                      setError("");
                      setConfirmed(false);
                    }}
                  >
                    Carregar a versão atual e descartar minha edição
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      {draft.currentSource.availability === "UNAVAILABLE" && (
        <Notice kind="info">
          Produto indisponível para pedidos. Confira a divulgação planejada.
        </Notice>
      )}
      {!draft.currentSource.active && (
        <Notice kind="info">
          Produto não publicado no catálogo. Confira quando e como pretende
          divulgar.
        </Notice>
      )}
      {draft.productChanged && (
        <Notice kind="info">
          A ficha foi alterada. Confira os dados atuais e atualize a referência
          antes de revisar.
        </Notice>
      )}
      <AdSourceReview draft={draft} />
      <Card>
        <CardHeader>
          <CardTitle>Texto do material</CardTitle>
          <CardDescription>
            O texto será publicado manualmente. Confira os acréscimos e
            condições antes de revisar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field
              label="Identificação interna"
              required
              maxLength={120}
              value={fields.internalName}
              error={errors.internalName}
              disabled={busy || archived}
              onChange={(e) => updateField("internalName", e.target.value)}
            />
            <Field
              label="Título do anúncio"
              required
              maxLength={120}
              value={fields.title}
              error={errors.title}
              disabled={busy || archived}
              onChange={(e) => updateField("title", e.target.value)}
            />
            <TextareaField
              label="Texto do anúncio"
              required
              rows={10}
              maxLength={5000}
              value={fields.body}
              hint={`${fields.body.length}/5000 caracteres`}
              error={errors.body}
              disabled={busy || archived}
              onChange={(e) => updateField("body", e.target.value)}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button disabled={busy || archived || !dirty} onClick={save}>
            Salvar rascunho
          </Button>
          <Button
            variant="outline"
            disabled={busy || archived || dirty}
            onClick={() => setConfirm("regenerate")}
          >
            Ver nova sugestão
          </Button>
          {draft.productChanged && (
            <Button
              variant="outline"
              disabled={busy || archived || dirty}
              onClick={() =>
                void command({
                  action: "REFRESH_KEEP",
                  expectedVersion: draft.version,
                })
              }
            >
              Manter meu texto e atualizar referência
            </Button>
          )}
        </CardFooter>
      </Card>
      {suggestion.warnings.map((w, i) => (
        <Notice key={i} kind="info">
          {w}
        </Notice>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Fotos e ordem de apresentação</CardTitle>
          <CardDescription>
            O download contém cópias em JPEG. Imagens transparentes recebem
            fundo branco; os originais são preservados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdPhotoSelector
            images={draft.currentSource.images}
            selected={fields.imageIds}
            disabled={busy || archived}
            onChange={(ids) => updateField("imageIds", ids)}
          />
          {errors.imageIds && <Notice>{errors.imageIds}</Notice>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Conferência e material final</CardTitle>
          <CardDescription>
            Revisado significa conferido pela equipe. O sistema não publica nem
            envia o anúncio.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={
                busy ||
                dirty ||
                archived ||
                draft.productChanged ||
                !!draft.missingPhotoIds.length ||
                !fields.imageIds.length
              }
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Conferi o texto, as fotos e a disponibilidade deste material
          </label>
          {draft.lastExport && (
            <p>
              Material gerado para a versão {draft.lastExport.draftVersion} em{" "}
              {new Date(draft.lastExport.createdAt).toLocaleString("pt-BR")}.
              Isso não confirma publicação.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            disabled={
              busy ||
              dirty ||
              archived ||
              !confirmed ||
              draft.productChanged ||
              !!draft.missingPhotoIds.length ||
              !fields.imageIds.length
            }
            onClick={() =>
              void command({
                action: "REVIEW",
                expectedVersion: draft.version,
                confirmed: true,
              })
            }
          >
            Marcar como revisado
          </Button>
          <Button
            variant="outline"
            disabled={!ready}
            onClick={() =>
              void run(async () => {
                await copyDraftText(draft.id, draft.version);
                setNotice("Texto copiado para a área de transferência.");
              })
            }
          >
            Copiar texto
          </Button>
          <Button
            variant="outline"
            disabled={!ready}
            onClick={() =>
              void run(async () => {
                await downloadDraft(draft.id, draft.version);
                const latest = await api<AdDraftDTO>(
                  `/api/anuncios/${draft.id}`,
                );
                if (latest.version !== draft.version) {
                  setRemote(latest);
                  setConflict(true);
                } else {
                  setDraft(latest);
                }
                setNotice(
                  "Material preparado. Confira o download no navegador.",
                );
              })
            }
          >
            Baixar material
          </Button>
          {archived ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void command({
                  action: "RESTORE",
                  expectedVersion: draft.version,
                })
              }
            >
              Restaurar rascunho
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={busy || dirty}
              onClick={() => setConfirm("archive")}
            >
              Arquivar rascunho
            </Button>
          )}
          {draft.status === "REVIEWED" && (
            <Button
              variant="outline"
              disabled={busy || dirty}
              onClick={() =>
                void command({
                  action: "UNREVIEW",
                  expectedVersion: draft.version,
                })
              }
            >
              Voltar a rascunho
            </Button>
          )}
        </CardFooter>
      </Card>
      <ContextEditor
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
        title={
          confirm === "regenerate"
            ? "Aplicar nova sugestão?"
            : confirm === "archive"
              ? "Arquivar este rascunho?"
              : "Sair sem salvar?"
        }
        description={
          confirm === "regenerate"
            ? "Confira a sugestão antes de substituir o título e o texto salvos."
            : confirm === "archive"
              ? "O material será preservado, mas não poderá ser exportado enquanto estiver arquivado."
              : "As alterações não salvas serão descartadas."
        }
      >
        {confirm === "regenerate" && (
          <>
            <h3>{suggestion.title}</h3>
            <p className="whitespace-pre-wrap break-words">{suggestion.body}</p>
          </>
        )}
        {error && <Notice>{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setConfirm(null)}
          >
            Cancelar
          </Button>
          {confirm === "leave" ? (
            <Button asChild>
              <Link href="/anuncios">Descartar alterações e sair</Link>
            </Button>
          ) : (
            <Button
              disabled={busy}
              onClick={() =>
                void command(
                  confirm === "regenerate"
                    ? {
                        action: "REFRESH_REGENERATE",
                        expectedVersion: draft.version,
                        confirmedReplacement: true,
                      }
                    : { action: "ARCHIVE", expectedVersion: draft.version },
                )
              }
            >
              {confirm === "regenerate"
                ? "Confirmar substituição"
                : "Confirmar arquivamento"}
            </Button>
          )}
        </div>
      </ContextEditor>
    </div>
  );
}
