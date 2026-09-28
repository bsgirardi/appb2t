import { describe, it, expect } from 'vitest';
import { calculate, formatBRL } from '@/domain/calculation/calculate';
import { parseDecimalInput } from '@/domain/calculation/validation';
export const fixture = {
  technology: 'FDM' as const, consumption: '100', hours: 2, minutes: 0, materialPrice: '100',
  printer: { acquisitionCost:'2400', amortizationMonths:12, daysPerMonth:25, hoursPerDay:'8', watts:'100' },
  settings: { energyRate:'1', maintenancePercent:'10', failurePercent:'10', finishingPercent:'10', fixation:'0.2', markupPercent:'200' },
};
describe('pricing', () => {
  it('preserves intermediate decimals and applies markup to full cost', () => {
    const r = calculate(fixture);
    expect(r).toMatchObject({material:'10', energy:'0.2', machine:'2', maintenance:'1.02', subtotal:'13.22', failure:'1.322', finishing:'1.322', total:'16.064', sale:'48.192'});
    expect(formatBRL(r.sale)).toContain('48,19');
  });
  it('uses ml per litre for resin', () => { expect(calculate({...fixture, technology:'RESIN'}).sale).toBe('48.192'); });
  it('supports zero overhead and markup', () => {
    expect(calculate({...fixture, settings:{energyRate:'0', maintenancePercent:'0', failurePercent:'0', finishingPercent:'0', fixation:'0', markupPercent:'0'}}).sale).toBe('12');
  });
  it.each(['', '-1', 'NaN', 'Infinity', '1000001'])('rejects consumption %s', (consumption) => expect(() => calculate({...fixture, consumption})).toThrow());
  it.each([{hours:0,minutes:0},{hours:1,minutes:60},{hours:-1,minutes:0}])('rejects invalid time %j', t => expect(() => calculate({...fixture,...t})).toThrow());
  it.each([{amortizationMonths:0},{daysPerMonth:32},{hoursPerDay:'25'}])('rejects invalid printer %j', p => expect(() => calculate({...fixture,printer:{...fixture.printer,...p}})).toThrow());
  it('rejects excessive risk percentage', () => expect(() => calculate({...fixture,settings:{...fixture.settings,failurePercent:'101'}})).toThrow());
});
describe('decimal entry', () => {
  it('accepts Brazilian decimal comma', () => expect(parseDecimalInput('1,25')).toBe('1.25'));
  it.each(['', ' ', 'Infinity', 'NaN', '1.234,56','1e9','-1'])('rejects %s', raw => expect(() => parseDecimalInput(raw)).toThrow());
});
