"use client";
import {useEffect,useRef,useState,useCallback} from 'react';
export function useCommercialQuery<T extends {expiresAt:string}>(){
 const [result,setResult]=useState<T|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(0);
 const invalidate=useCallback(()=>{request.current++;setResult(null);setBusy(false);},[]);
 const run=async(load:()=>Promise<T>)=>{
  const id=++request.current;setBusy(true);setError('');setResult(null);
  try{const r=await load();if(id===request.current&&Date.parse(r.expiresAt)>Date.now())setResult(r);}
  catch(e){if(id===request.current)setError((e as Error).message);}
  finally{if(id===request.current)setBusy(false);}
 };
 useEffect(()=>{
  const focus=()=>invalidate();const visibility=()=>{if(document.visibilityState==='visible')invalidate();};
  const token=request;
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
  return ()=>{token.current++;window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);};
 },[invalidate]);
 useEffect(()=>{if(!result)return;const timer=setTimeout(invalidate,Math.max(0,Date.parse(result.expiresAt)-Date.now()));return()=>clearTimeout(timer);},[result,invalidate]);
 return {result,busy,error,run,invalidate};
}
