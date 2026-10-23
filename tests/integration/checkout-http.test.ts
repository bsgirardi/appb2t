import { expect,it } from "vitest";
import {setupDatabase} from "./setup";
import {checkoutFixture} from "../fixtures/checkout";
import {POST as session} from "@/app/api/portfolio/checkout/session/route";
import {POST as review} from "@/app/api/portfolio/checkout/review/route";
import {POST as confirm} from "@/app/api/portfolio/checkout/confirm/route";
import {GET as detail} from "@/app/api/portfolio/checkout/detail/route";
setupDatabase();
function post(path:string,body:unknown,cookie="",origin="http://localhost:3000") {return new Request(`http://localhost:3000/api/portfolio/checkout/${path}`,{method:"POST",headers:{origin,"content-type":"application/json",cookie},body:JSON.stringify(body)});}
it("establishes a scoped cookie before confirmation and recovers a lost confirmation without leaking internal data",async()=>{
 const {draft}=await checkoutFixture();
 const start=await session(post("session",{}));const cookie=start.headers.get("set-cookie")!.split(";")[0];
 const r=await review(post("review",{draft,operationKey:"a".repeat(64)},cookie));
 expect(r.status).toBe(200);expect(r.headers.get("set-cookie")).toContain("b2t_checkout_");
 const {data:v}=await r.json();
 const response=await confirm(post("confirm",{operationKey:"b".repeat(64),expectedVersion:v.version,fingerprint:v.fingerprint,name:"Ana",agreed:true},cookie));
 expect(response.status).toBe(200);
 const recovered=await detail(new Request("http://localhost:3000/api/portfolio/checkout/detail",{headers:{cookie}}));
 expect(recovered.headers.get("referrer-policy")).toBe("no-referrer");expect(recovered.headers.get("cache-control")).toContain("no-store");
 const text=await recovered.text();expect(text).toContain("CONFIRMED");expect(text).not.toContain("internalNotes");expect(text).not.toContain("customerId");
 expect((await detail(new Request("http://localhost:3000/api/portfolio/checkout/detail?protocol=PED-000001"))).status).toBe(403);
 expect((await session(post("session",{},"","https://evil.test"))).status).toBe(403);
});
