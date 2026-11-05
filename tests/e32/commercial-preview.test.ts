import {it,expect} from 'vitest';
import {setupDatabase,fixture,snapshot} from './setup';
import {db} from '@/lib/db';
import {previewCommercial} from '@/server/planning/commercial-preview';
import {getCommercialContext} from '@/server/planning/commercial-read';
setupDatabase();
const payload=(f:Awaited<ReturnType<typeof fixture>>)=>({quoteId:f.q.id,quoteVersion:1,opportunityVersion:1,scenario:{lines:[{lineKey:'x',quantity:2,mode:'external',availableAt:new Date(Date.now()+3600000).toISOString(),reason:'Fornecedor confirmado como hipótese'}],completion:{post:{mode:'unknown'},delivery:{mode:'unknown'}}}});
it('calculates a dated hypothetical supply without reserving or creating anything',async()=>{
 const f=await fixture(),before=await snapshot();const r=await previewCommercial(f.actor,f.o.id,payload(f));
 expect(r.result.removalAt).not.toBeNull();expect(r.result.completion.deliveryAt).toBeNull();expect(Date.parse(r.expiresAt)-Date.parse(r.asOf)).toBe(60000);expect(await snapshot()).toEqual(before);
});
it('refuses stale quote versions, changed principals and won negotiations',async()=>{
 const f=await fixture(),p=payload(f);
 await db.quote.update({where:{id:f.q.id},data:{version:2}});
 await expect(previewCommercial(f.actor,f.o.id,p)).rejects.toMatchObject({code:'CONFLICT'});
 await db.opportunity.update({where:{id:f.o.id},data:{principalQuoteId:null}});
 await expect(previewCommercial(f.actor,f.o.id,p)).rejects.toMatchObject({code:'CONFLICT'});
 await db.opportunity.update({where:{id:f.o.id},data:{principalQuoteId:f.q.id,stage:'GANHO'}});
 await expect(previewCommercial(f.actor,f.o.id,{...p,quoteVersion:2})).rejects.toMatchObject({code:'CONFLICT'});
});
it('redirects to actual sale and refuses duplicating a quote once linked',async()=>{
 const f=await fixture();const sale=await db.sale.create({data:{customerId:f.customer.id,quoteId:f.q.id,document:{},totals:{}}});
 expect((await getCommercialContext(f.actor,f.o.id)).saleId).toBe(sale.id);
 await expect(previewCommercial(f.actor,f.o.id,payload(f))).rejects.toMatchObject({code:'CONFLICT'});
});
