import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import field36773 from '../../data/hubble/pinned-galaxy-field.json';
import field36747 from '../../data/hubble/pinned-galaxy-36747-field.json';
import field54876 from '../../data/hubble/pinned-galaxy-54876-field.json';
import fieldPegasus from '../../data/hubble/pinned-pegasus-field.json';
import exposureVectors from '../../data/hubble/galaxy-exposure-vectors.json';
import {fieldPackFromSnapshot,decodeFieldPack,FieldPackError,FIELD_PACK_SCHEMA} from './fieldPack';
import {lssFieldRows,type LssFieldNumber} from './lssFields';
import {nativeCursorInsert,evaluateField,buildFieldPopulation,admitFieldGalaxies,createFieldExposure,freshFieldArea,fieldVariableAdmitted,FieldEngineError,type FieldTelescope} from './fieldEngine';
import {decodeNativeVariableRecord} from './variableMerge';
import {verifiedGalaxyConfiguration,createGalaxyExposure} from './galaxyExposure';
import {tickJournal,startJournal,activateJournal} from './exposureJournal';
// The approved original catalogue is read only to feed the engine; assertions compare against the verified builders.
const glx=new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
type Snap=typeof field36773&Partial<typeof fieldPegasus>;
const FIELDS:readonly (readonly [string,Snap,readonly FieldTelescope[]])[]=[
 ['36773',field36773 as Snap,[0,1,2]],['36747',field36747 as Snap,[0,1,2]],['54876',field54876 as Snap,[0,1,2]],['NGC 7501',fieldPegasus as unknown as Snap,[0]],
];
describe('field engine reproduces the four verified fresh fields exactly',()=>{
 for(const [id,snap,telescopes] of FIELDS){
  const pack=fieldPackFromSnapshot(`snapshot-${id.replace(' ','')}`,snap);
  it(`${id}: area, regions, bands, stars, galaxies, variable and cleanup witnesses`,()=>{
   expect(freshFieldArea(snap.domain.pointing)).toEqual(snap.area);
   const {population,reasons}=buildFieldPopulation(pack,glx,snap.domain.pointing);
   expect(reasons).toEqual([]);
   const p=population!;
   expect(p.regionIds).toEqual(snap.regionIds);
   expect(p.bandOrder).toEqual(snap.bandOrder);
   expect(p.initialStarIds).toEqual(snap.initialStarIds);
   expect(p.galaxies).toEqual(snap.galaxies);
   if(snap.galaxyRead&&'sourceAdmissionIds' in snap.galaxyRead)expect(p.galaxyAdmissionIds).toEqual(snap.galaxyRead.sourceAdmissionIds);
   if(snap.variableMergeWitness){expect(p.variables.map(v=>v.recordIndex)).toEqual([snap.variableMergeWitness.recordIndex]);expect(p.variableRemoved).toEqual(snap.variableMergeWitness.removed);}
   else expect(p.variables).toEqual([]);
   expect(p.mergeWitnesses.map(w=>({galaxy:w.galaxy,removed:w.removed,savedWinnerIndex:w.savedWinnerIndex}))).toEqual(snap.mergeWitnesses.map(w=>({galaxy:w.galaxy,removed:w.removed,savedWinnerIndex:w.savedWinnerIndex})));
   expect(p.stars.map(s=>s.id)).toEqual(snap.expectedFinalIds);
  });
  for(const telescope of telescopes)it(`${id} on telescope record ${telescope}: crop, selection, slit level/fraction, amplitudes and means`,()=>{
   const result=evaluateField(pack,glx,snap.domain.pointing,telescope),known=verifiedGalaxyConfiguration(id,telescope);
   expect(result.reasons).toEqual([]);
   expect(result.target?.id).toBe(id);
   expect(result.selection?.kind==='galaxy'&&result.selection.galaxy.distance).toBe(0);
   expect(sha(result.viewport!.rgb as Uint8Array)).toBe(sha(known.viewport.rgb as Uint8Array));
   const c=result.calibration!;
   expect({zeroPoint:c.zeroPoint,pixelLevel:c.pixelLevel,fraction:c.fraction,amplitude:c.amplitude,instrumentMagnitude:c.instrumentMagnitude}).toEqual({zeroPoint:known.zeroPoint,pixelLevel:known.pixelLevel,fraction:known.fraction,amplitude:known.amplitude,instrumentMagnitude:known.instrumentMagnitude});
   expect(c.sourceMeans).toEqual(known.sourceMeans);
   expect(c.wavelengths).toEqual(known.wavelengths);
   // Same journal draws for the same seed and ticks.
   const run=(s:ReturnType<typeof createFieldExposure>)=>tickJournal(startJournal(activateJournal(s)),1000).exposure.counts;
   expect(run(createFieldExposure(result,'test-policy',12345))).toEqual(run(createGalaxyExposure(12345,id,telescope)));
  });
 }
 it('reproduces the recorded 36773 crop hash 3dd36af4…, slit level 50 and fraction 0.0625',()=>{
  const r=evaluateField(fieldPackFromSnapshot('s',field36773 as Snap),glx,field36773.domain.pointing,0);
  expect(exposureVectors.raster.cropSHA256).toBe('3dd36af4017e8d9f5b330e6e1ffaa792fdfe50022d2bc3900ab1c9def6775f76');
  expect(sha(r.viewport!.rgb as Uint8Array)).toBe(exposureVectors.raster.cropSHA256);
  expect([r.calibration!.pixelLevel,r.calibration!.fraction]).toEqual([exposureVectors.raster.slitLevel,exposureVectors.raster.fraction]);
 });
});
describe('field engine gates and errors',()=>{
 const pack=fieldPackFromSnapshot('s',field36773 as Snap);
 it('reports outside-pack for a pointing whose area the pack does not cover',()=>{
  const r=evaluateField(pack,glx,{ra:field36773.domain.pointing.ra+.001,dec:field36773.domain.pointing.dec},0);
  expect(r.reasons).toEqual(['outside-pack']);expect(r.population).toBeNull();
 });
 it('reports qso, photograph and variable gates from pack positions inside the area',()=>{
  const a=field36773.area,mid={ra:(a.minimumRa+a.maximumRa)/2,dec:(a.minimumDec+a.maximumDec)/2};
  const raw=JSON.parse(JSON.stringify({schema:FIELD_PACK_SCHEMA,id:'gated',coverage:{minimumRa:a.minimumRa,maximumRa:a.maximumRa,minimumDec:a.minimumDec,maximumDec:a.maximumDec},pointings:[field36773.domain.pointing],
   bands:field36773.bands.map(b=>({name:b.name,recordCount:b.recordCount,sha256:null,reads:b.reads.map(r=>[r.index,r.rawHex])})),
   variables:{sha256:null,recordsChecked:31147,entries:[]},qso:{sha256:null,recordsChecked:2269,entries:[{index:7,...mid}]},photographs:{sha256:null,recordsChecked:183,entries:[{pointing:0,indices:[3]}]}}));
  const r=evaluateField(decodeFieldPack(raw),glx,field36773.domain.pointing,0);
  expect(r.reasons).toEqual(['qso-merge','photographic-image']);
  expect(r.population?.qsoMatches).toEqual([7]);
  expect(r.population?.photographMatches).toEqual([3]);
 });
 it('accepts position-only witnesses for records rejected by position, and refuses them for records inside the area',()=>{
  const a=field36773.area,decode=(h:string)=>{const v=new DataView(Uint8Array.from(h.match(/../g)!,x=>parseInt(x,16)).buffer);return {ra:v.getInt32(0,true)/1e7,dec:v.getInt32(4,true)/1e5};};
  const snap=JSON.parse(JSON.stringify(field36773));let shortened=0;
  for(const r of snap.bands[0].reads){const p=decode(r.rawHex);if(!(p.ra>=a.minimumRa&&p.ra<=a.maximumRa&&p.dec>=a.minimumDec&&p.dec<=a.maximumDec)){r.rawHex=r.rawHex.slice(0,16);shortened++;}}
  expect(shortened).toBeGreaterThan(500);
  const known=evaluateField(fieldPackFromSnapshot('s',field36773 as Snap),glx,field36773.domain.pointing,0),slim=evaluateField(fieldPackFromSnapshot('s',snap),glx,field36773.domain.pointing,0);
  expect(slim.population?.stars.map(s=>s.id)).toEqual(known.population?.stars.map(s=>s.id));
  expect(sha(slim.viewport!.rgb as Uint8Array)).toBe(sha(known.viewport!.rgb as Uint8Array));
  const inside=snap.bands[0].reads.find((r:{rawHex:string})=>r.rawHex.length===54);inside.rawHex=inside.rawHex.slice(0,16);
  expect(()=>evaluateField(fieldPackFromSnapshot('s',snap),glx,field36773.domain.pointing,0)).toThrow(FieldEngineError);
 });
 it('throws evidence when a needed band read is missing, never skipping the record',()=>{
  const snap=JSON.parse(JSON.stringify(field36773));snap.bands[0].reads.splice(Math.floor(snap.bands[0].reads.length/2),1);
  expect(()=>evaluateField(fieldPackFromSnapshot('s',snap),glx,field36773.domain.pointing,0)).toThrow(FieldEngineError);
 });
 it('rejects malformed packs with typed errors',()=>{
  const code=(v:unknown)=>{try{decodeFieldPack(v);return 'ok';}catch(e){return e instanceof FieldPackError?e.code:'other';}};
  const ok={schema:FIELD_PACK_SCHEMA,id:'x',coverage:{minimumRa:1,maximumRa:2,minimumDec:0,maximumDec:1},pointings:[{ra:1.5,dec:.5}],bands:[{name:'N2230',recordCount:10,sha256:null,reads:[[1,'0'.repeat(54)],[2,'0'.repeat(54)]]}],variables:{sha256:null,recordsChecked:1,entries:[]},qso:{sha256:null,recordsChecked:1,entries:[]},photographs:{sha256:null,recordsChecked:1,entries:[]}};
  expect(code(ok)).toBe('ok');
  expect(code({...ok,schema:'v0'})).toBe('schema');
  expect(code({...ok,pointings:[]})).toBe('bounds');
  expect(code({...ok,bands:[{...ok.bands[0],reads:[[2,'0'.repeat(54)],[1,'0'.repeat(54)]]}]})).toBe('order');
  expect(code({...ok,bands:[{...ok.bands[0],reads:[[10,'0'.repeat(54)]]}]})).toBe('bounds');
  expect(code({...ok,bands:[{...ok.bands[0],reads:[[1,'zz'.repeat(27)]]}]})).toBe('record');
  expect(code({...ok,bands:[{...ok.bands[0],name:'N9999'}]})).toBe('schema');
  expect(code({...ok,coverage:{...ok.coverage,minimumRa:3}})).toBe('bounds');
  expect(code({...ok,bands:[{...ok.bands[0],sha256:'abc'}]})).toBe('identity');
  expect(code({...ok,qso:{sha256:null,recordsChecked:1,entries:[{index:4,ra:1,dec:0}]}})).toBe('bounds');
 });
 it('0x492728 cursor insert: after equal keys from below, before them from above, after an equal head',()=>{
  const gt=(a:number[],b:number[])=>a[0]>b[0];
  const ids=(xs:number[][])=>nativeCursorInsert(xs,gt).map(x=>x[1]);
  expect(ids([[5,0],[5,1],[5,2]])).toEqual([0,2,1]);// each head tie goes right after the equal head
  expect(ids([[1,0],[5,1],[5,2]])).toEqual([0,2,1]);// tie arrives from above (cursor = equal): before it
  expect(ids([[9,0],[5,1],[5,2]])).toEqual([1,2,0]);// backward to an equal head: after the head
  expect(ids([[5,0],[1,1],[5,2]])).toEqual([1,0,2]);// tie arrives from below (cursor smaller): after equal keys
  expect(ids([[3,0],[1,1],[2,2],[4,3]])).toEqual([1,2,0,3]);
 });
 it('reproduces the four LSS head-of-list tie vectors (independent review 1)',()=>{
  const at=(field:LssFieldNumber,id:string,records:number[])=>{const r=lssFieldRows(field).find(r=>r.id===id)!;return admitFieldGalaxies(glx,freshFieldArea(r)).galaxies.map(g=>g.recordIndex).filter(i=>records.includes(i));};
  expect(at(6,'IC 4395A',[17296,17297])).toEqual([17296,17297]);
  expect(at(7,'NGC 5709',[17752,17753])).toEqual([17752,17753]);
  expect(at(8,'14520+3025E',[18078,18079])).toEqual([18078,18079]);
  expect(at(9,'IC 4572',[18707,18708,18709])).toEqual([18707,18709,18708]);
 });
 it('orders equal-position galaxies preceded by a smaller one in reverse read order',()=>{
  // 15384+2831 W/S/E share one Double position (records 18707..18709).
  const {galaxies}=admitFieldGalaxies(glx,freshFieldArea({ra:15.674482603095818,dec:28.356417345271815}));
  const tied=galaxies.filter(g=>g.ra===15.674482603095818&&g.dec===28.356417345271815).map(g=>g.recordIndex);
  expect(tied).toEqual([18709,18708,18707]);
 });
});
describe('variable loading keeps only variables within the limiting magnitude (0x598572)',()=>{
 // Real CLEA_VStrs.dat records: 1791 (V0512 Per, Single 20.22, one of the 7 fainter than 20) and 7494 (EU Cnc, 20.4).
 const vstrs=new Uint8Array(readFileSync(new URL('../../public/original/variables/CLEA_VStrs.dat',import.meta.url)));
 const rec=(i:number)=>decodeNativeVariableRecord(Array.from(vstrs.subarray(i*92,i*92+92),b=>b.toString(16).padStart(2,'0')).join(''),i);
 it('a faint variable inside the area is not loaded; the same position at 20 or brighter is',()=>{
  expect(vstrs.length%92).toBe(0);
  const faint=[1791,7494].map(rec),faintCount=Array.from({length:vstrs.length/92},(_,i)=>i).filter(i=>new DataView(vstrs.buffer,vstrs.byteOffset+i*92+39,4).getFloat32(0,true)>20).length;
  expect(faintCount).toBe(7);
  for(const v of faint){
   expect(v.magnitude).toBeGreaterThan(20);
   const area=freshFieldArea({ra:v.ra,dec:v.dec});
   expect(fieldVariableAdmitted(v,area)).toBe(false);
   expect(fieldVariableAdmitted({...v,magnitude:20},area)).toBe(true);
   expect(fieldVariableAdmitted({...v,magnitude:20,dec:area.maximumDec+.01},area)).toBe(false);
  }
 });
});
