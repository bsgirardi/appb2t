import type { BatchDTO, Forecast } from './types';
import { demandIssue, type DemandFacts, type DemandProjection } from './commercial-types';
export function projectSaleDemand(facts:DemandFacts,batches:BatchDTO[],forecast:Forecast):DemandProjection {
 const issues=[...facts.issues];
 const issue=(code:string,message:string,nextAction='Revisar demanda e vínculos no detalhe da venda')=>demandIssue(code,facts.saleId,message,nextAction);
 if(facts.mode!=='U3') issues.push(issue('LEGACY','Venda sem cobertura rastreável do fluxo produtivo atual.'));
 if(['CANCELADA','RASCUNHO'].includes(facts.status)) issues.push(issue('SALE_STATE','Venda ainda não confirmada ou cancelada.'));
 const lines=facts.lines.map(l=>{
  const local=[...l.issues]; let planned=0;let timed=true;const ends:string[]=[];
  if(l.uncommittedGoodUnits>0)local.push(issue('UNASSIGNED_GOOD',`${l.uncommittedGoodUnits} peças boas sem destinação comercial comprovada.`,'Conferir origem e comprometer peças no detalhe da produção'));
  for(const prod of l.production){
   let claimed=0;
   for(const b of batches){
    if(['DRAFT','CANCELED'].includes(b.state))continue;
    for(const p of b.participants.filter(p=>p.lineId===prod.lineId)){
     const n=p.units-p.settledUnits-p.releasedUnits;
     if(n<0){local.push(issue('CLAIM_INVALID','Saldo de participação inválido.'));continue;}
     if(!n)continue;
     if(b.state==='CLOSED'){local.push(issue('RECONCILE','Lote retirado com saldo não conciliado.','Conciliar apontamentos e sobras no detalhe do lote'));continue;}
     claimed+=n;
     const f=forecast.batches.find(f=>f.batchId===b.id);
     if(!f?.removal||f.reason||b.blockers.length){timed=false;local.push(issue('BATCH_UNAVAILABLE',`Lote ${b.sequence} sem retirada confiável.`,'Resolver bloqueios no planejamento'));}
     else ends.push(f.removal.end);
    }
   }
   if(claimed>prod.remaining)local.push(issue('EXCESS_CLAIM','Participações excedem o saldo produtivo da linha.'));
   planned+=claimed;
  }
  const uncovered=l.soldUnits-l.deliveredUnits-l.committedUnits-planned;
  if(!l.lineKey||[l.soldUnits,l.deliveredUnits,l.committedUnits,...l.production.map(p=>p.remaining)].some(x=>!Number.isSafeInteger(x)||x<0)||uncovered<0)
   local.push(issue('INCONSISTENT','Quantidades ou vínculos comerciais inconsistentes.'));
  if(uncovered>0)local.push(issue('UNCOVERED',`${uncovered} unidades sem cobertura produtiva ou pronta comprometida.`,'Criar/liberar OP e planejar o saldo, ou comprometer peças disponíveis'));
  return {lineKey:l.lineKey,description:l.description,delivered:l.deliveredUnits,readyCommitted:l.committedUnits,planned,uncovered,removalAt:uncovered===0&&timed&&!local.length&&ends.length?ends.sort().at(-1)!:null,issues:local};
 });
 const completeCoverage=lines.length>0&&!issues.length&&lines.every(l=>l.uncovered===0&&!l.issues.length);
 const ends=lines.flatMap(l=>l.removalAt?[l.removalAt]:[]).sort();
 return {lines,completeCoverage,removalAt:completeCoverage?ends.at(-1)??null:null,allDelivered:completeCoverage&&facts.lines.every(l=>l.deliveredUnits===l.soldUnits),issues};
}
