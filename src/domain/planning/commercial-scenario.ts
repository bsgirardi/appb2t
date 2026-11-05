import {AppError} from '@/lib/errors';
import Decimal from 'decimal.js';
import type {BatchDTO,PlanningInput} from './types';
import type {CommercialQuoteLine,CommercialScenario,CommercialSimulation,HypotheticalBatch} from './commercial-types';
import {commercialScenarioSchema} from './commercial-validation';
import {forecast} from './scheduler';
import {restrictCalendarFrom} from './scenario-calendar';
import {projectCompletion} from './completion';
export type CommercialOptions={printers:{id:string;technology:string;active:boolean}[];materials:{id:string;active:boolean;inventoried:boolean;available:string}[]};
function invalid(message:string):never {throw new AppError('VALIDATION',message);}
export function simulateCommercial(input:PlanningInput,lines:CommercialQuoteLine[],raw:CommercialScenario,options:CommercialOptions):CommercialSimulation{
 const s=commercialScenarioSchema.parse(raw),issues:string[]=[],warnings:string[]=[];
 if(s.lines.length!==lines.length||new Set(s.lines.map(l=>l.lineKey)).size!==lines.length||new Set(lines.map(l=>l.lineKey)).size!==lines.length)invalid('Inclua todas as linhas do orçamento uma única vez.');
 const h=s.lines.flatMap(l=>l.mode==='produce'?l.batches:[]);
 if(new Set(h.map(b=>b.id)).size!==h.length)invalid('Identificadores de lotes hipotéticos repetidos.');
 const now=Date.parse(input.asOf),horizon=now+90*86400000;
 const checkTime=(v:string)=>{if(Date.parse(v)>horizon)invalid('Disponibilidade deve estar dentro do horizonte de 90 dias.');};
 for(const l of s.lines){
  const source=lines.find(x=>x.lineKey===l.lineKey);
  if(!source||source.quantity!==l.quantity)invalid('Quantidade ou linha diverge do orçamento atual.');
  if(l.mode==='external'){checkTime(l.availableAt);continue;}
  if(l.batches.reduce((n,b)=>n+b.units,0)!==source.quantity)invalid('Distribua exatamente a quantidade do item entre os lotes.');
  for(const b of l.batches){
   if(b.lineKey!==l.lineKey)invalid('Lote pertence a outro item.');
   const p=options.printers.find(p=>p.id===b.printerId);
   if(!p?.active||!input.machines.some(m=>m.id===p.id)||!(source.technology??b.technology)||p.technology!==(source.technology??b.technology))invalid('Confira tecnologia e máquina ativa do item.');
   if(b.durationSource==='snapshot'&&(!source.suggestion||source.suggestion.printerId!==b.printerId||l.batches.length!==1||!new Decimal(source.suggestion.minutes).eq(b.durationMinutes)))invalid('Revise a duração dividida ou alterada como declaração manual.');
   checkTime(b.availableAt);
   const material=options.materials.find(m=>m.id===b.materialItemId);
   if(!material?.active||!material.inventoried)issues.push(`Item ${source.description}: material não inventariado ou inativo.`);
   else if(new Decimal(material.available).lte(0)&&Date.parse(b.availableAt)<=now)issues.push(`Item ${source.description}: material sem saldo disponível; declare chegada futura ou revise estoque.`);
  }
 }
 const before=forecast(input);
 const derived:PlanningInput={...input,machines:input.machines.map(m=>{
  const hypothetical=h.filter(b=>b.printerId===m.id);
  if(!hypothetical.length)return m;
  const from=Math.max(now,...hypothetical.map(b=>Date.parse(b.availableAt)));
  let calendar=m.calendar;
  if(from>now){
   warnings.push(`Máquina ${m.id}: restrição conservadora de toda a agenda até ${new Date(from).toISOString()}, por disponibilidade declarada. Impactos incluem trabalhos existentes.`);
   if(m.batches.some(b=>['PREPARING','PRINTING','AWAITING_REMOVAL'].includes(b.state)))issues.push(`Máquina ${m.id}: restrição futura interfere em lote ativo; atualize marcos ou reformule o cenário.`);
   if(calendar)calendar=restrictCalendarFrom(calendar,new Date(from).toISOString(),input.asOf);
  }
  const max=Math.max(0,...m.batches.map(b=>b.position));
  return {...m,calendar,batches:[...m.batches,...hypothetical.map((b,i)=>hypotheticalDTO(b,max+i+1,input.asOf))]};
 })};
 const after=forecast(derived);
 const outputLines=s.lines.map(l=>{
  if(l.mode==='external')return {lineKey:l.lineKey,removalAt:l.availableAt};
  const projections=l.batches.map(b=>after.batches.find(f=>f.batchId===hypId(b)));
  const complete=projections.every(p=>p?.removal&&!p.reason);
  if(!complete)issues.push(`Item ${l.lineKey}: sem janela ou dados produtivos suficientes para todos os lotes.`);
  return {lineKey:l.lineKey,removalAt:complete?projections.map(p=>p!.removal!.end).sort().at(-1)!:null};
 });
 const removalAt=!issues.length&&outputLines.every(l=>l.removalAt)?outputLines.map(l=>l.removalAt!).sort().at(-1)??null:null;
 return {before,after,lines:outputLines,removalAt,issues:[...new Set(issues)],warnings,completion:projectCompletion(removalAt,false,s.completion),impacts:before.batches.flatMap(b=>{const a=after.batches.find(a=>a.batchId===b.batchId)!;return JSON.stringify(a)===JSON.stringify(b)?[]:[{batchId:b.batchId,before:b,after:a}];})};
}
const hypId=(b:HypotheticalBatch)=>`hyp:${b.lineKey}:${b.id}`;
function hypotheticalDTO(b:HypotheticalBatch,position:number,asOf:string):BatchDTO{
 return {id:hypId(b),version:0,sequence:0,printerId:b.printerId,state:'SCHEDULED',position,estimates:[],materialItemId:b.materialItemId,colorLabel:b.colorLabel,colorKey:b.colorLabel.toLocaleLowerCase('pt-BR'),profileConfirmed:true,fitConfirmed:true,colorAvailabilityConfirmed:true,durationMinutes:b.durationMinutes,durationConfirmedAt:asOf,prepareMinutes:b.prepareMinutes,removeMinutes:b.removeMinutes,remainingMinutes:null,remainingAsOf:null,participants:[{id:hypId(b),lineId:b.lineKey,units:b.units,settledUnits:0,releasedUnits:0,needQuantity:'0',dueDate:null,responsibleId:null,description:'Hipótese comercial',orderSequence:0}],coverage:[],milestones:[],blockers:[]};
}
