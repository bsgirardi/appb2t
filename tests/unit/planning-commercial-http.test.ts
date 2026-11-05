import {it,expect,vi,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({actor:vi.fn(),context:vi.fn(),preview:vi.fn(),sale:vi.fn()}));
vi.mock('@/server/auth/guards',()=>({requireActor:m.actor}));
vi.mock('@/server/planning/commercial-read',()=>({getCommercialContext:m.context,getSaleForecast:m.sale}));
vi.mock('@/server/planning/commercial-preview',()=>({previewCommercial:m.preview}));
import {GET,POST} from '@/app/api/opportunities/[id]/planning-preview/route';
import {POST as salePost} from '@/app/api/sales/[id]/planning-forecast/route';
import {AppError} from '@/lib/errors';
const ctx={params:Promise.resolve({id:'x'})};
beforeEach(()=>{vi.clearAllMocks();process.env.APP_URL='http://localhost:3000';});
it('authenticates context and refuses unauthenticated access',async()=>{
 m.actor.mockRejectedValue(new AppError('UNAUTHENTICATED','Entre'));
 expect((await GET(new Request('http://localhost:3000'),ctx)).status).toBe(401);expect(m.context).not.toHaveBeenCalled();
});
it.each(['ADMIN','OPERATOR'])('dispatches private reads and simulations for %s',async role=>{
 const actor={id:'a',role};m.actor.mockResolvedValue(actor);m.context.mockResolvedValue({});m.preview.mockResolvedValue({});m.sale.mockResolvedValue({});
 expect((await GET(new Request('http://localhost:3000'),ctx)).status).toBe(200);
 const req=()=>new Request('http://localhost:3000',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:'{}'});
 expect((await POST(req(),ctx)).status).toBe(200);expect(m.preview).toHaveBeenCalledWith(actor,'x',{});
 expect((await salePost(req(),ctx)).status).toBe(200);
});
it('rejects oversized and wrong-origin requests before scenario service',async()=>{
 m.actor.mockResolvedValue({id:'a',role:'ADMIN'});
 expect((await POST(new Request('http://localhost:3000',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:'x'.repeat(262145)}),ctx)).status).toBe(413);
 expect(m.preview).not.toHaveBeenCalled();
 expect((await POST(new Request('http://localhost:3000',{method:'POST',headers:{origin:'http://evil.test','content-type':'application/json'},body:'{}'}),ctx)).status).toBe(403);
});
