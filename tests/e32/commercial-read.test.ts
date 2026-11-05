import {it,expect} from 'vitest';
import {setupDatabase,fixture,snapshot} from './setup';
import {db} from '@/lib/db';
import {getCommercialContext,getSaleForecast} from '@/server/planning/commercial-read';
setupDatabase();
it('reads current principal and manual fallback without any database mutation',async()=>{
 const f=await fixture(),before=await snapshot();
 const ctx=await getCommercialContext(f.actor,f.o.id);
 expect(ctx.lines[0]).toMatchObject({lineKey:'x',quantity:2,suggestion:null});
 expect(await snapshot()).toEqual(before);
});
it.each(['ADMIN','OPERATOR'] as const)('enforces live user authorization for %s',async role=>{
 const f=await fixture();await db.user.update({where:{id:f.actor.id},data:{role}});
 const actor={...f.actor,role};expect((await getCommercialContext(actor,f.o.id)).quoteId).toBe(f.q.id);
 await db.user.update({where:{id:f.actor.id},data:{active:false}});
 await expect(getCommercialContext(actor,f.o.id)).rejects.toMatchObject({code:'FORBIDDEN'});
});
it('shows uncovered sales demand and agreed date without updating sale status',async()=>{
 const f=await fixture();const sale=await db.sale.create({data:{customerId:f.customer.id,status:'CONFIRMADA',fulfillmentMode:'U3',document:{},totals:{},expectedDeliveryDate:new Date('2026-11-10'),items:{create:{lineKey:'x',position:0,description:'Peça',quantity:2,unitPrice:'10'}}}});
 const before=await snapshot(),r=await getSaleForecast(f.actor,sale.id,{});
 expect(r.result.demand.lines[0].uncovered).toBe(2);expect(r.result.completion.deliveryAt).toBeNull();expect(r.result.agreedDate).toBe('2026-11-10');
 expect(await snapshot()).toEqual(before);
});
