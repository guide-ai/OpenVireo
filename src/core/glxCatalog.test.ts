import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import samples from '../../data/hubble/galaxy-catalog-samples.json';
import targets from '../../data/hubble/galaxy-targets.json';
import {GLX_CATALOG,GlxCatalogError,decodeGlxRecord,glxRecordAt,parseGlxCatalog} from './glxCatalog';
import {HUBBLE_HOT_LIST} from './hubbleHotList';
import {buildPinnedGalaxyPopulation,galaxyDomainFor} from './pinnedGalaxyField';
// The approved original is read only to feed the decoder; assertions use size, SHA-256 and decoded scalars, never raw bytes.
const original=()=>new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url)));
const code=(f:()=>unknown)=>{try{f();return 'ok';}catch(e){return e instanceof GlxCatalogError?e.code:'other';}};
function synthetic({kind=0,name='4874',ra=12.5,dec=27.5,major=2.4,minor=1.2,magnitude=12.9,z=.0239,pa=-80,morphology=-3}={}){
 const raw=new Uint8Array(59),v=new DataView(raw.buffer);v.setFloat64(0,ra,true);v.setFloat64(8,dec,true);v.setFloat32(16,major,true);v.setFloat32(20,minor,true);v.setFloat32(24,magnitude,true);v.setFloat32(28,z,true);v.setInt16(32,pa,true);v.setInt8(34,morphology);raw[38]=kind;
 const at=kind<2?40:48;raw[at-1]=name.length;for(let i=0;i<name.length;i++)raw[at+i]=name.charCodeAt(i);return raw;
}
describe('CLEA_GLX.DAT 59-byte decoder (reader 0x598acc): source order only, no sort/dedup/tie rejection',()=>{
 it('decodes the recovered layout, name kinds and Single/Int fields of synthetic records',()=>{
  expect(decodeGlxRecord(synthetic())).toEqual({id:'NGC 4874',ra:12.5,dec:27.5,majorArcminutes:Math.fround(2.4),minorArcminutes:Math.fround(1.2),magnitude:Math.fround(12.9),redshift:Math.fround(.0239),positionAngleDegrees:-80,morphology:-3});
  expect(decodeGlxRecord(synthetic({kind:1,name:'1234 '})).id).toBe('IC 1234');
  expect(decodeGlxRecord(synthetic({kind:2,name:' 54875 '})).id).toBe('54875');
  expect(code(()=>decodeGlxRecord(new Uint8Array(58)))).toBe('record');
  const long=synthetic({kind:2,name:'12345678901'});long[47]=12;expect(code(()=>decodeGlxRecord(long))).toBe('name');
  for(const bad of [synthetic({ra:NaN}),synthetic({dec:Infinity}),synthetic({magnitude:Infinity})])expect(code(()=>decodeGlxRecord(bad))).toBe('number');
 });
 it('whole-file parse requires exactly 24069 records and keeps duplicates and source order',()=>{
  expect(code(()=>parseGlxCatalog(new Uint8Array(GLX_CATALOG.bytes-59)))).toBe('size');expect(code(()=>parseGlxCatalog(new Uint8Array(GLX_CATALOG.bytes+1)))).toBe('size');
  const bytes=new Uint8Array(GLX_CATALOG.bytes);for(let i=0;i<GLX_CATALOG.records;i++)bytes.set(synthetic({kind:2,name:String(i%3),ra:1,dec:2}),i*59);
  const all=parseGlxCatalog(bytes);expect(all).toHaveLength(24069);expect(all.slice(0,4).map(r=>[r.recordIndex,r.id])).toEqual([[0,'0'],[1,'1'],[2,'2'],[3,'0']]);
  expect(code(()=>glxRecordAt(bytes,24069))).toBe('record');expect(glxRecordAt(bytes,24068).id).toBe(String(24068%3));
 });
 it('the approved original: size and SHA-256 BEFORE parsing; samples, all 13 Hubble.HTL records and the 54876 field galaxies',()=>{
  const bytes=original();expect(bytes.byteLength).toBe(GLX_CATALOG.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(GLX_CATALOG.sha256);expect(samples.sha256).toBe(GLX_CATALOG.sha256);
  const all=parseGlxCatalog(bytes);expect(all).toHaveLength(samples.recordCount);
  for(const s of samples.samples)expect(all[s.index]).toEqual({id:s.identifier,ra:s.raHours,dec:s.decDegrees,majorArcminutes:s.majorArcminutes,minorArcminutes:s.minorArcminutes,magnitude:s.apparentMagnitude,redshift:s.redshift,positionAngleDegrees:s.positionAngleDegrees,morphology:s.morphology,recordIndex:s.index});
  // Each original hot-list identifier names its designated catalogue record exactly (no folding).
  for(const row of HUBBLE_HOT_LIST)expect(all[row.catalogIndex].id).toBe(row.id);
  for(const t of targets){const r=all[t.recordIndex];expect([r.id,r.ra,r.dec,r.magnitude]).toEqual([t.id,t.ra,t.dec,t.magnitude]);}
  // The unchanged pinned 54876 snapshot is the whole-source record set at each galaxy's index, in its own native order.
  const field=buildPinnedGalaxyPopulation(galaxyDomainFor('54876'));
  for(const g of field.galaxies){const{rawHex:_,...decoded}=g;expect(all[g.recordIndex]).toEqual(decoded);}
  expect(field.galaxies.map(g=>g.id)).toEqual(['54868','54870','54876','54875','54891','54890']);
  const same=field.galaxies.filter(g=>g.id==='54891'||g.id==='54890');expect(same[0].ra).toBe(same[1].ra);expect(same[0].dec).toBe(same[1].dec);expect(all[18492]).toMatchObject({id:'54890',recordIndex:18492});expect(all[18493]).toMatchObject({id:'54891',recordIndex:18493});expect([same[0].recordIndex,same[1].recordIndex]).toEqual([18493,18492]);
 });
});
