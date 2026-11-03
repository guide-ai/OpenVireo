import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import extracts from '../../data/camera/extracts.json';
import {composeCameraExposure,type CameraExposureRecipe} from './cameraExposure';
import {readVizierCatalog,selectVizierCatalog,vizierRouteForCamera,type VizierBand} from './vizierNomad';
import {cameraRegionRecord,cameraRegionSelection} from './cameraRegion';
import {cameraPreparationReference} from './cameraPreparation';

// Front IRJHK: the IR camera (C6) on a RECORDED NOMAD response with real 2MASS J/H/K, not the authored control table.
// Data: the bundled Front C5W extract public/camera/vizier/nomad-184.7070+14.7974-r0.25.xml (VizieR I/297 cone search,
// SR 0.25°, recorded byte for byte from vizier.idia.ac.za on 2026-10-29; data/camera/EXTRACTS-PROVENANCE.json). It is not
// a CLEA resource and not an observation; NOMAD's J/H/K come from 2MASS (Skrutskie et al. 2006).
// Oracle: every expected magnitude and count below is read from the recorded bytes by rawTable(), a separate split-based
// reader that shares nothing with readVizierCatalog, or is a literal copied from those bytes. The band per filter is the
// recovered IR switch 0x51dfda (filter positions 0/1/2 -> NOMAD selectors 3/4/5 = J/H/K; docs/CAMERA-IR.md), and the blank
// rule is the [W] contract in vizierNomad.ts: a blank selected magnitude is rejected like the recovered 0 sentinel, with no
// other band substituted.
const FILE='nomad-184.7070+14.7974-r0.25.xml',SHA256='7fbca0159228e5bd3f9b47113d6a1e9210a8e74ea1c5c9fa4ccbd27e73184662';
const bytes=new Uint8Array(readFileSync(new URL(`../../public/camera/vizier/${FILE}`,import.meta.url)));
const extract=extracts.extracts.find(e=>e.file===FILE)!;

/** Independent reader: FIELD names in order, then each <TR>'s <TD> cells as raw strings (empty for <TD></TD> or <TD/>).
 * It is only valid for the hash-pinned bytes above, which have no CDATA, no NaN cells and no <TD/> (checked in the first test);
 * it is not a general VOTable reader. */
function rawTable(data:Uint8Array){
 const text=Buffer.from(data).toString('utf8');
 const fields=text.split('<FIELD ').slice(1).map(f=>f.slice(f.indexOf('name="')+6).split('"')[0]);
 const body=text.slice(text.indexOf('<TABLEDATA>'),text.indexOf('</TABLEDATA>'));
 const rows=body.split('<TR>').slice(1).map(tr=>tr.split('</TR>')[0].split('<TD').slice(1).map(td=>td.startsWith('/>')?'':td.slice(1).split('</TD>')[0]));
 const at=(name:string)=>{const i=fields.indexOf(name);if(i<0)throw new Error(name);return i;};
 return {fields,rows,at};
}
const raw=rawTable(bytes);
const COLUMN:Readonly<Record<'J'|'H'|'K',string>>={J:'Jmag',H:'Hmag',K:'Kmag'};
const IR_BANDS=['J','H','K'] as const;
const id=(r:readonly string[])=>r[raw.at('NOMAD1')].trim();
const cell=(r:readonly string[],column:string)=>r[raw.at(column)].trim();
/** Rows the recovered row contract can admit for one magnitude column: a non-blank magnitude and motion, inside the query
 * window 1..21.5 (0x59c3f0 bri, 0x51dff6 fai). Expected value: the cell stored as Single. */
function expectedCandidates(column:string){
 const m=new Map<string,number>();
 for(const r of raw.rows){
  const v=cell(r,column);if(!v||!cell(r,'pmRA')||!cell(r,'pmDE'))continue;
  const single=Math.fround(Number(v));if(single!==0&&single>=1&&single<=21.5)m.set(id(r),single);
 }
 return m;
}
const parse=(band:VizierBand)=>readVizierCatalog(bytes,{catalog:'I/297',band,epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5});
const centre={ra:extract.raDegrees/15,dec:extract.decDegrees};
const recipe:CameraExposureRecipe={camera:'ir',opticalIndex:0,filterPosition:0,seconds:10,gain:4,centerRaHours:centre.ra,centerDecDegrees:centre.dec,seed:20261103};

