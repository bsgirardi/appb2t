"use client";
import { useState } from "react";
import type { ConsignmentReportDTO } from "@/server/consignment/reports";
import { api } from "@/lib/client-api";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Section, money } from "./shared";
import { todaySaoPaulo } from "@/domain/commerce/dates";
export function ResultPanel({
  partnerId,
  products = [],
}: {
  partnerId: string;
  products?: { productId: string; name: string }[];
}) {
  const today = todaySaoPaulo(new Date());
  const [report, setReport] = useState<ConsignmentReportDTO | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [productId, setProductId] = useState(""),
    [period, setPeriod] = useState({
      from: today.slice(0, 7) + "-01",
      to: today,
    });
  async function load(page = 1) {
    setBusy(true);
    setError("");
    try {
      setReport(
        await api(
          `/api/consignment/report?partnerId=${encodeURIComponent(partnerId)}&from=${period.from}&to=${period.to}&page=${page}${productId ? "&productId=" + encodeURIComponent(productId) : ""}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section
      title="Resultado por produto"
      description="Período pela data efetiva. Receita, contribuição e resultado após depreciação são distintos do caixa recebido."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <FieldGroup>
          <div className="field">
            <Label htmlFor="result-product">Produto do resultado</Label>
            <NativeSelect
              id="result-product"
              disabled={busy}
              value={productId}
              onChange={(e) => {setProductId(e.target.value);setReport(null);}}
            >
              <option value="">Todos os produtos</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Field
            label="Resultado desde"
            type="date"
            required
            value={period.from}
            disabled={busy}
            onChange={(e) => {
              setReport(null);
              setPeriod((p) => ({ ...p, from: e.target.value }));
            }}
          />
          <Field
            label="Resultado até"
            type="date"
            required
            value={period.to}
            disabled={busy}
            onChange={(e) => {
              setReport(null);
              setPeriod((p) => ({ ...p, to: e.target.value }));
            }}
          />
          <Button disabled={busy}>
            {busy ? "Consultando…" : "Consultar resultado"}
          </Button>
        </FieldGroup>
      </form>
      {error && <Notice>{error}</Notice>}
      {report && (
        <>
          <p>
            Bruto: {money(report.totals.gross)} · Comissão:{" "}
            {money(report.totals.commission)} · Repasse recebido:{" "}
            {money(report.totals.received)}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Produto",
                  "Vendidas / perdidas",
                  "Bruto",
                  "Comissão",
                  "Custo de peças / perdas",
                  "Contribuição",
                  "Após depreciação",
                  "Cobertura",
                ].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.items.map((r) => (
                <TableRow key={r.productId}>
                  <TableCell>{r.productName}</TableCell>
                  <TableCell>
                    {r.units} / {r.lostUnits}
                  </TableCell>
                  <TableCell>{money(r.gross)}</TableCell>
                  <TableCell>{money(r.commission)}</TableCell>
                  <TableCell>
                    {money(r.cost)} / {money(r.lossCost)}
                  </TableCell>
                  <TableCell>{money(r.contribution)}</TableCell>
                  <TableCell>{money(r.afterDepreciation)}</TableCell>
                  <TableCell>
                    {r.coverage === "COMPLETE"
                      ? "Completa"
                      : r.coverage === "PROVISIONAL"
                        ? "Provisória"
                        : "Parcial / faltam dados"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!report.total && <p>Nenhuma venda ou perda no período.</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy || report.page <= 1}
              onClick={() => void load(report.page - 1)}
            >
              Página anterior
            </Button>
            <span>
              {report.page} · {report.total} produtos
            </span>
            <Button
              variant="outline"
              disabled={busy || report.page * report.pageSize >= report.total}
              onClick={() => void load(report.page + 1)}
            >
              Próxima página
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}
