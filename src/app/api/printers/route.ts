import { db } from '@/lib/db';
import { endpoint,jsonBody,ok } from '@/lib/http';
import { requireAdmin } from '@/server/auth/guards';
import { savePrinter,printerDTO } from '@/server/catalog-inputs';
export async function GET(){return endpoint(async()=>{await requireAdmin();return ok((await db.printer.findMany({orderBy:{name:'asc'}})).map(printerDTO));});}
export async function POST(request:Request){return endpoint(async()=>{const actor=await requireAdmin();return ok(await savePrinter(actor,await jsonBody(request)));});}
