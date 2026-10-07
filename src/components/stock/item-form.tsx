"use client";
import { useState } from "react";
import { ActionForm, Select } from "@/components/finance/shared";
import { Field } from "@/components/ui/field";
import type { StockItemDTO, StockOptions } from "@/server/stock/queries";
import { stockCommand } from "@/lib/stock-client";
import {
  DateReason,
  QuantityFields,
  text,
  base,
  optionalReason,
} from "./shared";
export function ItemForm({
  item,
  options,
  onDone,
  onCancel,
}: {
  item?: StockItemDTO;
  options: StockOptions;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState(item?.method ?? "WEIGHTED_AVERAGE");
  return (
    <ActionForm
      revision={item?.version}
      title={item ? "Configurar item" : "Habilitar controle de estoque"}
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        stockCommand("ITEM", {
          operationKey,
          expectedVersion: item?.version ?? 0,
          id: item?.id,
          name: text(f, "name"),
          unit: item?.inventoriedAt ? item.unit : text(f, "unit"),
          materialId: item?.inventoriedAt
            ? item.materialId
            : text(f, "materialId") || null,
          extraId: item?.inventoriedAt
            ? item.extraId
            : text(f, "extraId") || null,
          method,
          manualUnitCost: text(f, "manualUnitCost") || null,
          active: text(f, "active") === "true",
          reason: optionalReason(f),
        })
      }
    >
      <Field
        label="Nome do item"
        name="name"
        defaultValue={item?.name}
        required
        minLength={2}
        maxLength={160}
      />
      {!item?.inventoriedAt && (
        <>
          <Select
            label="Unidade base"
            name="unit"
            value={item?.unit ?? "G"}
            options={[
              { value: "G", label: "Grama (FDM)" },
              { value: "ML", label: "Mililitro (resina)" },
              { value: "UNIT", label: "Unidade" },
            ]}
          />
          <Select
            label="Material existente (opcional)"
            name="materialId"
            value={item?.materialId ?? ""}
            required={false}
            options={options.materials.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.technology})`,
            }))}
          />
          <Select
            label="Complemento físico (opcional)"
            name="extraId"
            value={item?.extraId ?? ""}
            required={false}
            options={options.extras.map((e) => ({
              value: e.id,
              label: e.name,
            }))}
          />
        </>
      )}
      <label className="field">
        Método de custo
        <select
          name="method"
          className="w-full rounded border bg-background p-2"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="WEIGHTED_AVERAGE">Média ponderada móvel</option>
          <option value="MANUAL">Referência manual</option>
        </select>
      </label>
      <Field
        label="Referência por unidade base (R$)"
        name="manualUnitCost"
        inputMode="decimal"
        defaultValue={item?.manualUnitCost ?? ""}
        required={method === "MANUAL"}
        hint="Na mudança de método, informe a referência de abertura. Zero deve ser informado explicitamente."
      />
      <Select
        label="Situação"
        name="active"
        value={item?.active === false ? "false" : "true"}
        options={[
          { value: "true", label: "Ativo" },
          { value: "false", label: "Inativo" },
        ]}
      />
      <Field
        label="Justificativa"
        name="reason"
        minLength={3}
        maxLength={2000}
        hint="Obrigatória para alterar método ou referência vigente."
      />
      <p>
        Habilitar o controle não cria saldo. Registre a contagem inicial para
        liberar movimentos.
      </p>
    </ActionForm>
  );
}
export function OpeningForm({
  item,
  onDone,
  onCancel,
}: {
  item: StockItemDTO;
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <ActionForm
      revision={item?.version}
      title={`Inventário inicial · ${item.name}`}
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        stockCommand("OPENING", {
          operationKey,
          expectedVersion: item.version,
          itemId: item.id,
          quantity: base(f, item),
          value: text(f, "value") || undefined,
          effectiveDate: text(f, "effectiveDate"),
          reason: optionalReason(f),
        })
      }
    >
      <QuantityFields item={item} />
      {item.method === "WEIGHTED_AVERAGE" && (
        <Field
          label="Valor total contado (R$)"
          name="value"
          inputMode="decimal"
          required
          hint="Informe 0 explicitamente para material sem custo."
        />
      )}
      <DateReason />
    </ActionForm>
  );
}
