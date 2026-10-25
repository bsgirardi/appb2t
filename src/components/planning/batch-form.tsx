"use client";
import { useState } from "react";
import type { BatchDTO, Suggestion } from "@/domain/planning/types";
import { Field, Notice } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { planningCommand } from "@/lib/planning-client";
import {
  ActionForm,
  Select,
  Toggle,
  text,
  count,
  decimal,
  meta,
  type PlanningData,
} from "./shared";
export function BatchForm({
  data,
  batch,
  suggestion,
  onDone,
  onCancel,
}: {
  data: PlanningData;
  batch?: BatchDTO;
  suggestion?: Suggestion;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [printerId, setPrinterId] = useState(
    batch?.printerId ??
      suggestion?.printerId ??
      data.printers.find((p) => p.active)?.id ??
      "",
  );
  const settings = data.printers.find((p) => p.id === printerId)?.settings;
  const lines = data.lines.filter((l) => l.printerId === printerId);
  return (
    <ActionForm
      title={batch ? `Revisar lote ${batch.sequence}` : "Novo lote"}
      submit="Salvar lote"
      summary={
        <section className="admin-summary-card">
          <h3>Composição do lote</h3>
          <p>{lines.length} linhas disponíveis para esta máquina.</p>
          <p>
            O rascunho não reserva peças. Confirme a composição antes de
            vincular o material e confira tempo, perfil e encaixe.
          </p>
        </section>
      }
      revision={`${data.revision}:${batch?.version ?? 0}`}
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, key) =>
        planningCommand("BATCH_SAVE", {
          ...meta(data, key, batch?.version),
          ...(batch ? { id: batch.id } : {}),
          printerId,
          materialItemId: text(f, "materialItemId"),
          colorLabel: text(f, "colorLabel"),
          participants: lines
            .map((l) => ({ lineId: l.id, units: count(f, `units:${l.id}`) }))
            .filter((p) => p.units > 0),
          durationMinutes: decimal(f, "durationMinutes"),
          durationConfirmed: f.has("durationConfirmed"),
          profileConfirmed: f.has("profileConfirmed"),
          fitConfirmed: f.has("fitConfirmed"),
          prepareMinutes: decimal(f, "prepareMinutes"),
          removeMinutes: decimal(f, "removeMinutes"),
        })
      }
    >
      <Notice kind="info">
        Salvar rascunho não reserva peças. Confirme a composição e depois
        vincule o material. Ao mudar composição, a confirmação do tempo e da cor
        precisa ser refeita.
      </Notice>
      <label className="field">
        Máquina
        <NativeSelect
          value={printerId}
          onChange={(e) => setPrinterId(e.target.value)}
        >
          {data.printers
            .filter((p) => p.active)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </NativeSelect>
      </label>
      <Select
        label="Material"
        name="materialItemId"
        value={batch?.materialItemId ?? suggestion?.materialItemId}
        options={data.materials
          .filter((m) => m.active)
          .map((m) => ({
            value: m.id,
            label: `${m.name} (${m.unit})${m.inventoried ? "" : " — sem inventário"}`,
          }))}
      />
      <Field
        label="Cor declarada"
        name="colorLabel"
        required
        defaultValue={batch?.colorLabel ?? suggestion?.colorKey}
        maxLength={100}
      />
      <fieldset className="flex flex-col gap-3">
        <legend>Participações no lote</legend>
        {!lines.length && (
          <p>
            Nenhuma linha liberada para esta máquina. Confira a máquina
            planejada em Produção.
          </p>
        )}
        {lines.map((l) => (
          <Field
            key={l.id}
            label={`Peças — OP ${l.orderSequence} · ${l.description}`}
            name={`units:${l.id}`}
            type="number"
            min={0}
            step={1}
            defaultValue={
              batch?.participants.find((p) => p.lineId === l.id)?.units ??
              suggestion?.candidates.find((c) => c.lineId === l.id)?.units ??
              0
            }
            hint={`${l.freeUnits} peças livres para novos lotes; prazo ${l.dueDate ?? "não informado"}.`}
          />
        ))}
      </fieldset>
      {batch?.estimates.map((e) => (
        <p key={e.lineId}>
          Referência operacional U1: {e.minutes} min para {e.units} peças.
          Confirme o tempo total do lote no fatiador.
        </p>
      ))}
      <Field
        label="Tempo total de impressão (min)"
        name="durationMinutes"
        inputMode="decimal"
        defaultValue={batch?.durationMinutes ?? ""}
      />
      <Toggle
        name="durationConfirmed"
        label="Tempo confirmado no fatiador"
        defaultChecked={!!batch?.durationConfirmedAt}
      />
      <Toggle
        name="profileConfirmed"
        label="Perfil de impressão compatível"
        defaultChecked={batch?.profileConfirmed}
      />
      <Toggle
        name="fitConfirmed"
        label="Encaixe de todas as peças na mesa conferido"
        defaultChecked={batch?.fitConfirmed}
      />
      <div key={printerId} className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Preparação (min)"
          name="prepareMinutes"
          required
          inputMode="decimal"
          defaultValue={batch?.prepareMinutes ?? settings?.prepareMinutes ?? ""}
        />
        <Field
          label="Retirada (min)"
          name="removeMinutes"
          required
          inputMode="decimal"
          defaultValue={batch?.removeMinutes ?? settings?.removeMinutes ?? ""}
        />
      </div>
    </ActionForm>
  );
}
