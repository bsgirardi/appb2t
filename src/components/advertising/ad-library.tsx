"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/client-api";
import type {
  AdChannel,
  AdLibraryPage,
  AdLibraryQuery,
  AdSourceSnapshot,
  AdDraftDTO,
} from "@/domain/advertising/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { AdProductPicker, type AdProductsPage } from "./ad-product-picker";
import { adChannels, adStatuses, adLibraryPath } from "./ad-client";
import { FilterPanel } from "@/components/admin/filter-panel";
export function AdLibrary({
  initial,
  query,
  initialProducts,
}: {
  initial: AdLibraryPage;
  query: AdLibraryQuery;
  initialProducts: AdProductsPage;
}) {
  const router = useRouter();
  const [product, setProduct] = useState<AdSourceSnapshot | null>(null),
    [channel, setChannel] = useState<AdChannel>("INSTAGRAM"),
    [internalName, setInternalName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef({ payload: "", key: "" });
  async function create() {
    if (!product || !internalName.trim()) {
      setError("Escolha um produto e informe a identificação interna.");
      return;
    }
    const fields = {
        productId: product.productId,
        channel,
        internalName: internalName.trim(),
      },
      payload = JSON.stringify(fields);
    if (request.current.payload !== payload)
      request.current = { payload, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const d = await api<AdDraftDTO>("/api/anuncios", {
        action: "CREATE",
        operationKey: request.current.key,
        ...fields,
      });
      router.push(`/anuncios/${d.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="commerce-page">
      <div className="page-heading">
        <div>
          <h1>Anúncios</h1>
          <p>
            Prepare e revise o material de Instagram e WhatsApp antes de
            publicar manualmente.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Biblioteca da equipe</CardTitle>
          <CardDescription>
            {initial.total} {initial.total === 1 ? "rascunho" : "rascunhos"} · A
            revisão e a exportação não publicam nas redes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <FilterPanel
            activeCount={
              [query.search, query.channel, query.status].filter(Boolean).length
            }
          >
            <form action="/anuncios" method="get" aria-label="Filtrar anúncios">
              <FieldGroup className="admin-filter-grid grid">
                <Field
                  label="Buscar rascunhos"
                  name="search"
                  maxLength={100}
                  defaultValue={query.search}
                />
                <div data-slot="field">
                  <Label htmlFor="ads-channel">Canal</Label>
                  <NativeSelect
                    id="ads-channel"
                    name="channel"
                    defaultValue={query.channel || ""}
                  >
                    <option value="">Todos os canais</option>
                    {Object.entries(adChannels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div data-slot="field">
                  <Label htmlFor="ads-status">Estado</Label>
                  <NativeSelect
                    id="ads-status"
                    name="status"
                    defaultValue={query.status || ""}
                  >
                    <option value="">Todos os estados</option>
                    {Object.entries(adStatuses).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <Button type="submit" variant="outline">
                  Filtrar
                </Button>
              </FieldGroup>
            </form>
          </FilterPanel>
          {initial.drafts.length ? (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Conferência</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initial.drafts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-normal break-words">
                      <p>{d.internalName}</p>
                      <p>{d.currentSource.name}</p>
                      <p>{adChannels[d.channel]}</p>
                      <p>
                        Atualizado em{" "}
                        {new Date(d.updatedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      <div className="flex flex-col items-start gap-2">
                        <Badge variant="outline">{adStatuses[d.status]}</Badge>
                        {d.productChanged && <span>Ficha alterada</span>}
                        {!!d.missingPhotoIds.length && (
                          <span>Fotos ausentes</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline">
                        <Link href={`/anuncios/${d.id}`}>Abrir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhum rascunho encontrado</EmptyTitle>
                <EmptyDescription>
                  Ajuste os filtros ou escolha um produto abaixo para criar seu
                  primeiro material.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
        <CardFooter>
          {initial.page > 1 && (
            <Button asChild variant="outline">
              <Link href={adLibraryPath(query, initial.page - 1)}>
                Página anterior
              </Link>
            </Button>
          )}
          <span>
            Página {initial.page} de {Math.max(initial.pages, 1)}
          </span>
          {initial.page < initial.pages && (
            <Button asChild variant="outline">
              <Link href={adLibraryPath(query, initial.page + 1)}>
                Próxima página
              </Link>
            </Button>
          )}
          {(query.search || query.channel || query.status) && (
            <Button asChild variant="outline">
              <Link href="/anuncios">Limpar filtros</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Criar rascunho</CardTitle>
          <CardDescription>
            Escolha um produto com fotos. O rascunho é independente da ficha e
            de outros materiais do mesmo produto.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          {error && <Notice>{error}</Notice>}
          <AdProductPicker
            initial={initialProducts}
            disabled={busy}
            onPick={(p) => {
              setProduct(p);
              if (!internalName) setInternalName(p.name);
            }}
          />
          {product && <p role="status">Produto selecionado: {product.name}</p>}
          <fieldset disabled={busy} className="flex flex-col gap-2">
            <legend>Canal do rascunho</legend>
            <ToggleGroup
              type="single"
              value={channel}
              variant="outline"
              disabled={busy}
              aria-label="Canal do rascunho"
              onValueChange={(value) => {
                if (value) setChannel(value as AdChannel);
              }}
            >
              <ToggleGroupItem
                value="INSTAGRAM"
                role="radio"
                aria-checked={channel === "INSTAGRAM"}
              >
                Instagram
              </ToggleGroupItem>
              <ToggleGroupItem
                value="WHATSAPP"
                role="radio"
                aria-checked={channel === "WHATSAPP"}
              >
                WhatsApp
              </ToggleGroupItem>
            </ToggleGroup>
          </fieldset>
          <FieldGroup>
            <Field
              label="Identificação do novo rascunho"
              maxLength={120}
              required
              value={internalName}
              disabled={busy}
              onChange={(e) => setInternalName(e.target.value)}
              hint="Nome usado pela equipe para localizar este material."
            />
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button disabled={busy || !product} onClick={() => void create()}>
            Criar rascunho
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
