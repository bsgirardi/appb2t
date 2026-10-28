"use client";
import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CommissionModel } from "@/domain/consignment/types";
import type { PartnerDTO } from "@/server/consignment/partners";
import type { ConsignmentOptionsDTO } from "@/server/consignment/queries";
import { CommandForm } from "./shared";
export function ModelChoice({
  value,
  onChange,
}: {
  value: CommissionModel;
  onChange: (v: CommissionModel) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span>Modelo de comissão</span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v as CommissionModel);
        }}
        aria-label="Modelo de comissão"
        className="flex-wrap"
      >
        <ToggleGroupItem value="RETIDA">Retida pela loja</ToggleGroupItem>
        <ToggleGroupItem value="SEPARADA">Paga separadamente</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
export function PartnerForm({
  initial,
  options,
  actorId,
  onSaved,
}: {
  initial?: PartnerDTO;
  options: ConsignmentOptionsDTO;
  actorId: string;
  onSaved: () => void;
}) {
  const [model, setModel] = useState<CommissionModel>(
    initial?.model ?? "RETIDA",
  );
  return (
    <CommandForm
      area="partners"
      label={initial ? "Salvar parceiro" : "Cadastrar parceiro"}
      onSaved={onSaved}
      build={(d) => ({
        type: initial ? "UPDATE" : "CREATE",
        ...(initial
          ? { id: initial.id, active: d.get("active") === "true" }
          : { customerId: String(d.get("customerId")) }),
        expectedVersion: initial?.version ?? 0,
        responsibleId: String(d.get("responsibleId")),
        location: String(d.get("location")),
        model,
        percent: String(d.get("percent")),
        dueDay: Number(d.get("dueDay")),
        notes: String(d.get("notes")),
      })}
    >
      {!initial && (
        <div className="field">
          <Label htmlFor="partner-customer">
            Cliente que representa a loja
          </Label>
          <NativeSelect
            id="partner-customer"
            name="customerId"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Selecione um cliente cadastrado
            </option>
            {options.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <Field
        name="location"
        label="Local do parceiro"
        required
        maxLength={300}
        defaultValue={initial?.location ?? ""}
      />
      <div className="field">
        <Label htmlFor="partner-owner">Responsável interno</Label>
        <NativeSelect
          id="partner-owner"
          name="responsibleId"
          required
          defaultValue={initial?.responsibleId ?? actorId}
        >
          {initial &&
            !options.users.some((u) => u.id === initial.responsibleId) && (
              <option value={initial.responsibleId}>
                Responsável atual (inativo)
              </option>
            )}
          {options.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <ModelChoice value={model} onChange={setModel} />
      <Field
        name="percent"
        label="Comissão padrão (%)"
        inputMode="decimal"
        required
        defaultValue={initial?.percent ?? "20"}
        hint="De 0 a 100, com até quatro casas decimais."
      />
      <Field
        name="dueDay"
        label="Dia do vencimento"
        type="number"
        min={1}
        max={28}
        required
        defaultValue={initial?.dueDay ?? 10}
        hint="Vence no mês seguinte à data efetiva da venda."
      />
      <Field
        name="notes"
        label="Condições e observações internas"
        maxLength={2000}
        defaultValue={initial?.notes ?? ""}
      />
      {initial && (
        <div className="field">
          <Label htmlFor="partner-active">Situação</Label>
          <NativeSelect
            id="partner-active"
            name="active"
            defaultValue={String(initial.active)}
          >
            <option value="true">Ativo</option>
            <option value="false">
              Inativo: permite resolver estoque e acertos existentes
            </option>
          </NativeSelect>
        </div>
      )}
    </CommandForm>
  );
}
