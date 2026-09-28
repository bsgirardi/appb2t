import type { Actor } from './session';
import { AppError } from '@/lib/errors';
export function assertAdmin(actor:Actor) {if(actor.role!=='ADMIN') throw new AppError('FORBIDDEN','Apenas administradores podem realizar esta ação.');}
