import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { appUrl } from './env';
const statuses={VALIDATION:422,UNAUTHENTICATED:401,FORBIDDEN:403,CONFLICT:409,RATE_LIMIT:429,NOT_FOUND:404};
export async function jsonBody(request:Request):Promise<unknown> {
  if(request.headers.get('origin')!==appUrl().origin)throw new AppError('FORBIDDEN','Origem da requisição inválida.');
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AppError('VALIDATION','Envie os dados em JSON.');
  if(Number(request.headers.get('content-length'))>16384)throw new AppError('VALIDATION','Requisição muito grande.');
  const reader=request.body?.getReader();let text='';let bytes=0;const decoder=new TextDecoder();
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16384){await reader.cancel();throw new AppError('VALIDATION','Requisição muito grande.');}text+=decoder.decode(value,{stream:true});}
  text+=decoder.decode();try{return JSON.parse(text);}catch{throw new AppError('VALIDATION','Dados inválidos.');}
}
export function ok<T>(data:T){return NextResponse.json({data},{headers:{'Cache-Control':'no-store'}});}
export async function endpoint(fn:()=>Promise<Response>):Promise<Response> {
  try{return await fn();}catch(e){
    if(e instanceof ZodError)return NextResponse.json({error:{code:'VALIDATION',message:'Verifique os campos informados.',fields:Object.fromEntries(e.issues.map(i=>[i.path.join('.'),i.message]))}},{status:422,headers:{'Cache-Control':'no-store'}});
    if(e instanceof AppError)return NextResponse.json({error:{code:e.code,message:e.message,fields:e.fields}},{status:statuses[e.code],headers:{'Cache-Control':'no-store'}});
    console.error('Operação indisponível:', e instanceof Error?e.name:'UnknownError');
    return NextResponse.json({error:{code:'INTERNAL',message:'Não foi possível concluir. Tente novamente.'}},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
