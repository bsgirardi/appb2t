import Decimal from 'decimal.js';
import { z } from 'zod';
import type { CalculationInput } from './types';
export function parseDecimalInput(raw:string):string {
  const value=raw.trim().replace(',', '.');
  if(!/^\d+(\.\d{1,6})?$/.test(value) || new Decimal(value).gt('999999999999.999999')) throw new Error('Informe um número válido, com até 6 casas decimais.');
  return new Decimal(value).toFixed();
}
export const decimalSchema=z.string().transform((v,ctx)=>{
  try { return parseDecimalInput(v); } catch { ctx.addIssue({code:'custom',message:'Informe um número não negativo, com até 6 casas decimais.'}); return z.NEVER; }
});
const percentage=decimalSchema.refine(v=>new Decimal(v).lte(100),'Use um percentual de 0 a 100.');
export const printerValuesSchema=z.object({
  acquisitionCost:decimalSchema, amortizationMonths:z.number().int().min(1).max(1200), daysPerMonth:z.number().int().min(1).max(31),
  hoursPerDay:decimalSchema.refine(v=>new Decimal(v).gt(0)&&new Decimal(v).lte(24),'Use mais de 0 e até 24 horas.'), watts:decimalSchema,
});
export const settingsValuesSchema=z.object({energyRate:decimalSchema,maintenancePercent:percentage,failurePercent:percentage,finishingPercent:percentage,fixation:decimalSchema,markupPercent:decimalSchema});
export const calculationSchema=z.object({
  technology:z.enum(['FDM','RESIN']),consumption:decimalSchema.refine(v=>new Decimal(v).gt(0)&&new Decimal(v).lte(1000000),'Informe um consumo positivo até 1.000.000.'),
  hours:z.number().int().min(0).max(100000), minutes:z.number().int().min(0).max(59), materialPrice:decimalSchema,
  printer:printerValuesSchema,settings:settingsValuesSchema,
}).refine(v=>v.hours>0||v.minutes>0,{message:'Informe um tempo maior que zero.',path:['hours']});
export function validateCalculation(input:unknown):CalculationInput { return calculationSchema.parse(input); }
