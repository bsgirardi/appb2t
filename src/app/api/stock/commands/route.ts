import { z } from "zod";
import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { stockEndpoint, stockBody } from "@/server/stock/http";
import {
  saveStockItem,
  saveStockIdentity,
  openInventory,
} from "@/server/stock/catalog";
import { recordMovement } from "@/server/stock/movements";
import {
  reserveStock,
  consumeStock,
  releaseReservation,
} from "@/server/stock/reservations";
import { receivePurchase } from "@/server/stock/receipts";
import { confirmReceiptFinance } from "@/server/stock/purchase-finance";
import {
  correctStock,
  cancelReceipt,
  resolveReturnFinance,
} from "@/server/stock/corrections";
import { applyStockReference } from "@/server/stock/pricing-reference";
const actions = {
  ITEM: saveStockItem,
  IDENTITY: saveStockIdentity,
  OPENING: openInventory,
  MOVEMENT: recordMovement,
  RESERVE: reserveStock,
  CONSUME: consumeStock,
  RELEASE: releaseReservation,
  RECEIVE: receivePurchase,
  CONFIRM_RECEIPT: confirmReceiptFinance,
  CORRECTION: correctStock,
  CANCEL_RECEIPT: cancelReceipt,
  RETURN_FINANCE: resolveReturnFinance,
  APPLY_REFERENCE: applyStockReference,
};
const schema = z
  .object({
    action: z.enum(
      Object.keys(actions) as [
        keyof typeof actions,
        ...(keyof typeof actions)[],
      ],
    ),
    payload: z.unknown(),
  })
  .strict();
export async function POST(request: Request) {
  return stockEndpoint(async () => {
    const actor = await requireActor();
    const v = schema.parse(await stockBody(request));
    return ok(await actions[v.action](actor, v.payload));
  });
}
