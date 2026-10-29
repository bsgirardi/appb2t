"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { ComparisonPage, SavedComparison } from "@/domain/pricing/comparisons/types";
import { fetchComparisons, fetchComparison } from "@/lib/pricing-comparisons-client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ComparisonResults } from "./comparison-results";
type Selection = { comparison: SavedComparison; itemId: string };
export function ComparisonLibrary({ initial }: { initial: ComparisonPage }) {
  const [page, setPage] = useState(initial), [search, setSearch] = useState(""), [activeSearch, setActiveSearch] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [selected, setSelected] = useState<Selection[]>([]), [loaded, setLoaded] = useState<Record<string, SavedComparison>>({});
  const sequence = useRef(0), loading = useRef(new Set<string>());
  async function load(cursor?: string) {
    const requestId = ++sequence.current, term = cursor ? activeSearch : search;
    setBusy(true); setError("");
    try {
      const result = await fetchComparisons({ search: term, cursor });
      if (requestId !== sequence.current) return;
      setPage(p => ({ ...result, items: cursor ? [...p.items, ...result.items] : result.items }));
      setActiveSearch(term);
    } catch (e) { if (requestId === sequence.current) setError((e as Error).message); }
    finally { if (requestId === sequence.current) setBusy(false); }
  }
  async function inspect(id: string) {
    if (loading.current.has(id)) return;
    loading.current.add(id); setError("");
    try { const comparison = await fetchComparison(id); setLoaded(p => ({ ...p, [id]: comparison })); }
    catch (e) { setError((e as Error).message); }
    finally { loading.current.delete(id); }
  }
  function select(comparison: SavedComparison, itemId: string) {
    setSelected(items => {
      if (items.some(i => i.itemId === itemId)) return items.filter(i => i.itemId !== itemId);
      if (items.length >= 10) return items;
      return [...items, { comparison, itemId }];
    });
  }
  return <section className="flex min-w-0 flex-col gap-5">
    <h1>Comparações salvas</h1><p>Memórias imutáveis da equipe. Escolha até dez alternativas para consultar lado a lado.</p>
    <Link href="/calculadora">Voltar à calculadora</Link>
    <FieldGroup><Field label="Buscar pelo nome" value={search} maxLength={120} onChange={e => setSearch(e.target.value)} /><Button type="button" disabled={busy} onClick={() => load()}>Buscar</Button></FieldGroup>
    {error && <Notice>{error}</Notice>}
    {!page.items.length && <Empty><EmptyHeader><EmptyTitle>Nenhuma comparação encontrada.</EmptyTitle></EmptyHeader></Empty>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">{page.items.map(row => <Card key={row.id}>
      <CardHeader><CardTitle><Link href={`/calculadora/cenarios/${row.id}`}>{row.name}</Link></CardTitle><CardDescription>{row.actorName} · {new Date(row.createdAt).toLocaleString("pt-BR")} · {row.quantity} peças · {row.count} alternativas</CardDescription></CardHeader>
      <CardContent>{loaded[row.id]?.alternatives.map(item => {
        const chosen = selected.some(s => s.itemId === item.id);
        return <Button key={item.id} type="button" variant="outline" aria-pressed={chosen} disabled={!chosen && selected.length >= 10} onClick={() => select(loaded[row.id], item.id)}>{chosen ? "Retirar" : "Comparar"} {item.input.channel.name} · {item.discountPercent}%</Button>;
      })}</CardContent>
      <CardFooter><Button type="button" variant="outline" onClick={() => inspect(row.id)}>Ver alternativas de {row.name}</Button></CardFooter>
    </Card>)}</div>
    {page.nextCursor && <Button type="button" disabled={busy} onClick={() => load(page.nextCursor!)}>Carregar mais</Button>}
    {busy && <p role="status">Buscando comparações…</p>}
    {selected.length > 0 && <section className="flex min-w-0 flex-col gap-4" aria-label="Comparação histórica"><h2>{selected.length} de 10 alternativas selecionadas</h2><p>Quantidades e premissas podem ser diferentes; os resultados não são somados ou classificados automaticamente.</p><Button type="button" variant="outline" onClick={() => setSelected([])}>Limpar seleção</Button><div className="grid min-w-0 gap-4 xl:grid-cols-2">{selected.map((s, i) => <ComparisonResults key={s.itemId} value={s.comparison.alternatives.find(a => a.id === s.itemId)!} index={i} origin={s.comparison.name} />)}</div></section>}
  </section>;
}
