import { AppError } from '@/lib/errors';
import {completionSchema} from './commercial-validation';
import type {CompletionAssumptions,CompletionProjection} from './commercial-types';
export function projectCompletion(removalAt:string|null,productionReady:boolean,raw:CompletionAssumptions,asOf?:string):CompletionProjection{
 const a=completionSchema.parse(raw),issues:string[]=[];
 const lower=removalAt??(productionReady?asOf??null:null);
 let releaseAt:string|null=null,deliveryAt:string|null=null;
 if(!lower)issues.push('Sem cobertura produtiva completa para estimar liberação.');
 if(a.post.mode==='unknown')issues.push('Informe liberação após acabamento, inspeção e embalagem, ou dispensa justificada.');
 else if(lower){
  releaseAt=a.post.mode==='waived'?lower:a.post.at;
  if(Date.parse(releaseAt)<Date.parse(lower))throw new AppError('VALIDATION','Liberação não pode anteceder a retirada produtiva.');
 }
 if(a.delivery.mode==='unknown')issues.push('Informe previsão de atendimento na retirada ou chegada do transporte.');
 else if(releaseAt){
  if(Date.parse(a.delivery.at)<Date.parse(releaseAt))throw new AppError('VALIDATION','Entrega não pode anteceder a liberação.');
  deliveryAt=a.delivery.at;
 }
 return {removalAt,releaseAt,deliveryAt,issues};
}
