import { requireActor } from '@/server/auth/guards';
import { db } from '@/lib/db';
import { printerDTO } from '@/server/catalog-inputs';
import { settingsDTO } from '@/server/settings';
import { userSelect } from '@/server/users';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { AppError } from '@/lib/errors';
import { redirect } from 'next/navigation';
export default async function SettingsPage(){
  const actor=await requireActor().catch(e=>{if(e instanceof AppError&&e.code==='UNAUTHENTICATED')redirect('/login');throw e;});
  if(actor.role!=='ADMIN')return null;
  const [materials,printers,settings,users]=await Promise.all([db.material.findMany({orderBy:{name:'asc'}}),db.printer.findMany({orderBy:{name:'asc'}}),db.calculationSettings.findUnique({where:{id:1}}),db.user.findMany({select:userSelect,orderBy:{name:'asc'}})]);
  return <SettingsPanel initialData={{materials:materials.map(m=>({...m,price:m.price.toString()})),printers:printers.map(printerDTO),settings:settings?settingsDTO(settings):null,users}}/>;
}
