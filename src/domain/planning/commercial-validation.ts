import {z} from 'zod';
import Decimal from 'decimal.js';
export const instant=z.string().datetime({offset:true});
const reason=z.string().trim().min(3).max(1000);
const minutes=z.string().max(30).refine(v=>{try{const d=new Decimal(v);return d.isFinite()&&d.gte(0)&&d.lte(129600);}catch{return false;}},'Duração inválida (máximo 90 dias).');
export const completionSchema=z.object({post:z.discriminatedUnion('mode',[
 z.object({mode:z.literal('unknown')}).strict(),z.object({mode:z.literal('waived'),reason}).strict(),z.object({mode:z.literal('declared'),at:instant,reason}).strict(),
]),delivery:z.discriminatedUnion('mode',[
 z.object({mode:z.literal('unknown')}).strict(),z.object({mode:z.literal('pickup'),at:instant,reason}).strict(),z.object({mode:z.literal('shipping'),at:instant,reason,source:reason}).strict(),
])}).strict();
const key=z.string().min(1).max(200);
export const hypotheticalBatchSchema=z.object({id:key,lineKey:key,printerId:key,technology:z.enum(['FDM','RESIN']).optional(),units:z.number().int().min(1).max(1000000),durationMinutes:minutes.refine(v=>new Decimal(v).gt(0),'Informe duração positiva.'),prepareMinutes:minutes,removeMinutes:minutes,materialItemId:key,colorLabel:z.string().trim().min(1).max(100),availableAt:instant,availabilityReason:reason,durationSource:z.enum(['snapshot','manual']),reviewed:z.literal(true),profileAssumed:z.literal(true),fitAssumed:z.literal(true)}).strict();
export const commercialScenarioSchema=z.object({lines:z.array(z.discriminatedUnion('mode',[
 z.object({lineKey:key,quantity:z.number().int().min(1).max(1000000),mode:z.literal('produce'),batches:z.array(hypotheticalBatchSchema).min(1).max(200)}).strict(),
 z.object({lineKey:key,quantity:z.number().int().min(1).max(1000000),mode:z.literal('external'),availableAt:instant,reason}).strict(),
])).min(1).max(100),completion:completionSchema}).strict().refine(s=>s.lines.reduce((n,l)=>n+(l.mode==='produce'?l.batches.length:0),0)<=200,'Máximo de 200 lotes hipotéticos.');
