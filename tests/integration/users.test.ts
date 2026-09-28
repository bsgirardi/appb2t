import { it, expect } from 'vitest';
import { setupDatabase, seedUser, password } from './setup';
import { createUser, updateUser, resetPassword, changeOwnPassword } from '@/server/users';
import { login } from '@/server/auth/service';
import { getSession } from '@/server/auth/session';
import { db } from '@/lib/db';
setupDatabase();
it('denies operators all administrative writes', async () => {
  const op = await seedUser('OPERATOR');
  await expect(createUser(op,{name:'Novo',email:'n@example.test',role:'ADMIN',password})).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(updateUser(op,op.id,{name:op.name,email:op.email,role:'ADMIN',active:true,expectedVersion:1})).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(resetPassword(op,op.id,password)).rejects.toMatchObject({code:'FORBIDDEN'});
});
it('prevents removing the last administrator', async () => {
  const a = await seedUser();
  await expect(updateUser(a,a.id,{name:a.name,email:a.email,role:'OPERATOR',active:true,expectedVersion:1})).rejects.toMatchObject({code:'VALIDATION'});
  await expect(updateUser(a,a.id,{name:a.name,email:a.email,role:'ADMIN',active:false,expectedVersion:1})).rejects.toMatchObject({code:'VALIDATION'});
});
it('preserves one admin during simultaneous demotions', async () => {
  const a = await seedUser(); const b = await seedUser('ADMIN','second@example.test');
  const results = await Promise.allSettled([a,b].map(u => updateUser(u,u.id,{name:u.name,email:u.email,role:'OPERATOR',active:true,expectedVersion:1})));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  expect(await db.user.count({where:{role:'ADMIN',active:true}})).toBe(1);
});
it('normalizes duplicate email and rejects weak passwords', async () => {
  const a=await seedUser();
  await expect(createUser(a,{name:'Dup',email:' ADMIN@EXAMPLE.TEST ',role:'OPERATOR',password})).rejects.toMatchObject({code:'CONFLICT'});
  await expect(createUser(a,{name:'Novo',email:'n@example.test',role:'OPERATOR',password:'short'})).rejects.toThrow();
});
it('revokes all sessions on reset, own password change and deactivation', async () => {
  const a=await seedUser(); const op=await seedUser('OPERATOR','op@example.test');
  const s=await login(op.email,password); await resetPassword(a,op.id,'Nova-senha-123456');
  expect(await getSession(s.token)).toBeNull();
  const s2=await login(op.email,'Nova-senha-123456'); await changeOwnPassword(op,'Nova-senha-123456',password);
  expect(await getSession(s2.token)).toBeNull();
  const s3=await login(op.email,password); const fresh=await db.user.findUniqueOrThrow({where:{id:op.id}});
  await updateUser(a,op.id,{name:op.name,email:op.email,role:'OPERATOR',active:false,expectedVersion:fresh.version});
  expect(await getSession(s3.token)).toBeNull();
});
