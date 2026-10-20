"use client";
import { ProductConfigurationEditor } from "./product-configuration-editor";
import { emptyProductConfiguration } from "@/domain/products/configuration";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { useRef, useState, type FormEvent } from "react";
import Decimal from "decimal.js";
import {
  ProductGalleryEditor,
  type GalleryDraft,
} from "./product-gallery-editor";
import Link from "next/link";
import { RefreshCw, Save, ArrowLeft } from "lucide-react";
import type {
  CalculatorData,
  CalculationInput,
  CalculationResult,
  Technology,
} from "@/domain/calculation/types";
import type { ProductDTO, ProductInput } from "@/domain/products/types";
import {
  productSchema,
  parseFinalPrice,
  suggestedProductPrice,
} from "@/domain/products/validation";
import { calculate, formatBRL } from "@/domain/calculation/calculate";
import { api } from "@/lib/client-api";
import { saveProductRequest } from "@/lib/product-client";
import { Field, Notice } from "@/components/ui/field";
import { CostBreakdown } from "@/components/calculator/cost-breakdown";
import Image from "next/image";
import { productPath, summary } from "@/domain/products/storefront";
import { ProductCalculationFields } from "./product-calculation-fields";
import { ProductCommercialEditor } from "./product-commercial-editor";
import { availabilityLabels } from "@/domain/products/commercial";
import type { CollectionDTO } from "@/domain/collections/types";
import { isBatchCalculation } from "@/domain/pricing/product-calculations";
import type { PricingSnapshotDTO } from "@/domain/pricing/types";
import { ProductPricingEditor } from "@/components/pricing/product-pricing-editor";
import { PricingResult } from "@/components/pricing/pricing-result";
function initialCalculation(data: CalculatorData): CalculationInput {
  return {
    technology: "FDM",
    consumption: "",
    hours: NaN,
    minutes: 0,
    materialPrice: "",
    printer: {
      acquisitionCost: "",
      amortizationMonths: NaN,
      daysPerMonth: NaN,
      hoursPerDay: "",
      watts: "",
    },
    settings: data.settings
      ? { ...data.settings }
      : {
          energyRate: "",
          maintenancePercent: "",
          failurePercent: "",
          finishingPercent: "",
          fixation: "",
          markupPercent: "",
        },
  };
}
export function ProductForm({
  product,
  data,
  role,
  collections = [],
  onSaved,
  onCancel,
  initialPricingSnapshot,
}: {
  product?: ProductDTO;
  data: CalculatorData;
  role: "ADMIN" | "OPERATOR";
  collections?: CollectionDTO[];
  onSaved: (product: ProductDTO) => void;
  onCancel: () => void;
  initialPricingSnapshot?: PricingSnapshotDTO;
}) {
  const [snapshot, setSnapshot] = useState(data);
  const [pricingSnapshot, setPricingSnapshot] = useState<
    PricingSnapshotDTO | undefined
  >(product?.pricingSnapshot ?? initialPricingSnapshot);
  const [draft, setDraft] = useState<
    Omit<ProductInput, "calculation"> & { calculation: CalculationInput }
  >(() =>
    product
      ? {
          name: product.name,
          configuration: product.configuration ?? emptyProductConfiguration,
          publicPriceMode: product.publicPriceMode ?? "REFERENCE",
          sku: product.sku ?? "",
          shortDescription: product.shortDescription ?? "",
          specifications: product.specifications ?? "",
          colors: product.colors ?? [],
          sizes: product.sizes ?? [],
          availability: product.availability ?? "CONSULT",
          leadTimeDays: product.leadTimeDays ?? null,
          seoTitle: product.seoTitle || "",
          seoDescription: product.seoDescription || "",
          price: product.price,
          collectionIds: product.collectionIds,
          images: product.images.map((i) => ({ id: i.id })),
          description: product.description,
          paymentTerms: product.paymentTerms,
          active: product.active,
          calculation: isBatchCalculation(product.calculation)
            ? initialCalculation(data)
            : product.calculation,
          materialId: product.materialId,
          printerId: product.printerId,
        }
      : {
          name: "",
          seoTitle: "",
          seoDescription: "",
          price: "",
          collectionIds: [],
          images: [],
          description: "",
          paymentTerms: "",
          active: true,
          calculation: initialCalculation(data),
          materialId: null,
          printerId: null,
        },
  );
  const [gallery, setGallery] = useState<GalleryDraft[]>(
    () => product?.images.map((i) => ({ id: i.id, url: i.url })) ?? [],
  );
  const pending = useRef(false);
  const [saving, setSaving] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [info, setInfo] = useState("");
  const technology = draft.calculation.technology;
  const materials = snapshot.materials.filter(
      (m) => m.technology === technology,
    ),
    printers = snapshot.printers.filter((p) => p.technology === technology);
  const ready =
    !!pricingSnapshot ||
    !!product ||
    (!!snapshot.settings && materials.length > 0 && printers.length > 0);
  let result: CalculationResult | null = null;
  try {
    result = calculate(draft.calculation);
  } catch {
    /* Incomplete drafts do not have a price. */
  }
  let belowCost = false;
  try {
    belowCost =
      !!result && new Decimal(parseFinalPrice(draft.price)).lt(result.total);
  } catch {
    /* Price may be incomplete while typing. */
  }
  async function refresh() {
    if (pending.current) return;
    pending.current = true;
    setRefreshing(true);
    setError("");
    setInfo("");
    try {
      const next = await api<CalculatorData>("/api/calculator-data");
      setSnapshot(next);
      const material = next.materials.find(
          (m) => m.id === draft.materialId && m.technology === technology,
        ),
        printer = next.printers.find(
          (p) => p.id === draft.printerId && p.technology === technology,
        );
      if (!material || !printer || !next.settings) {
        setError(
          "Selecione material e impressora ativos e verifique as configurações. Os parâmetros salvos foram preservados.",
        );
        return;
      }
      setDraft({
        ...draft,
        calculation: {
          ...draft.calculation,
          materialPrice: material.price,
          printer: { ...printer },
          settings: { ...next.settings },
        },
      });
      setInfo(
        "Configurações carregadas no rascunho. A sugestão foi recalculada; o preço final foi preservado.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setRefreshing(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    setInfo("");
    const parsed = productSchema.safeParse({
      ...draft,
      ...(pricingSnapshot
        ? {
            calculation: { version: 2, snapshotId: pricingSnapshot.id },
            materialId: null,
            printerId: pricingSnapshot.input.printer.ref.id,
          }
        : {}),
      images: gallery.map((i) =>
        i.id ? { id: i.id } : { uploadKey: i.uploadKey },
      ),
    });
    if (!parsed.success) {
      const commercialLabels: Record<string, string> = {
        sku: "Código do produto",
        configuration:
          "Personalização: revise rótulos, limites e valores dos campos",
        publicPriceMode: "Preço no catálogo",
        shortDescription: "Descrição curta",
        specifications: "Especificações",
        colors: "Cores (até 30 opções únicas, com até 60 caracteres cada)",
        sizes: "Tamanhos (até 30 opções únicas, com até 60 caracteres cada)",
        availability: "Disponibilidade",
        leadTimeDays: "Prazo de produção (entre 1 e 365 dias inteiros)",
      };
      const invalidCommercial = parsed.error.issues
        .map((issue) => commercialLabels[String(issue.path[0])])
        .filter(Boolean);
      setError(
        invalidCommercial.length
          ? `Confira: ${[...new Set(invalidCommercial)].join("; ")}.`
          : "Confira os campos do produto e da calculadora. Preencha todos os valores; o tempo e o consumo devem ser positivos.",
      );
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      onSaved(
        await saveProductRequest(
          product?.id,
          {
            ...parsed.data,
            ...(product ? { expectedVersion: product.version } : {}),
          },
          Object.fromEntries(
            gallery
              .filter((i) => i.file && i.uploadKey)
              .map((i) => [i.uploadKey!, i.file!]),
          ),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <form className="product-form" onSubmit={save} noValidate>
      <div className="product-toolbar">
        <Button
          variant="outline"
          size="sm"
          type="button"
          className=""
          onClick={onCancel}
          disabled={saving || refreshing}
        >
          <ArrowLeft size={16} /> Voltar aos produtos
        </Button>
        <span className="muted">
          {product ? "Editar produto" : "Novo produto"}
        </span>
      </div>
      {error && <Notice>{error}</Notice>}
      {info && <Notice kind="info">{info}</Notice>}
      {!ready && (
        <Notice kind="info">
          {role === "ADMIN" ? (
            <>
              Configure materiais, impressoras e custos antes de cadastrar.{" "}
              <Link href="/configuracoes">Abrir configurações</Link>
            </>
          ) : (
            "Solicite a um administrador a configuração de materiais, impressoras e custos."
          )}
        </Notice>
      )}
      <fieldset disabled={saving || refreshing}>
        <div className="product-edit-grid">
          <div className="product-form">
            <Card asChild>
              <section className="">
                <h2>Apresentação do produto</h2>
                <Field
                  label="Nome do produto"
                  value={draft.name}
                  maxLength={120}
                  required
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                <div className="field">
                  <Label htmlFor="product-description">Descrição</Label>
                  <Textarea
                    id="product-description"
                    value={draft.description}
                    maxLength={5000}
                    required
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <Label htmlFor="product-payment">Formas de pagamento</Label>
                  <Textarea
                    id="product-payment"
                    value={draft.paymentTerms}
                    maxLength={1000}
                    placeholder="Ex.: Pix ou cartão em até 3 vezes sem juros"
                    required
                    onChange={(e) =>
                      setDraft({ ...draft, paymentTerms: e.target.value })
                    }
                  />
                </div>
                <Field
                  label="Preço final de venda"
                  value={draft.price}
                  inputMode="decimal"
                  required
                  onChange={(e) =>
                    setDraft({ ...draft, price: e.target.value })
                  }
                  hint="Valor publicado no catálogo. Independente da sugestão de custos."
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className=""
                  disabled={!result && !pricingSnapshot}
                  onClick={() => {
                    try {
                      setDraft({
                        ...draft,
                        price: parseFinalPrice(
                          pricingSnapshot
                            ? pricingSnapshot.result.offeredUnitPrice
                            : suggestedProductPrice(draft.calculation),
                        ),
                      });
                    } catch {
                      setError(
                        "A sugestão excede o limite de preço permitido.",
                      );
                    }
                  }}
                >
                  Usar preço sugerido
                </Button>
                {belowCost && result && (
                  <Notice kind="info">
                    Preço final abaixo do custo de produção de{" "}
                    {formatBRL(result.total)}. Confira sua decisão comercial.
                  </Notice>
                )}
                <ProductGalleryEditor
                  value={gallery}
                  onChange={setGallery}
                  onError={setError}
                />
                <h2>Coleções</h2>
                <div className="selection-list">
                  {collections.map((c) => (
                    <Label className="product-checkbox" key={c.id}>
                      <Checkbox
                        checked={draft.collectionIds.includes(c.id)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            collectionIds: e.target.checked
                              ? [...draft.collectionIds, c.id]
                              : draft.collectionIds.filter((id) => id !== c.id),
                          })
                        }
                      />
                      {c.name}
                      {c.active ? "" : " (inativa)"}
                    </Label>
                  ))}
                </div>
                {!collections.length && (
                  <p className="muted">
                    Crie suas coleções em <Link href="/colecoes">Coleções</Link>
                    .
                  </p>
                )}
                <Label className="product-checkbox">
                  <Checkbox
                    checked={draft.active}
                    onChange={(e) =>
                      setDraft({ ...draft, active: e.target.checked })
                    }
                  />{" "}
                  Produto ativo no catálogo público
                </Label>
              </section>
            </Card>
            <div className="field">
              <Label htmlFor="public-price-mode">Preço no catálogo</Label>
              <NativeSelect
                id="public-price-mode"
                value={draft.publicPriceMode ?? "REFERENCE"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    publicPriceMode: e.target.value as "REFERENCE" | "CONSULT",
                  })
                }
              >
                <option value="REFERENCE">Preço de referência</option>
                <option value="CONSULT">Sob consulta</option>
              </NativeSelect>
              <p className="muted">
                Sob consulta preserva o preço interno e o oculta na vitrine.
              </p>
            </div>
            <ProductConfigurationEditor
              value={draft.configuration ?? emptyProductConfiguration}
              images={(product?.images ?? []).filter((image) =>
                gallery.some((g) => g.id === image.id),
              )}
              onChange={(configuration) =>
                setDraft({ ...draft, configuration })
              }
            />
            <ProductCommercialEditor
              value={draft}
              onChange={(commercial) => setDraft({ ...draft, ...commercial })}
            />
            <Card asChild>
              <section className="product-seo-editor">
                <h2>Busca e compartilhamento</h2>
                <p className="muted">
                  Personalize a apresentação nos buscadores. Campos vazios usam
                  o nome e a descrição do produto.
                </p>
                <Field
                  label="Título para buscadores"
                  value={draft.seoTitle || ""}
                  maxLength={70}
                  onChange={(e) =>
                    setDraft({ ...draft, seoTitle: e.target.value })
                  }
                  hint={`${(draft.seoTitle || "").length}/70 caracteres`}
                />
                <div className="field">
                  <Label htmlFor="product-seo-description">
                    Descrição para buscadores
                  </Label>
                  <Textarea
                    id="product-seo-description"
                    value={draft.seoDescription || ""}
                    maxLength={170}
                    onChange={(e) =>
                      setDraft({ ...draft, seoDescription: e.target.value })
                    }
                  />
                </div>
                <div className="search-preview">
                  <small>Prévia aproximada nos buscadores</small>
                  <h3>{draft.seoTitle || draft.name || "Nome do produto"}</h3>
                  <p>
                    {draft.seoDescription ||
                      summary(draft.description) ||
                      "Adicione uma descrição clara do produto."}
                  </p>
                </div>
              </section>
            </Card>
            <Card asChild>
              <details className="product-publish-preview">
                <summary>Prévia do produto antes de publicar</summary>
                <p className="muted">
                  Esta prévia acompanha o rascunho. As alterações só são
                  publicadas ao salvar.
                </p>
                {gallery[0]?.url && (
                  <Image
                    src={gallery[0].url}
                    alt={`Prévia de ${draft.name || "produto"}`}
                    width={360}
                    height={360}
                    unoptimized
                  />
                )}
                <h2>{draft.name || "Nome do produto"}</h2>
                {draft.sku && <small>Código: {draft.sku}</small>}
                <p>
                  {availabilityLabels[draft.availability ?? "CONSULT"]}
                  {draft.leadTimeDays
                    ? ` · Produção em até ${draft.leadTimeDays} dias úteis`
                    : ""}
                </p>
                {draft.shortDescription && <p>{draft.shortDescription}</p>}
                {!!draft.colors?.length && (
                  <p>Cores: {draft.colors.filter(Boolean).join(", ")}</p>
                )}
                {!!draft.sizes?.length && (
                  <p>Tamanhos: {draft.sizes.filter(Boolean).join(", ")}</p>
                )}
                <p>{draft.description}</p>
                {draft.specifications && <p>{draft.specifications}</p>}
                <strong>
                  {/^\d+([.,]\d{1,2})?$/.test(draft.price)
                    ? formatBRL(draft.price.replace(",", "."))
                    : "Informe o preço"}
                </strong>
                <p>{draft.paymentTerms}</p>
                {product?.active && (
                  <a
                    href={productPath(product)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir versão publicada ↗
                  </a>
                )}
              </details>
            </Card>
            <ProductPricingEditor
              snapshot={pricingSnapshot}
              legacy={draft.calculation}
              materialId={draft.materialId}
              printerId={draft.printerId}
              onApply={(next) => {
                setPricingSnapshot(next);
                setInfo(
                  "Ficha por lote aplicada ao rascunho. O preço final foi preservado.",
                );
              }}
            />
            {!pricingSnapshot && (
              <>
                <Card asChild>
                  <section className="">
                    <h2>Referências da calculadora</h2>
                    <p className="muted">
                      Escolha os cadastros para preencher os custos. Você pode
                      ajustar cada valor abaixo.
                    </p>
                    <div className="field">
                      <Label htmlFor="product-technology">Tecnologia</Label>
                      <NativeSelect
                        id="product-technology"
                        value={technology}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            materialId: null,
                            printerId: null,
                            calculation: {
                              ...draft.calculation,
                              technology: e.target.value as Technology,
                            },
                          })
                        }
                      >
                        <option value="FDM">Filamento · FDM</option>
                        <option value="RESIN">Resina · SLA / DLP</option>
                      </NativeSelect>
                    </div>
                    <div className="form-grid">
                      <div className="field">
                        <Label htmlFor="product-material">
                          Material de referência
                        </Label>
                        <NativeSelect
                          id="product-material"
                          value={draft.materialId ?? ""}
                          onChange={(e) => {
                            const material = materials.find(
                              (m) => m.id === e.target.value,
                            );
                            setDraft({
                              ...draft,
                              materialId: material?.id ?? null,
                              calculation: {
                                ...draft.calculation,
                                materialPrice:
                                  material?.price ??
                                  draft.calculation.materialPrice,
                              },
                            });
                          }}
                        >
                          <option value="">Selecione o material</option>
                          {draft.materialId &&
                            !materials.some(
                              (m) => m.id === draft.materialId,
                            ) && (
                              <option value={draft.materialId}>
                                Referência indisponível · parâmetros salvos
                              </option>
                            )}
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="field">
                        <Label htmlFor="product-printer">
                          Impressora de referência
                        </Label>
                        <NativeSelect
                          id="product-printer"
                          value={draft.printerId ?? ""}
                          onChange={(e) => {
                            const printer = printers.find(
                              (p) => p.id === e.target.value,
                            );
                            setDraft({
                              ...draft,
                              printerId: printer?.id ?? null,
                              calculation: {
                                ...draft.calculation,
                                printer: printer
                                  ? { ...printer }
                                  : draft.calculation.printer,
                              },
                            });
                          }}
                        >
                          <option value="">Selecione a impressora</option>
                          {draft.printerId &&
                            !printers.some((p) => p.id === draft.printerId) && (
                              <option value={draft.printerId}>
                                Referência indisponível · parâmetros salvos
                              </option>
                            )}
                          {printers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className=""
                      onClick={refresh}
                    >
                      <RefreshCw size={16} />
                      {refreshing
                        ? "Carregando…"
                        : "Carregar configurações atuais"}
                    </Button>
                  </section>
                </Card>
                <ProductCalculationFields
                  value={draft.calculation}
                  onChange={(calculation) =>
                    setDraft({ ...draft, calculation })
                  }
                />
              </>
            )}
          </div>
          {pricingSnapshot ? (
            <PricingResult
              input={pricingSnapshot.input}
              result={pricingSnapshot.result}
            />
          ) : (
            <CostBreakdown
              result={result}
              markup={draft.calculation.settings.markupPercent || "0"}
            />
          )}
        </div>
      </fieldset>
      <div className="product-actions">
        <Button
          variant="default"
          size="sm"
          type="submit"
          className=""
          disabled={saving || refreshing || !ready}
        >
          <Save size={17} />
          {saving ? "Salvando…" : "Salvar produto"}
        </Button>
        <span className="muted">O preço só será publicado ao salvar.</span>
      </div>
    </form>
  );
}
