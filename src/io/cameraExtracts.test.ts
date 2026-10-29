import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import provenance from '../../data/camera/EXTRACTS-PROVENANCE.json';
import {CAMERA_EXTRACTS,findCameraExtract} from './cameraCatalog';
import {readVizierCatalog,VIZIER_HOSTS} from '../core/vizierNomad';
import {parseHtl} from '../core/hotList';

// Front C5W: the bundled static extracts (VizieR cone searches recorded from an official mirror, saved byte for byte).
const htl=parseHtl(new Uint8Array(readFileSync(new URL('../../public/original/hotlists/ObjectX.HTL',import.meta.url))));
const CCD_04_RADIUS=0.228217;// widest camera query cone (0.4 m CCD), docs/CAMERA-QUERY-CONTEXT-PROVENANCE.json
describe('bundled camera extracts',()=>{
 test('34 extracts (17 Object X positions × NOMAD and USNO-B1), each with its host, hash and an admitted VOTable',()=>{
  expect(CAMERA_EXTRACTS).toHaveLength(34);expect(provenance.notRecorded).toEqual([]);
  for(const e of CAMERA_EXTRACTS){
   const bytes=new Uint8Array(readFileSync(new URL(`../../public/camera/vizier/${e.file}`,import.meta.url)));
   expect(bytes.length,e.id).toBe(e.bytes);expect(createHash('sha256').update(bytes).digest('hex'),e.id).toBe(e.sha256);
   expect(e.host).toBe(VIZIER_HOSTS.idia);expect(new URL(e.request).hostname).toBe(e.host);
   const p=provenance.extracts.find(x=>x.id===e.id)!;expect(p.sha256).toBe(e.sha256);expect(p.rows).toBeLessThan(p.maxTuples!);
   const c=readVizierCatalog(bytes,e.catalog==='I/297'?{catalog:'I/297',band:'V',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}:{catalog:'I/284',band:'I2',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5});
   expect(c.entries.length,e.id).toBe(p.rows);
  }
 },120_000);
 test('every ObjectX.HTL position is covered for both catalogs by the widest camera cone, with about 78″ of pointing slack',()=>{
  const fields=new Set<string>();
  for(const r of htl)for(const catalog of ['I/297','I/284'] as const){
   for(const dDec of [0,70/3600,-70/3600]){
    const hit=findCameraExtract({catalog,raHours:r.ra,decDegrees:r.dec+dDec,radiusDegrees:CCD_04_RADIUS});
    expect(hit,`${r.id.trim()} ${catalog} ${dDec}`).not.toBeNull();fields.add(hit!.id);
   }
  }
  expect(fields.size).toBe(34);
  expect(findCameraExtract({catalog:'I/297',raHours:0,decDegrees:0,radiusDegrees:CCD_04_RADIUS})).toBeNull();
 });
});
