import { db } from '@/lib/db';
import { endpoint,jsonBody,ok } from '@/lib/http';
import { requireAdmin } from '@/server/auth/guards';
import { saveMaterial } from '@/server/catalog-inputs';
export async function GET(){return endpoint(async()=>{await requireAdmin();return ok((await db.material.findMany({orderBy:{name:'asc'}})).map(m=>({...m,price:m.price.toString()})));});}
export async function POST(request:Request){return endpoint(async()=>{const actor=await requireAdmin();return ok(await saveMaterial(actor,await jsonBody(request)));});}
