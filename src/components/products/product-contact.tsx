"use client";
import { catalogFilters } from "@/domain/products/catalog-navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PublicProductDTO } from "@/domain/products/types";
import { whatsappLink } from "@/domain/products/storefront";
import {
  addInquiry,
  readInquiry,
  writeInquiry,
  useInquiryStorageStatus,
} from "@/lib/inquiry-store";
import { inquiryKey, type InquiryInput } from "@/domain/products/inquiry";
import { replaceInquiryItem } from "@/domain/products/inquiry-draft";
import {
  emptyProductConfiguration,
  validateAnswers,
  answerLabels,
} from "@/domain/products/configuration";
import {
  configuredPrice,
  type ConfiguredPrice,
} from "@/domain/products/configuration-price";
import {
  readConfigurationDraft,
  writeConfigurationDraft,
  clearConfigurationDraft,
} from "@/lib/product-configuration-draft";
import { ProductConfigurationFields } from "./product-configuration-fields";
import { ProductPriceSummary } from "./product-price-summary";
type Props = {
  product: PublicProductDTO;
  phone: string;
  email: string;
  url: string;
  editLineId?: string;
  backHref?: string;
  onOptionImage?: (id: string | null) => void;
};
const subscribe = () => () => {};
export function ProductContact(props: Props) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return hydrated ? (
    <ContactForm
      key={`${props.product.id}:${props.editLineId ?? "new"}`}
      {...props}
    />
  ) : (
    <p role="status">Preparando suas escolhas…</p>
  );
}
function ContactForm({
  product,
  phone,
  email,
  url,
  editLineId,
  backHref,
  onOptionImage,
}: Props) {
  const storageStatus = useInquiryStorageStatus();
  const configuration = product.configuration ?? emptyProductConfiguration;
  const draftKey = `${product.id}:${editLineId ?? "new"}`;
  const [draft, setDraft] = useState<InquiryInput>(() => {
    try {
      return (
        readConfigurationDraft(draftKey) ??
        (editLineId
          ? readInquiry().find((i) => i.lineId === editLineId)
          : null) ?? {
          productId: product.id,
          color: "",
          size: "",
          quantity: 1,
          answers: [],
        }
      );
    } catch {
      return {
        productId: product.id,
        color: "",
        size: "",
        quantity: 1,
        answers: [],
      };
    }
  });
  const [initialImage] = useState(() => {
    const options = configuration.fields.flatMap((f) =>
      f.type === "SINGLE_CHOICE"
        ? f.options.filter(
            (o) =>
              o.id === draft.answers?.find((a) => a.fieldId === f.id)?.value &&
              o.imageId,
          )
        : [],
    );
    return options.at(-1)?.imageId ?? null;
  });
  useEffect(() => {
    if (initialImage) onOptionImage?.(initialImage);
  }, [initialImage, onOptionImage]);
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mergePending, setMergePending] = useState(false);
  const unavailable = product.availability === "UNAVAILABLE";
  let price: ConfiguredPrice | null = null;
  try {
    price = configuredPrice({
      mode: product.publicPriceMode ?? "REFERENCE",
      basePrice: product.price,
      configuration,
      answers: draft.answers ?? [],
      quantity: draft.quantity,
    });
  } catch {}
  const ready =
    (product.colors?.length
      ? product.colors.includes(draft.color ?? "")
      : !draft.color) &&
    (product.sizes?.length
      ? product.sizes.includes(draft.size ?? "")
      : !draft.size);
  function change(next: InquiryInput) {
    setDraft(next);
    setNotice("");
    setErrors({});
    setMergePending(false);
    try {
      setNotice(writeConfigurationDraft(draftKey, next));
    } catch {
      setNotice(
        "Não foi possível guardar este rascunho. Os valores continuam nesta página; reduza os textos antes de sair.",
      );
    }
  }
  function save(confirmMerge = false) {
    try {
      const answers = validateAnswers(configuration, draft.answers ?? []);
      if (!ready) throw new Error("Escolha cor e tamanho disponíveis.");
      const currentPrice = configuredPrice({
        mode: product.publicPriceMode ?? "REFERENCE",
        basePrice: product.price,
        configuration,
        answers,
        quantity: draft.quantity,
      });
      const item = {
        ...draft,
        catalogContext: backHref
          ? {
              ...catalogFilters(
                Object.fromEntries(
                  new URL(backHref, "http://local").searchParams,
                ),
              ),
              order: catalogFilters(
                Object.fromEntries(
                  new URL(backHref, "http://local").searchParams,
                ),
              ).order as "nome" | "recentes" | "menor-preco" | "maior-preco",
            }
          : draft.catalogContext,
        productId: product.id,
        answers,
        commercialRevision: product.commercialRevision ?? 1,
        seenPrice: currentPrice,
        answerLabels: answerLabels(configuration, answers),
      };
      if (editLineId) {
        const rows = readInquiry();
        if (rows.find((i) => i.lineId === editLineId)?.productId !== product.id)
          throw new Error(
            "Esta linha não pertence a este produto ou não está mais na lista. Adicione novamente.",
          );
        if (
          !confirmMerge &&
          rows.some(
            (i) =>
              i.lineId !== editLineId && inquiryKey(i) === inquiryKey(item),
          )
        ) {
          setMergePending(true);
          return;
        }
        writeInquiry(replaceInquiryItem(rows, editLineId, item));
      } else addInquiry(item);
      clearConfigurationDraft(draftKey);
      setMergePending(false);
      setNotice(
        editLineId
          ? "Configuração atualizada na lista."
          : "Produto adicionado à lista.",
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields = Object.fromEntries(
          error.issues.map((i) => [String(i.path[0]), i.message]),
        );
        setErrors(fields);
        const first = Object.keys(fields)[0];
        document.getElementById(`configuration-${first}`)?.focus();
      }
      setNotice(
        error instanceof Error
          ? error instanceof z.ZodError
            ? "Revise os campos indicados."
            : error.message
          : "Não foi possível salvar.",
      );
    }
  }
  const contactMessage = [
    unavailable
      ? `Olá! Gostaria de saber quando ${product.name} estará disponível novamente.`
      : `Olá! Gostaria de tirar uma dúvida sobre ${product.name}.`,
    product.sku && `Código: ${product.sku}`,
    draft.color && `Cor: ${draft.color}`,
    draft.size && `Tamanho: ${draft.size}`,
    url,
  ]
    .filter(Boolean)
    .join("\n");
  const whatsapp = whatsappLink(phone, contactMessage);
  const contact =
    whatsapp ||
    (email
      ? `mailto:${email}?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(contactMessage)}`
      : null);
  return (
    <div className="store-options">
      {storageStatus && <p role="alert">{storageStatus}</p>}
      {unavailable ? (
        <p>Este produto está indisponível no momento.</p>
      ) : (
        <>
          <div className="store-config-heading">
            <h2>
              {editLineId ? "Editar sua escolha" : "Deixe com a sua cara"}
            </h2>
            <p>Escolha os detalhes. Eles acompanham cada item da sua lista.</p>
          </div>
          {[
            {
              values: product.colors,
              value: draft.color ?? "",
              field: "color" as const,
              label: "Cor",
            },
            {
              values: product.sizes,
              value: draft.size ?? "",
              field: "size" as const,
              label: "Tamanho",
            },
          ].map((o) =>
            o.values?.length || o.value ? (
              <div className="field" key={o.field}>
                <Label htmlFor={`order-${o.field}`}>{o.label}</Label>
                <NativeSelect
                  id={`order-${o.field}`}
                  value={o.value}
                  onChange={(e) =>
                    change({ ...draft, [o.field]: e.target.value })
                  }
                >
                  <option value="">
                    {o.values?.length
                      ? "Selecione"
                      : "Não se aplica mais a este produto"}
                  </option>
                  {o.value && !o.values?.includes(o.value) && (
                    <option disabled value={o.value}>
                      {o.value} — opção retirada
                    </option>
                  )}
                  {(o.values ?? []).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null,
          )}
          {(draft.answers ?? [])
            .filter(
              (a) => !configuration.fields.some((f) => f.id === a.fieldId),
            )
            .map((a) => (
              <div role="alert" key={a.fieldId}>
                <p>
                  Este campo foi retirado. Guarde o texto antes de excluir a
                  resposta e continuar.
                </p>
                <p className="store-answer">{a.value}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    change({
                      ...draft,
                      answers: draft.answers?.filter(
                        (v) => v.fieldId !== a.fieldId,
                      ),
                    })
                  }
                >
                  Excluir resposta retirada
                </Button>
              </div>
            ))}
          <ProductConfigurationFields
            configuration={configuration}
            answers={draft.answers ?? []}
            errors={errors}
            onChange={(answers, fieldId) => {
              change({ ...draft, answers });
              const f = configuration.fields.find((f) => f.id === fieldId);
              if (f?.type === "SINGLE_CHOICE")
                onOptionImage?.(
                  f.options.find(
                    (o) =>
                      o.id ===
                      answers.find((a) => a.fieldId === fieldId)?.value,
                  )?.imageId ?? null,
                );
            }}
          />
          <div className="field">
            <Label htmlFor="inquiry-quantity">Quantidade para orçamento</Label>
            <Input
              id="inquiry-quantity"
              type="number"
              min={1}
              max={99}
              step={1}
              value={Number.isNaN(draft.quantity) ? "" : draft.quantity}
              onChange={(e) =>
                change({ ...draft, quantity: e.target.valueAsNumber })
              }
            />
          </div>
          <ProductPriceSummary price={price} quantity={draft.quantity} />
          <div className="store-config-action">
            <Button
              type="button"
              className="w-full"
              disabled={
                !ready ||
                !Number.isInteger(draft.quantity) ||
                draft.quantity < 1 ||
                draft.quantity > 99
              }
              onClick={() => save()}
            >
              {editLineId
                ? "Salvar configuração"
                : "Adicionar à lista de orçamento"}
            </Button>
            {!ready && (
              <p className="store-note">
                Escolha cor e tamanho quando disponíveis.
              </p>
            )}
          </div>
          {mergePending && (
            <div role="alert">
              <p>
                Esta configuração já está na lista. Deseja somar as quantidades
                em uma única linha?
              </p>
              <Button type="button" onClick={() => save(true)}>
                Confirmar e combinar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMergePending(false)}
              >
                Cancelar combinação
              </Button>
            </div>
          )}
          {editLineId && (
            <Button asChild variant="outline">
              <Link
                href="/portfolio/orcamento"
                onClick={() => clearConfigurationDraft(draftKey)}
              >
                Cancelar edição
              </Link>
            </Button>
          )}
        </>
      )}
      {notice && (
        <p role="status">
          {notice}{" "}
          <Link href="/portfolio/orcamento" className="inline-flex whitespace-nowrap">
            Ver minha lista →
          </Link>
        </p>
      )}
      {contact ? (
        <Button asChild variant="outline" className="w-full">
          <a
            href={contact}
            target={whatsapp ? "_blank" : undefined}
            rel={whatsapp ? "noopener noreferrer" : undefined}
          >
            {unavailable
              ? "Consultar reposição"
              : "Tirar uma dúvida com a equipe"}
          </a>
        </Button>
      ) : (
        <p className="store-note">
          Contato de atendimento ainda não informado.
        </p>
      )}
      {backHref && (
        <Link className="store-config-back" href={backHref}>
          Continuar explorando o catálogo
        </Link>
      )}
    </div>
  );
}
