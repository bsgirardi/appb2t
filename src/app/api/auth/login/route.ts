import { z } from 'zod';
import { endpoint,jsonBody,ok } from '@/lib/http';
import { appUrl } from '@/lib/env';
import { login } from '@/server/auth/service';
import { SESSION_COOKIE } from '@/server/auth/session';
export async function POST(request:Request){return endpoint(async()=>{
  const {email,password}=z.object({email:z.string().trim().email().max(254),password:z.string().min(1).max(128)}).strict().parse(await jsonBody(request));
  const result=await login(email,password);const response=ok(result.actor);
  response.cookies.set(SESSION_COOKIE,result.token,{httpOnly:true,secure:appUrl().protocol==='https:',sameSite:'lax',path:'/',maxAge:604800});return response;
});}
