import {describe,it,expect} from 'vitest';
import {orderNativeNomadEntries} from './nativeNomadOrder';
const row=(id:string,raHours:number,decDegrees=0)=>Object.freeze({id,result:Object.freeze({row:Object.freeze({raHours,decDegrees})})});
const ids=(rows:readonly ReturnType<typeof row>[])=>orderNativeNomadEntries(rows).map(r=>r.id);
describe('structured native ordered insertion with coordinate ties and owned cursor',()=>{
 it('inserts forwards/backwards and orders numeric RA then DEC without normalization',()=>{const a=row('A',3),b=row('B',1),c=row('C',2),d=row('D',2,-1),e=row('E',2,1);expect(ids([a,b,c,d,e])).toEqual(['B','D','C','E','A']);expect(ids([row('x',24),row('y',-.1),row('z',0)])).toEqual(['y','z','x']);});
 it('retains every equal-coordinate payload and the source first-element tie behavior',()=>{expect(ids(['A','B','C','D'].map(id=>row(id,1)))).toEqual(['A','D','C','B']);expect(ids([row('Z',0),...['A','B','C'].map(id=>row(id,1))])).toEqual(['Z','C','B','A']);});
 it('uses insertion cursor history rather than a stable-sort or fixed duplicate reversal',()=>{expect(ids([row('H',2),row('A',1),row('B',1),row('J',3),row('C',1)])).toEqual(['A','C','B','H','J']);});
 it('returns a new immutable list while preserving input identity and order',()=>{const input=[row('B',2),row('A',1)],out=orderNativeNomadEntries(input);expect(out).not.toBe(input);expect(input.map(r=>r.id)).toEqual(['B','A']);expect(out[0]).toBe(input[1]);expect(Object.isFrozen(out)).toBe(true);expect(orderNativeNomadEntries([])).toEqual([]);});
 it('bounds unsupported ordering input rather than accepting nonfinite comparison keys',()=>{expect(()=>orderNativeNomadEntries([row('bad',NaN)])).toThrow();expect(()=>orderNativeNomadEntries([row('bad',1,Infinity)])).toThrow();expect(()=>orderNativeNomadEntries(Array.from({length:10001},()=>row('x',1)))).toThrow();});
});
