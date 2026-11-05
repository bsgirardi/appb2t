"use client";
import Link from 'next/link';
import type {PlanningIssue} from '@/domain/planning/issues';
import {Button} from '@/components/ui/button';
import {Alert} from '@/components/ui/alert';
export function PlanningIssues({issues,onOpenTarget}:{issues:PlanningIssue[];onOpenTarget?:(target:{kind:string;id:string})=>void}){
 if(!issues.length)return null;
 return <ul className="flex min-w-0 flex-col gap-3">{issues.map((issue,i)=>{
  const t=issue.target;
  const href=t?.kind==='sale'?`/vendas/${encodeURIComponent(t.id)}`:t?.kind==='order'?'/producao':t?.kind==='calendar'?'/planejamento':t?.kind==='material'?'/estoque':t?.kind==='printer'?'/configuracoes':null;
  return <li key={`${issue.code}:${issue.entity.id}:${i}`}><Alert><p>{issue.message}</p><p>{issue.resolution}</p>{t&&onOpenTarget&&['batch','batch-edit','calendar'].includes(t.kind)?<Button type="button" variant="outline" onClick={()=>onOpenTarget(t)}>{issue.nextAction}</Button>:href?<Link href={href}>{issue.nextAction}</Link>:<p>{issue.nextAction}</p>}</Alert></li>;
 })}</ul>;
}
