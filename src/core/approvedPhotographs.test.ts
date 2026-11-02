import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {APPROVED_PHOTOGRAPHS,LSS_PHOTOGRAPHS,OBJECT_X_PHOTOGRAPHS,REMAINING_PHOTOGRAPHS,UNDRAWN_PHOTOGRAPHS,photographsInPack} from './approvedPhotographs';
import {nativePhotographRows} from './photographicList';
import {decodeBitmap8} from './photographDraw';
import {decodeFieldPack} from './fieldPack';
import {packWithPhotographs} from './lssLists';
import {OBJECT_X_SPECTRUM_ROWS} from './objectXSpectrometer';

const pub=(p:string)=>new Uint8Array(readFileSync('public'+p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const glimages=pub('/original/images/GLIMAGES.LST'),rows=nativePhotographRows(glimages),positions=rows.map(r=>({index:r.index,ra:r.ra,dec:r.dec}));
const files=(list:readonly {file:string}[])=>list.map(p=>p.file).sort();

describe('approved galaxy photographs (Front F4, user approval of 2026-11-02)',()=>{
 it('bundles the 166 remaining photographs of glimages-remaining.txt byte-exact, 175 in all, each at its zip-case path',()=>{
  expect(REMAINING_PHOTOGRAPHS).toHaveLength(166);expect(REMAINING_PHOTOGRAPHS.reduce((s,p)=>s+p.bytes,0)).toBe(6594708);
  expect(APPROVED_PHOTOGRAPHS).toHaveLength(175);expect(new Set(APPROVED_PHOTOGRAPHS.map(p=>p.file)).size).toBe(175);
  for(const p of APPROVED_PHOTOGRAPHS){const b=pub(p.path);expect(b.byteLength,p.file).toBe(p.bytes);expect(sha(b),p.file).toBe(p.sha256);expect(p.path.toUpperCase()).toBe('/ORIGINAL/IMAGES/'+p.file);}
  // 37 zip names are lower case (m33.bmp for GLIMAGES.LST's M33.BMP); the engine key stays the list's name.
  expect(APPROVED_PHOTOGRAPHS.filter(p=>!p.path.endsWith('/'+p.file))).toHaveLength(37);
 });
 it('every file a kept GLIMAGES.LST row names is bundled; the seven absent files are only on rows the original parser drops',()=>{
  const approved=new Set(APPROVED_PHOTOGRAPHS.map(p=>p.file));
  expect(rows.filter(r=>!approved.has(r.file))).toEqual([]);
  const text=new TextDecoder('latin1').decode(glimages).split('\r\n'),kept=new Set(rows.map(r=>r.index));
  for(const absent of ['NGC205.BMP','NGC404.BMP','NGC750.BMP','NGC751.BMP','NGC4215.BMP','NGC4449.BMP','NGC7331.BMP']){
   const at=text.findIndex(l=>l.split(',')[5]===absent);expect(at,absent).toBeGreaterThanOrEqual(0);expect(kept.has(at),absent).toBe(false);expect(approved.has(absent)).toBe(false);
  }
 });
 it('every photograph decodes at its listed size except exactly the three undrawn ones, which no pack ever loads',()=>{
  const failing:string[]=[];
  for(const p of APPROVED_PHOTOGRAPHS){
   const listed=rows.filter(r=>r.file===p.file);
   try{const b=decodeBitmap8(pub(p.path));if(listed.some(r=>r.width!==b.width||r.height!==b.height))failing.push(p.file);}catch{failing.push(p.file);}
  }
  expect(failing.sort()).toEqual([...UNDRAWN_PHOTOGRAPHS].sort());
  const all=Object.freeze({...decodeFieldPack(JSON.parse(readFileSync('data/lss/lss-field-01.json','utf8'))),photographs:{sha256:null,recordsChecked:rows.length,entries:[{pointing:0,indices:rows.map(r=>r.index)}]}});
  const named=files(photographsInPack(all,rows));
  expect(named).toHaveLength(175-1-UNDRAWN_PHOTOGRAPHS.size);// NGC253.BMP's row is dropped by the parser
  for(const f of UNDRAWN_PHOTOGRAPHS)expect(named).not.toContain(f);expect(named).not.toContain('NGC253.BMP');
 });
 it('the LSS and Object X packs name only their own photographs, so their up-front loaders stay complete (no exercise field changes)',()=>{
  const lss=new Set<string>(),objectX=new Set<string>();
  for(let f=1;f<=9;f++)for(const p of photographsInPack(packWithPhotographs(decodeFieldPack(JSON.parse(readFileSync(`data/lss/lss-field-0${f}.json`,'utf8'))),positions),rows))lss.add(p.file);
  for(const id of new Set(OBJECT_X_SPECTRUM_ROWS.map(r=>r.pack)))for(const p of photographsInPack(packWithPhotographs(decodeFieldPack(JSON.parse(readFileSync(`data/objectx/spectra-${id.replace('objectx-','')}.json`,'utf8'))),positions),rows))objectX.add(p.file);
  expect([...lss].sort()).toEqual(files(LSS_PHOTOGRAPHS));
  expect([...objectX].sort()).toEqual(files(OBJECT_X_PHOTOGRAPHS));
 });
});
