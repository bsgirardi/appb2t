"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AppearanceDTO } from "@/domain/appearance/types";
import { defaultStorefront } from "@/domain/appearance/storefront";
import {
  seoSchema,
  seoPages,
  type SeoPage,
  resolveSeo,
} from "@/domain/marketing/seo";
import { analyticsSchema } from "@/domain/marketing/analytics";
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
  Notice,
  TextareaField,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { GoogleAnalyticsPanel } from "./google-analytics-panel";
import { SeoImageSelect, type SeoImageOption } from "./seo-image-select";
import { summary } from "@/domain/products/storefront";

export function SeoPanel({
  initial,
  canonicalOrigin,
  googleConfigured,
  collectionEnabled,
  googleResult,
  images = [],
}: {
  initial: AppearanceDTO;
  canonicalOrigin: string;
  googleConfigured: boolean;
  collectionEnabled: boolean;
  googleResult?: string;
  images?: SeoImageOption[];
}) {
  const config = initial.storefront ?? defaultStorefront;
  const [seo, setSeo] = useState(seoSchema.parse(config.seo ?? {}));
  const [analytics, setAnalytics] = useState(
    analyticsSchema.parse(config.analytics ?? {}),
  );
  const [catalogTitle, setCatalogTitle] = useState(config.seoTitle);
  const [catalogDescription, setCatalogDescription] = useState(
    config.seoDescription,
  );
  const [version, setVersion] = useState(initial.version);
  const [page, setPage] = useState<SeoPage>("/");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const pending = useRef(false),
    router = useRouter();
  const pageValue = {
    title: "",
    description: "",
    image: "",
    index: true,
    ...seo.pages[page],
  };
  function changePage(value: Partial<typeof pageValue>) {
    const next = { ...pageValue, ...value };
    setSeo({
      ...seo,
      pages: {
        ...seo.pages,
        [page]:
          page === "/catalogo"
            ? { image: next.image, index: next.index }
            : next,
      },
    });
  }
  const preview = resolveSeo(
    seo,
    page,
    page === "/catalogo"
      ? catalogTitle || `Catálogo | ${initial.name}`
      : page === "/"
        ? `${initial.name} | Ideias em 3D`
        : page === "/portfolio/sobre"
          ? `${config.aboutTitle || "Sobre a loja"} | ${initial.name}`
          : `Ajuda e perguntas frequentes | ${initial.name}`,
    page === "/catalogo"
      ? catalogDescription || initial.slogan
      : page === "/"
        ? "Produtos personalizados, presentes e ideias em 3D. Conheça a B2T e explore o catálogo para preparar seu orçamento."
        : page === "/portfolio/sobre"
          ? summary(config.aboutText)
          : summary(config.faq.map((item) => item.question).join(" ")),
    "/brand/b2t-logo.png",
  );
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    setMessage("");
    const parsedSeo = seoSchema.safeParse(seo),
      parsedAnalytics = analyticsSchema.safeParse(analytics);
    if (!parsedSeo.success || !parsedAnalytics.success) {
      setError(
        [
          ...(!parsedSeo.success ? parsedSeo.error.issues : []),
          ...(!parsedAnalytics.success ? parsedAnalytics.error.issues : []),
        ]
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" · "),
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/marketing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: version,
          seo: parsedSeo.data,
          analytics: parsedAnalytics.data,
          seoTitle: catalogTitle,
          seoDescription: catalogDescription,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Não foi possível salvar.");
      setVersion(result.data.version);
      setMessage(
        "SEO e identificadores salvos. A coleta depende da configuração do servidor e da escolha de cada visitante.",
      );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-6 marketing-settings">
      <div>
        <h1>SEO e Analytics</h1>
        <p>
          Gerencie como a B2T aparece nas buscas e consulte as fontes de
          audiência.
        </p>
      </div>
      <form onSubmit={save} className="flex flex-col gap-6">
        <fieldset disabled={busy} className="contents">
          <Card>
            <CardHeader>
              <CardTitle>Padrões do site</CardTitle>
              <CardDescription>
                Nome, slogan e contatos usam a identidade já cadastrada em{" "}
                <Link href="/configuracoes/aparencia">Aparência</Link>. Campos
                vazios herdam o conteúdo de cada página.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field
                  label="Título padrão"
                  value={seo.title}
                  maxLength={70}
                  onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                  hint="Até 70 caracteres. Na página inicial, descreva o que a B2T oferece."
                />
                <TextareaField
                  label="Descrição padrão"
                  value={seo.description}
                  maxLength={170}
                  onChange={(e) =>
                    setSeo({ ...seo, description: e.target.value })
                  }
                />
                <SeoImageSelect
                  id="seo-default-image"
                  label="Imagem padrão de compartilhamento"
                  value={seo.image}
                  options={images}
                  onChange={(image) => setSeo({ ...seo, image })}
                />
                <Label>
                  <Checkbox
                    checked={seo.indexPublic}
                    onChange={(e) =>
                      setSeo({ ...seo, indexPublic: e.target.checked })
                    }
                  />{" "}
                  Permitir indexação das páginas públicas
                </Label>
                <p>
                  Login, administração e fluxos privados continuam fora da
                  indexação. Desmarcar esta opção pede aos buscadores que
                  retirem as páginas públicas; isso pode levar tempo.
                </p>
                <p>
                  Domínio canônico:{" "}
                  <strong className="break-all">{canonicalOrigin}</strong>. É
                  definido na configuração do servidor.
                </p>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>SEO por página</CardTitle>
              <CardDescription>
                Produtos usam seus títulos e descrições de SEO já cadastrados.
                Coleções usam nome, descrição e imagem próprios. Essas
                informações têm prioridade sobre os padrões.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Label htmlFor="seo-page">Página pública</Label>
                <NativeSelect
                  id="seo-page"
                  value={page}
                  onChange={(e) => setPage(e.target.value as SeoPage)}
                >
                  {Object.entries(seoPages).map(([path, title]) => (
                    <option key={path} value={path}>
                      {title}
                    </option>
                  ))}
                </NativeSelect>
                <Field
                  label={`Título de ${seoPages[page]}`}
                  maxLength={70}
                  value={page === "/catalogo" ? catalogTitle : pageValue.title}
                  onChange={(e) =>
                    page === "/catalogo"
                      ? setCatalogTitle(e.target.value)
                      : changePage({ title: e.target.value })
                  }
                />
                <TextareaField
                  label={`Descrição de ${seoPages[page]}`}
                  maxLength={170}
                  value={
                    page === "/catalogo"
                      ? catalogDescription
                      : pageValue.description
                  }
                  onChange={(e) =>
                    page === "/catalogo"
                      ? setCatalogDescription(e.target.value)
                      : changePage({ description: e.target.value })
                  }
                />
                <SeoImageSelect
                  id="seo-page-image"
                  label={`Imagem de ${seoPages[page]}`}
                  value={pageValue.image}
                  options={images}
                  onChange={(image) => changePage({ image })}
                />
                <Label>
                  <Checkbox
                    checked={pageValue.index}
                    onChange={(e) => changePage({ index: e.target.checked })}
                  />{" "}
                  Permitir indexação desta página pública
                </Label>
                <div
                  className="rounded-lg border border-border p-4"
                  aria-label="Prévia para buscadores"
                >
                  <p className="break-all text-sm">
                    {canonicalOrigin}
                    {page}
                  </p>
                  <h3>{preview.title}</h3>
                  <p>
                    {preview.description ||
                      "A descrição será herdada do conteúdo da página."}
                  </p>
                  <p>
                    {preview.index
                      ? "Indexação permitida"
                      : "Indexação desativada"}
                  </p>
                  <Image
                    src={preview.image || "/brand/b2t-logo.png"}
                    alt="Imagem escolhida para compartilhamento"
                    width={320}
                    height={180}
                    unoptimized
                    className="max-w-full object-contain"
                  />
                  <small>
                    Prévia ilustrativa. O Google e as redes sociais podem
                    apresentar outros trechos e recortes.
                  </small>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Redirecionamentos permanentes</CardTitle>
              <CardDescription>
                Encaminhe caminhos antigos sem página para uma página pública
                atual. As consultas são preservadas. Endereços do sistema não
                podem ser substituídos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                {seo.redirects.map((row, index) => (
                  <fieldset
                    className="flex flex-col gap-3 rounded-lg border border-border p-4"
                    key={index}
                  >
                    <legend>Redirecionamento {index + 1}</legend>
                    <Field
                      label="Caminho antigo"
                      placeholder="/campanha-antiga"
                      value={row.from}
                      maxLength={160}
                      required
                      onChange={(e) =>
                        setSeo({
                          ...seo,
                          redirects: seo.redirects.map((r, i) =>
                            i === index ? { ...r, from: e.target.value } : r,
                          ),
                        })
                      }
                    />
                    <Field
                      label="Destino público"
                      placeholder="/catalogo"
                      value={row.to}
                      maxLength={300}
                      required
                      onChange={(e) =>
                        setSeo({
                          ...seo,
                          redirects: seo.redirects.map((r, i) =>
                            i === index ? { ...r, to: e.target.value } : r,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setSeo({
                          ...seo,
                          redirects: seo.redirects.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      Remover redirecionamento {index + 1}
                    </Button>
                  </fieldset>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={seo.redirects.length >= 30}
                  onClick={() =>
                    setSeo({
                      ...seo,
                      redirects: [
                        ...seo.redirects,
                        { from: "", to: "/catalogo" },
                      ],
                    })
                  }
                >
                  Adicionar redirecionamento
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Fontes Google</CardTitle>
              <CardDescription>
                A tag coleta eventos; a conexão de leitura consulta relatórios.
                Salvar identificadores não concede acesso à sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field
                  label="Identificador da tag GA4"
                  placeholder="G-XXXXXXXXXX"
                  value={analytics.measurementId}
                  maxLength={22}
                  onChange={(e) =>
                    setAnalytics({
                      ...analytics,
                      measurementId: e.target.value,
                    })
                  }
                />
                <Field
                  label="Número da propriedade GA4"
                  placeholder="123456789"
                  value={analytics.propertyId}
                  inputMode="numeric"
                  maxLength={20}
                  onChange={(e) =>
                    setAnalytics({ ...analytics, propertyId: e.target.value })
                  }
                />
                <Field
                  label="Propriedade do Search Console"
                  placeholder="sc-domain:seudominio.com.br"
                  value={analytics.searchConsoleSite}
                  maxLength={300}
                  onChange={(e) =>
                    setAnalytics({
                      ...analytics,
                      searchConsoleSite: e.target.value,
                    })
                  }
                />
                <p>
                  Coleta no servidor:{" "}
                  <strong>
                    {collectionEnabled
                      ? "habilitada para visitantes que aceitarem"
                      : "desligada"}
                  </strong>
                  . A preferência de privacidade de cada visitante é respeitada.
                </p>
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={busy}>
                {busy ? "Salvando…" : "Salvar SEO e identificadores"}
              </Button>
            </CardFooter>
          </Card>
        </fieldset>
        {error && (
          <Notice>
            {error} Se outra pessoa alterou as configurações, recarregue a
            página antes de salvar novamente.
          </Notice>
        )}
        {message && <Notice kind="success">{message}</Notice>}
      </form>
      <GoogleAnalyticsPanel
        key={version}
        configured={googleConfigured}
        initialResult={googleResult}
        settingsVersion={version}
      />
    </div>
  );
}
