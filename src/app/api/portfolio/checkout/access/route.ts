import { exchangeCheckoutAccess } from "@/server/checkout/access";
import { checkoutEndpoint } from "@/server/checkout/http";
export function POST(request: Request) {
  return checkoutEndpoint(async () => {
    return exchangeCheckoutAccess(request);
  });
}
