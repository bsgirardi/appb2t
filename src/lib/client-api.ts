export class ApiError extends Error {constructor(message:string,public code:string,public fields?:Record<string,string>){super(message);}}
export async function api<T>(url:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T> {
  let response:Response;
  try{response=await fetch(url,{method,cache:'no-store',...(body!==undefined?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});}
  catch{throw new ApiError('Não foi possível conectar. Verifique sua conexão e tente novamente.','NETWORK');}
  const result=await response.json();
  if(!response.ok)throw new ApiError(result.error?.message||'Não foi possível concluir.',result.error?.code||'INTERNAL',result.error?.fields);
  return result.data;
}
