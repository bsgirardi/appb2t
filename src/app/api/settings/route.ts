import { db } from '@/lib/db';
import { endpoint,jsonBody,ok } from '@/lib/http';
import { requireAdmin } from '@/server/auth/guards';
import { saveSettings,settingsDTO } from '@/server/settings';
export async function GET(){return endpoint(async()=>{await requireAdmin();const s=await db.calculationSettings.findUnique({where:{id:1}});return ok(s?settingsDTO(s):null);});}
export async function POST(request:Request){return endpoint(async()=>{const a=await requireAdmin();return ok(await saveSettings(a,await jsonBody(request)));});}
