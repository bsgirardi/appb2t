"use client";
import { FormSection } from "@/components/admin/form-section";

import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import {
  Box,
  Layers3,
  Droplets,
  RefreshCw,
  Clock3,
  SlidersHorizontal,
  ArrowRight,
  Check,
  Printer,
} from "lucide-react";
import type {
  CalculatorData,
  CalculationResult,
  Technology,
} from "@/domain/calculation/types";
import { calculate, formatBRL } from "@/domain/calculation/calculate";
import { api } from "@/lib/client-api";
import { Field, Notice } from "@/components/ui/field";
import { CostBreakdown } from "./cost-breakdown";
export function CalculatorForm({
  data,
  role,
  onDraftChange,
}: {
  data: CalculatorData;
  role: "ADMIN" | "OPERATOR";
  onDraftChange?: (value: string) => void;
}) {
  const [snapshot, setSnapshot] = useState(data),
    [technology, setTechnology] = useState<Technology>("FDM"),
    [materialId, setMaterialId] = useState(""),
    [printerId, setPrinterId] = useState("");
  const [consumption, setConsumption] = useState(""),
    [hours, setHours] = useState(""),
    [minutes, setMinutes] = useState("0"),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState("");
  const fingerprint = JSON.stringify({
    snapshot,
    technology,
    materialId,
    printerId,
    consumption,
    hours,
    minutes,
  });
  useLayoutEffect(() => {
    onDraftChange?.(fingerprint);
  }, [fingerprint, onDraftChange]);
  const materials = snapshot.materials.filter(
      (m) => m.technology === technology,
    ),
    printers = snapshot.printers.filter((p) => p.technology === technology);
  const material = materials.find((m) => m.id === materialId),
    printer = printers.find((p) => p.id === printerId);
  let result: CalculationResult | null = null,
    invalid = "";
  if (material && printer && snapshot.settings && consumption && hours !== "") {
    try {
      if (!/^\d+$/.test(hours.trim()) || !/^\d+$/.test(minutes.trim()))
        throw new Error("Informe horas e minutos inteiros.");
      result = calculate({
        technology,
        consumption,
        hours: Number(hours),
        minutes: Number(minutes),
        materialPrice: material.price,
        printer,
        settings: snapshot.settings,
      });
    } catch {
      invalid =
        "Confira consumo e tempo: informe números válidos, consumo positivo e minutos entre 0 e 59.";
    }
  }
  function changeTechnology(value: Technology) {
    setTechnology(value);
    setMaterialId("");
    setPrinterId("");
  }
  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      const next = await api<CalculatorData>("/api/calculator-data");
      setSnapshot(next);
      if (!next.materials.some((m) => m.id === materialId)) setMaterialId("");
      if (!next.printers.some((p) => p.id === printerId)) setPrinterId("");
    } catch {
      setError(
        "Não foi possível atualizar. Os parâmetros anteriores continuam em uso. Tente novamente.",
      );
    } finally {
      setRefreshing(false);
    }
  }
  const ready =
    !!snapshot.settings && materials.length > 0 && printers.length > 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PRECIFICAÇÃO INTELIGENTE</div>
          <h1>
            Calculadora de impressão <span>3D</span>
          </h1>
          <p>Entenda seus custos. Encontre o preço certo para cada peça.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="refresh-button"
          disabled={refreshing}
          onClick={refresh}
        >
          <RefreshCw size={16} className={refreshing ? "spin" : ""} />
          Atualizar parâmetros
        </Button>
      </div>
      {error && <Notice>{error}</Notice>}
      <div className="calculator-grid">
        <div className="input-column">
          <Card asChild>
            <section className="">
              <div className="section-heading">
                <h2>
                  <span className="section-number">01</span>Dados da impressão
                </h2>
                <Box size={19} className="muted" />
              </div>
              <p className="section-description">
                Selecione a tecnologia e informe os dados do seu fatiador.
              </p>
              <div
                className="technology-switch"
                aria-label="Tecnologia de impressão"
              >
                <Button
                  variant={technology === "FDM" ? "default" : "outline"}
                  aria-pressed={technology === "FDM"}
                  onClick={() => changeTechnology("FDM")}
                >
                  <Layers3 size={20} />
                  <span>
                    Filamento <small>FDM</small>
                  </span>
                  {technology === "FDM" && <Check size={15} />}
                </Button>
                <Button
                  variant={technology === "RESIN" ? "default" : "outline"}
                  aria-pressed={technology === "RESIN"}
                  onClick={() => changeTechnology("RESIN")}
                >
                  <Droplets size={20} />
                  <span>
                    Resina <small>SLA / DLP</small>
                  </span>
                  {technology === "RESIN" && <Check size={15} />}
                </Button>
              </div>
              {!ready && (
                <Notice kind="info">
                  {role === "ADMIN" ? (
                    <>
                      Cadastre materiais, impressoras e custos para esta
                      tecnologia.{" "}
                      <Link href="/configuracoes">Abrir configurações →</Link>
                    </>
                  ) : (
                    "Sua equipe ainda não configurou esta tecnologia. Entre em contato com um administrador."
                  )}
                </Notice>
              )}
              <div className="form-grid">
                <div className="field">
                  <Label htmlFor="material">Material</Label>
                  <NativeSelect
                    required
                    id="material"
                    value={materialId}
                    onChange={(e) => setMaterialId(e.target.value)}
                  >
                    <option value="">Selecione o material</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <small>
                    {material
                      ? `${formatBRL(material.price)} / ${technology === "FDM" ? "kg" : "litro"}`
                      : "Preço definido nas configurações"}
                  </small>
                </div>
                <div className="field">
                  <Label htmlFor="printer">Impressora</Label>
                  <NativeSelect
                    required
                    id="printer"
                    value={printerId}
                    onChange={(e) => setPrinterId(e.target.value)}
                  >
                    <option value="">Selecione a impressora</option>
                    {printers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <small>
                    {printer
                      ? `${printer.watts} W · ${printer.amortizationMonths} meses de amortização`
                      : "Perfil de máquina da sua equipe"}
                  </small>
                </div>
              </div>
              <Separator className="my-6" />
              <Field
                required
                label="Consumo de material"
                inputMode="decimal"
                placeholder={technology === "FDM" ? "Ex.: 100" : "Ex.: 50"}
                value={consumption}
                onChange={(e) => setConsumption(e.target.value)}
                suffix={technology === "FDM" ? "gramas" : "ml"}
                hint="Inclua suportes e perdas de material informadas pelo fatiador."
              />
              <div className="time-heading">
                <Clock3 size={16} />
                <span>Tempo de impressão</span>
              </div>
              <div className="form-grid">
                <Field
                  label="Horas"
                  inputMode="numeric"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  suffix="h"
                />
                <Field
                  label="Minutos"
                  inputMode="numeric"
                  placeholder="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  suffix="min"
                />
              </div>
              {invalid && <Notice>{invalid}</Notice>}
              <div className="calculation-status">
                <span className="dot" />
                Cálculo automático ao preencher os campos
              </div>
            </section>
          </Card>
          <FormSection
            id="calculator-parameters"
            title="Parâmetros aplicados"
            collapsible
            defaultOpen={false}
            summary="Custos padronizados da equipe"
          >
            <section className="settings-summary">
              <div className="section-heading">
                <h2>
                  <span className="section-number">02</span>Parâmetros aplicados
                </h2>
                <SlidersHorizontal size={18} className="muted" />
              </div>
              <p className="section-description">
                Custos padronizados para toda a equipe.
              </p>
              <div className="parameter-grid">
                <div>
                  <span>Energia elétrica</span>
                  <strong>
                    {snapshot.settings
                      ? `${formatBRL(snapshot.settings.energyRate)} / kWh`
                      : "Não configurado"}
                  </strong>
                </div>
                <div>
                  <span>Manutenção</span>
                  <strong>
                    {snapshot.settings
                      ? `${snapshot.settings.maintenancePercent}%`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>Provisão para falhas</span>
                  <strong>
                    {snapshot.settings
                      ? `${snapshot.settings.failurePercent}%`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>Acabamento</span>
                  <strong>
                    {snapshot.settings
                      ? `${snapshot.settings.finishingPercent}%`
                      : "—"}
                  </strong>
                </div>
              </div>
              {role === "ADMIN" && (
                <Link className="text-link" href="/configuracoes">
                  Gerenciar configurações <ArrowRight size={15} />
                </Link>
              )}
              <small className="loaded-at">
                Carregados em{" "}
                {new Date(snapshot.loadedAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </small>
            </section>
          </FormSection>
        </div>
        <CostBreakdown
          result={result}
          markup={snapshot.settings?.markupPercent ?? "0"}
        />
      </div>
      <div className="bottom-tip">
        <Printer size={19} />
        <p>
          <strong>Do fatiador para o seu orçamento.</strong> Use o consumo e o
          tempo do trabalho completo. O resultado considera uma peça ou um lote,
          conforme os dados informados.
        </p>
      </div>
    </>
  );
}
