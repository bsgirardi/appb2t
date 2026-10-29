import { AppError } from "@/lib/errors";
let active=0;
export async function withAdExportSlot<T>(fn:()=>Promise<T>):Promise<T> {
  if(active>=2) throw new AppError("RATE_LIMIT","Há dois materiais em preparação. Tente novamente em instantes.");
  active++;
  try{return await fn();}finally{active--;}
}
