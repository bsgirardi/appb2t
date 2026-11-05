import {it,expect} from 'vitest';
import {assertE32Database} from '../e32/database';
it('accepts only explicitly marked exclusive E32 disposable database',()=>{
 const url='postgresql://test:test@127.0.0.1:55439/b2t_e32_test';
 expect(()=>assertE32Database(url,'1')).not.toThrow();
 for(const v of [undefined,'',url.replace('55439','55432'),url.replace('b2t_e32_test','b2t_test'),url.replace('127.0.0.1','remote'),url+'?schema=public'])expect(()=>assertE32Database(v,'1')).toThrow();
 expect(()=>assertE32Database(url,undefined)).toThrow();
});
