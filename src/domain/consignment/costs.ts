import { AppError } from "@/lib/errors";
import { units } from "@/domain/production/quantities";
export function assertCostPartition(total:number,buckets:number[]):void {
 units(total);
 for(const value of buckets)units(value);
 if(buckets.reduce((n,v)=>n+v,0)!==total)throw new AppError("CONFLICT","As alocações de custo não conservam as unidades da origem.");
}
