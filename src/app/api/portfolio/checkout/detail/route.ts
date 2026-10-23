import {getCheckoutDetail} from "@/server/checkout/queries"; import {checkoutPrincipal} from "@/server/checkout/access";
import {checkoutEndpoint,checkoutResponse} from "@/server/checkout/http";
export function GET(request:Request) {return checkoutEndpoint(async()=>{ return checkoutResponse(await getCheckoutDetail(await checkoutPrincipal(request)));});}
