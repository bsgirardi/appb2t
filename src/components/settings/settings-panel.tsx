"use client";
import { Badge } from "@/components/ui/badge";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Layers3,
  Printer,
  SlidersHorizontal,
  Users,
  Plus,
  Pencil,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { formatBRL } from "@/domain/calculation/calculate";
import type {
  MaterialDTO,
  PrinterDTO,
  SettingsDTO,
} from "@/domain/calculation/types";
import type { UserDTO } from "@/server/users";
import { Notice } from "@/components/ui/field";
import {
  RecordEditor,
  type EditorField,
  type EditorRecord,
} from "./record-editor";
type Tab = "materials" | "printers" | "settings" | "users";
export interface AdminData {
  materials: MaterialDTO[];
  printers: PrinterDTO[];
  settings: SettingsDTO | null;
  users: UserDTO[];
}
const technology: EditorField = {
  key: "technology",
  label: "Tecnologia",
  kind: "select",
  options: [
    { value: "FDM", label: "Filamento (FDM)" },
    { value: "RESIN", label: "Resina (SLA / DLP)" },
  ],
};
const name: EditorField = { key: "name", label: "Nome", kind: "text" };
const active: EditorField = {
  key: "active",
  label: "Cadastro ativo",
  kind: "checkbox",
};
const decimal = (
  key: string,
  label: string,
  suffix?: string,
  hint?: string,
): EditorField => ({ key, label, suffix, hint, kind: "decimal" });
const materialFields: EditorField[] = [
  name,
  technology,
  decimal("price", "Preço por kg / litro", "R$"),
  active,
];
const printerFields: EditorField[] = [
  name,
  technology,
  decimal("acquisitionCost", "Valor da máquina", "R$"),
  { key: "amortizationMonths", label: "Amortização em meses", kind: "integer" },
  { key: "daysPerMonth", label: "Dias de uso por mês", kind: "integer" },
  decimal("hoursPerDay", "Horas de uso por dia", "h"),
  decimal("watts", "Potência média", "W"),
  active,
];
const costFields: EditorField[] = [
  decimal("energyRate", "Energia elétrica", "R$/kWh"),
  decimal(
    "maintenancePercent",
    "Manutenção",
    "%",
    "Aplicada sobre material + energia.",
  ),
  decimal(
    "failurePercent",
    "Provisão para falhas",
    "%",
    "Aplicada sobre o subtotal operacional.",
  ),
  decimal(
    "finishingPercent",
    "Acabamento",
    "%",
    "Aplicado sobre o subtotal operacional.",
  ),
  decimal("fixation", "Fixação por trabalho", "R$"),
  decimal(
    "markupPercent",
    "Acréscimo sobre o custo",
    "%",
    "200% transforma R$ 10 de custo em R$ 30 de venda.",
  ),
];
const userFields: EditorField[] = [
  name,
  { key: "email", label: "E-mail", kind: "email" },
  {
    key: "role",
    label: "Perfil de acesso",
    kind: "select",
    options: [
      { value: "OPERATOR", label: "Operador" },
      { value: "ADMIN", label: "Administrador" },
    ],
  },
];
const tabs = [
  { key: "materials" as const, label: "Materiais", icon: Layers3 },
  { key: "printers" as const, label: "Impressoras", icon: Printer },
  {
    key: "settings" as const,
    label: "Custos e taxas",
    icon: SlidersHorizontal,
  },
  { key: "users" as const, label: "Equipe", icon: Users },
];
const defaults: Record<Tab, EditorRecord> = {
  materials: { name: "", technology: "FDM", price: "", active: true },
  printers: {
    name: "",
    technology: "FDM",
    acquisitionCost: "",
    amortizationMonths: 12,
    daysPerMonth: 25,
    hoursPerDay: "8",
    watts: "",
    active: true,
  },
  settings: {
    version: 0,
    energyRate: "",
    maintenancePercent: "",
    failurePercent: "",
    finishingPercent: "",
    fixation: "",
    markupPercent: "",
  },
  users: { name: "", email: "", role: "OPERATOR", password: "" },
};
export function SettingsPanel({ initialData }: { initialData: AdminData }) {
  const [data, setData] = useState(initialData),
    [tab, setTab] = useState<Tab>("materials"),
    [editing, setEditing] = useState<EditorRecord | null>(null),
    [resetting, setResetting] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [reloadKey, setReloadKey] = useState(0),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      const [materials, printers, settings, users] = await Promise.all([
        api<MaterialDTO[]>("/api/materials"),
        api<PrinterDTO[]>("/api/printers"),
        api<SettingsDTO | null>("/api/settings"),
        api<UserDTO[]>("/api/users"),
      ]);
      const next = { materials, printers, settings, users };
      setData(next);
      setError("");
      return next;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function selectTab(next: Tab) {
    setTab(next);
    setEditing(null);
    setResetting(false);
    setNotice("");
    setError("");
  }
  async function saved() {
    setEditing(null);
    setResetting(false);
    setNotice(
      "Alterações salvas. A equipe pode carregar os novos parâmetros na calculadora.",
    );
    await refresh();
  }
  async function reloadRecord() {
    const next = await refresh();
    if (!next) return;
    if (tab === "settings")
      setEditing(next.settings ? { ...next.settings } : defaults.settings);
    else {
      const fresh = next[tab].find((r) => r.id === editing?.id);
      setEditing(fresh ? { ...fresh } : null);
    }
    setReloadKey((k) => k + 1);
  }
  const title = tabs.find((t) => t.key === tab)!.label;
  const rows = tab === "settings" ? [] : data[tab];
  const fields = resetting
    ? [
        {
          key: "password",
          label: "Nova senha",
          kind: "password" as const,
          hint: "Entre 12 e 128 caracteres. Todas as sessões serão encerradas.",
        },
      ]
    : tab === "materials"
      ? materialFields
      : tab === "printers"
        ? printerFields
        : tab === "settings"
          ? costFields
          : editing?.id
            ? [...userFields, active]
            : [
                ...userFields,
                {
                  key: "password",
                  label: "Senha inicial",
                  kind: "password" as const,
                  hint: "Mínimo de 12 caracteres.",
                },
              ];
  const endpoint = resetting
    ? `/api/users/${editing?.id}/password`
    : `/api/${tab}${editing?.id ? `/${editing.id}` : ""}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROLE DA PRODUÇÃO</div>
          <h1>Configurações</h1>
          <p>Uma base de custos consistente, para toda a equipe.</p>
        </div>
        <span className="admin-label">Acesso de administrador</span>
      </div>
      <Tabs value={tab} onValueChange={(value) => selectTab(value as Tab)}>
        <TabsList
          className="h-auto flex-wrap justify-start"
          aria-label="Configurações"
        >
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              <t.icon size={18} />
              {t.label}
              {t.key !== "settings" && <span>{data[t.key].length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          {notice && <Notice kind="success">{notice}</Notice>}
          {error && <Notice>{error}</Notice>}
          {editing ? (
            <RecordEditor
              key={`${tab}-${editing.id ?? "new"}-${resetting}-${reloadKey}`}
              title={
                resetting
                  ? "Redefinir senha"
                  : `${editing.id || tab === "settings" ? "Editar" : "Adicionar"} · ${title}`
              }
              endpoint={endpoint}
              fields={fields}
              initial={resetting ? { password: "" } : editing}
              onSaved={saved}
              onCancel={() => {
                setEditing(null);
                setResetting(false);
              }}
              onReload={reloadRecord}
              method={resetting ? "POST" : undefined}
            />
          ) : (
            <Card asChild>
              <section className="settings-list">
                <div className="section-heading">
                  <div>
                    <h2>{title}</h2>
                    <p className="section-description">
                      {tab === "materials"
                        ? "Preços de compra para filamentos e resinas."
                        : tab === "printers"
                          ? "Potência e amortização dos seus equipamentos."
                          : tab === "users"
                            ? "Acessos individuais. Um workspace compartilhado."
                            : "Parâmetros utilizados em todas as simulações."}
                    </p>
                  </div>
                  <div className="list-actions">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className=""
                      aria-label="Atualizar lista"
                      onClick={refresh}
                      disabled={busy}
                    >
                      <RefreshCw size={17} />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className=""
                      onClick={() => {
                        setEditing(
                          tab === "settings" && data.settings
                            ? { ...data.settings }
                            : defaults[tab],
                        );
                        setNotice("");
                      }}
                    >
                      <Plus size={16} />
                      {tab === "settings" ? "Configurar custos" : "Adicionar"}
                    </Button>
                  </div>
                </div>
                {tab === "settings" ? (
                  data.settings ? (
                    <div className="settings-values">
                      {costFields.map((f) => (
                        <div key={f.key}>
                          <span>{f.label}</span>
                          <strong>
                            {f.suffix === "%"
                              ? `${data.settings![f.key as keyof SettingsDTO]}%`
                              : formatBRL(
                                  String(
                                    data.settings![f.key as keyof SettingsDTO],
                                  ),
                                )}
                            {f.key === "energyRate" ? " / kWh" : ""}
                          </strong>
                          {f.hint && <small>{f.hint}</small>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <SlidersHorizontal size={32} />
                      <h3>Defina os custos da sua operação</h3>
                      <p>
                        Informe sua tarifa de energia e os percentuais de
                        produção para começar.
                      </p>
                    </div>
                  )
                ) : rows.length === 0 ? (
                  <div className="empty-state">
                    <Plus size={32} />
                    <h3>
                      {tab === "materials"
                        ? "Seu primeiro material começa aqui"
                        : tab === "printers"
                          ? "Adicione sua primeira impressora"
                          : "Convide sua equipe"}
                    </h3>
                    <p>Use o botão Adicionar para criar um cadastro.</p>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>
                            {tab === "users"
                              ? "Perfil / E-mail"
                              : tab === "materials"
                                ? "Tecnologia / Preço"
                                : "Tecnologia / Potência"}
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>
                            <span className="sr-only">Ações</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <strong>{row.name}</strong>
                            </TableCell>
                            <TableCell>
                              {"email" in row ? (
                                <>
                                  <span>
                                    {row.role === "ADMIN"
                                      ? "Administrador"
                                      : "Operador"}
                                  </span>
                                  <small>{row.email}</small>
                                </>
                              ) : "price" in row ? (
                                <>
                                  <span>
                                    {row.technology === "FDM"
                                      ? "Filamento"
                                      : "Resina"}
                                  </span>
                                  <small>
                                    {formatBRL(row.price)} /{" "}
                                    {row.technology === "FDM" ? "kg" : "litro"}
                                  </small>
                                </>
                              ) : (
                                <>
                                  <span>
                                    {row.technology === "FDM"
                                      ? "FDM"
                                      : "SLA / DLP"}
                                  </span>
                                  <small>{row.watts} W</small>
                                </>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {row.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="row-actions">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className=""
                                  aria-label={`Editar ${row.name}`}
                                  onClick={() => setEditing({ ...row })}
                                >
                                  <Pencil size={16} />
                                </Button>
                                {tab === "users" && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className=""
                                    aria-label={`Redefinir senha de ${row.name}`}
                                    onClick={() => {
                                      setEditing({ ...row });
                                      setResetting(true);
                                    }}
                                  >
                                    <KeyRound size={16} />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      <div className="settings-footnote">
        Alterações só são aplicadas depois de salvar. Simulações abertas
        precisam atualizar os parâmetros.
      </div>
    </>
  );
}
