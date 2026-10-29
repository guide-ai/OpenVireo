import {describe,it,expect} from 'vitest';
import {repositoryLssSpectrumInputs} from '../io/lssSpectrumInputs.node';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import frozen from '../../data/hubble/existing-target-fingerprints.json';
import {verifiedGalaxyConfiguration,galaxyDefinition,replayGalaxy,galaxyCountsCsv} from './galaxyExposure';
import type {JournalEvent} from './exposureJournal';
import {decodeFieldPack} from './fieldPack';
import {evaluateLssRow} from './lssExposure';
import {parseGlimagesPositions,packWithPhotographs} from './lssLists';
import {lssFieldRows,type LssFieldNumber} from './lssFields';
/** Front F M0: the 14 existing (target, telescope) pairs and the 219×3 LSS evaluations, frozen at the Front F base (main 612e846)
 * before any engine change. Regenerate only with OPENVIREO_FREEZE_FINGERPRINTS=1 on an unchanged engine; a diff here means an
 * existing exercise changed. */
const sha=(v:string|NodeJS.ArrayBufferView)=>createHash('sha256').update(v).digest('hex');
const f64=(values:readonly number[])=>sha(new Uint8Array(Float64Array.from(values).buffer));
export const EXISTING_PAIRS:readonly (readonly [string,0|1|2])[]=[
 ['36773',0],['36773',1],['36773',2],['36747',0],['36747',1],['36747',2],['54876',0],['54876',1],['54876',2],
 ['54875',0],['54891',0],['NGC 7501',0],['NGC 7499',0],['NGC 7503',0]];
/** Five journal trajectories: plain, paused/resumed, zero-length ticks, maximum ticks, extreme seeds. */
const TRAJECTORIES:readonly Readonly<{seed:number;events:readonly JournalEvent[]}>[]=[
 {seed:1,events:[{kind:'start'},{kind:'tick',deltaMs:1000},{kind:'tick',deltaMs:1000},{kind:'pause'}]},
 {seed:42,events:[{kind:'start'},{kind:'tick',deltaMs:250},{kind:'pause'},{kind:'start'},{kind:'tick',deltaMs:750},{kind:'pause'}]},
 {seed:123456789,events:[{kind:'start'},{kind:'tick',deltaMs:0},{kind:'tick',deltaMs:1},{kind:'tick',deltaMs:999},{kind:'pause'}]},
 {seed:4294967295,events:[{kind:'start'},...Array.from({length:12},()=>({kind:'tick' as const,deltaMs:1000})),{kind:'pause'}]},
 {seed:0,events:[{kind:'start'},{kind:'tick',deltaMs:333},{kind:'pause'}]},
];
function pairFingerprint(id:string,index:0|1|2){
 const c=verifiedGalaxyConfiguration(id,index),d=galaxyDefinition(id,index);
 return {id,telescope:index,policyId:d.policyId,cropSHA256:sha(c.viewport.rgb),pixelLevel:c.pixelLevel,fraction:c.fraction,zeroPoint:c.zeroPoint,
  instrumentMagnitude:c.instrumentMagnitude,sourceAmplitude:c.amplitude.source,skyAmplitude:c.amplitude.sky,meansSHA256:f64(c.sourceMeans),wavelengthsSHA256:f64(c.wavelengths),
  trajectories:TRAJECTORIES.map(t=>{const s=replayGalaxy(t.seed,t.events,id,index),e=s.exposure;return {seed:t.seed,countsSHA256:f64(e.counts),sourceTotal:e.sourceTotal,skyTotal:e.skyTotal,draws:e.draws,elapsedMs:e.elapsedMs,finalSeed:e.seed,csvSHA256:sha(galaxyCountsCsv(s))};})};
}
const glx=new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url)));
const original=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
function lssFingerprints(){
 const photographs=parseGlimagesPositions(original('images/GLIMAGES.LST')),spectra=repositoryLssSpectrumInputs(),out:string[]=[];
 for(let f=1;f<=9;f++){
  const pack=packWithPhotographs(decodeFieldPack(JSON.parse(readFileSync(new URL(`../../data/lss/lss-field-0${f}.json`,import.meta.url)).toString())),photographs);
  for(const row of lssFieldRows(f as LssFieldNumber))for(const t of [0,1,2] as const){
   const s=evaluateLssRow(pack,glx,row,t,spectra),r=s.result;
   out.push([`F${f}R${row.index+1}T${t}`,s.kind,s.kind==='unavailable'?s.reasons.join('+'):s.selectedIndex,r?.viewport?sha(r.viewport.rgb):'-',r?.calibration?`${r.calibration.pixelLevel}/${r.calibration.fraction}/${f64(r.calibration.sourceMeans)}`:'-'].join('|'));
  }
 }
 return out;
}
describe('Front F M0: existing Hubble targets and LSS rows stay byte-identical',()=>{
 if(process.env.OPENVIREO_FREEZE_FINGERPRINTS==='1')it('regenerates the frozen fingerprints',()=>{
  const lss=lssFingerprints();
  writeFileSync(new URL('../../data/hubble/existing-target-fingerprints.json',import.meta.url),JSON.stringify({schema:'openvireo-existing-target-fingerprints-v1',base:'main 612e846 (Front F base)',pairs:EXISTING_PAIRS.map(([id,i])=>pairFingerprint(id,i)),lssRows:lss.length,lssSHA256:sha(lss.join('\n')),lss},null,1)+'\n');
 },600000);
 for(const [id,index] of EXISTING_PAIRS)it(`${id} on telescope record ${index}`,()=>{
  expect(pairFingerprint(id,index)).toEqual(frozen.pairs.find(p=>p.id===id&&p.telescope===index));
 });
 it('covers exactly the 14 frozen pairs',()=>{expect(frozen.pairs.map(p=>[p.id,p.telescope])).toEqual(EXISTING_PAIRS.map(p=>[...p]));});
 it('all 219 LSS rows on telescope records 0, 1 and 2 (reasons, selection, crop and calibration)',()=>{
  const lss=lssFingerprints();expect(lss).toHaveLength(657);expect(lss).toEqual(frozen.lss);expect(sha(lss.join('\n'))).toBe(frozen.lssSHA256);
 },600000);
});
