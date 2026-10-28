import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import bootes from '../../data/hubble/bootes-witnesses.json';
import {decodeFieldPack,type FieldPack} from './fieldPack';
import {fieldStarVariable as fieldStarVariableFromDispatch} from './variableDispatch';
import {buildFieldPopulation,evaluateField,fieldStarVariable,FieldEngineError,type FieldOptions,type FieldTelescope} from './fieldEngine';
import {parseGlimagesPositions,packWithPhotographs} from './lssLists';
import {lssFieldRows,type LssFieldNumber} from './lssFields';
vi.setConfig({testTimeout:300000});
// Front T M2: the TRUE branch of the variable dispatch 0x51ec48 in the field engine's variable stage (variableDispatch.ts).
// JDs here are SYNTHETIC test times (labelled as such), not observations; crop hashes with a JD are the engine's own regression
// output (no oracle). Statuses without a JD are the plan §4 measurement (front-t-true-dispatch.md), re-derived here.
const file=(p:string)=>readFileSync(new URL('../../'+p,import.meta.url));
const sha=(v:string|NodeJS.ArrayBufferView)=>createHash('sha256').update(v).digest('hex');
const glx=new Uint8Array(file('public/original/catalogs/CLEA_GLX.DAT'));
const photographs=parseGlimagesPositions(new Uint8Array(file('public/original/images/GLIMAGES.LST')));
const packs=new Map<number,FieldPack>();
const lssPack=(f:number)=>{let p=packs.get(f);if(!p){p=packWithPhotographs(decodeFieldPack(JSON.parse(file(`data/lss/lss-field-0${f}.json`).toString())),photographs);packs.set(f,p);}return p;};
const SYNTHETIC_JD=Object.freeze({jd:2451545.0,source:'observatory-clock' as const});// synthetic test time
const status=(f:number,i:number,t:FieldTelescope,options:FieldOptions={})=>{const row=lssFieldRows(f as LssFieldNumber)[i],r=evaluateField(lssPack(f),glx,{ra:row.ra,dec:row.dec},t,options);return {r,s:r.reasons.length?r.reasons.join('+'):r.target?'OK':'no-target'};};
// [field, row, statuses 0.4/0.9/4 m without a JD, TRUE variables]
const AVAILABLE:readonly (readonly [number,number,string,string])[]=[
 [1,17,'OK/mean-bound/OK','GY Com miss'],[1,20,'OK/mean-bound/OK','HL Com miss'],[2,9,'OK/OK/OK','GS Com miss'],[2,23,'OK/OK/OK','DV Com hit'],
 [3,16,'OK/OK/OK','EP Com miss'],[3,17,'OK/mean-bound/OK','EP Com miss'],[3,21,'OK/mean-bound/OK','EP Com miss'],[4,0,'OK/mean-bound/OK','ES Com hit'],
 [4,3,'OK/OK/OK','ER Com miss'],[4,22,'OK/mean-bound/OK','EW Com hit,EX Com miss'],[5,18,'OK/mean-bound/OK','AG Boo hit'],[5,21,'OK/OK/OK','AR CVn miss'],
 [5,23,'OK/OK/OK','AR CVn miss'],[6,5,'OK/OK/OK','WY Boo hit,UV CVn miss'],[6,9,'OK/OK/OK','BI Boo miss'],[6,10,'OK/OK/OK','BI Boo miss'],[8,19,'OK/OK/OK','S CrB hit'],
];
// In-view rows: available only with a JD. Crop SHA-256 at 0.4 m with the synthetic JD (engine regression values).
const TIME_ROWS:readonly (readonly [number,number,string,string])[]=[
 [1,19,'GY Com miss','0ba97db083bacc29'],[3,18,'EP Com miss','ee3392d241dacebd'],[6,7,'UU CVn miss','0e11e8cad6539671'],[6,8,'UU CVn miss','a4cd36f7288b9621'],[8,21,'S CrB hit','0c9f15327e1d2fb3'],
];
const variablesOf=(r:ReturnType<typeof evaluateField>)=>(r.population?.variableStars??[]).map(e=>`${e.gcvsId} ${e.path}`).join(',');
describe('Front T: TRUE-dispatch variables in the LSS fields without a JD',()=>{
 for(const [f,i,want,vars] of AVAILABLE)it(`F${f} r${i}: ${want} (${vars}), pixel-identical with a synthetic JD`,()=>{
  const got=([0,1,2] as const).map(t=>status(f,i,t));
  expect(got.map(g=>g.s).join('/')).toBe(want);expect(variablesOf(got[0].r)).toBe(vars);
  for(const e of got[0].r.population!.variableStars!){expect(e.values).toEqual({status:'unavailable',reason:'variable-time-required'});expect(e.nearGalaxyOrQso).toBe(false);}
  // Every affected stamp misses the crop: painting V(t) changes nothing in view.
  const timed=status(f,i,0,{variableTime:SYNTHETIC_JD});expect(timed.s).toBe('OK');
  expect(sha(timed.r.viewport!.rgb)).toBe(sha(got[0].r.viewport!.rgb));expect(timed.r.calibration!.pixelLevel).toBe(got[0].r.calibration!.pixelLevel);
  expect(timed.r.population!.variableStars!.every(e=>e.values.status==='computed'&&e.values.jd===SYNTHETIC_JD.jd)).toBe(true);
 });
 for(const [f,i,vars,crop] of TIME_ROWS)it(`F${f} r${i}: variable-time-required without a JD; available with the synthetic JD (${vars})`,()=>{
  for(const t of [0,1,2] as const)expect(status(f,i,t).s).toBe('variable-time-required');
  const timed=status(f,i,0,{variableTime:SYNTHETIC_JD});
  expect(timed.s).toBe('OK');expect(variablesOf(timed.r)).toBe(vars);expect(sha(timed.r.viewport!.rgb).slice(0,16)).toBe(crop);
  expect(timed.r.population!.variableTime).toEqual(SYNTHETIC_JD);
 });
});
describe('Front T: fieldStarVariable (API for the Catalog Object / GCVS button)',()=>{
 it('DV Com modifies the resolved GSC star; values need the time; GSC stars and absent ids give null',()=>{
  const row=lssFieldRows(2)[23],at={ra:row.ra,dec:row.dec};
  const {population}=buildFieldPopulation(lssPack(2),glx,at),p=population!,e=p.variableStars![0];
  expect(e.path).toBe('hit');expect(e.starId).toMatch(/^N(2230|3000)\.DAT@\d+$/);
  expect(fieldStarVariable(p,e.starId)).toEqual({starId:e.starId,recordIndex:9636,gcvsId:'DV Com',path:'hit',riseWordDefaulted:false,values:{status:'unavailable',reason:'variable-time-required'}});
  expect(fieldStarVariableFromDispatch).toBe(fieldStarVariable);// Front O imports it from variableDispatch.ts
  const other=p.stars.find(s=>s.id!==e.starId)!;expect(fieldStarVariable(p,other.id)).toBeNull();expect(fieldStarVariable(p,'N3000.DAT@0')).toBeNull();
  const timed=buildFieldPopulation(lssPack(2),glx,at,{variableTime:SYNTHETIC_JD}).population!,v=fieldStarVariable(timed,e.starId)!;
  // Same values as the independent witness at this synthetic JD (variableDispatch.controls.json): DV Com V 14.583…, F3III.
  expect(v.values).toMatchObject({status:'computed',jd:2451545,spectralText:'F3III'});
  expect(v.values.status==='computed'&&v.values.v).toBe(Math.fround(14.583390235900879));
  const star=timed.stars.find(s=>s.id===e.starId)!;expect(star.magnitude).toBe(v.values.status==='computed'?v.values.v:NaN);
 });
 it('WY Boo (SR, word 0) reports the Cepheid Init word mutation; misses are inserted type-0 stars at the variable position',()=>{
  const row=lssFieldRows(6)[5],p=buildFieldPopulation(lssPack(6),glx,{ra:row.ra,dec:row.dec}).population!;
  const wy=p.variableStars!.find(e=>e.gcvsId==='WY Boo')!,uv=p.variableStars!.find(e=>e.gcvsId==='UV CVn')!;
  expect(wy.riseWordDefaulted).toBe(true);expect(uv.path).toBe('miss');expect(uv.starId).toBe(`CLEA_VStrs.dat@${uv.recordIndex}`);
  const ins=p.stars.findIndex(s=>s.id===uv.starId),s=p.stars[ins];
  expect(s).toMatchObject({type:0,ra:uv.ra,dec:uv.dec,variableInserted:true});
  // RA cursor order around the inserted star (the walk 0x5986f8..0x59873c inserts after the last star with RA ≤ its RA).
  if(ins>0)expect(p.stars[ins-1].ra).toBeLessThanOrEqual(s.ra);
 });
 it('rejects a variable time outside the observatory-clock domain',()=>{
  const row=lssFieldRows(2)[23],at={ra:row.ra,dec:row.dec};
  for(const jd of [NaN,Infinity,2400000.5,2500000.5])expect(()=>buildFieldPopulation(lssPack(2),glx,at,{variableTime:{jd,source:'observatory-clock'}})).toThrow(FieldEngineError);
  expect(()=>buildFieldPopulation(lssPack(2),glx,at,{variableTime:{jd:2451545,source:'host' as 'observatory-clock'}})).toThrow(FieldEngineError);
 });
});
describe('Front T: Boötes RS Boo under the TRUE branch',()=>{
 it('modifies the record at the unrepaired saved index (resolved @513131), not the nearest',()=>{
  const pack=decodeFieldPack(JSON.parse(file('data/hubble/engine-bootes.json').toString()));
  for(const w of bootes.pointings){
   const p=buildFieldPopulation(pack,glx,w.pointing).population!,e=p.variableStars!.find(x=>x.gcvsId==='RS Boo')!;
   expect(e.path).toBe('hit');expect(e.starId).toBe(w.resolvedId);expect(e.winnerId).toBe(w.hitId);expect(p.variableRemoved).toContain(w.removedRunner[0]);
  }
 });
});
import {catalogRecords,catalogObjectView} from './catalogObject';
import {formatNativeSexagesimal} from './variableStars';
describe('Front T: Catalog Object records of TRUE-dispatch stars (GCVS button, Front O dialog)',()=>{
 it('a hit star shows the GCVS ID and enables GCVS; a miss star has a record; values need the frozen JD',()=>{
  for(const [f,i,gcvs,path] of [[2,23,'DV Com','hit'],[1,17,'GY Com','miss']] as const){
   const row=lssFieldRows(f)[i],at={ra:row.ra,dec:row.dec};
   for(const options of [{},{variableTime:SYNTHETIC_JD}] as const){
    const p=buildFieldPopulation(lssPack(f),glx,at,options).population!,e=p.variableStars!.find(x=>x.gcvsId===gcvs)!;
    expect(e.path).toBe(path);
    const k=p.stars.findIndex(s=>s.id===e.starId),r=catalogRecords(p).stars[k];
    expect(r.kind==='star'&&r.variable).toEqual({recordIndex:e.recordIndex,gcvsId:gcvs,valuesAvailable:'variableTime' in options,riseWordDefaulted:e.riseWordDefaulted});
    const v=catalogObjectView(r,formatNativeSexagesimal);
    expect([v.id,v.type,v.gcvsEnabled]).toEqual([gcvs,'Variable Star',true]);
    if('variableTime' in options){const x=fieldStarVariable(p,e.starId)!.values;expect(x.status).toBe('computed');expect(v.reasons).toEqual([]);expect(v.sp).toBe(x.status==='computed'?x.spectralText:'');}
    else{expect(v.reasons).toEqual(['variable-values-unavailable']);expect([v.mag,v.bv,v.ub,v.sp]).toEqual(['','','','']);}
    // Every other star keeps its GSC record and a disabled GCVS button.
    const others=catalogRecords(p).stars.filter((s,j)=>j!==k&&s.type===0);
    expect(others.every(s=>s.variable===null&&!catalogObjectView(s,formatNativeSexagesimal).gcvsEnabled)).toBe(true);
   }
  }
 });
});
import rowWitness from '../../data/variables/lss-true-dispatch-witness.json';
describe('Front T: LSS rows with TRUE variables equal the independent Python witness (no JD)',()=>{
 it('status class, hit/miss and modified or inserted star per variable, for every row the witness lists',()=>{
  const counts={'time-independent':0,'needs-jd':0,'qso-gated':0} as Record<string,number>;
  for(const w of rowWitness.rows){
   const row=lssFieldRows(w.field as LssFieldNumber)[w.row];expect([row.ra,row.dec]).toEqual([w.pointing.ra,w.pointing.dec]);
   const r=evaluateField(lssPack(w.field),glx,{ra:row.ra,dec:row.dec},0),reasons=r.reasons as readonly string[];counts[w.status]++;
   const label=`F${w.field} r${w.row}`;
   if(w.status==='qso-gated')expect(reasons,label).toContain('qso-merge');
   else if(w.status==='needs-jd')expect(reasons,label).toContain('variable-time-required');
   else expect(reasons.filter(x=>x.startsWith('variable')),label).toEqual([]);
   if(w.status!=='qso-gated'){
    const pop=buildFieldPopulation(lssPack(w.field),glx,{ra:row.ra,dec:row.dec}).population!;
    expect(pop.variableStars!.map(e=>[e.recordIndex,e.path,e.starId]),label).toEqual(w.affected.map(e=>[e.variable,e.path,e.starId]));
   }
  }
  expect(counts).toEqual({'time-independent':17,'needs-jd':5,'qso-gated':8});
 });
});
import {setFieldInfoResources,findCertifiedPopulation} from '../io/fieldInfoPacks';
const VSTRS=new Uint8Array(file('public/original/variables/CLEA_VStrs.dat'));
/** A real CLEA_VStrs.dat record moved to a position (and optionally with another record index or magnitude system): SYNTHETIC
 * test placements of real records, not catalogue entries. */
