"use client";
import { FormSection } from "@/components/admin/form-section";

import { useState } from "react";
import Link from "next/link";
import { Select, money } from "@/components/finance/shared";
import { ActionForm } from "./shared";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { productionCommand } from "@/lib/production-client";
import type {
  OrderDetail as Detail,
  ProductionOptions,
} from "@/server/production/queries";
import { ReportForm } from "./report-form";
import { PlanningForm } from "./planning-form";
import { OrderForm } from "./order-form";
import { MaterialReconciliation } from "./material-reconciliation";
import { CorrectionForm, CancelRemainderForm } from "./correction-form";
import { names, DateReason, text, optional, decimal } from "./shared";
export function OrderDetail({
  order,
  options,
  admin,
  onDone,
  onBack,
}: {
  order: Detail;
  options: ProductionOptions;
  admin: boolean;
  onDone: () => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState("");
  const done = () => {
    setMode("");
    onDone();
  };
  const active = ["LIBERADA", "EM_EXECUCAO"].includes(order.status);
  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        Voltar às ordens
      </Button>
      <h2>
        <Link href="/planejamento">Planejamento das máquinas</Link>
      </h2>
      <h2>
        OP-{String(order.sequence).padStart(6, "0")} · {names[order.status]}
      </h2>
      <p>
        {names[order.origin]} · prazo: {order.dueDate ?? "Não definido"}
      </p>
      {order.saleId && (
        <p>
          <Link href={`/vendas/${order.saleId}`}>
            Consultar arte e aprovação da venda
          </Link>
        </p>
      )}
      {order.lines.map((l) => (
        <p key={l.id}>
          {l.description}: meta {l.targetUnits}, boas {l.goodUnits}, falhas{" "}
          {l.failedUnits}, canceladas {l.canceledUnits}
        </p>
      ))}
      {active && (
        <Button onClick={() => setMode("report")}>Registrar execução</Button>
      )}
      <FormSection
        id="order-actions"
        title="Planejamento e outras ações"
        collapsible
        defaultOpen={false}
        summary="Reservas, conclusão e correções"
      >
        <div className="flex flex-wrap gap-2">
          {order.status === "RASCUNHO" && (
            <Button variant="outline" onClick={() => setMode("edit")}>
              Editar rascunho
            </Button>
          )}
          {active && (
            <Button variant="outline" onClick={() => setMode("planning")}>
              Alterar planejamento
            </Button>
          )}
          {active && (
            <>
              <Button variant="outline" onClick={() => setMode("reserve")}>
                Reservar material
              </Button>
              <Button variant="outline" onClick={() => setMode("complete")}>
                Concluir ordem
              </Button>
            </>
          )}
          {admin && order.events.length > 0 && (
            <Button variant="outline" onClick={() => setMode("correction")}>
              Corrigir apontamento
            </Button>
          )}
          {!["CANCELADA", "CONCLUIDA"].includes(order.status) &&
            (admin || !order.events.some((e) => e.kind === "REPORT")) && (
              <Button variant="outline" onClick={() => setMode("cancel")}>
                Cancelar restante
              </Button>
            )}
        </div>
      </FormSection>
      {mode === "edit" && (
        <OrderForm
          order={order}
          options={options}
          onDone={done}
          onCancel={() => setMode("")}
        />
      )}
      {mode === "planning" && (
        <PlanningForm
          order={order}
          options={options}
          onDone={done}
          onCancel={() => setMode("")}
        />
      )}
      {order.status === "RASCUNHO" && mode !== "edit" && (
        <ActionForm
          title="Liberar ordem"
          submit="Confirmar liberação"
          revision={order.version}
          onDone={done}
          onSubmit={(_f, operationKey) =>
            productionCommand("ORDER_RELEASE", {
              operationKey,
              expectedVersion: order.version,
              orderId: order.id,
            })
          }
        >
          <p>
            A liberação confirma as metas por venda e exige inventário do
            produto quando cadastrado.
          </p>
        </ActionForm>
      )}
      {mode === "report" && (
        <ReportForm
          order={order}
          options={options}
          onDone={done}
          onCancel={() => setMode("")}
        />
      )}
      {mode === "correction" && admin && (
        <CorrectionForm
          order={order}
          onDone={done}
          onCancel={() => setMode("")}
        />
      )}
      {mode === "cancel" && (
        <CancelRemainderForm
          order={order}
          onDone={done}
          onCancel={() => setMode("")}
        />
      )}
      {mode === "complete" && (
        <ActionForm
          title="Concluir ordem"
          submit="Confirmar conclusão"
          revision={order.version}
          onDone={done}
          onCancel={() => setMode("")}
          onSubmit={(_f, operationKey) =>
            productionCommand("COMPLETE", {
              operationKey,
              expectedVersion: order.version,
              orderId: order.id,
            })
          }
        >
          <p>
            As metas devem estar atendidas e as reservas de material resolvidas.
            Custos ainda não conferidos permanecerão sinalizados.
          </p>
        </ActionForm>
      )}
      {mode === "reserve" && (
        <ActionForm
          title="Reservar material para a ordem"
          revision={order.version}
          onDone={done}
          onCancel={() => setMode("")}
          onSubmit={(f, operationKey) =>
            productionCommand("MATERIAL_RESERVE", {
              operationKey,
              expectedVersion: order.version,
              lineId: text(f, "lineId"),
              itemId: text(f, "itemId"),
              quantity: decimal(f, "quantity"),
              effectiveDate: text(f, "effectiveDate"),
              reason: optional(f, "reason"),
            })
          }
        >
          <Select
            label="Item da ordem"
            name="lineId"
            options={order.lines.map((l) => ({
              value: l.id,
              label: l.description,
            }))}
          />
          <Select
            label="Material"
            name="itemId"
            options={options.materials.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.unit})`,
            }))}
          />
          <Field
            label="Quantidade a reservar"
            name="quantity"
            inputMode="decimal"
            required
          />
          <DateReason />
        </ActionForm>
      )}
      {order.saleId && active && (
        <MaterialReconciliation order={order} admin={admin} onDone={done} />
      )}
      <details>
        <summary>Reservas de material da ordem</summary>
        {order.allocations
          .filter((a) => Number(a.remaining) > 0)
          .map((a) => (
            <ActionForm
              key={a.id}
              title={`${a.name} · ${a.remaining} ${a.unit}`}
              revision={order.version}
              onDone={done}
              onSubmit={(f, operationKey) =>
                productionCommand("MATERIAL_RELEASE", {
                  operationKey,
                  expectedVersion: order.version,
                  allocationId: a.id,
                  quantity: decimal(f, "quantity"),
                  reason: text(f, "reason"),
                })
              }
            >
              <Field
                label="Quantidade a liberar"
                name="quantity"
                inputMode="decimal"
                required
              />
              <Field label="Motivo" name="reason" minLength={3} required />
            </ActionForm>
          ))}
      </details>
      {admin && order.cost && (
        <details>
          <summary>Custo e cobertura das medições</summary>
          {order.cost.map((c, i) => (
            <div key={c.lineId ?? i} className="p-3">
              <p>
                {order.lines.find((l) => l.id === c.lineId)?.description}:{" "}
                {money(c.total)} ·{" "}
                {c.provisional ? "Provisório ou incompleto" : "Conferido"}
              </p>
              <p>
                Por peça: {money(c.unitCost)} · parcela conhecida:{" "}
                {money(c.knownTotal)}
              </p>
              {c.missing.length > 0 && (
                <p>Existem medições ou valores ainda não informados.</p>
              )}
            </div>
          ))}
        </details>
      )}
      <details>
        <summary>Histórico de execução</summary>
        {order.events.map((e) => (
          <div key={e.id} className="border-b py-2">
            <p>
              {e.effectiveDate} · {names[e.kind] ?? e.kind}: boas {e.goodUnits},
              falhas {e.failedUnits}
            </p>
            <p>{e.reason}</p>
            <p>
              Máquina: {e.machineMinutes ?? "não medido"} min · preparação:{" "}
              {e.setupMinutes ?? "não medido"} min · acabamento:{" "}
              {e.finishingMinutes ?? "não medido"} min
            </p>
          </div>
        ))}
      </details>
    </div>
  );
}
