import { z } from 'zod';
import { endpoint,jsonBody,ok } from '@/lib/http';
import { requireActor } from '@/server/auth/guards';
import { changeOwnPassword } from '@/server/users';
export async function POST(request:Request){return endpoint(async()=>{const a=await requireActor();const v=z.object({current:z.string().max(128),next:z.string()}).strict().parse(await jsonBody(request));await changeOwnPassword(a,v.current,v.next);return ok(true);});}
