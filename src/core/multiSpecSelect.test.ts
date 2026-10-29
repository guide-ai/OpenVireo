import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import coma from '../../data/hubble/engine-coma.json';
import engineTargets from '../../data/hubble/engine-targets.json';
import {decodeFieldPack} from './fieldPack';
import {evaluateFieldView,type FieldPopulation} from './fieldEngine';
import {multiSpecPick,multiSpecClickPoint,nearestSelection,type MultiSpecField} from './multiSpecSelect';
import type {NativeSelectionScene} from './objectSelection';

const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const glx=file('catalogs/CLEA_GLX.DAT'),qb=file('catalogs/CLEA_QSO.DAT');
const target=engineTargets.targets.find(t=>t.id==='NGC 4874')!;
const view=evaluateFieldView(decodeFieldPack(coma),glx,target.pointing,0,{qso:'merge',qsoCatalog:{bytes:qb,sha256:createHash('sha256').update(qb).digest('hex')}});
const field:MultiSpecField={population:view.population!,scene:view.scene!};
/** One star and one galaxy of the Coma field placed at chosen raster points (the scene's projected positions replaced). */
function placed(star:{x:number;y:number}|null,galaxy:{x:number;y:number}|null):MultiSpecField{
 const p=view.population!,si=p.stars.findIndex(s=>s.id==='N2230.DAT@503386'),gi=p.galaxies.findIndex(g=>g.id==='NGC 4864');
 const population={...p,stars:star?[p.stars[si]]:[],galaxies:galaxy?[p.galaxies[gi]]:[],variableStars:[],photographAssociations:[]} as unknown as FieldPopulation;
 const scene={...view.scene!,stars:star?[{id:'s',...star}]:[],galaxies:galaxy?[{id:'g',majorArcminutes:.6,...galaxy}]:[]} as unknown as NativeSelectionScene;
 return {population,scene};
}

describe('Front M: Multi-Spec selection (CRT1MouseUp 0x53cff8)',()=>{
 it('click point: control pixel + 312 (fresh unpanned field)',()=>{
  expect(multiSpecClickPoint(0,0)).toEqual({x:312,y:312});expect(multiSpecClickPoint(311,155)).toEqual({x:623,y:467});
  expect(()=>multiSpecClickPoint(1.5,0)).toThrow();
 });
 it('thresholds: distance 10.0 still selects, 10.0+ is a Sky record at the click point',()=>{
  const f=placed({x:400,y:400},null);
  expect(multiSpecPick(f,406,408)).toMatchObject({type:0,name:'N2230-01839',x:400,y:400,spectralIndex:40305000});// 10.0
  expect(multiSpecPick(f,407,408)).toEqual({type:4,name:'Sky',ra:null,dec:null,v:null,z:null,spectralIndex:null,x:407,y:408,source:{kind:'sky'}});// 10.63
  expect(multiSpecPick(placed(null,{x:400,y:400}),406,408)).toMatchObject({type:1,name:'NGC 4864',x:400,y:400});
 });
 it('galaxy wins ties (galaxy distance ≤ star distance); otherwise the nearer star',()=>{
  const f=placed({x:400,y:400},{x:420,y:400});
  expect(multiSpecPick(f,410,400).type).toBe(1);// 10 / 10
  expect(multiSpecPick(f,409,400).type).toBe(0);// 9 / 11
  expect(multiSpecPick(f,411,400).type).toBe(1);
 });
 it('galaxy record: catalogue V, z = gal+0x39, type 1; star record: V and +0x43; every pick follows the rule on the whole crop',()=>{
  const p=view.population!,s=view.scene!;
  for(let y=312;y<624;y+=7)for(let x=312;x<624;x+=7){
   const d=(o:{x:number;y:number})=>Math.sqrt((x-o.x)**2+(y-o.y)**2);
   const sd=Math.min(1000,...s.stars.map(d).filter(v=>v<350)),gd=Math.min(1000,...s.galaxies.map(d).filter(v=>v<350));
   const r=multiSpecPick(field,x,y),expected=sd>10&&gd>10?4:gd<=sd?1:0;
   expect([x,y,r.type===3?0:r.type]).toEqual([x,y,expected]);
   if(r.type===1){const g=p.galaxies[(r.source as {index:number}).index];expect([r.v,r.z]).toEqual([Math.fround(g.magnitude),Math.fround(g.redshift)]);}
  }
 });
 it('0x52a6d0: strict nearest below the limit (0 → 350 px), first wins, −1 when none',()=>{
  const list=[{x:400,y:400},{x:410,y:400},{x:400,y:400}];
  expect(nearestSelection(list,405,400,0)).toBe(0);expect(nearestSelection(list,400,400,1)).toBe(0);
  expect(nearestSelection(list,401,400,1)).toBe(-1);expect(nearestSelection(list,800,800,0)).toBe(-1);expect(nearestSelection(list,749,400,0)).toBe(1);
 });
});
