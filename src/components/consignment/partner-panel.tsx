"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  ConsignmentOptionsDTO,
  listPartners,
} from "@/server/consignment/queries";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Section } from "./shared";
import { PartnerForm } from "./partner-form";
export function PartnerPanel({
  initial,
  options,
  actorId,
  admin,
  query,
  pending,
  productId = "",
}: {
  initial: Awaited<ReturnType<typeof listPartners>>;
  options: ConsignmentOptionsDTO;
  actorId: string;
  admin: boolean;
  query: string;
  pending: string;
  productId?: string;
}) {
  const router = useRouter(),
    [creating, setCreating] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Pontos de venda</h1>
          <p>Peças em lojas parceiras, vendas e acertos de consignação.</p>
        </div>
        {admin && (
          <Button onClick={() => setCreating((v) => !v)}>
            {creating ? "Fechar cadastro" : "Cadastrar parceiro"}
          </Button>
        )}
      </header>
      {creating && admin && (
        <Section title="Novo parceiro">
          <PartnerForm
            options={options}
            actorId={actorId}
            onSaved={() => {
              setCreating(false);
              router.refresh();
            }}
          />
        </Section>
      )}
      <Section title="Consultar parceiros">
        <form action="/pontos-de-venda">
          <FieldGroup>
            <Field label="Nome do parceiro" name="query" defaultValue={query} />
            <div className="field">
              <Label htmlFor="partner-product">Produto</Label>
              <NativeSelect
                id="partner-product"
                name="productId"
                defaultValue={productId}
              >
                <option value="">Todos os produtos</option>
                {options.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="field">
              <Label htmlFor="partner-pending">Pendências</Label>
              <NativeSelect
                id="partner-pending"
                name="pending"
                defaultValue={pending}
              >
                <option value="all">Todos</option>
                <option value="replenishment">Precisam de reposição</option>
                <option value="transit">Com peças em trânsito</option>
              </NativeSelect>
            </div>
            <Button>Filtrar parceiros</Button>
          </FieldGroup>
        </form>
      </Section>
      <p>
        {initial.total} parceiros · Na loja: {initial.totals.partner} · Ida:{" "}
        {initial.totals.outbound} · Retorno: {initial.totals.inbound}
      </p>
      {initial.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parceiro</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Reposição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/pontos-de-venda/${p.id}`}>
                    {p.customer.name}
                  </Link>
                </TableCell>
                <TableCell>{p.location}</TableCell>
                <TableCell>
                  <Badge variant={p.active ? "secondary" : "outline"}>
                    {p.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.balances
                    .filter((b) => b.replenishment)
                    .map((b) => b.name)
                    .join(", ") || "Sem alerta"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhum parceiro encontrado</EmptyTitle>
            <EmptyDescription>
              Cadastre um parceiro ou ajuste os filtros.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <nav aria-label="Paginação de parceiros" className="flex flex-wrap gap-3">
        {initial.page > 1 && (
          <Link
            href={`?query=${encodeURIComponent(query)}&pending=${pending}&productId=${encodeURIComponent(productId)}&page=${initial.page - 1}`}
          >
            Página anterior
          </Link>
        )}
        {initial.page * initial.pageSize < initial.total && (
          <Link
            href={`?query=${encodeURIComponent(query)}&pending=${pending}&productId=${encodeURIComponent(productId)}&page=${initial.page + 1}`}
          >
            Próxima página
          </Link>
        )}
      </nav>
    </div>
  );
}
