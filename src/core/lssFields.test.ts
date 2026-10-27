import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../../docs/LOCAL-RESOURCES.json';
import {parseHtl} from './hotList';
import {glxRecordAt} from './glxCatalog';
import {LSS_FIELD_FILES,LSS_ROWS,lssFieldRows,lssFieldIdentity,lssRowIdentity,isLssFieldList,type LssFieldNumber} from './lssFields';
// Approved originals are read only to feed the existing decoders; assertions use size, SHA-256 and decoded scalars.
const read=(path:string)=>new Uint8Array(readFileSync(new URL('../../public'+path,import.meta.url)));
const glx=new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url)));
const fold=(s:string)=>s.toUpperCase().replace(/\s+/g,'');
describe('LSS_Field01..09.HTL identities (approved 2026-10-26)',()=>{
 it('records nine byte-exact files matching the resource manifest',()=>{
  expect(LSS_FIELD_FILES.map(f=>f.records)).toEqual([23,25,25,23,24,21,26,25,27]);
  expect(LSS_ROWS).toHaveLength(219);
  for(const f of LSS_FIELD_FILES){
   const bytes=read(f.path);
   expect(bytes.byteLength).toBe(f.bytes);
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(f.sha256);
   expect(manifest.files).toContainEqual({path:'public'+f.path,bytes:f.bytes,sha256:f.sha256});
  }
 });
 it('equals the parseHtl binary64 projection of every original record, in file order',()=>{
  for(const f of LSS_FIELD_FILES){
   const bytes=read(f.path),list=parseHtl(bytes),rows=lssFieldRows(f.field);
   expect(list).toHaveLength(rows.length);
   list.forEach((row,i)=>{
    expect({id:row.id,remarks:row.remarks,ra:row.ra,dec:row.dec}).toEqual({id:rows[i].id,remarks:rows[i].remarks,ra:rows[i].ra,dec:rows[i].dec});
    expect(createHash('sha256').update(bytes.subarray(i*86,(i+1)*86)).digest('hex')).toBe(rows[i].recordSha256);
    expect(lssRowIdentity(f.field,row)?.index).toBe(i);
   });
   expect(isLssFieldList(f.field,list)).toBe(true);
  }
 });
 it('designates one same-named CLEA_GLX.DAT record within 1 arcsec; 164 exact and 55 rounded rows',()=>{
  let exact=0;
  for(const r of LSS_ROWS){
   const g=glxRecordAt(glx,r.catalogIndex);
   expect(fold(g.id)).toBe(fold(r.id));
   const sep=Math.hypot((g.ra-r.ra)*15*Math.cos(r.dec*Math.PI/180),g.dec-r.dec)*3600;
   expect(sep).toBeLessThanOrEqual(1);
   expect(r.exact).toBe(g.ra===r.ra&&g.dec===r.dec);
   if(r.exact)exact++;
   for(const n of r.near){const o=glxRecordAt(glx,n);expect(Math.hypot((o.ra-r.ra)*15*Math.cos(r.dec*Math.PI/180),o.dec-r.dec)*3600).toBeLessThanOrEqual(1);}
  }
  expect(exact).toBe(164);
  expect(LSS_ROWS.filter(r=>r.near.length).map(r=>r.id)).toEqual(['12550+2749','IC 4395A','NGC 5639A','14520+3025E','14520+3025W','15384+2831W','15384+2831S','15384+2831E']);
 });
 it('rejects lists that are reordered, truncated or edited, and unknown fields',()=>{
  const list=parseHtl(read(lssFieldIdentity(2).path));
  expect(isLssFieldList(2,list.slice(1))).toBe(false);
  expect(isLssFieldList(2,[list[1],list[0],...list.slice(2)])).toBe(false);
  expect(isLssFieldList(1 as LssFieldNumber,list)).toBe(false);
  expect(lssRowIdentity(2,{...list[0],ra:list[0].ra+1e-9})).toBeNull();
  expect(()=>lssFieldIdentity(10)).toThrow(RangeError);
 });
});
