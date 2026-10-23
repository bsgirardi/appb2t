"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/client-api";
import type { ArtRevisionDTO } from "@/domain/art/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/ui/field";
type Package = {
  id: string;
  currentRevisionId: string | null;
  revisions: ArtRevisionDTO[];
};
type Line = {
  lineId: string;
  name: string;
  quantity: number;
  packageId?: string | null;
};
const labels: Record<string, string> = {
  DRAFT: "Rascunho",
  AWAITING_CUSTOMER: "Aguardando cliente",
  APPROVED: "Aprovada",
  CHANGES_REQUESTED: "Ajustes solicitados",
  SUPERSEDED: "Substituída",
};

function RevisionEditor({
  row,
  command,
  refresh,
  detach,
}: {
  row: ArtRevisionDTO;
  command: <T>(url: string, body: object, method?: string) => Promise<T>;
  refresh: () => Promise<void>;
  detach?: (sourceLineId: string) => Promise<void>;
}) {
  const [instructions, setInstructions] = useState(row.instructions);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState("FINAL");
  const [confirmed, setConfirmed] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const upload = useRef<{
    file: File;
    purpose: string;
    key: string;
    version: number;
  } | null>(null);
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function sendFile() {
    if (!file) return;
    if (upload.current?.file !== file || upload.current?.purpose !== purpose)
      upload.current = {
        file,
        purpose,
        key: crypto.randomUUID(),
        version: row.version,
      };
    const task = upload.current;
    const response = await fetch(`/api/art/revisions/${row.id}/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-art-filename": encodeURIComponent(file.name),
        "x-art-purpose": task.purpose,
        "x-art-version": String(task.version),
        "x-operation-key": task.key,
      },
      body: file,
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error?.message ?? "Envio não concluído. Tente novamente.",
      );
    upload.current = null;
    setFile(null);
    setMessage("Arquivo recebido. Confira a lista antes de publicar.");
  }
  return (
    <section className="art-team-revision">
      <ul>
        {row.lines.map((line) => (
          <li key={line.sourceLineId}>
            {line.description ?? line.sourceLineId} · {line.quantity ?? "—"}{" "}
            unidade(s)
            {detach && row.state !== "SUPERSEDED" && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => detach(line.sourceLineId))}
              >
                Retirar linha e manter pendência
              </Button>
            )}
          </li>
        ))}
      </ul>
      <h4>
        Versão {row.number} · {labels[row.state] ?? row.state}
      </h4>
      <ul>
        {row.files.map((f) => (
          <li key={f.id}>
            <a href={`/api/art/files/${f.id}`} target="_blank" rel="noreferrer">
              {f.name}
            </a>{" "}
            · {f.purpose === "FINAL" ? "Arte final" : "Referência"}
            {row.state === "DRAFT" && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await command(
                      `/api/art/files/${f.id}`,
                      { expectedVersion: row.version },
                      "DELETE",
                    );
                  })
                }
              >
                Remover {f.name}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {row.decision && (
        <Notice kind={row.decision.action === "APPROVE" ? "success" : "info"}>
          {row.decision.action === "APPROVE" ? "Aprovação" : "Ajustes"}{" "}
          registrados por {row.decision.name} em{" "}
          {new Date(row.decision.decidedAt).toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}
          . {row.decision.comment}
        </Notice>
      )}
      {row.state === "DRAFT" ? (
        <div className="grid gap-3">
          <Label htmlFor={`art-instructions-${row.id}`}>
            Instruções da versão
          </Label>
          <Textarea
            id={`art-instructions-${row.id}`}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            maxLength={4000}
            disabled={busy}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy || instructions === row.instructions}
            onClick={() =>
              void run(async () => {
                await command(
                  `/api/art/revisions/${row.id}`,
                  { expectedVersion: row.version, instructions },
                  "PUT",
                );
              })
            }
          >
            Salvar instruções
          </Button>
          <Label htmlFor={`art-file-${row.id}`}>
            Arquivo (JPEG, PNG, WebP ou PDF; até dez MiB)
          </Label>
          <Input
            id={`art-file-${row.id}`}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Label htmlFor={`art-purpose-${row.id}`}>Uso do arquivo</Label>
          <NativeSelect
            id={`art-purpose-${row.id}`}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            disabled={busy}
          >
            <option value="FINAL">Arte final para aprovação</option>
            <option value="REFERENCE">Referência de apoio</option>
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !file}
            onClick={() => void run(sendFile)}
          >
            {busy && file ? `Enviando ${file.name}…` : "Enviar arquivo"}
          </Button>
          <small>
            Envie um arquivo por vez. Máximo de dez arquivos e cinquenta MiB por
            revisão. PDFs devem ser estáticos, sem senha e com até 500 páginas.
          </small>
          <Label className="flex items-start gap-2">
            <Checkbox
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={busy}
            />
            Conferi os arquivos finais e as linhas abrangidas. Publicar
            substitui a versão anterior e suspende novos apontamentos até o novo
            aceite, inclusive se já houver produção registrada.
          </Label>
          <Button
            type="button"
            disabled={
              busy ||
              !confirmed ||
              instructions !== row.instructions ||
              !row.files.some((f) => f.purpose === "FINAL")
            }
            onClick={() =>
              void run(async () => {
                await command(`/api/art/revisions/${row.id}`, {
                  expectedVersion: row.version,
                });
              })
            }
          >
            Publicar para revisão do cliente
          </Button>
        </div>
      ) : (
        <p className="whitespace-pre-wrap">{row.instructions}</p>
      )}
      {row.state !== "DRAFT" && (
        <div className="grid gap-3">
          {row.state === "AWAITING_CUSTOMER" && (
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setLink(
                    await command(`/api/art/revisions/${row.id}/access`, {
                      action: "ISSUE",
                      expectedVersion: row.version,
                    }),
                  );
                })
              }
            >
              Gerar ou renovar link privado
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await command(`/api/art/revisions/${row.id}/access`, {
                  action: "REVOKE",
                  expectedVersion: row.version,
                });
                setLink(null);
                setMessage("Acesso revogado.");
              })
            }
          >
            Revogar acesso
          </Button>
        </div>
      )}
      {link && (
        <div className="grid gap-2">
          <Label htmlFor={`art-link-${row.id}`}>
            Link privado para compartilhar
          </Label>
          <Input id={`art-link-${row.id}`} readOnly value={link.url} />
          <small>
            Expira em{" "}
            {new Date(link.expiresAt).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
            . Renovar revoga o link anterior.
          </small>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(link.url).then(
                () =>
                  setMessage("Link copiado. Envie pelo canal de atendimento."),
                () => setError("Selecione e copie o link no campo acima."),
              );
            }}
          >
            Copiar link
          </Button>
        </div>
      )}
      {message && <Notice kind="success">{message}</Notice>}
      {error && (
        <Notice>
          {error} O rascunho foi mantido. Em conflito, atualize os dados e
          confira os arquivos antes de repetir.
        </Notice>
      )}
    </section>
  );
}

export function TeamArtPanel({
  requestId,
  lines,
}: {
  requestId: string;
  lines: Line[];
}) {
  const [opened, setOpened] = useState(false);
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [options, setOptions] = useState<Line[]>(lines);
  const [selected, setSelected] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const operations = useRef(new Map<string, string>());
  const pending = useRef(false);
  async function command<T>(
    url: string,
    body: object,
    method = "POST",
  ): Promise<T> {
    const hash = JSON.stringify({ url, body, method });
    let key = operations.current.get(hash);
    if (!key) {
      key = crypto.randomUUID();
      operations.current.set(hash, key);
    }
    const result = await api<T>(url, { ...body, operationKey: key }, method);
    operations.current.delete(hash);
    return result;
  }
  async function refresh() {
    const [data, available] = await Promise.all([
      api<Package[]>(`/api/art/requests/${requestId}`),
      api<Line[]>(`/api/art/requests/${requestId}/lines`),
    ]);
    setPackages(data);
    setOptions(available.length ? available : lines);
  }
  async function open() {
    if (packages) return;
    setOpened(true);
    setBusy(true);
    try {
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await command(`/api/art/requests/${requestId}`, {
        sourceLineIds: selected,
        instructions,
      });
      await refresh();
      setSelected([]);
      setInstructions("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <details
      className="art-team-panel my-4 rounded-lg border p-4"
      onToggle={(e) => {
        if (e.currentTarget.open) void open();
      }}
    >
      <summary className="cursor-pointer font-semibold">
        Arte e aprovação
      </summary>
      {opened && (
        <div className="grid gap-4 pt-4">
          <p>
            Marque as linhas que exigem arte. A equipe anexa arquivos e o
            cliente decide por link privado. Essa decisão não confirma a compra.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void refresh()
                .then(
                  () => setError(""),
                  (e: Error) => setError(e.message),
                )
                .finally(() => setBusy(false));
            }}
          >
            Atualizar dados sem apagar rascunho
          </Button>
          {packages && (
            <>
              <fieldset className="grid gap-2">
                <legend>Linhas do novo pacote</legend>
                {options.map((line) => (
                  <Label key={line.lineId} className="flex items-start gap-2">
                    <Checkbox
                      checked={selected.includes(line.lineId)}
                      disabled={busy || !!line.packageId}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked
                            ? [...s, line.lineId]
                            : s.filter((id) => id !== line.lineId),
                        )
                      }
                    />
                    {line.name} · {line.quantity} unidade(s)
                  </Label>
                ))}
              </fieldset>
              <Label htmlFor={`art-create-${requestId}`}>
                Instruções da arte
              </Label>
              <Textarea
                id={`art-create-${requestId}`}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={4000}
                disabled={busy}
              />
              <Button
                type="button"
                disabled={busy || !selected.length}
                onClick={() => void create()}
              >
                Criar pacote de arte
              </Button>
            </>
          )}
          {packages?.map((pkg, index) => (
            <section key={pkg.id} className="grid gap-4 border-t pt-4">
              <h3>Pacote de arte {index + 1}</h3>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void command(`/api/art/packages/${pkg.id}/revisions`, {
                    instructions: "",
                  })
                    .then(refresh)
                    .catch((e: Error) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                Criar nova revisão
              </Button>
              {pkg.revisions.map((row) => (
                <RevisionEditor
                  key={row.id}
                  row={row}
                  command={command}
                  refresh={refresh}
                  detach={
                    pkg.revisions[0].id === row.id
                      ? async (sourceLineId) => {
                          await command(
                            `/api/art/requests/${requestId}/lines`,
                            {
                              sourceLineId,
                              expectedPackageId: pkg.id,
                              targetPackageId: null,
                            },
                            "PATCH",
                          );
                        }
                      : undefined
                  }
                />
              ))}
            </section>
          ))}
          {busy && <p role="status">Atualizando arte…</p>}
          {error && <Notice>{error}</Notice>}
        </div>
      )}
    </details>
  );
}
