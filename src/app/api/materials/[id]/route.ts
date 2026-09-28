import { endpoint,jsonBody,ok } from '@/lib/http';
import { requireAdmin } from '@/server/auth/guards';
import { saveMaterial } from '@/server/catalog-inputs';
import { z } from 'zod';
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){return endpoint(async()=>{const actor=await requireAdmin();const input=z.record(z.string(),z.unknown()).parse(await jsonBody(request));return ok(await saveMaterial(actor,{...input,id:(await context.params).id}));});}
