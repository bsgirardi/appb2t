"use client";
import { useId, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client-api";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { activeTaxProfiles } from "@/domain/tax/periods";
import type { TaxProfilesDTO, TaxProfile } from "@/domain/tax/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatBRL } from "@/domain/calculation/calculate";

export function TaxSettingsPanel({ initial }: { initial: TaxProfilesDTO }) {
  const [data, setData] = useState(initial),
    [regime, setRegime] = useState<"MEI" | "SIMPLES">("MEI");
  const today = todaySaoPaulo(new Date());
  const [start, setStart] = useState(today.slice(0, 7)),
    [end, setEnd] = useState(`${today.slice(0, 4)}-12`);
  const [amount, setAmount] = useState(""),
    [source, setSource] = useState(""),
    [checked, setChecked] = useState(today);
  const [scope, setScope] = useState(
      "Venda de produtos sem exceções fiscais identificadas",
    ),
    [reason, setReason] = useState("");
  const [replacesId, setReplaces] = useState(""),
    [verified, setVerified] = useState(false),
    [products, setProducts] = useState(false),
    [channels, setChannels] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const lock = useRef(false),
    id = useId();
  const details = useRef<HTMLDetailsElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const active = activeTaxProfiles(data.profiles);
  const current = active.find(
    (p) => p.startsAt <= today.slice(0, 7) && p.endsAt >= today.slice(0, 7),
  );
  function load(p: TaxProfile) {
    setRegime(p.regime);
    setStart(p.startsAt);
    setEnd(p.endsAt);
    setAmount(p.regime === "MEI" ? p.monthlyDas! : p.percent!);
    setScope(p.scope);
    setSource(p.source);
    setChecked(p.checkedOn);
    setReplaces(p.id);
    setReason("");
    setChannels(false);
    setProducts(false);
    setVerified(false);
    setNotice(
      "Revisão carregada para substituição explícita. Confira os valores e a vigência.",
    );
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setErrors({});
    setNotice("");
    try {
      const next = await api<TaxProfilesDTO>("/api/tax/profiles", {
        regime,
        startsAt: start,
        endsAt: end,
        percent: regime === "SIMPLES" ? amount : null,
        monthlyDas: regime === "MEI" ? amount : null,
        scope,
        source,
        checkedOn: checked,
        verification: verified ? "CHECKED" : "INFORMED",
        productsConfirmed: products,
        channelsReviewed: channels,
        reason,
        replacesId: replacesId || null,
        expectedVersion: data.version,
      });
      setData(next);
      setReason("");
      setReplaces("");
      setChannels(false);
      setProducts(false);
      setNotice(
        "Revisão salva. Memórias e documentos anteriores permanecem iguais. Atualize explicitamente as referências de cálculos abertos.",
      );
    } catch (e) {
      const fields = e instanceof ApiError ? (e.fields ?? {}) : {};
      setErrors(fields);
      if (details.current && Object.keys(fields).length)
        details.current.open = true;
      setError((e as Error).message + (fields[""] ? ` ${fields[""]}` : ""));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tributação</CardTitle>
        <CardDescription>
          Tributação para estimativas gerenciais. Configure por competência; a
          alíquota não é determinada automaticamente pelo CNPJ.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {current && (
          <p>
            Vigente neste mês:{" "}
            <strong>
              {current.regime === "MEI"
                ? `MEI · DAS ${formatBRL(current.monthlyDas!)}/mês`
                : `Simples · ${current.percent}% informado`}
            </strong>{" "}
            · revisão {current.revision}. O formulário abaixo cria uma nova
            revisão.
          </p>
        )}
        {!active.length && (
          <Alert>
            <AlertTitle>Tributação não configurada</AlertTitle>
            <AlertDescription>
              Os preços continuam calculáveis, com cobertura fiscal identificada
              como incompleta.
            </AlertDescription>
          </Alert>
        )}
        <FieldGroup>
          <Label id={`${id}-regime`}>Regime para estimativa</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={regime}
            onValueChange={(v) => {
              if (v === "MEI" || v === "SIMPLES") {
                setRegime(v);
                setAmount("");
              }
            }}
            aria-labelledby={`${id}-regime`}
            disabled={busy}
          >
            <ToggleGroupItem value="MEI">MEI (SIMEI)</ToggleGroupItem>
            <ToggleGroupItem value="SIMPLES">Simples Nacional</ToggleGroupItem>
          </ToggleGroup>
          <Field
            label="Competência inicial"
            error={errors.startsAt}
            type="month"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            disabled={busy}
          />
          <Field
            label="Competência final"
            error={errors.endsAt}
            type="month"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            disabled={busy}
            hint="Obrigatória. Revise os valores antes de usar em outro período."
          />
          <Field
            label={
              regime === "MEI"
                ? "DAS mensal (R$)"
                : "Alíquota efetiva estimada (%)"
            }
            inputMode="decimal"
            error={errors[regime === "MEI" ? "monthlyDas" : "percent"]}
            placeholder={
              regime === "SIMPLES" ? "Ex.: 4,00" : "Valor da competência"
            }
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
            hint={
              regime === "MEI"
                ? "O DAS entra na previsão de custos fixos do mês; não é rateado nem deduzido por venda."
                : "Confira a alíquota efetiva no PGDAS-D ou com o contador. O valor total da guia, sozinho, não determina a alíquota."
            }
          />
        </FieldGroup>
        {regime === "MEI" && (
          <Alert>
            <AlertTitle>Valor mensal conforme o período</AlertTitle>
            <AlertDescription>
              Em 2026, INSS ordinário de R$ 81,05, acrescido de ICMS R$ 1 e/ou
              ISS R$ 5 quando devidos. Informe o valor aplicável, sem encargos
              por atraso.{" "}
              <a
                className="underline"
                href="https://www8.receita.fazenda.gov.br/simplesnacional/Noticias/NoticiaCompleta.aspx?id=c3b2044c-ff97-432a-b33c-ecf2a3df6dc3"
                target="_blank"
                rel="noreferrer"
              >
                Fonte oficial de 2026
              </a>
              . Não reutilize o valor em outro ano sem conferência.
            </AlertDescription>
          </Alert>
        )}
        <details ref={details}>
          <summary>Vigência, origem e conferência</summary>
          <FieldGroup>
            <Field
              label="Operação coberta"
              error={errors.scope}
              value={scope}
              maxLength={240}
              onChange={(e) => setScope(e.target.value)}
              disabled={busy}
              hint="Resumo comercial visível na calculadora; não inclua informações privadas."
            />
            <Field
              label="Origem dos parâmetros"
              error={errors.source}
              value={source}
              maxLength={500}
              onChange={(e) => setSource(e.target.value)}
              disabled={busy}
              hint="Ex.: orientação do contador e competência. Não inclua documentos ou credenciais."
            />
            <Field
              label="Data da conferência"
              error={errors.checkedOn}
              type="date"
              value={checked}
              onChange={(e) => setChecked(e.target.value)}
              disabled={busy}
            />
            <Field
              label="Parâmetros conferidos com o responsável"
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              disabled={busy}
            />
            <Field
              label="Confirmo que a premissa cobre venda de produtos sem exceções identificadas"
              type="checkbox"
              checked={products}
              onChange={(e) => setProducts(e.target.checked)}
              disabled={busy}
            />
            <Field
              label="Conferi as taxas dos canais e removi explicitamente eventual imposto duplicado para novos cálculos"
              type="checkbox"
              checked={channels}
              onChange={(e) => setChannels(e.target.checked)}
              disabled={busy}
            />
            <Label htmlFor={`${id}-replace`}>Revisão substituída</Label>
            <NativeSelect
              id={`${id}-replace`}
              value={replacesId}
              onChange={(e) => setReplaces(e.target.value)}
              disabled={busy}
            >
              <option value="">Novo período, sem sobreposição</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  Revisão {p.revision}: {p.startsAt} a {p.endsAt}
                </option>
              ))}
            </NativeSelect>
            <Field
              label="Motivo do registro ou substituição"
              error={errors.reason}
              value={reason}
              minLength={5}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
          </FieldGroup>
        </details>
        {error && (
          <Notice>
            {error} Confira os campos; se houver conflito, recarregue a
            configuração antes de salvar.
          </Notice>
        )}
        {notice && <Notice kind="success">{notice}</Notice>}
        <details>
          <summary>Histórico fiscal ({data.profiles.length} revisões)</summary>
          <ul className="flex flex-col gap-3">
            {[...data.profiles].reverse().map((p) => (
              <li key={p.id}>
                Revisão {p.revision} ·{" "}
                {p.regime === "MEI"
                  ? `MEI: ${formatBRL(p.monthlyDas!)}/mês`
                  : `Simples: ${p.percent}%`}{" "}
                · {p.startsAt} a {p.endsAt} ·{" "}
                {active.some((a) => a.id === p.id)
                  ? "Ativa para seleção"
                  : "Substituída"}{" "}
                · {p.actorName}
                <p>
                  {p.reason} · Origem: {p.source}
                </p>
                {active.some((a) => a.id === p.id) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => load(p)}
                  >
                    Revisar sem alterar o histórico
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={save}
          disabled={busy || !products || !channels}
        >
          {busy ? "Salvando…" : "Salvar nova revisão fiscal"}
        </Button>
      </CardFooter>
    </Card>
  );
}
