import {jsonBody} from "@/lib/http"; import {checkoutDecisionSchema} from "@/domain/checkout/validation"; import {confirmCheckout} from "@/server/checkout/confirm"; import {checkoutPrincipal} from "@/server/checkout/access";
import {checkoutEndpoint,checkoutResponse} from "@/server/checkout/http";
export function POST(request:Request) {return checkoutEndpoint(async()=>{ return checkoutResponse(await confirmCheckout(await checkoutPrincipal(request), checkoutDecisionSchema.parse(await jsonBody(request))));});}
