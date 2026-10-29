import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {observeObjectXSpectrum,revealObjectXSpectrum,setObjectXSpectrometerResources} from './objectXSpectrometer';
import {objectXCode} from '../core/objectXLab';
import {parseObjectXSpectrumPolicy} from '../core/objectXSpectrometer';
import {parseHtl} from '../core/hotList';
import {decodeQsoSpectrumFile,prepareQsoSource,QSO_SPECTRUM_FILE} from '../core/qsoSpectrum';
vi.setConfig({testTimeout:120000});
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const htl=parseHtl(file('hotlists/ObjectX.HTL')),qb=file('catalogs/CLEA_QSO.DAT');
const byPath:Record<string,Uint8Array>=Object.fromEntries(['spectra/QSOSpect.dat','images/GLIMAGES.LST','spectra/jspect2/JSPEC2.SPI','spectra/GLXYSP.LST','classification/A0000044.SP','classification/A0000018.SP','classification/A0000052.SP','spectra/jspect2/A0000046.SP','images/NGC2403.BMP','images/NGC4262.BMP','images/NGC4631.BMP','images/NGC4656.BMP','spectra/NGC4262.SP','spectra/NGC4449.SP','spectra/NGC4631.SP'].map(p=>['/original/'+p,file(p)]));
const at=(row:number)=>({ra:htl[row].ra,dec:htl[row].dec});
describe('Front F: Object X spectrometer API (display and reveal parts)',()=>{
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
 // Recorded outcome per row and telescope (0.4 / 0.9 / 4 m): 'A' available; otherwise the reveal-side typed reason.
 const OUTCOMES:Record<number,[string,string,readonly string[]]>={
  1:['qso','CLEA_QSO.DAT@522',['A','A','A']],10:['qso','CLEA_QSO.DAT@1356',['mean-bound','mean-bound','A']],13:['qso','CLEA_QSO.DAT@1785',['A','A','A']],
  3:['galaxy','NGC 2403',['A','mean-bound','A']],6:['galaxy','NGC 4262',['A','mean-bound','A']],8:['galaxy','NGC 4449',['mean-bound','mean-bound','A']],11:['galaxy','NGC 4631',['mean-bound','mean-bound','A']],
  4:['star','N6000.DAT@209199',['mean-bound','mean-bound','A']],5:['star','N0730.DAT@472049',['mean-bound','mean-bound','A']],9:['star','N3730.DAT@513845',['mean-bound','mean-bound','A']],12:['star','N3000.DAT@483032',['mean-bound','mean-bound','A']]};
 it('every spectroscopy row: the display holds only status and telescope; the separate reveal holds row, kind, record and reasons',async()=>{
  for(const [row,[kind,id,states]] of Object.entries(OUTCOMES))for(const t of [0,1,2] as const){
   const v=await observeObjectXSpectrum(at(Number(row)),t),r=await revealObjectXSpectrum(at(Number(row)),t);
   expect(Object.keys(v).sort()).toEqual(v.status==='available'?['engine','status','telescope','wavelengths']:['status','telescope']);
   expect(JSON.stringify({...v,engine:undefined})).not.toMatch(/QSO|NGC|\.DAT|\.BMP|\.SP|A0000|galaxy|star|qso/i);
   expect([row,t,v.status==='available'?'A':r.reasons.join()]).toEqual([row,t,states[t]]);
   expect(r).toMatchObject({row:Number(row),kind,recordId:id});
   if(v.status==='available'){
    expect(v.wavelengths[0]).toBe(3700);const p=parseObjectXSpectrumPolicy(v.engine.policy);expect(p).toEqual({code:objectXCode(htl[Number(row)].id),telescope:t});
    expect(v.engine.policy).not.toMatch(/R\d/);// never the ObjectX.HTL row
    const s=v.engine.replay(11,[{kind:'start'},{kind:'tick',deltaMs:1000},{kind:'pause'}]);expect(s.exposure.sourceTotal).toBeGreaterThan(0);expect(()=>v.engine.start({...s,policy:'other'} as typeof s)).toThrow();
   }
  }
 });
 it('unavailable displays are identical for star, galaxy, QSO, pulsar and asteroid rows; only the reveal tells them apart',async()=>{
  const shown=[];for(const row of [9,8,10,0,7])shown.push(JSON.stringify(await observeObjectXSpectrum(at(row),0)));
  expect(new Set(shown)).toEqual(new Set([JSON.stringify({status:'unavailable',telescope:0})]));
  for(const row of [0,2,7,14,15,16])expect(await revealObjectXSpectrum(at(row),2)).toEqual({row:null,kind:null,recordId:null,headerMagnitude:null,reasons:['not-a-target'],pixelLevel:null});
  expect(await observeObjectXSpectrum({ra:at(1).ra,dec:at(1).dec+1e-9},0)).toEqual({status:'unavailable',telescope:0});
 });
 it('GLXYSP guard: a galaxy whose own spectrum is not supplied is the typed spectrum-mapping reason, never the fallback template',async()=>{
  const {loadObjectXSpectrometerInputs}=await import('./objectXSpectrometerInputs');const {evaluateObjectXSpectrum}=await import('../core/objectXSpectrometer');
  const inputs=await loadObjectXSpectrometerInputs({glx:async()=>file('catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>byPath[p],objectXHotList:async()=>file('hotlists/ObjectX.HTL')});
  const without={...inputs,galaxySpectra:new Map([...inputs.galaxySpectra].filter(([f])=>f!=='NGC4262.SP'))};
  const e=evaluateObjectXSpectrum(without,at(6),2);expect(e.display.status).toBe('unavailable');expect(e.reveal.reasons).toEqual(['spectrum-mapping']);
  // NGC 2403 has no GLXYSP.LST line: it keeps the fallback template legitimately.
  expect(evaluateObjectXSpectrum(without,at(3),2).display.status).toBe('available');
 });
 it('everything is loaded once, up front, whatever the target',async()=>{
  const fetched:string[]=[];setObjectXSpectrometerResources({glx:async()=>file('catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>{fetched.push(p);return byPath[p];},objectXHotList:async()=>file('hotlists/ObjectX.HTL')});
  await observeObjectXSpectrum(at(8),0);const before=fetched.length;await observeObjectXSpectrum(at(3),0);await observeObjectXSpectrum(at(13),0);await observeObjectXSpectrum(at(0),0);expect(fetched.length).toBe(before);
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
