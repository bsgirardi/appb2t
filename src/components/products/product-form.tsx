"use client";
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
import { ProductCalculationFields } from "./product-calculation-fields";
import type { CollectionDTO } from "@/domain/collections/types";
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
}: {
  product?: ProductDTO;
  data: CalculatorData;
  role: "ADMIN" | "OPERATOR";
  collections?: CollectionDTO[];
  onSaved: (product: ProductDTO) => void;
  onCancel: () => void;
}) {
  const [snapshot, setSnapshot] = useState(data);
  const [draft, setDraft] = useState<ProductInput>(() =>
    product
      ? {
          name: product.name,
          price: product.price,
          collectionIds: product.collectionIds,
          images: product.images.map((i) => ({ id: i.id })),
          description: product.description,
          paymentTerms: product.paymentTerms,
          active: product.active,
          calculation: product.calculation,
          materialId: product.materialId,
          printerId: product.printerId,
        }
      : {
          name: "",
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
      images: gallery.map((i) =>
        i.id ? { id: i.id } : { uploadKey: i.uploadKey },
      ),
    });
    if (!parsed.success) {
      setError(
        "Confira os campos do produto e da calculadora. Preencha todos os valores; o tempo e o consumo devem ser positivos.",
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
        <button
          type="button"
          className="button secondary"
          onClick={onCancel}
          disabled={saving || refreshing}
        >
          <ArrowLeft size={16} /> Voltar aos produtos
        </button>
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
            <section className="card">
              <h2>Apresentação do produto</h2>
              <Field
                label="Nome do produto"
                value={draft.name}
                maxLength={120}
                required
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
              <div className="field">
                <label htmlFor="product-description">Descrição</label>
                <textarea
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
                <label htmlFor="product-payment">Formas de pagamento</label>
                <textarea
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
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                hint="Valor publicado no catálogo. Independente da sugestão de custos."
              />
              <button
                type="button"
                className="button secondary"
                disabled={!result}
                onClick={() => {
                  try {
                    setDraft({
                      ...draft,
                      price: suggestedProductPrice(draft.calculation),
                    });
                  } catch {
                    setError("A sugestão excede o limite de preço permitido.");
                  }
                }}
              >
                Usar preço sugerido
              </button>
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
                  <label className="product-checkbox" key={c.id}>
                    <input
                      type="checkbox"
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
                  </label>
                ))}
              </div>
              {!collections.length && (
                <p className="muted">
                  Crie suas coleções em <Link href="/colecoes">Coleções</Link>.
                </p>
              )}
              <label className="product-checkbox">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) =>
                    setDraft({ ...draft, active: e.target.checked })
                  }
                />{" "}
                Produto ativo no catálogo público
              </label>
            </section>
            <section className="card">
              <h2>Referências da calculadora</h2>
              <p className="muted">
                Escolha os cadastros para preencher os custos. Você pode ajustar
                cada valor abaixo.
              </p>
              <div className="field">
                <label htmlFor="product-technology">Tecnologia</label>
                <select
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
                </select>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="product-material">
                    Material de referência
                  </label>
                  <select
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
                            material?.price ?? draft.calculation.materialPrice,
                        },
                      });
                    }}
                  >
                    <option value="">Selecione o material</option>
                    {draft.materialId &&
                      !materials.some((m) => m.id === draft.materialId) && (
                        <option value={draft.materialId}>
                          Referência indisponível · parâmetros salvos
                        </option>
                      )}
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="product-printer">
                    Impressora de referência
                  </label>
                  <select
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
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="button secondary"
                onClick={refresh}
              >
                <RefreshCw size={16} />
                {refreshing ? "Carregando…" : "Carregar configurações atuais"}
              </button>
            </section>
            <ProductCalculationFields
              value={draft.calculation}
              onChange={(calculation) => setDraft({ ...draft, calculation })}
            />
          </div>
          <CostBreakdown
            result={result}
            markup={draft.calculation.settings.markupPercent || "0"}
          />
        </div>
      </fieldset>
      <div className="product-actions">
        <button
          type="submit"
          className="button primary"
          disabled={saving || refreshing || !ready}
        >
          <Save size={17} />
          {saving ? "Salvando…" : "Salvar produto"}
        </button>
        <span className="muted">O preço só será publicado ao salvar.</span>
      </div>
    </form>
  );
}
