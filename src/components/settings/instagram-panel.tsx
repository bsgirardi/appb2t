"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup, Notice } from "@/components/ui/field";
import {
  INSTAGRAM_PROFILE,
  newestInstagramPosts,
  type InstagramSettings,
} from "@/domain/marketing/instagram";
import { instagramSeedPosts } from "@/domain/marketing/instagram-seed";
const errorMessages = {
  authorization:
    "A autorização expirou ou não permite a leitura. Renove a conexão no provedor e configure a credencial no servidor.",
  rate_limit:
    "O Instagram limitou as consultas. A última cópia foi preservada; aguarde antes de atualizar.",
  unavailable:
    "Não foi possível atualizar. A última cópia foi preservada e uma nova tentativa será feita após o intervalo.",
  wrong_account:
    "A credencial pertence a outro perfil. Conecte a conta profissional @somosb2t.",
};
export function InstagramPanel({
  initial,
  initialVersion,
  configured,
  automaticEnabled,
}: {
  initial: InstagramSettings;
  initialVersion: number;
  configured: boolean;
  automaticEnabled: boolean;
}) {
  const [settings, setSettings] = useState(initial),
    [version, setVersion] = useState(initialVersion);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const pending = useRef(false),
    router = useRouter();
  const posts = newestInstagramPosts(
    settings.posts ?? instagramSeedPosts,
    [],
    24,
  );
  async function request(method: "PUT" | "POST") {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/marketing/instagram", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === "PUT"
            ? {
                expectedVersion: version,
                enabled: settings.enabled,
                hiddenIds: settings.hiddenIds,
              }
            : {},
        ),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Não foi possível concluir.");
      setSettings(result.data.settings);
      setVersion(result.data.version);
      setMessage(
        method === "PUT"
          ? "Preferências do Instagram salvas."
          : result.data.settings.lastError
            ? errorMessages[
                result.data.settings.lastError as keyof typeof errorMessages
              ]
            : result.data.settings.lastSuccessAt
              ? "Cópia do Instagram atualizada ou ainda dentro do intervalo mínimo de consulta."
              : "A conexão ainda não foi concluída. Salve as preferências e confira a configuração do servidor.",
      );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const dirty =
    settings.enabled !== initial.enabled ||
    JSON.stringify(settings.hiddenIds) !== JSON.stringify(initial.hiddenIds);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Instagram</h1>
        <p>
          Publicações de{" "}
          <a href={INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer">
            @somosb2t
          </a>{" "}
          na página inicial, sempre da mais recente para a mais antiga.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Atualização automática</CardTitle>
          <CardDescription>
            Somente leitura do perfil oficial. Sem publicar, editar posts ou
            acessar mensagens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <p role="status">
              {!configured
                ? "Conta ainda não conectada à API no servidor"
                : !automaticEnabled
                  ? "Importação automática desligada no servidor"
                  : settings.lastError
                    ? "A sincronização precisa de atenção"
                    : settings.lastSuccessAt
                      ? "Sincronização automática configurada"
                      : "Conexão configurada; primeira sincronização pendente"}
            </p>
            <p>
              A página usa a última cópia válida e verifica atualizações a cada
              15 minutos quando recebe acessos. Publicações fixadas não passam à
              frente de posts mais recentes.
            </p>
            {settings.lastSuccessAt ? (
              <p>
                Última atualização bem-sucedida:{" "}
                {new Date(settings.lastSuccessAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}{" "}
                (horário de Brasília).
              </p>
            ) : (
              <p>
                A seleção inicial autorizada é de 09/11/2026 e contém
                publicações de 30/09 a 05/11. Ela ainda não representa uma
                conexão automática ativa.
              </p>
            )}
            {settings.lastError && (
              <Notice>{errorMessages[settings.lastError]}</Notice>
            )}
            {!configured && (
              <Notice kind="info">
                A conexão precisa ser configurada por um responsável no
                servidor, com acesso autorizado à conta profissional. Não digite
                senhas ou tokens nesta página.
              </Notice>
            )}
            <Label>
              <Checkbox
                checked={settings.enabled}
                disabled={busy}
                onChange={(e) =>
                  setSettings({ ...settings, enabled: e.target.checked })
                }
              />{" "}
              Exibir publicações na landing inicial
            </Label>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <Button type="button" disabled={busy} onClick={() => request("PUT")}>
            {busy ? "Aguarde…" : "Salvar preferências"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              busy ||
              !configured ||
              !automaticEnabled ||
              !settings.enabled ||
              dirty
            }
            onClick={() => request("POST")}
          >
            Atualizar agora
          </Button>
        </CardFooter>
      </Card>
      {error && (
        <Notice>
          {error} Se houve outra edição, recarregue a página antes de salvar
          novamente.
        </Notice>
      )}
      {message && <Notice kind="info">{message}</Notice>}
      <Card>
        <CardHeader>
          <CardTitle>Publicações da página inicial</CardTitle>
          <CardDescription>
            A landing mostra até seis publicações visíveis. Desmarque uma
            publicação para ocultá-la apenas no site. Os vídeos são abertos no
            Instagram, sem reprodução automática.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {!posts.length && (
              <p>
                A última consulta não retornou publicações. O link para o perfil
                continua disponível no início.
              </p>
            )}
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex flex-wrap items-start gap-4 border-b border-border pb-4"
              >
                <Image
                  src={post.image}
                  alt={post.alt ?? "Capa da publicação"}
                  width={96}
                  height={96}
                  unoptimized
                  className="size-24 object-contain"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Label>
                    <Checkbox
                      disabled={busy}
                      checked={!settings.hiddenIds.includes(post.id)}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          hiddenIds: e.target.checked
                            ? settings.hiddenIds.filter((id) => id !== post.id)
                            : [...settings.hiddenIds, post.id],
                        })
                      }
                    />{" "}
                    Mostrar: {post.title}
                  </Label>
                  <time dateTime={post.publishedAt}>
                    {post.publishedAt
                      .slice(0, 10)
                      .split("-")
                      .reverse()
                      .join("/")}
                  </time>
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Conferir publicação original
                  </a>
                </div>
              </div>
            ))}
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
