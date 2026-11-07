import {useState} from "react";
import {createRoot} from "react-dom/client";
import {CommercialSettingsPanel} from "@/components/settings/commercial-settings-panel";
import {OpportunityDetail} from "@/components/opportunities/detail";
import {Button} from "@/components/ui/button";
import {opportunity,opportunityOptions} from "./fixtures/opportunity";
import type {OpportunityEventDTO,OpportunityDTO} from "@/domain/opportunities/types";
import "@/app/design.css";
// In-memory preview only: never sends requests to application APIs or any database.
let current:OpportunityDTO={...opportunity,stage:"PROPOSTA",principalQuoteId:"q-demo",quotes:[{id:"q-demo",number:"ORC-000042",status:"ENVIADO",version:3}]};
let settings={replyWaitDays:14,version:0};
const events:OpportunityEventDTO[]=[];
window.fetch=async(url,init)=>{
 const path=String(url);
 if(path==="/api/commercial-settings") {const body=JSON.parse(String(init?.body));settings={replyWaitDays:body.replyWaitDays,version:settings.version+1};return Response.json({data:settings});}
 if(path.endsWith("/commands")){const body=JSON.parse(String(init?.body));current={...current,version:current.version+1};events.unshift({id:String(current.version),type:body.action,authorKind:"OPERATOR",actorName:"Equipe fictícia",createdAt:new Date().toISOString(),data:{text:body.text,quoteId:body.quoteId,quoteVersion:body.quoteVersion}});return Response.json({data:current});}
 if(path.includes("/events"))return Response.json({data:{items:events,total:events.length,page:1,pageSize:20}});
 return Response.json({error:{code:"NOT_FOUND",message:"Fora do recorte desta prévia sintética"}},{status:404});
};
function Preview(){const [view,setView]=useState("settings");return <main className="admin-ui mx-auto flex min-w-0 max-w-5xl flex-col gap-4 p-4"><h1>Envio e resposta · prévia fictícia</h1><p>Dados em memória; nenhuma mensagem ou operação real.</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setView("settings")}>Prazo administrativo</Button><Button variant="outline" onClick={()=>setView("opportunity")}>Negociação de teste</Button><Button variant="outline" onClick={()=>document.documentElement.dataset.theme=document.documentElement.dataset.theme==="light"?"dark":"light"}>Alternar tema</Button></div>{view==="settings"?<CommercialSettingsPanel initial={settings}/>:<OpportunityDetail initial={current} initialEvents={{items:events,total:events.length,page:1,pageSize:20}} options={opportunityOptions}/>}</main>;}
createRoot(document.getElementById("root")!).render(<Preview/>);
