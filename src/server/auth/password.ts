import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { AppError } from '@/lib/errors';
function derive(password:string,salt:string):Promise<Buffer> {return new Promise((resolve,reject)=>scrypt(password,salt,64,{N:16384,r:8,p:1},(e,key)=>e?reject(e):resolve(key)));}
export function validatePassword(password:string) {
  if(typeof password!=='string'||password.length<12||password.length>128) throw new AppError('VALIDATION','A senha deve ter entre 12 e 128 caracteres.');
}
export async function hashPassword(password:string):Promise<string> {
  validatePassword(password); const salt=randomBytes(16).toString('hex'); return `scrypt:${salt}:${(await derive(password,salt)).toString('hex')}`;
}
export async function verifyPassword(password:string,hash:string):Promise<boolean> {
  if(typeof password!=='string'||password.length>128) return false;
  const [algorithm,salt,value]=hash.split(':'); if(algorithm!=='scrypt'||!salt||!value) return false;
  const actual=await derive(password,salt), expected=Buffer.from(value,'hex');
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