function moved(index:number,ra:number,dec:number,patch?:(b:Uint8Array)=>void):Readonly<{recordIndex:number;rawHex:string}>{
 const b=VSTRS.slice(index*92,index*92+92),v=new DataView(b.buffer);v.setFloat64(11,ra,true);v.setFloat64(19,dec,true);patch?.(b);
 return {recordIndex:index,rawHex:Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};
}
function withVariables(pack:FieldPack,extra:readonly Readonly<{recordIndex:number;rawHex:string}>[]):FieldPack{
 const entries=[...pack.variables.entries.filter(e=>!extra.some(x=>x.recordIndex===e.recordIndex)),...extra].sort((a,b)=>a.recordIndex-b.recordIndex);
 return Object.freeze({...pack,variables:Object.freeze({...pack.variables,entries:Object.freeze(entries)})}) as FieldPack;
}
describe('Front T review 1: stage gates never certify a population (M1); colours after a no-JD hit (L4)',()=>{
 const row=lssFieldRows(2)[23],at={ra:row.ra,dec:row.dec};
 it('T Mon (descending range) and an empty magnitude system gate the population; Field Information refuses it',async()=>{
  const cases:readonly (readonly [string,Readonly<{recordIndex:number;rawHex:string}>])[]=[
   ['variable-spectrum-indeterminate',moved(5339,row.ra+0.004,row.dec+0.1)],// T Mon F7Iab-K1Iab+A0V
   ['variable-model-fault',moved(9636,row.ra+0.004,row.dec+0.1,b=>{b[48]=0;})],// DV Com with no magnitude system
  ];
  for(const [reason,entry] of cases){
   const pack=withVariables(lssPack(2),[entry]);
   expect(buildFieldPopulation(pack,glx,at).reasons,reason).toContain(reason);
   setFieldInfoResources({snapshot:async id=>JSON.parse(file(`data/hubble/${id==='36773'?'pinned-galaxy-field':id==='pegasus'?'pinned-pegasus-field':`pinned-galaxy-${id}-field`}.json`).toString()),engine:async id=>JSON.parse(file(`data/hubble/engine-${id}.json`).toString()),lss:async f=>f===2?pack:lssPack(f),
    glx:async()=>glx,qso:async()=>({bytes:new Uint8Array(file('public/original/catalogs/CLEA_QSO.DAT')),sha256:'69ecc5bf1aea34a40507de326d39ee47d23c810d49baa53d5732c064edef90b5'}),glimages:async()=>new Uint8Array(file('public/original/images/GLIMAGES.LST'))});
   try{expect(await findCertifiedPopulation(at),reason).toEqual({status:'unavailable',reason:'population',detail:reason});}finally{setFieldInfoResources(null);}
  }
 });
 it('a class-2 hit after a no-JD class-0/1 hit on the same star is typed, and computed with a JD',()=>{
  const base=buildFieldPopulation(lssPack(2),glx,at).population!,dv=base.variableStars!.find(e=>e.gcvsId==='DV Com')!;
  const star=base.stars.find(s=>s.id===dv.starId)!;
  // AK Aur (EA, class 2, system B) placed 1″ north of the star DV Com modified: the stage visits it after DV Com and hits that star.
  const pack=withVariables(lssPack(2),[moved(5603,star.ra,star.dec+1/3600)]);
  const plain=buildFieldPopulation(pack,glx,at).population!,e=plain.variableStars!.find(x=>x.gcvsId==='AK Aur')!;
  expect([e.path,e.starId,e.values]).toEqual(['hit',dv.starId,{status:'unavailable',reason:'variable-time-required'}]);
  const timed=buildFieldPopulation(pack,glx,at,{variableTime:SYNTHETIC_JD}).population!.variableStars!.find(x=>x.gcvsId==='AK Aur')!;
  expect(timed.values.status).toBe('computed');
 });
});
import {frozenObservatoryTime} from './fieldEngine';
describe('frozenObservatoryTime (one helper for LSS, Edit Mode and the Star Data List)',()=>{
 it('freezes a finite in-domain clock JD; anything else gives no time',()=>{
  expect(frozenObservatoryTime(()=>2451545)).toEqual({jd:2451545,source:'observatory-clock'});
  for(const f of [undefined,()=>NaN,()=>Infinity,()=>2400000,()=>2500000,()=>{throw new Error('clock domain');}])expect(frozenObservatoryTime(f as (()=>number)|undefined)).toBeUndefined();
 });
});
