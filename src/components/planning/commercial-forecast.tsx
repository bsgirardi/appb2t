"use client";
import {useState,useRef,useEffect} from 'react';
import Link from 'next/link';
import {api} from '@/lib/client-api';
import type {CommercialContext,getSaleForecast} from '@/server/planning/commercial-read';
import type {CommercialEnvelope,CommercialSimulation,CompletionAssumptions} from '@/domain/planning/commercial-types';
import {unknownCompletion} from '@/domain/planning/commercial-types';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardDescription,CardContent} from '@/components/ui/card';
import {Notice} from '@/components/ui/field';
import {CommercialScenarioForm} from './commercial-scenario-form';
import {useCommercialQuery} from './commercial-query';
import {CommercialResult,DemandResult,CompletionResult} from './commercial-result';
import {CompletionForm} from './completion-form';
import {planningLabel} from './commercial-time';
export function CommercialForecast(props:{opportunityId:string;principalQuote:{id:string;version:number}|null;wonSale:{id:string}|null;opportunityVersion?:number}){
 return <CommercialForecastBody key={`${props.opportunityId}:${props.opportunityVersion}:${props.principalQuote?.id}:${props.principalQuote?.version}:${props.wonSale?.id}`} {...props}/>;
}
function CommercialForecastBody({opportunityId,principalQuote,wonSale}:{opportunityId:string;principalQuote:{id:string;version:number}|null;wonSale:{id:string}|null}){
 const [context,setContext]=useState<CommercialContext|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const request=useRef(0),query=useCommercialQuery<CommercialEnvelope<CommercialSimulation>>();
 useEffect(()=>()=>{request.current++;},[]);
 async function load(){
  const id=++request.current;setLoading(true);setError('');setContext(null);query.invalidate();
  try{const c=await api<CommercialContext>(`/api/opportunities/${opportunityId}/planning-preview`);if(id===request.current)setContext(c);}
  catch(e){if(id===request.current)setError((e as Error).message);}finally{if(id===request.current)setLoading(false);}
 }
 const saleId=wonSale?.id??context?.saleId;
 return <Card className="no-print print:hidden min-w-0"><CardHeader><CardTitle>Previsão para a negociação</CardTitle><CardDescription>Cenário temporário sobre a fila inteira, sem reserva nem promessa automática.</CardDescription></CardHeader><CardContent className="flex min-w-0 flex-col gap-4">
 {saleId?<Link href={`/vendas/${saleId}`}>Consultar previsão da venda vinculada</Link>:!principalQuote?<p>Defina um orçamento principal para simular a produção.</p>:<>
 <Button type="button" variant="outline" disabled={loading} onClick={()=>void load()}>{loading?'Consultando…':context?'Atualizar orçamento e descartar cenário':'Preparar simulação do orçamento principal'}</Button>
 {context&&!context.saleId&&context.quoteId&&<><p>Orçamento versão {context.quoteVersion}. Dados consultados em {planningLabel(context.asOf)}. Atualize após editar o documento.</p>{context.warnings.map(w=><p key={w}>{w}</p>)}<CommercialScenarioForm key={`${context.quoteId}:${context.quoteVersion}:${context.asOf}`} context={context} busy={query.busy} onChange={query.invalidate} onSubmit={scenario=>void query.run(()=>api(`/api/opportunities/${opportunityId}/planning-preview`,{quoteId:context.quoteId,quoteVersion:context.quoteVersion,opportunityVersion:context.opportunityVersion,scenario}))}/></>}
 </>}
 {(error||query.error)&&<Notice>{error||query.error}</Notice>}
 <div aria-live="polite" aria-busy={query.busy}>{query.result?<CommercialResult value={query.result}/>:context&&<p>Sem resultado vigente. Revise as premissas e recalcule; resultados expiram após 60 segundos ou ao retornar à tela.</p>}</div>
 <Link href="/planejamento">Abrir planejamento</Link>
 </CardContent></Card>;
}
export function SalePlanningForecast(props:{saleId:string;saleVersion:number}){return <SaleForecastBody key={`${props.saleId}:${props.saleVersion}`} {...props}/>;}
function SaleForecastBody({saleId}:{saleId:string}){
 const [completion,setCompletion]=useState<CompletionAssumptions>(unknownCompletion),q=useCommercialQuery<Awaited<ReturnType<typeof getSaleForecast>>>();
 return <Card className="no-print print:hidden min-w-0"><CardHeader><CardTitle>Previsão produtiva do pedido</CardTitle><CardDescription>Cobertura por item, peças prontas comprometidas e saldo ainda sem planejamento.</CardDescription></CardHeader><CardContent className="flex min-w-0 flex-col gap-4"><CompletionForm value={completion} onChange={v=>{setCompletion(v);q.invalidate();}}/><Button type="button" variant="outline" disabled={q.busy} onClick={()=>void q.run(()=>api(`/api/sales/${saleId}/planning-forecast`,{completion}))}>{q.busy?'Consultando…':'Consultar previsão do pedido'}</Button>{q.error&&<Notice>{q.error}</Notice>}<div aria-live="polite" aria-busy={q.busy}>{q.result?<><p>Referência: {planningLabel(q.result.asOf)} · revisão {q.result.revision} · venda versão {q.result.source.version}.</p><p>Entrega combinada registrada: {q.result.result.agreedDate??'Não informada'}.</p><DemandResult value={q.result.result.demand}/><CompletionResult value={q.result.result.completion}/></>:<p>Sem resultado vigente. Consulte para atualizar a cobertura e as datas.</p>}</div><p>Previsão condicionada às peças boas e às premissas declaradas; não altera a entrega combinada.</p><Link href="/planejamento">Abrir planejamento</Link></CardContent></Card>;
}
