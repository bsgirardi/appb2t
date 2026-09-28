import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
export type Actor={id:string;name:string;email:string;role:'ADMIN'|'OPERATOR'};
export const SESSION_COOKIE='b2t_session';
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function getSession(token:string):Promise<Actor|null> {
  if(!/^[a-f0-9]{64}$/.test(token)) return null;
  const s=await db.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});
  if(!s||s.expiresAt<=new Date()||!s.user.active) return null;
  const {id,name,email,role}=s.user; return {id,name,email,role};
}
export async function logout(token:string):Promise<void> {await db.session.deleteMany({where:{tokenHash:tokenHash(token)}});}
