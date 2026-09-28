import { z } from 'zod';
import { endpoint,jsonBody,ok } from '@/lib/http';
import { requireAdmin } from '@/server/auth/guards';
import { resetPassword } from '@/server/users';
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return endpoint(async()=>{const a=await requireAdmin();const {password}=z.object({password:z.string()}).strict().parse(await jsonBody(request));await resetPassword(a,(await context.params).id,password);return ok(true);});}
