import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import witnesses from '../../data/lss/lss-witnesses.json';
import {decodeFieldPack} from './fieldPack';
import {buildFieldPopulation} from './fieldEngine';
import {evaluateLssRow,LSS_SPECTRUM_MAPPED_IDS} from './lssExposure';
import {lssFieldRows,type LssFieldNumber} from './lssFields';
// Published bounded packs (2026-10-27 approval) against the independent whole-source Python witnesses.
const glx=new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url)));
const raw=(f:number)=>readFileSync(new URL(`../../data/lss/lss-field-0${f}.json`,import.meta.url));
const sha=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
describe('LSS field packs reproduce the independent witnesses for every row',()=>{
 for(const w of witnesses.fields)it(`field ${w.field}`,()=>{
  const bytes=raw(w.field);expect(sha(bytes)).toBe(w.packSHA256);
  const pack=decodeFieldPack(JSON.parse(bytes.toString()));
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
 it('re-derives the acquirable rows per telescope (0.4 m 129, 0.9 m 69, 4 m 130 of 219, before the spectrum-mapping gate)',()=>{
  const counts=[0,0,0],mapped:string[]=[];
  for(let f=1;f<=9;f++){const pack=decodeFieldPack(JSON.parse(raw(f).toString()));for(const row of lssFieldRows(f as LssFieldNumber))for(const t of [0,1,2] as const){const s=evaluateLssRow(pack,glx,row,t);if(s.kind!=='unavailable')counts[t]++;else if(s.reasons.includes('spectrum-mapping')){counts[t]++;mapped.push(`${row.id}@${t}`);}}}
  expect(counts).toEqual([129,69,130]);
  expect([...new Set(mapped.map(m=>m.split('@')[0]))].every(id=>LSS_SPECTRUM_MAPPED_IDS.includes(id))).toBe(true);
 },120000);
});
