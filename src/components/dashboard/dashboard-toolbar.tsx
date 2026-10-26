"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import {
  dashboardPanels,
  type DashboardFilter,
  type DashboardPanel,
} from "@/domain/dashboard/types";
import { shiftDay } from "@/domain/dashboard/filters";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { useAdminTheme } from "@/components/admin/admin-theme";
type Panel = (typeof dashboardPanels)[number];
export function DashboardToolbar({
  filter: f,
  panels,
}: {
  filter: DashboardFilter;
  panels: readonly Panel[];
}) {
  const router = useRouter(),
    [pending, startTransition] = useTransition(),
    [error, setError] = useState("");
  const theme = useAdminTheme();
  function navigate(
    panel: DashboardPanel,
    from = f.from,
    to = f.to,
    range: DashboardFilter["range"] = f.range,
    margin: string | null = f.margin ?? null,
  ) {
    const params = new URLSearchParams({ panel, from, to, range });
    if (margin !== null) params.set("margin", margin);
    startTransition(() =>
      router.push(`/dashboard?${params}`, { scroll: false }),
    );
  }
  function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      from = String(data.get("from")),
      to = String(data.get("to"));
    if (
      from > to ||
      to > f.today ||
      (Date.parse(to) - Date.parse(from)) / 86400000 > 365
    ) {
      setError(
        "Escolha um período de até 366 dias, com início anterior ao fim e sem datas futuras.",
      );
      return;
    }
    setError("");
    const margin = data.get("margin");
    navigate(
      f.panel,
      from,
      to,
      "custom",
      margin === null
        ? (f.margin ?? null)
        : margin === ""
          ? null
          : String(margin),
    );
  }
  return (
    <div className="dashboard-toolbar" aria-busy={pending}>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-72">
          <Label htmlFor="dashboard-switcher">Dashboard</Label>
          <Combobox
            items={panels.map((p) => p.label)}
            value={panels.find((p) => p.id === f.panel)?.label ?? null}
            onValueChange={(value) => {
              const p = panels.find((p) => p.label === value);
              if (p) navigate(p.id);
            }}
            disabled={pending}
            autoHighlight
          >
            <ComboboxInput
              id="dashboard-switcher"
              aria-label="Dashboard"
              placeholder="Buscar operação…"
              className="w-full"
            />
            <ComboboxContent
              className="admin-ui admin-theme font-admin"
              style={theme}
            >
              <ComboboxEmpty>Nenhuma operação encontrada.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={f.range}
          aria-label="Período do dashboard"
          disabled={pending}
          onValueChange={(value) => {
            if (value === "custom" || !value) return;
            if (value === "month")
              navigate(f.panel, `${f.today.slice(0, 7)}-01`, f.today, "month");
            else
              navigate(
                f.panel,
                shiftDay(f.today, 1 - Number(value)),
                f.today,
                value as "30" | "90",
              );
          }}
          className="flex-wrap justify-start"
        >
          <ToggleGroupItem value="month">Este mês</ToggleGroupItem>
          <ToggleGroupItem value="30">30 dias</ToggleGroupItem>
          <ToggleGroupItem value="90">90 dias</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <form
        key={`${f.from}-${f.to}-${f.margin ?? ""}`}
        onSubmit={apply}
        className="flex flex-wrap items-end gap-3"
      >
        <FieldGroup className="dashboard-date-fields flex-row flex-wrap items-end">
          <Field
            label="Início"
            name="from"
            type="date"
            defaultValue={f.from}
            max={f.today}
            required
            disabled={pending}
          />
          <Field
            label="Fim"
            name="to"
            type="date"
            defaultValue={f.to}
            max={f.today}
            required
            disabled={pending}
          />
          {f.panel === "profitability" && (
            <Field
              label="Referência de margem (%)"
              name="margin"
              type="number"
              min="-100"
              max="100"
              step="0.01"
              defaultValue={f.margin}
              hint="Opcional; vazio destaca margens negativas."
              disabled={pending}
            />
          )}
        </FieldGroup>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          )}
          Aplicar período
        </Button>
      </form>
      {error && (
        <Alert variant="destructive" role="alert">
          {error}
        </Alert>
      )}
      <span role="status" className="sr-only">
        {pending ? "Atualizando dashboard…" : ""}
      </span>
    </div>
  );
}
