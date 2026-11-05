import { describe,it,expect } from 'vitest';
import { projectSaleDemand } from '@/domain/planning/demand';
import { scenarioInput } from '../fixtures/planning-scenario';
import { forecast } from '@/domain/planning/scheduler';
const facts = () => ({saleId:'s',mode:'U3',status:'CONFIRMADA',lines:[{lineKey:'x',description:'Peça',soldUnits:10,deliveredUnits:2,committedUnits:3,uncommittedGoodUnits:0,issues:[],production:[{lineId:'line-a',remaining:5}]}],issues:[]});
describe('sale demand projection',()=>{
 it('does not conceal uncovered demand behind last batch removal',()=>{
  const input=scenarioInput(); input.machines[0].batches[0].participants[0].units=4;
  const r=projectSaleDemand(facts(),input.machines.flatMap(m=>m.batches),forecast(input));
  expect(r.lines[0]).toMatchObject({delivered:2,readyCommitted:3,planned:4,uncovered:1});
  expect(r.completeCoverage).toBe(false);expect(r.removalAt).toBeNull();
 });
 it('requires conciliation after removal, excludes draft and canceled claims',()=>{
  for(const state of ['CLOSED','DRAFT','CANCELED'] as const){
   const input=scenarioInput();input.machines[0].batches[0].state=state;
   const r=projectSaleDemand(facts(),input.machines.flatMap(m=>m.batches),forecast(input));
   expect(r.lines[0].planned).toBe(0);expect(r.removalAt).toBeNull();
  }
 });
 it('keeps sales demand after production cancellations and exposes unassigned good units',()=>{
  const f=facts(); f.lines[0].production=[];f.lines[0].uncommittedGoodUnits=2;
  const r=projectSaleDemand(f,[],{asOf:'',revision:0,batches:[],totals:[]});
  expect(r.lines[0].uncovered).toBe(5);expect(r.lines[0].issues.some(i=>i.code==='UNASSIGNED_GOOD')).toBe(true);
 });
 it('refuses surplus and ambiguous/legacy linkage without clamping it into completion',()=>{
  const f=facts();f.lines[0].committedUnits=11;
  expect(projectSaleDemand(f,[],{asOf:'',revision:0,batches:[],totals:[]}).completeCoverage).toBe(false);
  f.mode='LEGACY';expect(projectSaleDemand(f,[],{asOf:'',revision:0,batches:[],totals:[]}).issues.length).toBeGreaterThan(0);
 });
 it('covers split production and mixed batches only once using open participation quantities',()=>{
  const f=facts();f.lines[0].production=[{lineId:'line-a',remaining:2},{lineId:'line-b',remaining:3}];
  const input=scenarioInput();input.machines[0].batches[0].participants[0].units=4;input.machines[0].batches[0].participants[0].settledUnits=2;
  input.machines[0].batches[1].participants[0].units=4;input.machines[0].batches[1].participants[0].releasedUnits=1;
  const r=projectSaleDemand(f,input.machines.flatMap(m=>m.batches),forecast(input));
  expect(r.completeCoverage).toBe(true);expect(r.lines[0].planned).toBe(5);expect(r.removalAt).not.toBeNull();
 });
 it('shows delivered facts without inventing a new forecast',()=>{
  const f=facts();f.lines[0].deliveredUnits=10;f.lines[0].committedUnits=0;f.lines[0].production=[];
  const r=projectSaleDemand(f,[],{asOf:'',revision:0,batches:[],totals:[]});expect(r.allDelivered).toBe(true);expect(r.removalAt).toBeNull();
 });
});
