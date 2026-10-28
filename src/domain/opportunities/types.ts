import type { QuoteStatus, SaleStatus } from "@/domain/commerce/types";
export const openStages = ["CONTATO", "LEVANTAMENTO", "PROPOSTA", "NEGOCIACAO"] as const;
export type OpenStage = typeof openStages[number];
export type OpportunityStage = OpenStage | "GANHO" | "PERDIDO";
export const stageLabels: Record<OpportunityStage,string> = {CONTATO:"Contato",LEVANTAMENTO:"Levantamento",PROPOSTA:"Proposta",NEGOCIACAO:"Negociação",GANHO:"Ganho",PERDIDO:"Perdido"};
export interface OpportunityFields { title:string; customerId:string; ownerId:string; stage:OpenStage; nextAction:string; nextContactDate:string; pendingNotes:string }
export interface OpportunityQuote {id:string; number:string; version:number; status:QuoteStatus}
export interface OpportunityDTO {
 id:string; title:string; customerId:string; ownerId:string; stage:OpportunityStage; nextAction:string|null; nextContactDate:string|null; pendingNotes:string; lossReason:string|null; version:number;
 customer:{id:string;name:string;active:boolean}; owner:{id:string;name:string;active:boolean}; principalQuoteId:string|null; quotes:OpportunityQuote[]; wonSale:{id:string;number:string;status:SaleStatus}|null; createdAt:string;updatedAt:string;
}
export interface OpportunityEventDTO {id:string;type:string;authorKind:string;actorName:string;createdAt:string;data:Record<string,unknown>}
export interface OpportunityOptions {customers:{id:string;name:string;active:boolean}[];owners:{id:string;name:string;active:boolean}[]}
