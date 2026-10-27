"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CatalogQuantityInput } from "@/components/products/catalog-quantity-input";
import { Alert } from "@/components/ui/alert";
import type { PublicProductDTO } from "@/domain/products/types";
import type { KitDTO, KitGroupReview, KitSelection } from "@/domain/kits/types";
import {
  inquiryItemsSchema,
  mergeInquiryItem,
  type InquiryInput,
  type InquiryReview,
} from "@/domain/products/inquiry";
import { replaceInquiryItem } from "@/domain/products/inquiry-draft";
import { configuredPrice } from "@/domain/products/configuration-price";
import { emptyProductConfiguration } from "@/domain/products/configuration";
import { calculateKitPrice } from "@/domain/kits/pricing";
import {
  useKitSelection,
  readKitSelection,
  useInquiryStorageStatus,
  useInquiryDraftValid,
} from "@/lib/inquiry-store";
import { createKitCompositionStore } from "@/lib/kit-composition-store";
import { api } from "@/lib/client-api";
import { ProductContact } from "@/components/products/product-contact";
import { KitCanvas } from "./kit-canvas";
import { KitControls } from "./kit-controls";
import { KitSummary } from "./kit-summary";
import { KitPicker } from "./kit-picker";
const subscribe = () => () => {},
  clamp = (n: number) => Math.max(0, Math.min(1, n));
