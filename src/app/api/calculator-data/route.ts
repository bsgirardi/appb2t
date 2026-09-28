import { endpoint,ok } from '@/lib/http';
import { requireActor } from '@/server/auth/guards';
import { getCalculatorData } from '@/server/catalog-inputs';
export async function GET(){return endpoint(async()=>ok(await getCalculatorData(await requireActor())));}
