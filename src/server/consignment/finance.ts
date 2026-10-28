import type { Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/session";
import type { CommercialTotals } from "@/domain/consignment/types";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { civilDateToDb,todaySaoPaulo } from "@/domain/commerce/dates";
import { consignmentDueDate } from "@/domain/consignment/commercial";
import { AppError } from "@/lib/errors";
export async function assertStandardSaleFlow(tx:Prisma.TransactionClient,saleId:string){
 const sale=await tx.sale.findUnique({where:{id:saleId},select:{fulfillmentMode:true}});
 if(sale?.fulfillmentMode==="CONSIGNMENT")throw new AppError("CONFLICT","Use Pontos de venda para alterar esta venda de consignação.");
}
export async function assertStandaloneEntry(tx:Prisma.TransactionClient,entryId:string){
 if(await tx.consignmentFinancialLink.findUnique({where:{entryId}}))throw new AppError("CONFLICT","Altere esta obrigação pelo fluxo de consignação de origem.");
}
export async function readConsignmentReceiptSummary(tx:Prisma.TransactionClient,saleId:string){
 const sale=await tx.consignmentSale.findUnique({where:{saleId},include:{financialLinks:{include:{entry:{include:{settlements:{include:{movement:{include:{reversedBy:true}}}}}}}}}});
 if(!sale)return null;
 const totals=sale.totals as CommercialTotals|null;
 let received=new D(0),paid=new D(0),overdue=new D(0);
 const today=todaySaoPaulo(new Date());
 const links=sale.financialLinks.map(l=>{
  const settled=l.entry.settlements.filter(s=>s.movement&&!s.movement.reversedBy).reduce((n,s)=>n.plus(s.amount.toFixed()),new D(0));
  const remaining=l.entry.canceledAt?new D(0):new D(l.entry.amount.toFixed()).minus(settled);
  if(l.role==="REPASSE"){received=received.plus(settled);if(l.entry.dueDate.toISOString().slice(0,10)<today)overdue=overdue.plus(remaining);}
  else paid=paid.plus(settled);
  return {id:l.entryId,role:l.role,version:l.entry.version,amount:l.entry.amount.toFixed(2),settled:settled.toFixed(2),remaining:remaining.toFixed(2),canceled:!!l.entry.canceledAt,dueDate:l.entry.dueDate.toISOString().slice(0,10)};
 });
 const active=sale.status==="CONFIRMED";
 const expected=new D(active?totals?.receivable??0:0), payable=new D(active?totals?.payable??0:0);
 return {gross:totals?.gross??"0.00",commission:active?totals?.commission??"0.00":"0.00",expectedRepayment:expected.toFixed(2),receivedRepayment:received.toFixed(2),pendingRepayment:expected.minus(received).toFixed(2),commissionPayable:payable.toFixed(2),commissionPaid:paid.toFixed(2),pendingCommission:payable.minus(paid).toFixed(2),overdue:overdue.toFixed(2),links};
}
export type ConsignmentReceiptSummary=NonNullable<Awaited<ReturnType<typeof readConsignmentReceiptSummary>>>;
export async function createConsignmentObligations(tx:Prisma.TransactionClient,actor:Actor,saleId:string){
 const sale=await tx.consignmentSale.findUniqueOrThrow({where:{saleId},include:{partner:{include:{customer:true}}}});
 const totals=sale.totals as CommercialTotals;
 for(const spec of [{role:"REPASSE",kind:"RECEIVABLE" as const,amount:totals.receivable,code:"CONSIGNMENT_REPAYMENT",name:"Repasses de consignação"},{role:"COMISSAO",kind:"PAYABLE" as const,amount:totals.payable,code:"CONSIGNMENT_COMMISSION",name:"Comissões de consignação"}]){
  if(new D(spec.amount).isZero())continue;
  const category=await tx.financialCategory.upsert({where:{systemCode:spec.code},create:{name:spec.name,kind:spec.kind==="RECEIVABLE"?"REVENUE":"EXPENSE",systemCode:spec.code},update:{}});
  const entry=await tx.financialEntry.create({data:{kind:spec.kind,amount:spec.amount,dueDate:civilDateToDb(consignmentDueDate(sale.effectiveDate.toISOString().slice(0,10),sale.dueDay)),description:`Consignação ${sale.reference} · ${spec.role==="REPASSE"?"Repasse":"Comissão"}`,counterparty:sale.partner.customer.name,customerId:sale.partner.customerId,categoryId:category.id}});
  await tx.consignmentFinancialLink.create({data:{consignmentSaleId:sale.id,entryId:entry.id,role:spec.role}});
  await tx.financialAuditEvent.create({data:{entityType:"ENTRY",entityId:entry.id,action:"CONSIGNMENT_CREATE",actorId:actor.id,actorName:actor.name,changes:{consignmentSaleId:sale.id,role:spec.role,amount:spec.amount}}});
 }
}