type Props = {
  kit: KitDTO;
  products: PublicProductDTO[];
  initialInstanceId?: string;
};
export function KitBuilder(props: Props) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return hydrated ? (
    <RecoverableBuilder {...props} />
  ) : (
    <p role="status">Preparando a montagem…</p>
  );
}
function RecoverableBuilder(props: Props) {
  const valid = useInquiryDraftValid();
  if (!valid)
    return (
      <Alert role="alert">
        Não foi possível ler sua lista salva. Copie a recuperação antes de
        reiniciar.{" "}
        <Link href="/portfolio/orcamento">Abrir recuperação da lista</Link>
      </Alert>
    );
  return <Builder {...props} />;
}
function Builder({ kit, products, initialInstanceId }: Props) {
  const selection = useKitSelection(),
    storage = useInquiryStorageStatus();
  const [controller] = useState(createKitCompositionStore),
    history = useSyncExternalStore(
      controller.subscribe,
      controller.getSnapshot,
      controller.getSnapshot,
    );
  const [instanceId, setInstanceId] = useState(
    () =>
      (initialInstanceId &&
      !selection.groups.some(
        (g) => g.instanceId === initialInstanceId && g.kitId !== kit.id,
      )
        ? initialInstanceId
        : undefined) ??
      selection.groups.find((g) => g.kitId === kit.id)?.instanceId ??
      crypto.randomUUID(),
  );
  const [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<string | undefined>(),
    [product, setProduct] = useState<PublicProductDTO | null>(null),
    [notice, setNotice] = useState(""),
    [zoom, setZoom] = useState(1),
    [busy, setBusy] = useState(false);
  const group = selection.groups.find(
      (g) => g.instanceId === instanceId && g.kitId === kit.id,
    ),
    members = selection.items.filter((i) => i.kitInstanceId === instanceId),
    itemsStamp = JSON.stringify(members),
    stamp = JSON.stringify({ items: members, group });
  const [invalidQuantities, setInvalidQuantities] = useState<
    Record<string, boolean>
  >({});
  const quantityInvalid = members.some(
    (item) => invalidQuantities[item.lineId!],
  );
  const pricingStamp = JSON.stringify([
    kit.id,
    instanceId,
    members.map(({ lineId, productId, quantity, color, size, answers }) => ({
      lineId,
      productId,
      quantity,
      color,
      size,
      answers,
    })),
  ]);
  const [reviewed, setReviewed] = useState<{
    stamp: string;
    pricingStamp: string;
    review: InquiryReview;
  }>();
  const eligible = products.filter(
    (p) => kit.productIds.includes(p.id) && p.availability !== "UNAVAILABLE",
  );
  const localPrice = (() => {
    try {
      const rows = inquiryItemsSchema.parse(JSON.parse(itemsStamp));
      if (!rows.length) return { price: null, problem: null };
      return {
        price: calculateKitPrice(
          rows.map((item) => {
            const p = products.find((p) => p.id === item.productId);
            if (
              !p ||
              !kit.productIds.includes(p.id) ||
              p.availability === "UNAVAILABLE"
            )
              throw new Error(
                "Uma peça não está mais disponível neste kit. Remova-a ou revise a escolha.",
              );
            return {
              quantity: item.quantity,
              price: configuredPrice({
                mode: p.publicPriceMode ?? "REFERENCE",
                basePrice: p.price,
                configuration: p.configuration ?? emptyProductConfiguration,
                answers: item.answers,
                quantity: item.quantity,
                minimumQuantity: p.minimumQuantity,
              }),
            };
          }),
          kit.tiers,
        ),
        problem: null,
      };
    } catch (error) {
      return { price: null, problem: (error as Error).message };
    }
  })();
  const currentReview = reviewed?.stamp === stamp ? reviewed.review : undefined;
  const reviewedPrice =
    reviewed?.pricingStamp === pricingStamp
      ? reviewed.review.groups?.find((g) => g.instanceId === instanceId)
      : undefined;
  const summary: KitGroupReview = {
    instanceId,
    kitId: kit.id,
    commercialRevision: group?.commercialRevision ?? null,
    currentRevision: kit.commercialRevision,
    name: kit.name,
    placements: group?.placements ?? [],
    seenPrice: group?.seenPrice ?? null,
    price: localPrice.price,
    problem: localPrice.problem,
    requiresConfirmation: !!group && !currentReview?.ready,
  };
  function commit(next: KitSelection, message = "Composição atualizada.") {
    try {
      controller.commit(next);
      setNotice(message);
      return true;
    } catch (error) {
      setNotice((error as Error).message);
      return false;
    }
  }
  function transformGroup(
    change: (selection: KitSelection) => KitSelection,
    message?: string,
  ) {
    return commit(change(readKitSelection()), message);
  }
  function move(lineId: string, x: number, y: number) {
    transformGroup(
      (current) => ({
        ...current,
        groups: current.groups.map((g) =>
          g.instanceId === instanceId
            ? {
                ...g,
                placements: g.placements.map((p) =>
                  p.lineId === lineId ? { ...p, x: clamp(x), y: clamp(y) } : p,
                ),
              }
            : g,
        ),
      }),
      "Posição atualizada. A quantidade e o valor não mudaram.",
    );
  }
  function reorder(lineId: string, direction: "front" | "back") {
    transformGroup((current) => ({
      ...current,
      groups: current.groups.map((g) => {
        if (g.instanceId !== instanceId) return g;
        const piece = g.placements.find((p) => p.lineId === lineId);
        if (!piece) return g;
        const others = g.placements.filter((p) => p.lineId !== lineId);
        return {
          ...g,
          placements: (direction === "front"
            ? [...others, piece]
            : [piece, ...others]
          ).map((p, z) => ({ ...p, z })),
        };
      }),
    }));
  }
  function saveItem(item: InquiryInput) {
    const current = readKitSelection(),
      nextItem = {
        ...item,
        kitInstanceId: instanceId,
        lineId: editing ?? crypto.randomUUID(),
      };
    const items = editing
      ? replaceInquiryItem(current.items, editing, nextItem)
      : mergeInquiryItem(current.items, nextItem);
    const existing = current.groups.find((g) => g.instanceId === instanceId),
      rows = items.filter((i) => i.kitInstanceId === instanceId);
    const nextGroup = {
      instanceId,
      kitId: kit.id,
      commercialRevision: kit.commercialRevision,
      seenPrice: null,
      placements: rows.map(
        (i, z) =>
          existing?.placements.find((p) => p.lineId === i.lineId) ?? {
            lineId: i.lineId!,
            x: 0.2 + (z % 3) * 0.3,
            y: 0.2 + Math.floor(z / 3) * 0.08,
            z,
          },
      ),
    };
    controller.commit({
      ...current,
      items,
      groups: existing
        ? current.groups.map((g) =>
            g.instanceId === instanceId ? nextGroup : g,
          )
        : [...current.groups, nextGroup],
    });
    setProduct(null);
    setEditing(undefined);
    setNotice("Peça salva no conjunto. Revise o resumo antes de enviar.");
  }
  function remove(lineId: string) {
    transformGroup((current) => {
      const items = current.items.filter((i) => i.lineId !== lineId);
      return {
        ...current,
        items,
        groups: current.groups.flatMap((g) =>
          g.instanceId !== instanceId
            ? [g]
            : items.some((i) => i.kitInstanceId === instanceId)
              ? [
                  {
                    ...g,
                    seenPrice: null,
                    placements: g.placements.filter((p) => p.lineId !== lineId),
                  },
                ]
              : [],
        ),
      };
    }, "Peça removida do conjunto.");
    setSelected(null);
  }
  async function review() {
    if (!group || busy) return;
    setBusy(true);
    try {
      const fresh = await api<InquiryReview>("/api/portfolio/inquiry", {
        schemaVersion: 2,
        items: members,
        groups: [group],
      });
      setReviewed({ stamp, pricingStamp, review: fresh });
      setNotice(
        fresh.ready
          ? "Conjunto revisado. Continue para a lista para enviar à equipe."
          : "Confira as referências atuais e confirme as condições deste conjunto.",
      );
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function confirm() {
    if (!currentReview) return;
    const fresh = currentReview.groups?.[0];
    if (!fresh || fresh.problem || currentReview.lines.some((l) => l.problem))
      return;
    transformGroup(
      (current) => ({
        ...current,
        items: current.items.map((item) => {
          const line = currentReview.lines.find(
            (l) => l.lineId === item.lineId,
          );
          return line
            ? {
                ...item,
                answers: line.answers,
                answerLabels: line.answerLabels,
                commercialRevision: line.currentRevision ?? null,
                seenPrice: line.configuredPrice ?? null,
              }
            : item;
        }),
        groups: current.groups.map((g) =>
          g.instanceId === instanceId
            ? {
                ...g,
                commercialRevision: fresh.currentRevision,
                seenPrice: fresh.price,
              }
            : g,
        ),
      }),
      "Condições confirmadas. Revise o conjunto novamente para continuar.",
    );
  }
  return (
    <article className="kit-builder">
      <header className="store-heading">
        <div>
          <h1>{kit.name}</h1>
          <p>
            {kit.description ||
              "Escolha as peças, personalize e organize sua composição."}
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/portfolio/orcamento">Ver minha lista</Link>
        </Button>
      </header>
      {storage && (
        <Alert role="alert">
          {storage}{" "}
          <Link href="/portfolio/orcamento">Abrir recuperação da lista</Link>
        </Alert>
      )}
      <div className="kit-instance-picker">
        <Label htmlFor="kit-instance">Montagem deste kit</Label>
        <NativeSelect
          id="kit-instance"
          value={instanceId}
          className="min-h-11"
          onChange={(e) => {
            setInstanceId(e.target.value);
            setSelected(null);
            setProduct(null);
            setEditing(undefined);
          }}
        >
          {selection.groups
            .filter((g) => g.kitId === kit.id)
            .map((g, i) => (
              <option key={g.instanceId} value={g.instanceId}>
                Conjunto {i + 1}
              </option>
            ))}
          {!group && <option value={instanceId}>Novo conjunto</option>}
        </NativeSelect>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => {
            setInstanceId(crypto.randomUUID());
            setSelected(null);
            setProduct(null);
            setEditing(undefined);
          }}
        >
          Novo conjunto deste kit
        </Button>
      </div>
      {notice && (
        <p role="status" className="kit-announcement">
          {notice}
        </p>
      )}
      <div className="kit-builder-layout">
        <div className="kit-builder-panel">
          <KitPicker
            products={eligible}
            onSelect={(p) => {
              setProduct(p);
              setEditing(undefined);
            }}
          />
          {product && (
            <section className="kit-product-configuration">
              <h2>{product.name}</h2>
              <ProductContact
                key={`${product.id}:${editing ?? "new"}:${instanceId}`}
                product={product}
                phone=""
                email=""
                url=""
                editLineId={editing}
                kitContext={{ instanceId, onSave: saveItem }}
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setProduct(null)}
              >
                Fechar escolhas da peça
              </Button>
            </section>
          )}
        </div>
        <div className="kit-builder-workspace">
          <KitCanvas
            lines={members.map((item) => {
              const p = products.find((p) => p.id === item.productId);
              return {
                lineId: item.lineId!,
                name: p?.name ?? "Peça indisponível",
                quantity: item.quantity,
                imageUrl:
                  p?.images.find((i) => i.id === p.compositionImageId)?.url ??
                  p?.imageUrl ??
                  null,
              };
            })}
            placements={group?.placements ?? []}
            selectedLineId={selected}
            onSelect={setSelected}
            onMove={move}
            onReorder={reorder}
            zoom={zoom}
          />
          <KitControls
            selected={!!selected && members.some((i) => i.lineId === selected)}
            onMove={(dx, dy) => {
              const p = group?.placements.find((p) => p.lineId === selected);
              if (p) move(p.lineId, p.x + dx, p.y + dy);
            }}
            onReorder={(direction) => {
              if (selected) reorder(selected, direction);
            }}
            onZoom={(n) => setZoom((z) => Math.max(0.75, Math.min(2, z + n)))}
            onReset={() => setZoom(1)}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            onUndo={() => {
              try {
                controller.undo();
                setNotice(
                  "Alteração desfeita. Confira as referências se houve mudança nas peças.",
                );
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
            onRedo={() => {
              try {
                controller.redo();
                setNotice("Alteração refeita.");
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          />
          <section className="kit-text-lines">
            <h2>Peças do conjunto</h2>
            {members.map((item) => {
              const p = products.find((p) => p.id === item.productId);
              return (
                <article key={item.lineId}>
                  <h3>{p?.name ?? "Peça indisponível"}</h3>
                  {item.answerLabels.map((a) => (
                    <p key={a.fieldId}>
                      {a.label}: {a.valueLabel}
                    </p>
                  ))}
                  <Label htmlFor={`kit-quantity-${item.lineId}`}>
                    Quantidade de {p?.name ?? "peça"}
                  </Label>
                  <CatalogQuantityInput
                    id={`kit-quantity-${item.lineId}`}
                    value={item.quantity}
                    minimumQuantity={p?.minimumQuantity}
                    onValidityChange={(valid) =>
                      setInvalidQuantities((previous) =>
                        previous[item.lineId!] === !valid
                          ? previous
                          : { ...previous, [item.lineId!]: !valid },
                      )
                    }
                    onValueChange={(quantity) =>
                      transformGroup((current) => ({
                        ...current,
                        items: current.items.map((i) =>
                          i.lineId === item.lineId
                            ? {
                                ...i,
                                quantity,
                                seenPrice: null,
                              }
                            : i,
                        ),
                        groups: current.groups.map((g) =>
                          g.instanceId === instanceId
                            ? { ...g, seenPrice: null }
                            : g,
                        ),
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      disabled={!p || !eligible.some((e) => e.id === p.id)}
                      onClick={() => {
                        if (p) {
                          setProduct(p);
                          setEditing(item.lineId);
                        }
                      }}
                    >
                      Editar peça {members.indexOf(item) + 1}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => remove(item.lineId!)}
                    >
                      Remover peça {members.indexOf(item) + 1}
                    </Button>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
        <aside className="kit-builder-panel">
          {!reviewedPrice && group && (
            <p className="store-note">
              Estimativa desta página. Revise o conjunto para conferir os
              valores atuais.
            </p>
          )}
          <KitSummary review={reviewedPrice ?? summary} />
          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={
              !group ||
              !members.length ||
              busy ||
              quantityInvalid ||
              !!localPrice.problem
            }
            onClick={review}
          >
            {busy ? "Conferindo…" : "Revisar conjunto"}
          </Button>
          {currentReview && !currentReview.ready && (
            <>
              <p>Referências atuais retornadas pela equipe:</p>
              <KitSummary review={currentReview.groups?.[0] ?? null} />
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={
                  !!currentReview.groups?.[0]?.problem ||
                  quantityInvalid ||
                  currentReview.lines.some((l) => !!l.problem)
                }
                onClick={confirm}
              >
                Confirmar referências atuais
              </Button>
            </>
          )}
          {currentReview?.ready && !quantityInvalid && (
            <Button asChild className="min-h-11">
              <Link href="/portfolio/orcamento">Continuar para a lista</Link>
            </Button>
          )}
        </aside>
      </div>
    </article>
  );
}
