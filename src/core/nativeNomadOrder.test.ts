import {describe,it,expect} from 'vitest';
import {orderNativeNomadEntries} from './nativeNomadOrder';
const row=(id:string,raHours:number,decDegrees=0)=>Object.freeze({id,result:Object.freeze({row:Object.freeze({raHours,decDegrees})})});
const ids=(rows:readonly ReturnType<typeof row>[])=>orderNativeNomadEntries(rows).map(r=>r.id);
describe('structured native ordered insertion with coordinate ties and owned cursor',()=>{
 it('inserts forwards/backwards and orders numeric RA then DEC without normalization',()=>{const a=row('A',3),b=row('B',1),c=row('C',2),d=row('D',2,-1),e=row('E',2,1);expect(ids([a,b,c,d,e])).toEqual(['B','D','C','E','A']);expect(ids([row('x',24),row('y',-.1),row('z',0)])).toEqual(['y','z','x']);});
 it('retains every equal-coordinate payload and the source first-element tie behavior',()=>{expect(ids(['A','B','C','D'].map(id=>row(id,1)))).toEqual(['A','D','C','B']);expect(ids([row('Z',0),...['A','B','C'].map(id=>row(id,1))])).toEqual(['Z','C','B','A']);});
 it('uses insertion cursor history rather than a stable-sort or fixed duplicate reversal',()=>{expect(ids([row('H',2),row('A',1),row('B',1),row('J',3),row('C',1)])).toEqual(['A','C','B','H','J']);});
 it('returns a new immutable list while preserving input identity and order',()=>{const input=[row('B',2),row('A',1)],out=orderNativeNomadEntries(input);expect(out).not.toBe(input);expect(input.map(r=>r.id)).toEqual(['B','A']);expect(out[0]).toBe(input[1]);expect(Object.isFrozen(out)).toBe(true);expect(orderNativeNomadEntries([])).toEqual([]);});
 it('bounds unsupported ordering input rather than accepting nonfinite comparison keys',()=>{expect(()=>orderNativeNomadEntries([row('bad',NaN)])).toThrow();expect(()=>orderNativeNomadEntries([row('bad',1,Infinity)])).toThrow();expect(()=>orderNativeNomadEntries(Array.from({length:60001},()=>row('x',1)))).toThrow();});
 it('equals the literal native cursor walk on random inputs with heavy ties, and stays fast at 50,000 rows',()=>{
  // Literal port of the previous cursor walk (0x492728), kept here as the reference.
  function walk<T extends ReturnType<typeof row>>(input:readonly T[]):T[]{
   const o:T[]=[];let c=0;const after=(a:T,b:T)=>a.result.row.raHours===b.result.row.raHours?a.result.row.decDegrees>b.result.row.decDegrees:a.result.row.raHours>b.result.row.raHours;
   for(const v of input){if(!o.length){o.push(v);continue;}let cur=o[c];
    if(after(v,cur)){while(c<o.length-1&&!after(cur,v))cur=o[++c];if(after(cur,v))c--;}
    else{while(c>0&&!after(v,cur))cur=o[--c];if(c===0&&after(cur,v)){o.unshift(v);c=0;continue;}}
    o.splice(++c,0,v);}
   return o;
  }
  let seed=12345;const rnd=(n:number)=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed%n;};
  for(let trial=0;trial<3000;trial++){
   const n=1+rnd(14),keys=1+rnd(5);
   const input=Array.from({length:n},(_,i)=>row(String(i),rnd(keys),rnd(2)));
   expect(ids(input)).toEqual(walk(input).map(r=>r.id));
  }
  const big=Array.from({length:50000},(_,i)=>row(String(i),rnd(2400)/100,rnd(1000)/100));
  const t=performance.now();const out=orderNativeNomadEntries(big);expect(performance.now()-t).toBeLessThan(1000);
  expect(out).toHaveLength(50000);
  const sample=big.slice(0,4000);expect(ids(sample)).toEqual(walk(sample).map(r=>r.id));
 });
});
