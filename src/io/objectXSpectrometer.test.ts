import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {observeObjectXSpectrum,setObjectXSpectrometerResources} from './objectXSpectrometer';
import {parseObjectXSpectrumPolicy} from '../core/objectXSpectrometer';
import {parseHtl} from '../core/hotList';
import {decodeQsoSpectrumFile,prepareQsoSource,QSO_SPECTRUM_FILE} from '../core/qsoSpectrum';
vi.setConfig({testTimeout:120000});
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const htl=parseHtl(file('hotlists/ObjectX.HTL')),qb=file('catalogs/CLEA_QSO.DAT');
const byPath:Record<string,Uint8Array>={'/original/spectra/QSOSpect.dat':file('spectra/QSOSpect.dat'),'/original/images/GLIMAGES.LST':file('images/GLIMAGES.LST')};
const at=(row:number)=>({ra:htl[row].ra,dec:htl[row].dec});
describe('Front F: Object X spectrometer API (QSO branch available; stars and galaxies typed)',()=>{
 beforeAll(()=>{vi.stubGlobal('crypto',webcrypto);setObjectXSpectrometerResources({glx:async()=>file('catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>byPath[p],objectXHotList:async()=>file('hotlists/ObjectX.HTL')});});
 afterAll(()=>{setObjectXSpectrometerResources(null);vi.unstubAllGlobals();});
 it('QSOSpect.dat decodes and the 0x55e330 window keeps the trailing unread slot',()=>{
  const b=file('spectra/QSOSpect.dat');expect([b.byteLength,sha(b)]).toEqual([QSO_SPECTRUM_FILE.bytes,QSO_SPECTRUM_FILE.sha256]);
  const s=prepareQsoSource(decodeQsoSpectrumFile(b),Math.fround(0.158),4000,5000);
  expect(s.firstRecord).toBe(Math.round(4000/(1+Math.fround(0.158))-302));expect(s.count).toBe(Math.round(s.restMaximum-s.restMinimum)+1);
  expect(s.spectrum.intensities).toHaveLength(s.count+1);expect(s.spectrum.intensities.at(-1)).toBe(0);expect(Math.max(...s.spectrum.intensities)).toBe(1);
  expect(s.spectrum.step).toBe((s.restMaximum-s.restMinimum)/s.count);
  // Clamp to the file: z = 2.51 at 1000–1200 Å would start below 302 Å.
  expect(prepareQsoSource(decodeQsoSpectrumFile(b),2.51,1000,1200).restMinimum).toBe(302);
 });
 it('each QSO row: available where the existing mean bound allows; no name in the display fields',async()=>{
  const got:Record<number,string[]>={};
  for(const row of [1,10,13])for(const t of [0,1,2] as const){
   const r=await observeObjectXSpectrum(at(row),t);(got[row]??=[]).push(r.status==='available'?'available':r.reason);
   const shown=JSON.stringify({...r,revealDetail:undefined,engine:undefined});expect(shown).not.toMatch(/QSO|HE |3C|HS |NGC|CLEA_/);
   if(r.status==='available'){expect(r.revealDetail.kind).toBe('qso');expect(parseObjectXSpectrumPolicy(r.engine.policy)).toEqual({row,telescope:t});
    const s=r.engine.replay(7,[{kind:'start'},{kind:'tick',deltaMs:1000},{kind:'pause'}]);expect(s.exposure.sourceTotal).toBeGreaterThan(0);expect(()=>r.engine.start({...s,policy:'other'} as typeof s)).toThrow();}
  }
  expect(got).toEqual({1:['available','available','available'],10:['telescope','telescope','available'],13:['available','available','available']});
 });
 it('stars and galaxies are typed not-recovered (photographic association; NGC 4631 also its variable); other pointings are not targets',async()=>{
  for(const row of [3,4,5,6,8,9,11,12]){const r=await observeObjectXSpectrum(at(row),0);expect(r).toMatchObject({status:'unavailable',reason:'not-recovered',targetKey:row});if(r.status==='unavailable')expect(r.revealDetail.reasons).toContain('photographic-image');}
  for(const row of [0,2,7,14,15,16])expect(await observeObjectXSpectrum(at(row),0)).toMatchObject({status:'unavailable',reason:'not-a-target',targetKey:null});
  expect(await observeObjectXSpectrum({ra:at(1).ra,dec:at(1).dec+1e-9},0)).toMatchObject({reason:'not-a-target'});
 });
});
describe('Object X spectroscopy packs reproduce the independent witnesses',()=>{
 it('band order, initial stars, QSO operations (3C 273 replaces its GSC star), final order and galaxies',async()=>{
  const {buildFieldPopulation}=await import('../core/fieldEngine');const {decodeFieldPack}=await import('../core/fieldPack');
  const w=JSON.parse(readFileSync(new URL('../../data/objectx/witnesses.json',import.meta.url),'utf8'));
  const packs=['he0353','ngc2403','ngc4262','ngc4449','3c273','ngc4631','hs1603'].map(g=>decodeFieldPack(JSON.parse(readFileSync(new URL(`../../data/objectx/spectra-${g}.json`,import.meta.url),'utf8'))));
  for(const x of w.pointings){
   const pack=packs.find(p=>p.pointings.some(q=>q.ra===x.pointing.ra&&q.dec===x.pointing.dec))!;
   const {population:p}=buildFieldPopulation(pack,file('catalogs/CLEA_GLX.DAT'),x.pointing,{qso:'merge',qsoCatalog:{bytes:qb,sha256:sha(qb)}});
   expect(p!.bandOrder).toEqual(x.bandOrder);expect(sha(new TextEncoder().encode(p!.initialStarIds.join(',')))).toBe(x.initialStarIdsSHA256);
   expect(p!.qsoMatches.map(i=>`CLEA_QSO.DAT@${i}`)).toEqual(x.qso);
   if(!x.modelled)continue;
   expect(p!.qsoStage?.witnesses.map(o=>[o.qso,o.operation,o.operation==='replace'?o.replacedId:o.position])??[]).toEqual(x.qsoOperations);
   expect(p!.stars).toHaveLength(x.finalStars);expect(sha(new TextEncoder().encode(p!.stars.map(s=>s.id).join(',')))).toBe(x.finalStarIdsSHA256);expect(p!.galaxies.map(g=>g.recordIndex)).toEqual(x.galaxies);
  }
 });
});
