import { z } from "zod";
import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import {
  consignmentBody,
  consignmentEndpoint,
} from "@/server/consignment/http";
import { executePartnerCommand } from "@/server/consignment/partners";
import { executeCustodyCommand } from "@/server/consignment/custody";
import { executeConsignmentSaleCommand } from "@/server/consignment/sales";
import { executeStatementCommand } from "@/server/consignment/statements";
const schema = z
  .object({
    area: z.enum(["partners", "shipments", "sales", "statements"]),
    payload: z.unknown(),
  })
  .strict();
const actions = {
  partners: executePartnerCommand,
  shipments: executeCustodyCommand,
  sales: executeConsignmentSaleCommand,
  statements: executeStatementCommand,
};
export async function POST(request: Request) {
  return consignmentEndpoint(async () => {
    const actor = await requireActor(),
      v = schema.parse(await consignmentBody(request));
    return ok(await actions[v.area](actor, v.payload));
  });
}
