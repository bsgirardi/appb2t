"use client";
import { useId, useState, type FormEvent } from "react";
import type {
  OpportunityDTO,
  OpportunityFields,
  OpportunityOptions,
  OpenStage,
} from "@/domain/opportunities/types";
import { openStages, stageLabels } from "@/domain/opportunities/types";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useOpportunityCommand, CommandError } from "./command";
export function OpportunityForm({
  initial,
  options,
  onSaved,
  onCancel,
}: {
  initial?: OpportunityDTO;
  options: OpportunityOptions;
  onSaved: (value: OpportunityDTO) => void;
  onCancel: () => void;
}) {
  const prefix = useId(),
    command = useOpportunityCommand(initial?.id);
  const [fields, setFields] = useState<OpportunityFields>(() => ({
    title: initial?.title ?? "",
    customerId: initial?.customerId ?? "",
    ownerId: initial?.ownerId ?? "",
    stage: (initial?.stage ?? "CONTATO") as OpenStage,
    nextAction: initial?.nextAction ?? "",
    nextContactDate: initial?.nextContactDate ?? todaySaoPaulo(new Date()),
    pendingNotes: initial?.pendingNotes ?? "",
  }));
  function update(patch: Partial<OpportunityFields>) {
    setFields((old) => ({ ...old, ...patch }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    const result = await command.run({
      action: initial ? "UPDATE" : "CREATE",
      ...(initial ? { expectedVersion: initial.version } : {}),
      fields,
    });
    if (result) onSaved(result);
  }
  const customers =
    options.customers.some((c) => c.id === initial?.customerId) || !initial
      ? options.customers
      : [initial.customer, ...options.customers];
  const owners =
    options.owners.some((c) => c.id === initial?.ownerId) || !initial
      ? options.owners
      : [initial.owner, ...options.owners];
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <CommandError {...command} />
      <FieldGroup>
        <Field
          label="Título"
          required
          maxLength={160}
          value={fields.title}
          onChange={(e) => update({ title: e.target.value })}
        />
        <div data-slot="field">
          <Label htmlFor={`${prefix}-customer`}>Cliente</Label>
          <NativeSelect
            id={`${prefix}-customer`}
            required
            value={fields.customerId}
            disabled={!!initial?.quotes.length || command.busy}
            onChange={(e) => update({ customerId: e.target.value })}
          >
            <option value="">Selecione o cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!c.active ? " (inativo)" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div data-slot="field">
          <Label htmlFor={`${prefix}-owner`}>Responsável</Label>
          <NativeSelect
            id={`${prefix}-owner`}
            required
            value={fields.ownerId}
            onChange={(e) => update({ ownerId: e.target.value })}
          >
            <option value="">Selecione o responsável</option>
            {owners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!c.active ? " (inativo)" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div data-slot="field">
          <Label htmlFor={`${prefix}-stage`}>Etapa</Label>
          <NativeSelect
            id={`${prefix}-stage`}
            value={fields.stage}
            onChange={(e) => update({ stage: e.target.value as OpenStage })}
          >
            {(initial ? openStages : openStages.slice(0, 2)).map((s) => (
              <option
                key={s}
                value={s}
                disabled={
                  ["PROPOSTA", "NEGOCIACAO"].includes(s) &&
                  !initial?.principalQuoteId
                }
              >
                {stageLabels[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Field
          label="Próxima ação"
          required
          maxLength={500}
          value={fields.nextAction}
          onChange={(e) => update({ nextAction: e.target.value })}
        />
        <Field
          label="Próximo contato"
          type="date"
          required
          value={fields.nextContactDate}
          onChange={(e) => update({ nextContactDate: e.target.value })}
        />
        <div data-slot="field">
          <Label htmlFor={`${prefix}-pending`}>Pendências</Label>
          <Textarea
            id={`${prefix}-pending`}
            maxLength={4000}
            value={fields.pendingNotes}
            onChange={(e) => update({ pendingNotes: e.target.value })}
          />
        </div>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button disabled={command.busy}>Salvar oportunidade</Button>
        <Button
          type="button"
          variant="outline"
          disabled={command.busy}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
