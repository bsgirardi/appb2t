import { z } from "zod";
import { ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { productionBody, productionEndpoint } from "@/server/production/http";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import {
  saveFinishedStock,
  openFinishedStock,
  adjustFinishedStock,
} from "@/server/production/finished-stock";
import {
  reserveOrderMaterial,
  allocateSaleReservation,
  releaseOrderReservation,
} from "@/server/production/reservations";
import { recordProduction } from "@/server/production/reports";
import { linkExistingConsumption } from "@/server/production/material-links";
import { correctProduction } from "@/server/production/corrections";
import {
  reserveFinished,
  releaseFinished,
} from "@/server/production/fulfillment";
import {
  recordDelivery,
  correctDelivery,
} from "@/server/production/deliveries";
import {
  completeOrder,
  cancelOrderRemainder,
} from "@/server/production/lifecycle";
import { adoptSaleProduction } from "@/server/production/legacy";
const actions = {
  ORDER_SAVE: saveOrder,
  ORDER_RELEASE: releaseOrder,
  FINISHED_SAVE: saveFinishedStock,
  FINISHED_OPEN: openFinishedStock,
  FINISHED_ADJUST: adjustFinishedStock,
  MATERIAL_RESERVE: reserveOrderMaterial,
  MATERIAL_ALLOCATE: allocateSaleReservation,
  MATERIAL_RELEASE: releaseOrderReservation,
  REPORT: recordProduction,
  LINK_CONSUMPTION: linkExistingConsumption,
  CORRECT_PRODUCTION: correctProduction,
  RESERVE_FINISHED: reserveFinished,
  RELEASE_FINISHED: releaseFinished,
  DELIVER: recordDelivery,
  CORRECT_DELIVERY: correctDelivery,
  COMPLETE: completeOrder,
  CANCEL_REMAINDER: cancelOrderRemainder,
  ADOPT: adoptSaleProduction,
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
  return productionEndpoint(async () => {
    const actor = await requireActor();
    const v = schema.parse(await productionBody(request));
    return ok(await actions[v.action](actor, v.payload));
  });
}
