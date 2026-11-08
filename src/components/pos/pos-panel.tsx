"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  Check,
  ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { useDocumentExit } from "@/components/commerce/use-document-exit";
import {
  emptyPosDraft,
  type PosDraftInput,
  type PosOrderDTO,
  type PosProduct,
} from "@/domain/pos/types";
import { posDraftSchema, calculatePosPayment } from "@/domain/pos/validation";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import { quantityBasePrice } from "@/domain/products/quantity-pricing";

const money = (v: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v),
  );
type CustomerOption = { id: string; name: string; version: number };
function serialized(value: PosDraftInput) {
  const parsed = posDraftSchema.safeParse(value);
  return JSON.stringify(parsed.success ? parsed.data : value);
}
export function PosPanel({
  initialOrder,
  initialProducts,
}: {
  initialOrder: PosOrderDTO | null;
  initialProducts: PosProduct[];
}) {
  const [order, setOrder] = useState(initialOrder);
  const [input, setInput] = useState<PosDraftInput>(
    initialOrder?.input ?? emptyPosDraft,
  );
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [mode, setMode] = useState(
    initialOrder?.input.newCustomer
      ? "new"
      : initialOrder?.input.customerId
        ? "existing"
        : "none",
  );
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflictingOrder, setConflictingOrder] = useState<PosOrderDTO | null>(
    null,
  );
  const [review, setReview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const receiptRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const exit = useDocumentExit(JSON.stringify(input));
  const dirty = serialized(input) !== serialized(order?.input ?? emptyPosDraft);
  const disabled = busy || uncertain || !!order?.receipt;
  const totals = (() => {
    try {
      return calculateDocumentTotals(
        input.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          description: "Produto",
        })),
        input.discount,
        "0.00",
      );
    } catch {
      return null;
    }
  })();
  const payment = (() => {
    try {
      return totals
        ? calculatePosPayment(totals.total, input.method, input.tendered)
        : null;
    } catch {
      return null;
    }
  })();
  useEffect(() => {
    if (!dirty) exit.markSaved();
  }, [dirty, exit]);
  useEffect(() => {
    if (order?.receipt) receiptRef.current?.focus();
  }, [order?.receipt]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  function change(next: PosDraftInput) {
    setInput(next);
    setError("");
    setReview(false);
    setNotice("");
  }
  async function run(action: () => Promise<void>) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível continuar.");
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function persist(): Promise<PosOrderDTO> {
    const parsed = posDraftSchema.safeParse(input);
    if (!parsed.success)
      throw new Error(
        "Confira a identificação, quantidades e valores antes de salvar.",
      );
    let current = order;
    try {
      if (!current) current = await api<PosOrderDTO>("/api/pos", {});
      // Keep the identity as soon as it exists, even if the following response is lost.
      setOrder(current);
      if (serialized(parsed.data) !== serialized(current.input))
        current = await api<PosOrderDTO>(
          `/api/pos/${current.id}`,
          { expectedVersion: current.version, input: parsed.data },
          "PATCH",
        );
      setOrder(current);
      setInput(current.input);
      setNotice("Compra salva.");
      return current;
    } catch (e) {
      setUncertain(true);
      throw e;
    }
  }
  async function complete() {
    await run(async () => {
      const current = await persist();
      try {
        const result = await api<PosOrderDTO>(
          `/api/pos/${current.id}/complete`,
          { expectedVersion: current.version },
        );
        setOrder(result);
        setInput(result.input);
        setReview(false);
        setNotice("");
      } catch (e) {
        setUncertain(true);
        throw e;
      }
    });
  }
  async function recover() {
    await run(async () => {
      const current = await api<PosOrderDTO | null>(
        order ? `/api/pos/${order.id}` : "/api/pos",
      );
      if (
        current &&
        order &&
        !current.receipt &&
        current.version !== order.version &&
        serialized(current.input) !== serialized(input)
      ) {
        setConflictingOrder(current);
        setNotice("");
        return;
      }
      setOrder(current);
      if (current?.receipt) {
        setInput(current.input);
        setReview(false);
      }
      setUncertain(false);
      setNotice(
        current?.receipt
          ? "Venda localizada."
          : "Nenhuma conclusão registrada nesta compra. Confira os dados e retome a mesma compra.",
      );
    });
  }
  function resolveConflict(useSaved: boolean) {
    if (!conflictingOrder) return;
    setOrder(conflictingOrder);
    if (useSaved) {
      setInput(conflictingOrder.input);
      setMode(
        conflictingOrder.input.newCustomer
          ? "new"
          : conflictingOrder.input.customerId
            ? "existing"
            : "none",
      );
    }
    setConflictingOrder(null);
    setUncertain(false);
    setReview(false);
    setNotice(
      useSaved
        ? "Compra salva recuperada."
        : "Sua edição foi mantida. Confira e salve antes de concluir.",
    );
  }
  function quantity(productId: string, count: number) {
    if (!Number.isInteger(count) || count < 1 || count > 100000) return;
    const product = products.find((p) => p.id === productId);
    change({
      ...input,
      items: input.items.map((i) =>
        i.productId === productId
          ? {
              ...i,
              quantity: count,
              ...(product
                ? {
                    unitPrice: quantityBasePrice(
                      product.price,
                      count,
                      product.quantityTiers,
                    ),
                    commercialRevision: product.commercialRevision,
                  }
                : {}),
            }
          : i,
      ),
    });
  }
  function add(product: PosProduct) {
    const old = input.items.find((i) => i.productId === product.id);
    if (old) quantity(product.id, old.quantity + 1);
    else
      change({
        ...input,
        items: [
          ...input.items,
          {
            productId: product.id,
            quantity: product.minimumQuantity,
            commercialRevision: product.commercialRevision,
            unitPrice: quantityBasePrice(
              product.price,
              product.minimumQuantity,
              product.quantityTiers,
            ),
          },
        ],
      });
    setNotice(`${product.name} adicionado à compra.`);
    document.getElementById("pos-search")?.focus();
  }
  async function refreshProducts() {
    await run(async () => {
      const rows = await api<PosProduct[]>(
        `/api/pos/catalog?query=${encodeURIComponent(query)}`,
      );
      setProducts((previous) => [
        ...previous.filter((p) => !rows.some((r) => r.id === p.id)),
        ...rows,
      ]);
      setNotice("Produtos consultados. Revise os preços antes de concluir.");
    });
  }
  async function updateCartReferences() {
    await run(async () => {
      const rows = await api<PosProduct[]>(
        `/api/pos/catalog?ids=${encodeURIComponent(input.items.map((i) => i.productId).join(","))}`,
      );
      setProducts((previous) => [
        ...previous.filter((p) => !rows.some((r) => r.id === p.id)),
        ...rows,
      ]);
      change({
        ...input,
        items: input.items.map((i) => {
          const p = rows.find((p) => p.id === i.productId);
          return p && !p.reason
            ? {
                ...i,
                unitPrice: quantityBasePrice(
                  p.price,
                  i.quantity,
                  p.quantityTiers,
                ),
                commercialRevision: p.commercialRevision,
              }
            : i;
        }),
      });
      setNotice(
        "Preços e referências da compra atualizados. Confira os valores antes de revisar.",
      );
    });
  }
  const visibleProducts = products.filter(
    (p) =>
      !query ||
      `${p.name} ${p.sku}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  if (order?.receipt) {
    const receipt = order.receipt;
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <header>
          <h1 tabIndex={-1} ref={receiptRef}>
            {receipt.status === "ENTREGUE"
              ? "Venda concluída"
              : "Venda registrada"}
          </h1>
          <p>
            {receipt.number} ·{" "}
            {receipt.status === "ENTREGUE"
              ? "Peças entregues no atendimento"
              : receipt.status}
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>{money(receipt.total)}</CardTitle>
            <CardDescription>{receipt.customerName}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p>
              Forma informada:{" "}
              {receipt.payment.method === "PIX"
                ? "Pix"
                : receipt.payment.method === "CASH"
                  ? "Dinheiro"
                  : "Cartão"}
            </p>
            {receipt.payment.tendered && (
              <p>
                Entregue: {money(receipt.payment.tendered)} · Troco:{" "}
                {money(receipt.payment.change)}
              </p>
            )}
            <Alert>
              <AlertTitle>
                {receipt.pending === "0.00"
                  ? "Recebimento registrado no financeiro"
                  : "Recebimento a conferir"}
              </AlertTitle>
              <AlertDescription>
                Recebido: {money(receipt.received)}. Pendente:{" "}
                {money(receipt.pending)}. A informação do atendimento não
                confirma o provedor nem registra baixa automática.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-3">
            <Button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const next = await api<PosOrderDTO>("/api/pos", {});
                  setOrder(next);
                  setInput(next.input);
                  setMode("none");
                  setNotice("");
                  setProducts(await api<PosProduct[]>("/api/pos/catalog"));
                })
              }
            >
              <Plus data-icon="inline-start" />
              Nova venda
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/vendas/${receipt.saleId}`}>
                Abrir venda e comprovante
              </Link>
            </Button>
          </CardFooter>
        </Card>
        {error && <Alert variant="destructive">{error}</Alert>}
      </div>
    );
  }
  return (
    <div className="pos-workspace flex min-w-0 flex-col gap-6 pb-24 lg:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>PDV presencial</h1>
          <p className="text-muted-foreground">
            Escolha as peças, confira a compra e entregue no atendimento.
          </p>
        </div>
        <Badge variant="outline">Conexão necessária</Badge>
      </header>
      {error && (
        <Alert ref={errorRef} tabIndex={-1} variant="destructive">
          <AlertTitle>Confira antes de continuar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {conflictingOrder && (
        <Alert>
          <AlertTitle>Há outra edição salva desta compra</AlertTitle>
          <AlertDescription>
            Escolha qual compra manter antes de continuar. Nenhuma venda será
            criada por esta escolha.
          </AlertDescription>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => resolveConflict(true)}>
              Usar compra salva
            </Button>
            <Button variant="outline" onClick={() => resolveConflict(false)}>
              Manter minha edição
            </Button>
          </div>
        </Alert>
      )}
      {uncertain && !conflictingOrder && (
        <Alert>
          <AlertTitle>Resultado ainda não confirmado</AlertTitle>
          <AlertDescription>
            Consulte esta compra antes de continuar. A consulta não cria outra
            venda.
          </AlertDescription>
          <Button
            className="mt-3"
            variant="outline"
            disabled={busy}
            onClick={recover}
          >
            Consultar esta compra
          </Button>
        </Alert>
      )}
      <p role="status" className="text-sm text-muted-foreground">
        {busy
          ? "Processando solicitação. Aguarde antes de continuar."
          : dirty
            ? "Alterações ainda não salvas. Salve a compra para retomá-la depois."
            : notice ||
              (order
                ? "Compra salva no servidor."
                : "A compra será salva ao adicionar os itens e salvar.")}
      </p>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <section
          className="flex min-w-0 flex-col gap-4"
          aria-label="Produtos para atendimento"
        >
          <div>
            <h2>Produtos para atendimento</h2>
            <p className="text-sm text-muted-foreground">
              Peças prontas livres, com preço definido. Kits, configurações e
              encomendas seguem em Vendas.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void refreshProducts();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <FieldGroup className="min-w-0 flex-1">
              <Field
                id="pos-search"
                label="Buscar produto ou código"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={busy}
              />
            </FieldGroup>
            <Button type="submit" variant="outline" disabled={busy}>
              <Search data-icon="inline-start" />
              Buscar
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            {visibleProducts.length}{" "}
            {visibleProducts.length === 1
              ? "produto nesta busca."
              : "produtos nesta busca."}
            {visibleProducts.length > 0 && " Adicione as peças à compra."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleProducts.map((p) => (
              <Card key={p.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>
                    {p.sku || "Produto cadastrado"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  <p>
                    {money(p.price)}{" "}
                    <span className="text-sm text-muted-foreground">
                      por peça
                      {p.quantityTiers.length
                        ? ", com faixas por quantidade"
                        : ""}
                    </span>
                  </p>
                  <Badge variant="secondary" className="w-fit">
                    {p.available} livres
                  </Badge>
                  {p.reason && (
                    <p className="text-sm text-muted-foreground">{p.reason}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full min-h-11"
                    variant="outline"
                    disabled={
                      disabled ||
                      !!p.reason ||
                      (input.items.find((i) => i.productId === p.id)
                        ?.quantity ?? 0) >= p.available
                    }
                    aria-label={
                      p.reason || p.available === 0
                        ? `Indisponível: ${p.name}`
                        : `Adicionar ${p.name}`
                    }
                    onClick={() => add(p)}
                  >
                    {!p.reason && p.available > 0 && (
                      <Plus data-icon="inline-start" />
                    )}
                    {p.reason || p.available === 0
                      ? "Indisponível"
                      : "Adicionar"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          {!visibleProducts.length && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhum produto encontrado</EmptyTitle>
                <EmptyDescription>
                  {query
                    ? "Tente outro nome ou código e use Buscar para consultar novamente."
                    : "Não há peças nesta consulta. Use Buscar para consultar a disponibilidade novamente."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
        <Card className="h-fit" id="compra">
          <CardHeader>
            <CardTitle>
              <h2>Compra atual</h2>
            </CardTitle>
            <CardDescription>
              {input.items.reduce((s, i) => s + i.quantity, 0)} peças · entrega
              imediata
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <section
              aria-labelledby="pos-items-title"
              className="flex min-w-0 flex-col gap-4"
            >
              <h3 id="pos-items-title">Itens da compra</h3>
              {!input.items.length && (
                <Empty>
                  <EmptyHeader>
                    <ShoppingCart aria-hidden="true" />
                    <EmptyTitle>Comece pelos produtos</EmptyTitle>
                    <EmptyDescription>
                      Adicione as peças que o cliente vai levar.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              {input.items.map((i) => {
                const p = products.find((p) => p.id === i.productId),
                  name = p?.name ?? "Produto da compra";
                return (
                  <div key={i.productId} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong>{name}</strong>
                        <p className="text-sm text-muted-foreground">
                          {money(i.unitPrice)} por peça
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-11"
                        aria-label={`Remover ${name}`}
                        disabled={disabled}
                        onClick={() =>
                          change({
                            ...input,
                            items: input.items.filter(
                              (row) => row.productId !== i.productId,
                            ),
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-11"
                        aria-label={`Diminuir ${name}`}
                        disabled={
                          disabled || i.quantity <= (p?.minimumQuantity ?? 1)
                        }
                        onClick={() => quantity(i.productId, i.quantity - 1)}
                      >
                        <Minus />
                      </Button>
                      <FieldGroup className="min-w-0 flex-1">
                        <Field
                          label="Quantidade"
                          aria-label={`Quantidade de ${name}`}
                          type="number"
                          min={p?.minimumQuantity ?? 1}
                          max={100000}
                          value={i.quantity}
                          disabled={disabled}
                          onChange={(e) =>
                            quantity(i.productId, Number(e.target.value))
                          }
                        />
                      </FieldGroup>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-11"
                        aria-label={`Aumentar ${name}`}
                        disabled={
                          disabled || i.quantity >= (p?.available ?? 100000)
                        }
                        onClick={() => quantity(i.productId, i.quantity + 1)}
                      >
                        <Plus />
                      </Button>
                    </div>
                    {p?.reason && (
                      <p className="text-sm text-muted-foreground">
                        {p.reason} Confira a disponibilidade antes de concluir.
                      </p>
                    )}
                    <Separator />
                  </div>
                );
              })}
              {input.items.length > 0 && (
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={updateCartReferences}
                >
                  Atualizar itens da compra
                </Button>
              )}
              <FieldGroup>
                <Field
                  label="Desconto na compra (R$)"
                  inputMode="decimal"
                  value={input.discount}
                  disabled={disabled}
                  onChange={(e) =>
                    change({ ...input, discount: e.target.value })
                  }
                />
              </FieldGroup>
            </section>
            <Separator />
            <fieldset
              disabled={disabled}
              className="flex min-w-0 flex-col gap-3"
            >
              <legend className="mb-3 font-medium">Cliente (opcional)</legend>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={1}
                value={mode}
                onValueChange={(value) => {
                  if (!value) return;
                  setMode(value);
                  change({
                    ...input,
                    customerId: null,
                    customerVersion: null,
                    customerName: "",
                    newCustomer:
                      value === "new"
                        ? { name: "", phone: "", email: "" }
                        : null,
                  });
                }}
                aria-label="Identificação do comprador"
              >
                <ToggleGroupItem value="none">Sem identificar</ToggleGroupItem>
                <ToggleGroupItem value="existing">Selecionar</ToggleGroupItem>
                <ToggleGroupItem value="new">Cadastrar</ToggleGroupItem>
              </ToggleGroup>
              {mode === "none" && (
                <p className="text-sm text-muted-foreground">
                  Venda sem criar cadastro de cliente.
                </p>
              )}
              {mode === "existing" && (
                <>
                  <FieldGroup>
                    <Field
                      label="Buscar cliente"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                    />
                  </FieldGroup>
                  <Button
                    variant="outline"
                    onClick={() =>
                      run(async () => {
                        const page = await api<{ items: CustomerOption[] }>(
                          `/api/customers?active=true&search=${encodeURIComponent(customerQuery)}&pageSize=50`,
                        );
                        setCustomers(page.items);
                      })
                    }
                  >
                    Consultar clientes
                  </Button>
                  <Label htmlFor="pos-customer">Cliente cadastrado</Label>
                  <NativeSelect
                    id="pos-customer"
                    value={input.customerId ?? ""}
                    onChange={(e) => {
                      const c = customers.find((c) => c.id === e.target.value);
                      change({
                        ...input,
                        customerId: c?.id ?? null,
                        customerVersion: c?.version ?? null,
                        customerName: c?.name ?? "",
                      });
                    }}
                  >
                    <NativeSelectOption value="">
                      Selecione um cliente
                    </NativeSelectOption>
                    {input.customerId &&
                      !customers.some((c) => c.id === input.customerId) && (
                        <NativeSelectOption value={input.customerId}>
                          {input.customerName ||
                            "Cliente selecionado anteriormente"}
                        </NativeSelectOption>
                      )}
                    {customers.map((c) => (
                      <NativeSelectOption key={c.id} value={c.id}>
                        {c.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </>
              )}
              {mode === "new" && (
                <FieldGroup>
                  <Field
                    label="Nome do cliente"
                    value={input.newCustomer?.name ?? ""}
                    required
                    onChange={(e) =>
                      change({
                        ...input,
                        newCustomer: {
                          name: e.target.value,
                          phone: input.newCustomer?.phone ?? "",
                          email: input.newCustomer?.email ?? "",
                        },
                      })
                    }
                  />
                  <Field
                    label="Telefone (opcional)"
                    type="tel"
                    value={input.newCustomer?.phone ?? ""}
                    onChange={(e) =>
                      change({
                        ...input,
                        newCustomer: {
                          name: input.newCustomer?.name ?? "",
                          phone: e.target.value,
                          email: input.newCustomer?.email ?? "",
                        },
                      })
                    }
                  />
                  <Field
                    label="E-mail (opcional)"
                    type="email"
                    value={input.newCustomer?.email ?? ""}
                    onChange={(e) =>
                      change({
                        ...input,
                        newCustomer: {
                          name: input.newCustomer?.name ?? "",
                          phone: input.newCustomer?.phone ?? "",
                          email: e.target.value,
                        },
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    O cadastro será criado junto com a conclusão da venda.
                  </p>
                </FieldGroup>
              )}
            </fieldset>
            <Separator />
            <fieldset
              disabled={disabled}
              className="flex min-w-0 flex-col gap-3"
            >
              <legend className="mb-3 font-medium">Pagamento informado</legend>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={1}
                value={input.method}
                aria-label="Forma de pagamento"
                onValueChange={(value) => {
                  if (value === "PIX" || value === "CASH" || value === "CARD")
                    change({ ...input, method: value, tendered: "" });
                }}
              >
                <ToggleGroupItem value="PIX">Pix</ToggleGroupItem>
                <ToggleGroupItem value="CASH">Dinheiro</ToggleGroupItem>
                <ToggleGroupItem value="CARD">Cartão</ToggleGroupItem>
              </ToggleGroup>
              {input.method === "CASH" && (
                <FieldGroup>
                  <Field
                    label="Valor entregue (R$)"
                    inputMode="decimal"
                    value={input.tendered}
                    onChange={(e) =>
                      change({ ...input, tendered: e.target.value })
                    }
                  />
                  {payment && <p>Troco: {money(payment.change)}</p>}
                </FieldGroup>
              )}
              <p className="text-sm text-muted-foreground">
                Recebimento sujeito à conferência pelo administrador no
                financeiro.
              </p>
            </fieldset>
            <Separator />
            <h3>Resumo da compra</h3>
            <dl className="flex flex-col gap-2">
              <div className="flex justify-between gap-3">
                <dt>Subtotal</dt>
                <dd>{totals ? money(totals.subtotal) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3 text-lg font-semibold">
                <dt>Total</dt>
                <dd>{totals ? money(totals.total) : "Confira os valores"}</dd>
              </div>
            </dl>
            {review && (
              <Alert>
                <AlertTitle>Conferir e entregar</AlertTitle>
                <AlertDescription>
                  {input.items.reduce((s, i) => s + i.quantity, 0)} peças, total{" "}
                  {totals ? money(totals.total) : "—"}.{" "}
                  {mode === "none"
                    ? "Consumidor não identificado."
                    : mode === "new"
                      ? `Cadastrar ${input.newCustomer?.name}.`
                      : `Cliente: ${input.customerName}.`}{" "}
                  A conclusão registra a entrega física imediatamente.
                </AlertDescription>
              </Alert>
            )}
            {!input.items.length && (
              <p className="text-sm text-muted-foreground">
                Adicione pelo menos uma peça para revisar a venda.
              </p>
            )}
            {input.items.length > 0 &&
              mode === "existing" &&
              !input.customerId && (
                <p className="text-sm text-muted-foreground">
                  Selecione o cliente cadastrado ou escolha Sem identificar para
                  continuar sem cadastro.
                </p>
              )}
            {input.items.length > 0 && !payment && input.method === "CASH" && (
              <p className="text-sm text-muted-foreground">
                Confira o valor entregue em dinheiro antes de revisar a venda.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full min-h-11"
              disabled={
                disabled ||
                !totals ||
                !payment ||
                !posDraftSchema.safeParse(input).success ||
                (mode === "existing" && !input.customerId)
              }
              onClick={() => {
                if (review) void complete();
                else setReview(true);
              }}
            >
              {review ? (
                <>
                  <Check data-icon="inline-start" />
                  Concluir venda e entregar
                </>
              ) : (
                "Revisar venda"
              )}
            </Button>
            {review && (
              <Button
                variant="ghost"
                disabled={disabled}
                onClick={() => setReview(false)}
              >
                <ArrowLeft data-icon="inline-start" />
                Voltar à compra
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              disabled={
                disabled || !dirty || !posDraftSchema.safeParse(input).success
              }
              onClick={() =>
                run(async () => {
                  await persist();
                })
              }
            >
              Salvar compra para depois
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div
        className="pos-mobile-summary fixed inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t bg-background p-3 lg:hidden"
        aria-label="Resumo e acesso à compra"
      >
        <span>
          {input.items.length
            ? `${input.items.reduce((s, i) => s + i.quantity, 0)} peças`
            : "Compra vazia"}{" "}
          · {totals ? money(totals.total) : "—"}
        </span>
        <Button asChild variant="outline">
          <a href="#compra">Ver compra</a>
        </Button>
      </div>
    </div>
  );
}
