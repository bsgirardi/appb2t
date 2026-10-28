import type { Prisma } from "@prisma/client";
export async function lockConsignment(tx:Prisma.TransactionClient,ids:{partnerId:string;shipmentIds?:string[];eventIds?:string[];statementIds?:string[];consignmentSaleIds?:string[]}){
 await tx.$queryRaw`SELECT id FROM "Partner" WHERE id=${ids.partnerId} FOR UPDATE`;
 for(const id of [...new Set(ids.shipmentIds??[])].sort())await tx.$queryRaw`SELECT id FROM "ConsignmentShipment" WHERE id=${id} FOR UPDATE`;
 for(const id of [...new Set(ids.eventIds??[])].sort())await tx.$queryRaw`SELECT id FROM "ConsignmentEvent" WHERE id=${id} FOR UPDATE`;
 for(const id of [...new Set(ids.statementIds??[])].sort())await tx.$queryRaw`SELECT id FROM "ConsignmentStatement" WHERE id=${id} FOR UPDATE`;
 for(const id of [...new Set(ids.consignmentSaleIds??[])].sort())await tx.$queryRaw`SELECT id FROM "ConsignmentSale" WHERE id=${id} FOR UPDATE`;
}
