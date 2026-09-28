// @vitest-environment jsdom
import { it,expect,afterEach,vi } from 'vitest';
import { render,screen,fireEvent,cleanup,waitFor } from '@testing-library/react';
import { RecordEditor } from '@/components/settings/record-editor';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const fields=[{key:'name',label:'Nome',kind:'text' as const},{key:'price',label:'Preço',kind:'decimal' as const}];
it('keeps draft on conflict and offers explicit reload',async()=>{
  vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({error:{code:'CONFLICT',message:'Outro administrador alterou este registro.'}}),{status:409}));
  render(<RecordEditor title="Material" endpoint="/api/materials/m" fields={fields} initial={{name:'PLA',price:'100',version:1}} onSaved={()=>{}} onCancel={()=>{}} onReload={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'PLA novo'}});fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toBeTruthy());expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('PLA novo');expect(screen.getByRole('button',{name:'Recarregar registro'})).toBeTruthy();
});
it('sends canonical decimals and original version; allows retry after offline',async()=>{
  let body:Record<string,unknown>={};const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,options)=>{body=JSON.parse(options?.body as string);throw new Error('offline');});
  render(<RecordEditor title="Material" endpoint="/api/materials/m" fields={fields} initial={{name:'PLA',price:'100',version:3}} onSaved={()=>{}} onCancel={()=>{}} onReload={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Preço'),{target:{value:'12,50'}});fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toBeTruthy());expect(body).toMatchObject({price:'12.5',expectedVersion:3});expect(fetcher).toHaveBeenCalledTimes(1);expect((screen.getByRole('button',{name:'Salvar alterações'}) as HTMLButtonElement).disabled).toBe(false);
});
