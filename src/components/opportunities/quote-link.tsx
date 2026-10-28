"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OpportunityDTO } from "@/domain/opportunities/types";
import type { Page } from "@/domain/shared/pagination";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { stageLabels } from "@/domain/opportunities/types";
import { CommandError, useOpportunityCommand } from "./command";
export function OpportunityQuoteLink({
  quoteId,
  customerId,
  opportunity,
}: {
  quoteId: string;
  customerId: string | null;
  opportunity: OpportunityDTO | null;
}) {
  const router = useRouter(),
    [rows, setRows] = useState<Page<OpportunityDTO> | null>(null),
    [selected, setSelected] = useState<OpportunityDTO | null>(null),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const command = useOpportunityCommand(selected?.id);
  async function search(page = 1) {
    if (!customerId) return;
    setError("");
    setBusy(true);
    try {
      setRows(
        await api<Page<OpportunityDTO>>(
          `/api/opportunities?${new URLSearchParams({ customerId, stage: "abertas", search: query, page: String(page) })}`,
        ),
      );
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function link() {
    if (!selected) return;
    const result = await command.run({
      action: "LINK_QUOTE",
      quoteId,
      expectedVersion: selected.version,
    });
    if (result) {
      router.push(`/negociacoes/${result.id}`);
      router.refresh();
    }
  }
  return (
    <Card className="no-print print:hidden">
      <CardHeader>
        <CardTitle>Negociação vinculada</CardTitle>
        <CardDescription>Informações internas da equipe.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {opportunity ? (
          <>
            <Link href={`/negociacoes/${opportunity.id}`}>
              {opportunity.title}
            </Link>
            <p>
              {stageLabels[opportunity.stage]} · {opportunity.owner.name}
            </p>
          </>
        ) : customerId ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void search();
              }}
              className="flex flex-col gap-2"
            >
              <FieldGroup>
                <Field
                  label="Buscar oportunidade do cliente"
                  maxLength={160}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </FieldGroup>
              <Button variant="outline" disabled={busy}>
                Buscar oportunidades
              </Button>
            </form>
            {error ? <Notice>{error}</Notice> : null}
            <CommandError {...command} />
            {rows ? (
              <>
                <Label htmlFor="quote-opportunity">Oportunidade</Label>
                <NativeSelect
                  id="quote-opportunity"
                  value={selected?.id ?? ""}
                  onChange={(e) =>
                    setSelected(
                      rows.items.find((o) => o.id === e.target.value) ?? null,
                    )
                  }
                >
                  <option value="">Selecione uma oportunidade</option>
                  {rows.items.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </NativeSelect>
                {!rows.items.length ? (
                  <p>Nenhuma oportunidade aberta para este cliente.</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!selected || command.busy}
                    onClick={() => {
                      void link();
                    }}
                  >
                    Vincular à oportunidade
                  </Button>
                  {rows.page > 1 ? (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        void search(rows.page - 1);
                      }}
                    >
                      Oportunidades anteriores
                    </Button>
                  ) : null}
                  {rows.page * rows.pageSize < rows.total ? (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        void search(rows.page + 1);
                      }}
                    >
                      Mais oportunidades
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
            <Link href="/negociacoes">Abrir negociações</Link>
          </>
        ) : (
          <p>
            Selecione um cliente no orçamento antes de vincular uma
            oportunidade.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