describe('IR camera on a recorded NOMAD extract with non-blank J/H/K (Front IRJHK)',()=>{
 test('the extract is the bundled, hashed C5W recording and carries 2MASS J/H/K for 224 of its 1317 rows',()=>{
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(SHA256);
  expect(extract).toMatchObject({id:'nomad-184.7070+14.7974-r0.25',catalog:'I/297',sha256:SHA256,bytes:bytes.length,host:'vizier.idia.ac.za'});
  expect(raw.rows).toHaveLength(1317);expect(new Set(raw.rows.map(id)).size).toBe(1317);
  expect(raw.rows.every(r=>r.length===raw.fields.length)).toBe(true);
  const text=Buffer.from(bytes).toString('utf8');
  expect([text.includes('<![CDATA['),text.includes('<TD/>'),text.includes('<TD>NaN</TD>')]).toEqual([false,false,false]);
  for(const band of IR_BANDS)expect(raw.rows.filter(r=>cell(r,COLUMN[band])!=='').length,band).toBe(224);
  // NOMAD's J/H/K are blank or present together in this extract; V is present for a different set of rows.
  expect(raw.rows.every(r=>new Set(IR_BANDS.map(b=>cell(r,COLUMN[b])==='')).size===1)).toBe(true);
  expect(raw.rows.filter(r=>cell(r,'Vmag')!=='').length).toBe(250);
  // Literal witnesses copied from the recorded bytes (<TR> of NOMAD1 1047-0214710 and 1047-0214714).
  const w=raw.rows.find(r=>id(r)==='1047-0214710')!;
  expect(IR_BANDS.map(b=>cell(w,COLUMN[b]))).toEqual(['14.285','13.717','13.483']);expect(cell(w,'Vmag')).toBe('17.740');
  const noV=raw.rows.find(r=>id(r)==='1047-0214714')!;
  expect([cell(noV,'Vmag'),cell(noV,'Jmag')]).toEqual(['','16.283']);
 });
 test.each([0,1,2])('filter position %i: routed to its own NOMAD column, every non-blank value admitted as Single and every blank one rejected',position=>{
  const route=vizierRouteForCamera('ir',position),band=IR_BANDS[position];
  expect(route).toEqual({catalog:'I/297',band,catalogName:'NOMAD'});
  const catalog=parse(route.band),expected=expectedCandidates(COLUMN[band]);
  expect(expected.size).toBe(224);
  expect(new Map(catalog.catalogEntries.map(e=>[e.result.row.identifier,e.result.row.selectedMagnitude]))).toEqual(expected);
  expect(catalog.invalidCount).toBe(0);
  const rejected=catalog.entries.filter(e=>e.result.kind==='rejected');
  expect(rejected).toHaveLength(1317-224);
  for(const e of rejected){
   expect(e.result).toEqual({kind:'rejected',reason:'selected-magnitude'});
   expect(cell(raw.rows[e.rowIndex],COLUMN[band])).toBe('');
  }
 });
 test('a star with J but no V is a J candidate and a V rejection; the IR path does not fall back to V',()=>{
  const j=parse('J'),v=parse('V');
  expect(j.catalogEntries.find(e=>e.result.row.identifier==='1047-0214714')?.result.row.selectedMagnitude).toBe(Math.fround(16.283));
  expect(v.catalogEntries.some(e=>e.result.row.identifier==='1047-0214714')).toBe(false);
  const at=raw.rows.findIndex(r=>id(r)==='1047-0214714');
  expect(v.entries[at].result).toEqual({kind:'rejected',reason:'selected-magnitude'});
 });
 test.each([0,1,2])('IR exposure at the extract centre, filter position %i, draws each on-detector star at its own recorded J/H/K magnitude',position=>{
  // As CameraControl does: the band comes from the camera route, and the region record of the loaded field (±0.375°, wider than the 0.25° cone) bounds the selection.
  const band=vizierRouteForCamera('ir',position).band as 'J'|'H'|'K',column=COLUMN[band];
  expect(band).toBe(IR_BANDS[position]);
  const selection=selectVizierCatalog(parse(band),cameraRegionSelection(cameraRegionRecord(centre),21.5));
  const x=composeCameraExposure({...recipe,filterPosition:position},selection);
  expect(x.plane.width).toBe(512);
  expect(x.catalog.rows).toBe(1317);expect(x.catalog.selected).toBe(224);
  const catalogRecords=x.records.filter(r=>r.origin==='catalog');
  expect(catalogRecords).toHaveLength(x.catalog.onDetector);expect(x.catalog.onDetector).toBeGreaterThan(20);
  const byId=new Map(raw.rows.map(r=>[id(r),r]));
  // Half-diagonal of the 0.4 m IR field (15.21′ square, cameraPreparationReference), in degrees (≈ 0.179°).
  const field=cameraPreparationReference('ir',0),halfDiagonal=Math.hypot(field.widthArcminutes,field.heightArcminutes)/2/60;
  expect(halfDiagonal).toBeLessThan(0.19);
  for(const r of catalogRecords){
   const row=byId.get(r.identifier!)!;
   expect(cell(row,column),r.identifier!).not.toBe('');
   expect(r.magnitude,r.identifier!).toBe(Math.fround(Number(cell(row,column))));
   // Footprint bound, not a test of the search radius (static mode never applies the 0.19° SR; only the live K test in
   // ir-camera.spec.ts checks it): _r, the row's recorded distance from the cone centre in degrees, of a star drawn on the
   // detector lies inside the field's half-diagonal.
   expect(Number(cell(row,'_r')),r.identifier!).toBeLessThanOrEqual(halfDiagonal);
  }
  expect(catalogRecords.find(r=>r.identifier==='1047-0214710')?.magnitude).toBe(Math.fround([14.285,13.717,13.483][position]));
  // The star drawn brightest is the extract's brightest in this column (more than 2 mag ahead of the next in J, H and K, read
  // from the bytes): the image's maximum pixel lies on it.
  const brightest=raw.rows.filter(r=>cell(r,column)!=='').reduce((a,r)=>Number(cell(r,column))<Number(cell(a,column))?r:a);
  const star=catalogRecords.find(r=>r.identifier===id(brightest))!;
  let top=0;for(let i=1;i<x.plane.pixels.length;i++)if(x.plane.pixels[i]>x.plane.pixels[top])top=i;
  expect(Math.hypot(top%512-star.pixelX,Math.floor(top/512)-star.pixelY)).toBeLessThanOrEqual(2);
 });
});
