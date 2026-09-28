import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { verifyPassword } from './password';
import { tokenHash, type Actor } from './session';
const dummyHash=`scrypt:00000000000000000000000000000000:${'0'.repeat(128)}`;
export async function login(email:string,password:string):Promise<{token:string;actor:Actor}> {
  const normalized=email.trim().toLowerCase(), key=tokenHash(normalized);
  return db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const now=new Date(); let attempt=await tx.loginAttempt.findUnique({where:{key}});
    if(!attempt||now.getTime()-attempt.windowStart.getTime()>=900000) attempt=await tx.loginAttempt.upsert({where:{key},create:{key,attempts:0,windowStart:now},update:{attempts:0,windowStart:now}});
    if(attempt.attempts>=5) return {error:new AppError('RATE_LIMIT','Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.')} as const;
    const user=await tx.user.findUnique({where:{email:normalized}});
    const valid=await verifyPassword(password,user?.passwordHash??dummyHash);
    if(!user||!user.active||!valid) {
      await tx.loginAttempt.update({where:{key},data:{attempts:{increment:1}}});
      return {error:new AppError('UNAUTHENTICATED','E-mail ou senha inválidos.')} as const;
    }
    // Serialize with password resets/deactivation so a login cannot survive revocation.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    const fresh=await tx.user.findUniqueOrThrow({where:{id:user.id}});
    if(!fresh.active||fresh.passwordHash!==user.passwordHash) return {error:new AppError('UNAUTHENTICATED','E-mail ou senha inválidos.')} as const;
    await tx.loginAttempt.deleteMany({where:{key}});
    await tx.loginAttempt.deleteMany({where:{windowStart:{lt:new Date(now.getTime()-86400000)}}});
    await tx.session.deleteMany({where:{expiresAt:{lt:now}}});
    const token=randomBytes(32).toString('hex');
    await tx.session.create({data:{tokenHash:tokenHash(token),userId:user.id,expiresAt:new Date(now.getTime()+7*86400000)}});
    const {id,name,role}=fresh; return {token,actor:{id,name,email:normalized,role}};
  },{timeout:15000}).then(result=>{if('error' in result) throw result.error; return result;});
}
