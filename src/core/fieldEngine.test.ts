import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import field36773 from '../../data/hubble/pinned-galaxy-field.json';
import field36747 from '../../data/hubble/pinned-galaxy-36747-field.json';
import field54876 from '../../data/hubble/pinned-galaxy-54876-field.json';
import fieldPegasus from '../../data/hubble/pinned-pegasus-field.json';
import exposureVectors from '../../data/hubble/galaxy-exposure-vectors.json';
import {fieldPackFromSnapshot,decodeFieldPack,FieldPackError,FIELD_PACK_SCHEMA} from './fieldPack';
import {evaluateField,buildFieldPopulation,admitFieldGalaxies,createFieldExposure,freshFieldArea,FieldEngineError,type FieldTelescope} from './fieldEngine';
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
  const raw=JSON.parse(JSON.stringify({schema:FIELD_PACK_SCHEMA,id:'gated',coverage:{minimumRa:a.minimumRa,maximumRa:a.maximumRa,minimumDec:a.minimumDec,maximumDec:a.maximumDec},
   bands:field36773.bands.map(b=>({name:b.name,recordCount:b.recordCount,sha256:null,reads:b.reads.map(r=>[r.index,r.rawHex])})),
   variables:{sha256:null,recordsChecked:31147,entries:[]},qso:{sha256:null,recordsChecked:2269,entries:[{index:7,...mid}]},photographs:{sha256:null,recordsChecked:183,entries:[{index:3,...mid}]}}));
  const r=evaluateField(decodeFieldPack(raw),glx,field36773.domain.pointing,0);
  expect(r.reasons).toEqual(['qso-merge','photographic-image']);
  expect(r.population?.qsoMatches).toEqual([7]);
 });
 it('throws evidence when a needed band read is missing, never skipping the record',()=>{
  const snap=JSON.parse(JSON.stringify(field36773));snap.bands[0].reads.splice(Math.floor(snap.bands[0].reads.length/2),1);
  expect(()=>evaluateField(fieldPackFromSnapshot('s',snap),glx,field36773.domain.pointing,0)).toThrow(FieldEngineError);
 });
 it('rejects malformed packs with typed errors',()=>{
  const code=(v:unknown)=>{try{decodeFieldPack(v);return 'ok';}catch(e){return e instanceof FieldPackError?e.code:'other';}};
  const ok={schema:FIELD_PACK_SCHEMA,id:'x',coverage:{minimumRa:1,maximumRa:2,minimumDec:0,maximumDec:1},bands:[{name:'N2230',recordCount:10,sha256:null,reads:[[1,'0'.repeat(54)],[2,'0'.repeat(54)]]}],variables:{sha256:null,recordsChecked:1,entries:[]},qso:{sha256:null,recordsChecked:1,entries:[]},photographs:{sha256:null,recordsChecked:1,entries:[]}};
  expect(code(ok)).toBe('ok');
  expect(code({...ok,schema:'v0'})).toBe('schema');
  expect(code({...ok,bands:[{...ok.bands[0],reads:[[2,'0'.repeat(54)],[1,'0'.repeat(54)]]}]})).toBe('order');
  expect(code({...ok,bands:[{...ok.bands[0],reads:[[10,'0'.repeat(54)]]}]})).toBe('bounds');
  expect(code({...ok,bands:[{...ok.bands[0],reads:[[1,'zz'.repeat(27)]]}]})).toBe('record');
  expect(code({...ok,bands:[{...ok.bands[0],name:'N9999'}]})).toBe('schema');
  expect(code({...ok,coverage:{...ok.coverage,minimumRa:3}})).toBe('bounds');
  expect(code({...ok,bands:[{...ok.bands[0],sha256:'abc'}]})).toBe('identity');
  expect(code({...ok,qso:{sha256:null,recordsChecked:1,entries:[{index:4,ra:1,dec:0}]}})).toBe('bounds');
 });
 it('orders equal-position galaxies in reverse read order (insert before equal keys)',()=>{
  // 15384+2831 W/S/E share one Double position (records 18707..18709).
  const {galaxies}=admitFieldGalaxies(glx,freshFieldArea({ra:15.674482603095818,dec:28.356417345271815}));
  const tied=galaxies.filter(g=>g.ra===15.674482603095818&&g.dec===28.356417345271815).map(g=>g.recordIndex);
  expect(tied).toEqual([18709,18708,18707]);
 });
});
