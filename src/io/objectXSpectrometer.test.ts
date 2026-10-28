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
const byPath:Record<string,Uint8Array>=Object.fromEntries(['spectra/QSOSpect.dat','images/GLIMAGES.LST','spectra/jspect2/JSPEC2.SPI','spectra/GLXYSP.LST','classification/A0000044.SP','classification/A0000018.SP','classification/A0000052.SP','spectra/jspect2/A0000046.SP','images/NGC2403.BMP','images/NGC4262.BMP','images/NGC4631.BMP','images/NGC4656.BMP','spectra/NGC4262.SP','spectra/NGC4449.SP','spectra/NGC4631.SP'].map(p=>['/original/'+p,file(p)]));
const at=(row:number)=>({ra:htl[row].ra,dec:htl[row].dec});
describe('Front F: Object X spectrometer API (QSO, galaxy and star branches)',()=>{
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
 it('the NGC 4449 galaxy (own NGC4449.SP) and the row-9 star (A0000044) are observable on the 4 m; bright on smaller telescopes',async()=>{
  for(const [row,kind,id] of [[8,'galaxy','NGC 4449'],[9,'star','N3730.DAT@513845']] as const){
   for(const t of [0,1] as const)expect(await observeObjectXSpectrum(at(row),t)).toMatchObject({status:'unavailable',reason:'telescope'});
   const r=await observeObjectXSpectrum(at(row),2);expect(r.status).toBe('available');if(r.status==='available'){expect(r.revealDetail).toEqual({kind,recordId:id});expect(r.wavelengths[0]).toBe(3700);}
  }
 });
 it('photograph rows: galaxies drawn from their approved BMPs, stars through the 0x50d660 matcher; every row observable on the 4 m',async()=>{
  const expected:Record<number,[string,string,string[]]>={
   3:['galaxy','NGC 2403',['available','telescope','available']],4:['star','N6000.DAT@209199',['telescope','telescope','available']],
   5:['star','N0730.DAT@472049',['telescope','telescope','available']],6:['galaxy','NGC 4262',['available','telescope','available']],
   11:['galaxy','NGC 4631',['telescope','telescope','available']],12:['star','N3000.DAT@483032',['telescope','telescope','available']]};
  for(const [row,[kind,id,states]] of Object.entries(expected)){
   const got:string[]=[];
   for(const t of [0,1,2] as const){const r=await observeObjectXSpectrum(at(Number(row)),t);got.push(r.status==='available'?'available':r.reason);
    const shown=JSON.stringify({...r,revealDetail:undefined,engine:undefined});expect(shown).not.toMatch(/NGC|\.DAT|\.BMP|\.SP|A0000/);
    if(r.status==='available'){expect(r.revealDetail).toEqual({kind,recordId:id});expect(r.wavelengths[0]).toBe(3700);
     const s=r.engine.replay(11,[{kind:'start'},{kind:'tick',deltaMs:1000},{kind:'pause'}]);expect(s.exposure.sourceTotal).toBeGreaterThan(0);}}
   expect(got).toEqual(states);
  }
 });
 it('other pointings are not targets',async()=>{
  for(const row of [0,2,7,14,15,16])expect(await observeObjectXSpectrum(at(row),0)).toMatchObject({status:'unavailable',reason:'not-a-target',targetKey:null});
  expect(await observeObjectXSpectrum({ra:at(1).ra,dec:at(1).dec+1e-9},0)).toMatchObject({reason:'not-a-target'});
 });
 it('unavailable results are kind-neutral: same fields, the reason from the same domain, no per-kind resource fetch',async()=>{
  const fetched:string[]=[];setObjectXSpectrometerResources({glx:async()=>file('catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>{fetched.push(p);return byPath[p];},objectXHotList:async()=>file('hotlists/ObjectX.HTL')});
  const shown=async(row:number,t:0|1|2)=>{const r=await observeObjectXSpectrum(at(row),t);const {revealDetail,...rest}=r;void revealDetail;return rest;};
  // galaxy (8), star (9) and QSO (10) rows on the 0.4 m: identical shape and reason; only the row key differs.
  const [g,s,q]=[await shown(8,0),await shown(9,0),await shown(10,0)];
  expect([g,s,q].map(x=>({...x,targetKey:0}))).toEqual([0,0,0].map(()=>({status:'unavailable',targetKey:0,telescope:0,reason:'telescope'})));
  const before=fetched.length;await shown(3,0);await shown(13,0);expect(fetched.length).toBe(before);// everything is loaded once, up front
 });
});
describe('Object X spectroscopy packs reproduce the independent witnesses',()=>{
 it('band order, initial stars, QSO operations (3C 273 replaces its GSC star), final order and galaxies',async()=>{
  const {buildFieldPopulation}=await import('../core/fieldEngine');const {decodeFieldPack}=await import('../core/fieldPack');
  const w=JSON.parse(readFileSync(new URL('../../data/objectx/witnesses.json',import.meta.url),'utf8'));
  const {packWithPhotographs}=await import('../core/lssLists');const {nativePhotographRows}=await import('../core/photographicList');
  const {decodeStarIndexList,lookupStarTemplate,compactSpectralIndex}=await import('../core/starTemplates');
  const rows=nativePhotographRows(file('images/GLIMAGES.LST')),spi=decodeStarIndexList(file('spectra/jspect2/JSPEC2.SPI'));
  expect(w.pointings.every((x:{modelled:boolean})=>x.modelled)).toBe(true);
  const packs=['he0353','ngc2403','ngc4262','ngc4449','3c273','ngc4631','hs1603'].map(g=>decodeFieldPack(JSON.parse(readFileSync(new URL(`../../data/objectx/spectra-${g}.json`,import.meta.url),'utf8'))));
  for(const x of w.pointings){
   const pack=packs.find(p=>p.pointings.some(q=>q.ra===x.pointing.ra&&q.dec===x.pointing.dec))!;
   const {population:p}=buildFieldPopulation(packWithPhotographs(pack,rows),file('catalogs/CLEA_GLX.DAT'),x.pointing,{qso:'merge',qsoCatalog:{bytes:qb,sha256:sha(qb)},variableDispatch:'recovered',photographs:{rows,bitmaps:new Map()}});
   expect(p!.bandOrder).toEqual(x.bandOrder);expect(sha(new TextEncoder().encode(p!.initialStarIds.join(',')))).toBe(x.initialStarIdsSHA256);
   expect(p!.qsoMatches.map(i=>`CLEA_QSO.DAT@${i}`)).toEqual(x.qso);
   if(!x.modelled)continue;
   expect(p!.qsoStage?.witnesses.map(o=>[o.qso,o.operation,o.operation==='replace'?o.replacedId:o.position])??[]).toEqual(x.qsoOperations);
   expect(p!.stars).toHaveLength(x.finalStars);expect(sha(new TextEncoder().encode(p!.stars.map(s=>s.id).join(',')))).toBe(x.finalStarIdsSHA256);expect(p!.galaxies.map(g=>g.recordIndex)).toEqual(x.galaxies);
   expect(p!.photographAssociations).toEqual(x.photographAssociations);
   if(x.selectedStar){const st=p!.stars.find(s=>s.id===x.selectedStar.id)!;expect(compactSpectralIndex((st as {rawHex:string}).rawHex)).toBe(x.selectedStar.spectralIndex);expect(lookupStarTemplate(spi,x.selectedStar.spectralIndex)).toBe(x.selectedStar.template.toUpperCase());}
  }
 });
});
