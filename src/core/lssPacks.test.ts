import {describe,it,expect} from 'vitest';
import {repositoryLssSpectrumInputs} from '../io/lssSpectrumInputs.node';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import witnesses from '../../data/lss/lss-witnesses.json';
import {decodeFieldPack} from './fieldPack';
import {buildFieldPopulation} from './fieldEngine';
import {evaluateLssRow} from './lssExposure';
import {parseGlimagesPositions,packWithPhotographs,hasLibrarySpectrum} from './lssLists';
import {lssFieldRows,type LssFieldNumber} from './lssFields';
// Published bounded packs (2026-10-27 approval) against the independent whole-source Python witnesses.
const glx=new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url)));
const raw=(f:number)=>readFileSync(new URL(`../../data/lss/lss-field-0${f}.json`,import.meta.url));
const sha=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
const original=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const photographs=parseGlimagesPositions(original('images/GLIMAGES.LST')),spectra=repositoryLssSpectrumInputs();
describe('LSS field packs reproduce the independent witnesses for every row',()=>{
 for(const w of witnesses.fields)it(`field ${w.field}`,()=>{
  const bytes=raw(w.field);expect(sha(bytes)).toBe(w.packSHA256);
  const packed=decodeFieldPack(JSON.parse(bytes.toString())),pack=packWithPhotographs(packed,photographs);
  // The byte-exact GLIMAGES.LST gives the same per-pointing matches the pack was built with.
  expect(pack.photographs.entries).toEqual(packed.photographs.entries);
  expect(pack.bands.map(b=>b.name).sort()).toEqual(['N2230','N3000']);
  const rows=lssFieldRows(w.field as LssFieldNumber);expect(w.pointings).toHaveLength(rows.length);
  for(const p of w.pointings){
   const row=rows[p.row],{population}=buildFieldPopulation(pack,glx,{ra:row.ra,dec:row.dec}),q=population!;
   expect(q.regionIds).toEqual(p.regionIds);expect(q.bandOrder).toEqual(p.bandOrder);
   expect(q.initialStarIds).toHaveLength(p.initialStars);expect(sha(q.initialStarIds.join(','))).toBe(p.initialStarIdsSHA256);
   expect(q.galaxyAdmissionIds).toEqual(p.galaxyAdmission);expect(q.galaxies.map(g=>g.recordIndex)).toEqual(p.galaxyOrder);
   expect(q.variables.map(v=>v.recordIndex)).toEqual(p.variables);expect(q.qsoMatches).toEqual(p.qso);expect(q.photographMatches).toEqual(p.photographs);
  }
 });
 it('re-derives the acquirable rows per telescope without a variable time (0.4 m 187, 0.9 m 93, 4 m 189 of 219 with the Front L2 QSO merge; 157/86/158 under the QSO gate, 140/76/141 before the Front T TRUE dispatch, 129/69/130 before the recovered variable dispatch)',()=>{
  const counts=[0,0,0],mapped:string[]=[];
  for(let f=1;f<=9;f++){const pack=packWithPhotographs(decodeFieldPack(JSON.parse(raw(f).toString())),photographs);for(const row of lssFieldRows(f as LssFieldNumber))for(const t of [0,1,2] as const){const s=evaluateLssRow(pack,glx,row,t,spectra);if(s.kind!=='unavailable')counts[t]++;else if(s.reasons.includes('spectrum-mapping')){counts[t]++;mapped.push(`${row.id}@${t}`);}}}
  expect(counts).toEqual([187,93,189]);
  expect(mapped).toEqual([]);// NGC 4670 and NGC 4889 match GLXYSP.LST and are observed with their bundled own spectra
  expect(['NGC 4670','NGC 4889'].every(id=>hasLibrarySpectrum(spectra.names,id))).toBe(true);
 },600000);// 657 field evaluations (as hubbleExistingTargets.test.ts). Measured in review 1 at load average ~40 on 32 cores: 126 s on
 // the QSO-gate base, 181 s with the merge (the 35 formerly gated rows now evaluate fully); about 60 s on an idle machine.
 it('Front L2: NGC 4670 (F3 row 1) and NGC 4889 (F4 row 2) are observed with their own bundled spectra; without the file the row stays typed',()=>{
  const pack3=packWithPhotographs(decodeFieldPack(JSON.parse(raw(3).toString())),photographs),pack4=packWithPhotographs(decodeFieldPack(JSON.parse(raw(4).toString())),photographs);
  const own=evaluateLssRow(pack3,glx,lssFieldRows(3)[0],2,spectra);
  expect(own.kind).toBe('available');if(own.kind==='unavailable')throw Error();
  expect([own.selectedId,own.result.calibration!.sourceFile]).toEqual(['NGC 4670','NGC4670.SP']);
  const coma=evaluateLssRow(pack4,glx,lssFieldRows(4)[1],0,spectra);if(coma.kind==='unavailable')throw Error();
  expect([coma.selectedId,coma.result.calibration!.sourceFile]).toEqual(['NGC 4889','NGC4889.SP']);
  expect(evaluateLssRow(pack3,glx,lssFieldRows(3)[0],2,{...spectra,ownSpectra:new Map()})).toMatchObject({kind:'unavailable',reasons:['spectrum-mapping']});
 },120000);
});
