import { expect,it } from "vitest";
import { assertCostPartition } from "@/domain/consignment/costs";
import { calculateSale } from "@/domain/profitability/calculate";
import { completeInput } from "../fixtures/profitability";
it("rejects cost buckets that omit custody units or count a returned unit twice",()=>{
 expect(()=>assertCostPartition(20,[12,8])).not.toThrow();
 expect(()=>assertCostPartition(20,[12])).toThrow();
 expect(()=>assertCostPartition(20,[14,8])).toThrow();
 expect(()=>assertCostPartition(20,[14,1,1,3,1])).not.toThrow();
});
it("uses frozen consignment commission once instead of additional administrative channel fees",()=>{
 const i=completeInput();
 Object.assign(i,{consignment:true});
 Object.assign(i.lines[0],{frozenCommission:"20.00"});
 i.administrative!.fees={state:"DECLARED",value:"30"};
 // E5 has no freight: revenue 200 minus source cost 85 and commission 20.
 expect(calculateSale(i).actual.fees.value).toBe("20");
 expect(calculateSale(i).actual.afterDepreciation.value).toBe("95");
});
