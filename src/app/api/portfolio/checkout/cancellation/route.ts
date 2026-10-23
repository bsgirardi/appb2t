import {jsonBody} from "@/lib/http";
import {checkoutCancellationSchema} from "@/domain/checkout/validation";
import {checkoutEndpoint,checkoutResponse} from "@/server/checkout/http";
import {checkoutPrincipal} from "@/server/checkout/access";
import {requestCheckoutCancellation} from "@/server/checkout/cancellations";
export function POST(request:Request){return checkoutEndpoint(async()=>{const p=await checkoutPrincipal(request);const input=checkoutCancellationSchema.parse(await jsonBody(request));return checkoutResponse(await requestCheckoutCancellation(p,input.reason,input.operationKey));});}
