import {describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {env} from 'node:process';
import {PULSAR_CATALOG_COLUMNS,parsePulsarCatalog,type PulsarRecord} from './radioPulsarCatalog';

// External original fixture: the shipped VIREO Pulsars.dat stays outside the repository and is never bundled. Set
// OPENVIREO_PULSARS_DAT to its path to run these checks; when unset the suite is reported as skipped by name.
// A supplied path that cannot be read or has another SHA-256 fails; it is never skipped. Expected counts come from
// ORIGINAL-CATALOG-CONTROLS.json (Python Decimal source-content controls), not from a native run.
const FIXTURE=env.OPENVIREO_PULSARS_DAT;
const EXPECTED=Object.freeze({
 sha256:'ba94ee94c359e2afd4acce940266d69983d24a93893719cca20d3e23ef3dceaa',bytes:285692,rows:558,distinctPrimary:557,
 duplicate:{name:'1927+18',indices:[452,454]},lineLengths:{506:1,510:557},crlf:558,raDescents:80,
 raOutOfOrderIndices:[4,9,39,44,54,56,65,75,85,90,93,102,124,138,146,156,162,165,187,189,205,219,223,226,240,245,250,252,255,258,
  262,265,267,268,277,285,289,296,310,328,334,338,340,342,352,353,360,365,376,381,382,386,392,397,399,405,407,410,415,417,419,
  422,425,429,435,453,459,462,473,478,482,485,489,516,526,527,528,545,547,552],
});

describe.skipIf(!FIXTURE)('original Pulsars.dat external fixture (OPENVIREO_PULSARS_DAT; skipped when unset)',()=>{
 const load=()=>{const bytes=new Uint8Array(readFileSync(FIXTURE!));return {bytes,sha:createHash('sha256').update(bytes).digest('hex')};};
 it('is the shipped file (SHA-256 checked first)',()=>{
  const {bytes,sha}=load();expect(sha).toBe(EXPECTED.sha256);expect(bytes.length).toBe(EXPECTED.bytes);
 });
 it('has the recorded line profile',()=>{
  const {bytes,sha}=load();expect(sha).toBe(EXPECTED.sha256);
  const lengths:Record<number,number>={};let crlf=0,start=0;
  for(let i=0;i<bytes.length;i++)if(bytes[i]===0x0a){
   const cr=i>start&&bytes[i-1]===0x0d;if(cr)crlf++;const n=i-start-(cr?1:0);lengths[n]=(lengths[n]??0)+1;start=i+1;
  }
  expect(start).toBe(bytes.length);// ends with a terminator
  expect(lengths).toEqual(EXPECTED.lineLengths);expect(crlf).toBe(EXPECTED.crlf);
 });
 it('decodes 558 finite records in file order with the duplicate kept',()=>{
  const {bytes,sha}=load();expect(sha).toBe(EXPECTED.sha256);
  const r=parsePulsarCatalog(bytes);if(!r.ok)throw new Error(JSON.stringify(r.error));
  const c=r.catalog;expect(c).toHaveLength(EXPECTED.rows);
  expect(new Set(c.map(x=>x.primaryName)).size).toBe(EXPECTED.distinctPrimary);
  expect(c.flatMap((x,i)=>x.primaryName===EXPECTED.duplicate.name?[i]:[])).toEqual(EXPECTED.duplicate.indices);
  const numeric=c.flatMap(x=>Object.values(x).filter(v=>typeof v==='number'));
  expect(numeric).toHaveLength(EXPECTED.rows*11);expect(numeric.every(Number.isFinite)).toBe(true);
 });
 it('records that the file is not globally RA-sorted',()=>{
  const {bytes,sha}=load();expect(sha).toBe(EXPECTED.sha256);
  const r=parsePulsarCatalog(bytes);if(!r.ok)throw new Error(JSON.stringify(r.error));
  const descents=r.catalog.flatMap((x,i)=>i>0&&x.ra<r.catalog[i-1].ra?[i]:[]);
  expect(descents).toHaveLength(EXPECTED.raDescents);
  // The controls list the zero-based index of the later row of each descending pair.
  expect(descents).toEqual(EXPECTED.raOutOfOrderIndices);
 });
 it('matches the text columns field by field at spot rows 0, 452 and 557',()=>{
  const {bytes,sha}=load();expect(sha).toBe(EXPECTED.sha256);
  const r=parsePulsarCatalog(bytes);if(!r.ok)throw new Error(JSON.stringify(r.error));
  const lines=new TextDecoder('ascii').decode(bytes).split('\r\n');
  for(const index of [0,EXPECTED.duplicate.indices[0],EXPECTED.rows-1]){
   const text=lines[index],rec=r.catalog[index],cell=(f:keyof PulsarRecord)=>{const k=PULSAR_CATALOG_COLUMNS[f];return text.slice(k.start,k.start+k.width);};
   expect(rec.primaryName).toBe(cell('primaryName').replace(/ +$/,''));expect(rec.legacyName).toBe(cell('legacyName').replace(/ +$/,''));
   expect(rec.ra).toBe(Number(cell('ra'))*24/360);expect(rec.x3e).toBe(Number(cell('x3e'))+2400000);
   for(const f of ['dec','x2a','x34'] as const)expect(rec[f],f).toBe(Number(cell(f)));
   for(const f of ['s48','s4c','s50','s54','s58','s5c'] as const)expect(rec[f],f).toBe(Math.fround(Number(cell(f))));
  }
 });
});
