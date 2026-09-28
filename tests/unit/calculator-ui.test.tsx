// @vitest-environment jsdom
import { it,expect,afterEach,vi } from 'vitest';
import { render,screen,fireEvent,cleanup,waitFor } from '@testing-library/react';
import { CalculatorForm } from '@/components/calculator/calculator-form';
import type { CalculatorData } from '@/domain/calculation/types';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
export const data:CalculatorData={materials:[{id:'m',name:'PLA',technology:'FDM',price:'100',active:true,version:1}],printers:[{id:'p',name:'Impressora',technology:'FDM',active:true,version:1,acquisitionCost:'2400',amortizationMonths:12,daysPerMonth:25,hoursPerDay:'8',watts:'100'}],settings:{version:1,energyRate:'1',maintenancePercent:'10',failurePercent:'10',finishingPercent:'10',fixation:'0.2',markupPercent:'200'},loadedAt:'2026-09-28T12:00:00Z'};
function fill(){fireEvent.change(screen.getByLabelText('Material'),{target:{value:'m'}});fireEvent.change(screen.getByLabelText('Impressora'),{target:{value:'p'}});fireEvent.change(screen.getByLabelText('Consumo de material'),{target:{value:'100'}});fireEvent.change(screen.getByLabelText('Horas'),{target:{value:'2'}});}
it('requires inputs before showing price and calculates approved example',()=>{
  render(<CalculatorForm data={data} role="ADMIN"/>);expect(screen.queryByText('R$ 48,19')).toBeNull();fill();expect(screen.getByText('R$ 48,19')).toBeTruthy();
});
it('clears an incompatible selection on technology change',()=>{
  render(<CalculatorForm data={data} role="ADMIN"/>);fill();fireEvent.click(screen.getByRole('button',{name:/Resina/}));expect(screen.queryByText('R$ 48,19')).toBeNull();
});
it('removes price when refresh deactivates current material',async()=>{
  vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({data:{...data,materials:[]}}),{status:200}));
  render(<CalculatorForm data={data} role="ADMIN"/>);fill();fireEvent.click(screen.getByRole('button',{name:/Atualizar parâmetros/}));
  await waitFor(()=>expect(screen.queryByText('R$ 48,19')).toBeNull());
});
it('keeps previous simulation with notice after network failure',async()=>{
  vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('offline'));render(<CalculatorForm data={data} role="OPERATOR"/>);fill();fireEvent.click(screen.getByRole('button',{name:/Atualizar parâmetros/}));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toMatch(/anteriores/));expect(screen.getByText('R$ 48,19')).toBeTruthy();
});
