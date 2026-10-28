"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PartnerDetailDTO,
  ConsignmentOptionsDTO,
} from "@/server/consignment/queries";
import type { ShipmentDTO } from "@/server/consignment/custody";
import type { ConsignmentSaleDTO } from "@/server/consignment/sales";
import type { StatementDTO } from "@/server/consignment/statements";
import { api } from "@/lib/client-api";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PartnerForm } from "./partner-form";
import { ShipmentForm, CustodyForm } from "./shipment-form";
import { SaleForm } from "./sale-form";
import { StatementPanel } from "./statement-panel";
import { ResultPanel } from "./result-panel";
import { Section, CommandForm, CommissionSummary, money } from "./shared";
const unique = <T extends { id: string }>(a: T[], b: T[]) => [
  ...a,
  ...b.filter((x) => !a.some((y) => y.id === x.id)),
];
export function PartnerDetail({
  data,
  options,
  actorId,
  admin,
}: {
  data: PartnerDetailDTO;
  options: ConsignmentOptionsDTO;
  actorId: string;
  admin: boolean;
}) {
  const router = useRouter(),
    [editing, setEditing] = useState(false),
    [newShipment, setNewShipment] = useState(false),
    [newSale, setNewSale] = useState(false),
    [editingShipment, setEditingShipment] = useState(""),
    [editingSale, setEditingSale] = useState("");
  const [extraShipments, setExtraShipments] = useState<ShipmentDTO[]>([]),
    [extraSales, setExtraSales] = useState<ConsignmentSaleDTO[]>([]),
    [extraStatements, setExtraStatements] = useState<StatementDTO[]>([]),
    [pages, setPages] = useState({ shipments: 1, sales: 1, statements: 1 }),
    [ended, setEnded] = useState({
      shipments: false,
      sales: false,
      statements: false,
    }),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const p = data.partner,
    shipments = unique(data.shipments, extraShipments),
    sales = unique(data.sales, extraSales),
    statements = unique(data.statements, extraStatements);
  function saved() {
    setEditing(false);
    setNewShipment(false);
    setNewSale(false);
    setEditingShipment("");
    setEditingSale("");
    setExtraShipments([]);
    setExtraSales([]);
    setExtraStatements([]);
    setPages({ shipments: 1, sales: 1, statements: 1 });
    setEnded({ shipments: false, sales: false, statements: false });
    router.refresh();
  }
  async function more(kind: "shipments" | "sales" | "statements") {
    setLoading(true);
    setError("");
    try {
      const page = pages[kind] + 1,
        url = `/api/consignment/${kind}?partnerId=${p.id}&page=${page}`;
      if (kind === "shipments") {
        const r = await api<{ items: ShipmentDTO[]; total: number }>(url);
        setExtraShipments((a) => unique(a, r.items));
        setEnded((e) => ({ ...e, shipments: page * 20 >= r.total }));
      }
      if (kind === "sales") {
        const r = await api<{ items: ConsignmentSaleDTO[]; total: number }>(
          url,
        );
        setExtraSales((a) => unique(a, r.items));
        setEnded((e) => ({ ...e, sales: page * 20 >= r.total }));
      }
      if (kind === "statements") {
        const r = await api<{ items: StatementDTO[]; total: number }>(url);
        setExtraStatements((a) => unique(a, r.items));
        setEnded((e) => ({ ...e, statements: page * 20 >= r.total }));
      }
      setPages((old) => ({ ...old, [kind]: page }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Link href="/pontos-de-venda">← Pontos de venda</Link>
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <h1>{p.customer.name}</h1>
          <p>{p.location}</p>
          <Badge variant={p.active ? "secondary" : "outline"}>
            {p.active ? "Parceiro ativo" : "Parceiro inativo"}
          </Badge>
        </div>
        {admin && (
          <Button variant="outline" onClick={() => setEditing((v) => !v)}>
            Editar parceiro
          </Button>
        )}
      </header>
      {editing && admin && (
        <Section title="Cadastro e condições">
          <PartnerForm
            key={p.version}
            initial={p}
            options={options}
            actorId={actorId}
            onSaved={saved}
          />
        </Section>
      )}
      {admin && (
        <Accordion type="single" collapsible>
          <AccordionItem value="product-conditions">
            <AccordionTrigger>
              Condições por produto e alertas de reposição
            </AccordionTrigger>
            <AccordionContent>
              <Section
                title="Condições por produto"
                description="O mínimo considera o saldo confirmado na loja. O trânsito aparece separadamente."
              >
                <CommandForm
                  area="partners"
                  label="Salvar condição do produto"
                  onSaved={saved}
                  build={(d) => ({
                    type: "SET_PRODUCT_CONDITION",
                    id: p.id,
                    expectedVersion: p.version,
                    productId: String(d.get("productId")),
                    percent: String(d.get("percent")).trim() || null,
                    minimum:
                      String(d.get("minimum")).trim() === ""
                        ? null
                        : Number(d.get("minimum")),
                  })}
                >
                  <div className="field">
                    <Label htmlFor="condition-product">
                      Produto da condição
                    </Label>
                    <NativeSelect
                      id="condition-product"
                      name="productId"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      {options.products.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <Field
                    name="percent"
                    label="Comissão específica (%)"
                    hint="Em branco usa o padrão do parceiro."
                    inputMode="decimal"
                  />
                  <Field
                    name="minimum"
                    label="Saldo mínimo para reposição"
                    type="number"
                    min={0}
                    hint="Em branco desativa o alerta deste produto."
                  />
                </CommandForm>
              </Section>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      <Section
        title="Saldo físico por produto"
        description="As peças em trânsito e no parceiro continuam rastreadas pela origem. Não estão disponíveis no estoque interno."
      >
        {data.balances.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Produto",
                  "Ida",
                  "Na loja",
                  "Retorno",
                  "Vendidas",
                  "Perdidas",
                  "Reposição",
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.balances.map((b) => (
                <TableRow key={b.productId}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>{b.outbound}</TableCell>
                  <TableCell>{b.partner}</TableCell>
                  <TableCell>{b.inbound}</TableCell>
                  <TableCell>{b.sold}</TableCell>
                  <TableCell>{b.lost}</TableCell>
                  <TableCell>
                    {b.replenishment ? (
                      <Badge variant="outline">
                        Abaixo do mínimo {b.minimum}
                      </Badge>
                    ) : (
                      (b.minimum ?? "Sem mínimo")
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nenhuma peça em consignação</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </Section>
      <div className="flex flex-wrap gap-3">
        {p.active && p.customer.active && (
          <Button onClick={() => setNewShipment((v) => !v)}>
            Nova remessa
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!data.received.length}
          onClick={() => setNewSale((v) => !v)}
        >
          Registrar venda da loja
        </Button>
      </div>
      {newShipment && (
        <Section title="Preparar remessa">
          <ShipmentForm partnerId={p.id} options={options} onSaved={saved} />
        </Section>
      )}
      {newSale && (
        <Section title="Venda efetiva">
          <SaleForm
            detail={{ ...data, sales }}
            options={options}
            admin={admin}
            onSaved={saved}
          />
        </Section>
      )}
      <h2>Remessas e conferências</h2>
      {shipments.map((s) => (
        <Section
          key={s.id}
          title={`Remessa ${s.sequence}`}
          description={
            s.status === "DRAFT"
              ? "Rascunho sem reserva de estoque"
              : s.status === "CANCELED"
                ? "Rascunho cancelado"
                : "Expedida — acompanhe o recebimento e o retorno"
          }
        >
          <ul>
            {s.lines.map((l) => (
              <li key={l.id}>
                {l.product.name}: {l.units} peças · {l.allocations.length}{" "}
                origens
              </li>
            ))}
          </ul>
          {s.status === "DRAFT" && (
            <div className="flex flex-col gap-4">
              <Button
                variant="outline"
                onClick={() =>
                  setEditingShipment(editingShipment === s.id ? "" : s.id)
                }
              >
                Revisar quantidades
              </Button>
              {editingShipment === s.id && (
                <ShipmentForm
                  key={s.version}
                  partnerId={p.id}
                  options={options}
                  initial={s}
                  onSaved={saved}
                />
              )}
              <CommandForm
                area="shipments"
                label="Confirmar expedição"
                description="Retira as peças do disponível interno e coloca em trânsito. Não cria venda nem receita."
                onSaved={saved}
                build={(d) => ({
                  type: "DISPATCH",
                  id: s.id,
                  expectedVersion: s.version,
                  effectiveDate: String(d.get("date")),
                  reason: String(d.get("reason")),
                })}
              >
                <Field
                  label="Data da expedição"
                  name="date"
                  type="date"
                  required
                  defaultValue={todaySaoPaulo(new Date())}
                />
                <Field
                  label="Observação da expedição"
                  name="reason"
                  maxLength={2000}
                />
              </CommandForm>
              <CommandForm
                area="shipments"
                label="Cancelar rascunho da remessa"
                onSaved={saved}
                build={(d) => ({
                  type: "CANCEL_DRAFT",
                  id: s.id,
                  expectedVersion: s.version,
                  reason: String(d.get("reason")),
                })}
              >
                <Field
                  label="Motivo do cancelamento da remessa"
                  name="reason"
                  required
                  minLength={3}
                  maxLength={2000}
                />
              </CommandForm>
            </div>
          )}
          {s.status === "DISPATCHED" && (
            <Accordion type="single" collapsible>
              <AccordionItem value="custody">
                <AccordionTrigger>
                  Recebimentos, retornos e perdas
                </AccordionTrigger>
                <AccordionContent>
                  <CustodyForm shipment={s} admin={admin} onSaved={saved} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          <ul aria-label={`Histórico da remessa ${s.sequence}`}>
            {s.events.map((e) => (
              <li key={e.id}>
                {e.effectiveDate} ·{" "}
                {e.kind === "RECEIVE"
                  ? "Recebimento"
                  : e.kind === "RETURN"
                    ? "Retorno"
                    : e.kind === "LOSS"
                      ? "Perda"
                      : e.kind === "DISPATCH"
                        ? "Expedição"
                        : e.kind === "CONFIRM_RETURN"
                          ? "Retorno conferido"
                          : e.kind === "COMPENSATE"
                            ? "Compensação"
                            : "Rascunho"}{" "}
                · {e.actorName}
                {e.receiver && ` · Recebedor: ${e.receiver}`}
                {e.reason && ` · ${e.reason}`}
                {!!e.allocations.length && (
                  <ul>
                    {e.allocations.map((a) => {
                      const line = s.lines.find((l) =>
                        l.allocations.some(
                          (o) => o.id === a.shipmentAllocationId,
                        ),
                      );
                      const origin = line?.allocations.find(
                        (o) => o.id === a.shipmentAllocationId,
                      );
                      return (
                        <li key={a.id}>
                          {line?.product.name ?? "Peça"} · origem{" "}
                          {origin?.originNumber ?? "registrada"} · {a.units}{" "}
                          peças
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Section>
      ))}
      {!ended.shipments && data.shipments.length >= 20 && (
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void more("shipments")}
        >
          Carregar remessas anteriores
        </Button>
      )}
      <h2>Vendas e comissões</h2>
      {sales.map((s) => (
        <Section
          key={s.id}
          title={s.reference}
          description={
            s.status === "DRAFT"
              ? "Rascunho para conferência"
              : s.status === "CANCELED"
                ? "Venda cancelada"
                : "Venda confirmada"
          }
        >
          <p>Data efetiva: {s.effectiveDate}</p>
          <CommissionSummary
            model={s.model}
            lines={s.lines.map((l) => ({
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              percent: l.percent,
              model: s.model,
            }))}
          />
          {s.saleId && (
            <p>
              <Link href={`/vendas/${s.saleId}`}>Ver documento de venda</Link>
            </p>
          )}
          {admin && s.finance && (
            <ul>
              {s.finance.links.map((e) => (
                <li key={e.id}>
                  <Link href={`/financeiro/lancamentos?entryId=${e.id}`}>
                    {e.role === "REPASSE" ? "Repasse" : "Comissão"}:{" "}
                    {money(e.amount)}
                  </Link>{" "}
                  · restante {money(e.remaining)}
                </li>
              ))}
            </ul>
          )}
          {s.status === "DRAFT" && (
            <div className="flex flex-col gap-4">
              <Button
                variant="outline"
                onClick={() => setEditingSale(editingSale === s.id ? "" : s.id)}
              >
                Revisar venda
              </Button>
              {editingSale === s.id && (
                <SaleForm
                  key={s.version}
                  detail={{ ...data, sales }}
                  options={options}
                  initial={s}
                  admin={admin}
                  onSaved={saved}
                />
              )}
              {admin && (
                <CommandForm
                  area="sales"
                  label="Confirmar venda e obrigações"
                  description="Consome somente as peças recebidas na loja e cria os títulos acima, sem nova saída do estoque interno."
                  onSaved={saved}
                  build={(d) => ({
                    type: "CONFIRM",
                    id: s.id,
                    expectedVersion: s.version,
                    reason: String(d.get("reason")),
                  })}
                >
                  <Field
                    label="Observação da confirmação"
                    name="reason"
                    maxLength={2000}
                  />
                </CommandForm>
              )}
            </div>
          )}
          {admin && s.status === "CONFIRMED" && (
            <CommandForm
              area="sales"
              label="Cancelar integralmente esta venda"
              description="Antes, estorne as baixas e cancele o fechamento do acerto. As peças voltam ao saldo da loja; relance a parte mantida com nova referência."
              onSaved={saved}
              build={(d) => ({
                type: "CANCEL",
                id: s.id,
                expectedVersion: s.version,
                reason: String(d.get("reason")),
              })}
            >
              <Field
                label="Motivo da correção da venda"
                name="reason"
                required
                minLength={3}
                maxLength={2000}
              />
            </CommandForm>
          )}
        </Section>
      ))}
      {!ended.sales && data.sales.length >= 20 && (
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => void more("sales")}
        >
          Carregar vendas anteriores
        </Button>
      )}
      {admin && (
        <>
          <StatementPanel
            partnerId={p.id}
            statements={statements}
            onSaved={saved}
          />
          {!ended.statements && data.statements.length >= 20 && (
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => void more("statements")}
            >
              Carregar acertos anteriores
            </Button>
          )}
          <ResultPanel partnerId={p.id} products={data.balances} />
        </>
      )}
      {error && <Notice>{error}</Notice>}
      {admin && !!data.pendingCompetences.length && (
        <Notice kind="info">
          Há vendas sem acerto nas competências:{" "}
          {data.pendingCompetences.join(", ")}.
        </Notice>
      )}
      {admin && data.overdueTitles > 0 && (
        <Notice kind="info">
          {data.overdueTitles} títulos de consignação estão vencidos com saldo
          pendente.
        </Notice>
      )}
      <Section
        title="Atividade recente"
        description="Últimos 50 registros. O histórico das peças está em cada remessa."
      >
        <ul>
          {data.events.map((e) => (
            <li key={e.id}>
              {e.effectiveDate} ·{" "}
              {(
                {
                  PARTNER_CREATE: "Cadastro do parceiro",
                  UPDATE: "Atualização do parceiro",
                  SET_PRODUCT_CONDITION: "Condição por produto",
                  SAVE_DRAFT: "Rascunho de remessa",
                  SALE_DRAFT: "Rascunho de venda",
                  SALE: "Venda efetiva",
                  SALE_CANCEL: "Cancelamento de venda",
                  STATEMENT_CLOSE: "Fechamento de acerto",
                  STATEMENT_CANCEL: "Cancelamento de acerto",
                } as Record<string, string>
              )[e.kind] ?? "Movimentação de consignação"}{" "}
              · {e.actorName}
              {e.reason && ` · ${e.reason}`}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
