import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import witness from './clusterHr.witness.json';
import {clusterBankOrder,clusterHrHitTest,clusterRaBank,clusterVBank,possibleMemberFields} from './clusterHrSelect';

// Witness: analysis/front-v2-cluster-hr/tools/hr_witness.py (pinned in clusterHrPlot.test.ts); same reading, second port.
type Point={id:string;ra:number;dec:number;bMinusV:number;v:number};
const data=(file:string)=>JSON.parse(readFileSync(new URL(`../../data/photometry/${file}`,import.meta.url),'utf8')) as Point[];
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
type W={vBankSha256:string;raBankSha256:string;vBankFirst:string[];equalVAdjacentPairs:number;sourceOrderEqualsVBank:boolean;hitProbesSha256:string;hitProbesSample:Record<string,string>};
const datasets=witness.datasets as unknown as Record<string,W>;

describe('bank order 0x492728 (V bank 0x535a70, RA bank 0x535a80)',()=>{
 it('equals the witness V and RA bank orders for all 16 datasets',()=>{
  for(const [file,w] of Object.entries(datasets)){
   const pts=data(file),v=clusterVBank(pts),ra=clusterRaBank(pts);
   expect(v.slice(0,5).map(p=>p.id),file).toEqual(w.vBankFirst);
   expect(sha(v.map(p=>p.id).join('\n')),file).toBe(w.vBankSha256);
   expect(sha(ra.map(p=>p.id).join('\n')),file).toBe(w.raBankSha256);
   expect(v.map(p=>p.id).join()===pts.map(p=>p.id).join(),file).toBe(w.sourceOrderEqualsVBank);
   let ties=0;for(let i=1;i<v.length;i++)if(Math.fround(v[i].v)===Math.fround(v[i-1].v))ties++;
   expect(ties,file).toBe(w.equalVAdjacentPairs);
  }
 });
 it('follows the cursor and head rules on synthetic keys',()=>{
  const order=(keys:number[])=>clusterBankOrder(keys.map((k,i)=>({k,i})),(a,b)=>a.k>b.k).map(x=>`${x.k}.${x.i}`).join(' ');
  expect(order([5,3,4,9,1])).toBe('1.4 3.1 4.2 5.0 9.3');
  // A key equal to the cursor is not greater, so it walks back; at the head it goes right after the head (not before).
  expect(order([5,5,5])).toBe('5.0 5.2 5.1');
  expect(order([1,5,5,5])).toBe('1.0 5.3 5.2 5.1');// each equal key walks back to the head and lands right after it
  expect(order([5,9,5])).toBe('5.0 5.2 9.1');
  expect(order([])).toBe('');
 });
});

describe('hit test 0x544304',()=>{
 it('picks the witness record for every probe pixel of all 16 datasets',()=>{
  for(const [file,w] of Object.entries(datasets)){
   const bank=clusterVBank(data(file)),lines:string[]=[];
   for(let X=0;X<496;X+=31)for(let Y=0;Y<506;Y+=46){const h=clusterHrHitTest(bank,X,Y)!;lines.push(`${X},${Y}=${bank[h.index].id}`);}
   for(const [k,id] of Object.entries(w.hitProbesSample))expect(lines.find(l=>l.startsWith(k+'='))).toBe(`${k}=${id}`);
   expect(sha(lines.join('\n')),file).toBe(w.hitProbesSha256);
  }
 });
 it('breaks ties by bank order, uses a strict 1000 px cap and needs integer pixels',()=>{
  const a={bMinusV:0,v:5},b={bMinusV:0,v:5};
  expect(clusterHrHitTest([a,b],140,99)).toEqual({index:0,pixel:{x:140,y:99}});
  expect(clusterHrHitTest([{bMinusV:0,v:5}],140+1000,99)).toBeNull();
  expect(clusterHrHitTest([{bMinusV:0,v:5}],140+999,99)!.index).toBe(0);
  expect(clusterHrHitTest([],0,0)).toBeNull();
  expect(()=>clusterHrHitTest([a],0.5,0)).toThrow(RangeError);
 });
});

describe('Possible Cluster Member fields 0x5408ac',()=>{
 it('formats RA, Dec, V and B−V as VIREO does; values from 30 up are blank',()=>{
  const p=data('cluster-m67.json')[0];
  expect(possibleMemberFields('M 67 (NGC 2682)',p)).toEqual({name:'M 67 (NGC 2682)',ra:'   8h 49m 56.83s',dec:'  11° 41\' 33.0"',v:'9.840',bMinusV:'1.360'});
  expect(possibleMemberFields('X',{...p,v:30,bMinusV:-0.25})).toMatchObject({v:'',bMinusV:'-0.250'});
 });
});
