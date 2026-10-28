import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {observeObjectXSpectrum,setObjectXSpectrometerResources} from './objectXSpectrometer';
import {OBJECT_X_SPECTRA_LIMITS,admitObjectXSpectra,portableObjectXSpectra,readObjectXSpectra,setObjectXSpectraSources,type ObjectXSpectrumRecord} from './objectXSpectra';
import {readAnalysisSession,serializeAnalysisSession,AnalysisSessionError,type AnalysisSession} from './analysisSession';
import {parseHtl} from '../core/hotList';
import {objectXCode} from '../core/objectXLab';
import {INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import type {ObjectXInvestigation} from './objectXInvestigation';
vi.setConfig({testTimeout:120000});
// E08 kept spectra in the v29 wrapper: replayed on restore, never naming the object (D5).
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const qb=file('catalogs/CLEA_QSO.DAT'),htlBytes=file('hotlists/ObjectX.HTL'),htl=parseHtl(htlBytes);
const SECRETS=htl.flatMap(r=>[r.id.trim(),r.remarks.trim()]).filter(Boolean);
const base:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
const inv=(code:string,spectra?:readonly ObjectXSpectrumRecord[]):ObjectXInvestigation=>({orbitFile:'ObjX_MPC.CMO.sav',id:'7',target:code,startUtc:'2009-06-01T04:00:00',clockSet:false,listJd:null,limit:16,exposures:[],images:[],measure:null,log:[],answer:null,description:'',revealed:false,...(spectra?{spectra}:{})});
const read=(text:string)=>readAnalysisSession(new File([text],'objx.json'));
async function kept(row:number,telescope:0|1|2,label:string):Promise<ObjectXSpectrumRecord>{
 const v=await observeObjectXSpectrum({ra:htl[row].ra,dec:htl[row].dec},telescope);if(v.status!=='available')throw Error('row '+row);
 let s=v.engine.activate(v.engine.create(99));s=v.engine.start(s);s=v.engine.tick(s,1000);s=v.engine.tick(s,500);s=v.engine.pause(s);
 return {label,code:objectXCode(htl[row].id),telescope,seedAtReset:s.seedAtReset,events:s.events};
}
beforeAll(()=>{
 vi.stubGlobal('crypto',webcrypto);
 setObjectXSpectrometerResources({glx:async()=>file('catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>file(p.replace('/original/','')),objectXHotList:async()=>htlBytes});
 setObjectXSpectraSources({hotList:async()=>htl,observe:observeObjectXSpectrum});
});
afterAll(()=>{setObjectXSpectrometerResources(null);setObjectXSpectraSources(null);vi.unstubAllGlobals();});
describe('kept Object X spectra (v29)',()=>{
 it('star, galaxy and QSO spectra round-trip in the v29 wrapper; the file names no object, kind or record',async()=>{
  const spectra=[await kept(9,2,'ObjX-7-S01'),await kept(8,2,'ObjX-7-S02'),await kept(1,0,'ObjX-7-S03')];
  const text=await serializeAnalysisSession({...base,objectX:inv(spectra[0].code,spectra)}),v=JSON.parse(text);
  expect(v.version).toBe(29);expect(v.base.version).toBe(28);expect(v.objectXSpectra).toEqual(portableObjectXSpectra(spectra));
  expect(JSON.stringify(v.base)).not.toContain('objectXSpectra');expect(v.base.objectX.spectra).toBeUndefined();// the v28 section is unchanged
  for(const s of SECRETS)expect(text.includes(s),s).toBe(false);
  // The base's analyzer setting "reference": "galaxy" (a spectrum-analyzer mode, present in every session) is not about the object.
  expect(text.replace(/"reference": "galaxy"/,'')).not.toMatch(/\.DAT@|A00000\d\d|\.BMP|"(star|galaxy|qso)"/i);
  const back=await read(text);expect(back.objectX?.spectra).toEqual(spectra);
  // A session without kept spectra stays v28.
  expect(JSON.parse(await serializeAnalysisSession({...base,objectX:inv(spectra[0].code)})).version).toBe(28);
 });
 it('restore replays: an altered journal, an unknown code or a code without a spectrum rejects the file',async()=>{
  const good=await kept(9,2,'ObjX-7-S01'),text=await serializeAnalysisSession({...base,objectX:inv(good.code,[good])});
  const variant=(f:(r:Record<string,unknown>)=>void)=>{const v=JSON.parse(text);f(v.objectXSpectra[0]);return JSON.stringify(v);};
  for(const t of [variant(r=>{(r.events as {deltaMs?:number}[])[1].deltaMs=5000;}),variant(r=>{r.code='X-AAAAA';}),variant(r=>{r.code=objectXCode(htl[0].id);}),variant(r=>{r.events=[{kind:'start'}];})])
   await expect(read(t)).rejects.toMatchObject({code:'state'});
  // Kept spectra need the Object X investigation they belong to.
  const v=JSON.parse(text);v.base=v.base.base;await expect(read(JSON.stringify(v))).rejects.toBeInstanceOf(AnalysisSessionError);
 });
 it('a loading failure is the retryable resources error; shape bounds are enforced',async()=>{
  const good=await kept(1,0,'ObjX-7-S01'),text=await serializeAnalysisSession({...base,objectX:inv(good.code,[good])});
  setObjectXSpectraSources({hotList:async()=>{throw Error('network');},observe:observeObjectXSpectrum});
  try{await expect(read(text)).rejects.toMatchObject({code:'resources'});}finally{setObjectXSpectraSources({hotList:async()=>htl,observe:observeObjectXSpectrum});}
  expect(()=>readObjectXSpectra(Array(OBJECT_X_SPECTRA_LIMITS.spectra+1).fill((portableObjectXSpectra([good]) as object[])[0]))).toThrow();
  expect(()=>readObjectXSpectra([{...(portableObjectXSpectra([good]) as object[])[0],label:'x'.repeat(41)}])).toThrow();
  expect(()=>readObjectXSpectra([{...(portableObjectXSpectra([good]) as object[])[0],extra:1}])).toThrow();
  // Combined budget before replay: 8 journals of 3001 events each (24008 > 24000) are refused without any replay.
  const heavy={...(portableObjectXSpectra([good]) as object[])[0],events:[{kind:'start'},...Array.from({length:2999},()=>({kind:'tick',deltaMs:1})),{kind:'pause'}]};
  let observed=0;setObjectXSpectraSources({hotList:async()=>htl,observe:async(...a)=>{observed++;return observeObjectXSpectrum(...a);}});
  try{await expect(admitObjectXSpectra(Array(8).fill(heavy))).rejects.toMatchObject({code:'format'});expect(observed).toBe(0);}finally{setObjectXSpectraSources({hotList:async()=>htl,observe:observeObjectXSpectrum});}
  expect(await admitObjectXSpectra(portableObjectXSpectra([good]))).toEqual([good]);
 });
});
