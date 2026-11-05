import {z} from 'zod';
import {db} from '@/lib/db';
import {AppError} from '@/lib/errors';
import type {Actor} from '@/server/auth/session';
import {commercialScenarioSchema} from '@/domain/planning/commercial-validation';
import {simulateCommercial} from '@/domain/planning/commercial-scenario';
import {loadPlanningSource} from './forecast-input';
import {loadCommercialContext,envelope} from './commercial-read';
import {balance} from '@/server/stock/movements';
const requestSchema=z.object({quoteId:z.string().min(1),quoteVersion:z.number().int().positive(),opportunityVersion:z.number().int().positive(),scenario:commercialScenarioSchema}).strict();
export async function previewCommercial(actor:Actor,id:string,raw:unknown){
 const v=requestSchema.parse(raw);
 return db.$transaction(async tx=>{
  const asOf=new Date().toISOString(),ctx=await loadCommercialContext(tx,actor,id,asOf);
  if(ctx.saleId||!['CONTATO','LEVANTAMENTO','PROPOSTA','NEGOCIACAO'].includes(ctx.stage))throw new AppError('CONFLICT','Negociação encerrada ou venda vinculada. Atualize e consulte a demanda real.');
  if(ctx.quoteId!==v.quoteId||ctx.quoteVersion!==v.quoteVersion||ctx.opportunityVersion!==v.opportunityVersion)throw new AppError('CONFLICT','Orçamento principal ou negociação alterados. Atualize antes de simular.');
  const source=await loadPlanningSource(tx,actor,asOf);
  const rows=await tx.stockItem.findMany({select:{id:true,active:true,inventoriedAt:true}});
  const materials=await Promise.all(rows.map(async m=>({id:m.id,active:m.active,inventoried:!!m.inventoriedAt,available:(await balance(tx,m.id)).available})));
  const result=simulateCommercial(source.input,ctx.lines,v.scenario,{printers:source.printers,materials});
  return envelope(asOf,source.input.revision,'quote',v.quoteId,v.quoteVersion,{ctx,input:source.input,materials,scenario:v.scenario},result);
 },{isolationLevel:'RepeatableRead',timeout:20000});
}
