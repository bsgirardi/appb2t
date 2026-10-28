// @vitest-environment jsdom
import {act,renderHook,cleanup} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {useOpportunityCommand} from "@/components/opportunities/command";
afterEach(()=>{cleanup();vi.restoreAllMocks()});
it("scopes an ambiguous retry to the selected opportunity",async()=>{
 const calls:Record<string,unknown>[]=[];
 vi.spyOn(globalThis,"fetch").mockImplementation(async(_url,init)=>{calls.push(JSON.parse(String(init?.body)));throw new Error("offline")});
 const {result,rerender}=renderHook(({id})=>useOpportunityCommand(id),{initialProps:{id:"a"}});
 const payload={action:"LINK_QUOTE",quoteId:"quote",expectedVersion:1};
 await act(async()=>{await result.current.run(payload)});
 rerender({id:"b"});
 await act(async()=>{await result.current.run(payload)});
 expect(calls[0].operationKey).not.toBe(calls[1].operationKey);
});
