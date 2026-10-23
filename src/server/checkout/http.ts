import { endpoint,ok } from "@/lib/http";
export function checkoutResponse(data:unknown) {const r=ok(data);privateHeaders(r);return r;}
export function privateHeaders(r:Response) {
 r.headers.set("Cache-Control","private, no-store");r.headers.set("Referrer-Policy","no-referrer");r.headers.set("X-Robots-Tag","noindex, nofollow");r.headers.set("X-Content-Type-Options","nosniff");
}
export async function checkoutEndpoint(fn:()=>Promise<Response>) {const r=await endpoint(fn);privateHeaders(r);return r;}
