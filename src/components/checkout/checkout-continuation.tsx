"use client";
import {useEffect,useState,useRef} from "react";
import {Button} from "@/components/ui/button";
import {Field} from "@/components/ui/field";
import {Alert} from "@/components/ui/alert";
import {api} from "@/lib/client-api";
import type {CheckoutPublicDetail} from "@/domain/checkout/types";
import {newCheckoutKey,readCheckoutAttempt,saveCheckoutAttempt} from "@/domain/checkout/attempt";
import {CheckoutSummary} from "./checkout-summary";
export function CheckoutContinuation() {
 const [data,setData]=useState<CheckoutPublicDetail>(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [id,setId]=useState(""); const [name,setName]=useState(""); const [agreed,setAgreed]=useState(false); const [reason,setReason]=useState("");
 const acceptKey=useRef(""); const cancelKey=useRef("");
 const suffix=(value:string)=>value?`?checkoutId=${encodeURIComponent(value)}`:"";
 async function load(value=id){setBusy(true);setError("");try{setData(await api<CheckoutPublicDetail>(`/api/portfolio/checkout/detail${suffix(value)}`));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 useEffect(()=>{let active=true;(async()=>{try{
  let selected=new URL(window.location.href).searchParams.get("checkoutId")??"";
  const token=window.location.hash.slice(1);
  if(token){history.replaceState(null,"",window.location.pathname);const access=await api<{checkoutId:string}>("/api/portfolio/checkout/access",{token});selected=access.checkoutId;history.replaceState(null,"",`${window.location.pathname}?checkoutId=${encodeURIComponent(selected)}`);}
  const d=await api<CheckoutPublicDetail>(`/api/portfolio/checkout/detail${suffix(selected)}`);
  if(active){setId(selected);setData(d);const attempt=readCheckoutAttempt();acceptKey.current=attempt?.checkoutId===d.review.id?attempt.operationKey:newCheckoutKey();}
 }catch(e){if(active)setError((e as Error).message);}})();return()=>{active=false;};},[]);
 async function accept(){if(!data||!agreed)return;setBusy(true);setError("");try{
  if(!acceptKey.current)acceptKey.current=newCheckoutKey();
  const payload={operationKey:acceptKey.current,expectedVersion:data.review.version,fingerprint:data.review.fingerprint,name,agreed:true};
  saveCheckoutAttempt({checkoutId:data.review.id,operationKey:payload.operationKey,expectedVersion:payload.expectedVersion,fingerprint:payload.fingerprint});
  await api(`/api/portfolio/checkout/accept${suffix(id)}`,payload);await load();
 }catch(e){setError(`${(e as Error).message} Consulte o resultado antes de repetir.`);}finally{setBusy(false);}}
 async function cancel(){setBusy(true);try{if(!cancelKey.current)cancelKey.current=newCheckoutKey();setData(await api<CheckoutPublicDetail>(`/api/portfolio/checkout/cancellation${suffix(id)}`,{reason,operationKey:cancelKey.current}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const labels:Record<string,string>={REVIEW:"Em conferência pela equipe",OFFERED:"Total pronto para sua confirmação",CONFIRMED:"Compra confirmada · pagamento pendente de registro pela equipe",CLOSED:"Pedido encerrado",PENDING:"solicitado, aguardando a equipe",COMPLETED:"concluído pela equipe",DECLINED:"não concluído"};
 return <section className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8"><h1 className="text-3xl font-semibold">Seu pedido</h1>
 {error&&<Alert role="alert">{error} Se o acesso expirou, solicite um novo link à equipe.</Alert>}<Button variant="outline" disabled={busy} onClick={()=>void load()}>Consultar resultado</Button>
 {data&&<><p role="status">{data.receipt?.protocol} · {labels[data.receipt?.state??"REVIEW"]}</p><CheckoutSummary review={data.review}/>
 {data.receipt?.state==="OFFERED"&&<div className="flex flex-col gap-4"><Field id="checkout-signer" label="Nome de quem confirma a compra" value={name} maxLength={120} onChange={e=>setName(e.target.value)}/><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>Li e concordo com os itens, total, entrega e condições de pagamento.</label><Button disabled={busy||!agreed||name.trim().length<2} onClick={accept}>Confirmar compra pelo orçamento</Button></div>}
 {data.cancellation&&<Alert>Cancelamento: {labels[data.cancellation.state]}{data.cancellation.response&&` · ${data.cancellation.response}`}</Alert>}
 {data.receipt&&data.receipt.state!=="CLOSED"&&data.cancellation?.state!=="PENDING"&&<div className="flex flex-col gap-3"><Field id="checkout-cancel-reason" label="Motivo do pedido de cancelamento" value={reason} maxLength={2000} onChange={e=>{setReason(e.target.value);cancelKey.current="";}}/><small>A equipe vai conferir pagamento e produção antes de concluir. Esta solicitação não executa devolução financeira.</small><Button variant="outline" disabled={busy||reason.trim().length<3} onClick={cancel}>Solicitar cancelamento</Button></div>}
 </>}
 </section>;
}
