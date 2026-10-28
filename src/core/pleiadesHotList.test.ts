import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseHtl} from './hotList';
import {PLEIADES_PHOTOMETER_CHOICES,PLEIADES_PHOTOMETER_TARGETS,buildPhotometerTargetField} from './photometerField';
import {PLEIADES_ADMITTED_ROWS,PLEIADES_HOT_LIST,PLEIADES_HTL,isPleiadesExerciseList,photometerPointingAccess,pleiadesRowIdentity,pleiadesStarAt} from './pleiadesHotList';
// The bundled original is read at test time only for hashes and parsed fields; its bytes are never printed or diffed.
const asset=()=>new Uint8Array(readFileSync(new URL('../../public/original/hotlists/PLEIADES.HTL',import.meta.url)));
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const next=(x:number)=>{const v=new DataView(new ArrayBuffer(8));v.setFloat64(0,x);v.setBigUint64(0,v.getBigUint64(0)+1n);return v.getFloat64(0);};

describe('PLEIADES.HTL identity table against the bundled original',()=>{
 it('the bundled asset has the recorded size and SHA-256 and parses into exactly the 24 table rows',()=>{
  const bytes=asset();expect(bytes.byteLength).toBe(PLEIADES_HTL.bytes);expect(sha(bytes)).toBe(PLEIADES_HTL.sha256);
  const list=parseHtl(bytes);expect(list.length).toBe(PLEIADES_HTL.records);expect(PLEIADES_HOT_LIST.length).toBe(24);
  for(const [i,row] of PLEIADES_HOT_LIST.entries()){
   expect(row.index).toBe(i);
   expect(sha(bytes.subarray(i*PLEIADES_HTL.recordBytes,(i+1)*PLEIADES_HTL.recordBytes))).toBe(row.recordSha256);
   expect(list[i].id).toBe(row.id);expect(list[i].ra).toBe(row.ra);expect(list[i].dec).toBe(row.dec);
   expect(pleiadesRowIdentity(list[i])?.index).toBe(i);
  }
  expect(isPleiadesExerciseList(list)).toBe(true);
 });
 it('19 admitted rows equal the photometer targets (rows 3, 5, 10 since the recovered variable merge of 2026-10-28); the 5 others keep their reasons',()=>{
  expect(PLEIADES_ADMITTED_ROWS.length).toBe(19);expect(PLEIADES_PHOTOMETER_TARGETS.length).toBe(19);expect(PLEIADES_PHOTOMETER_CHOICES.length).toBe(24);
  for(const row of PLEIADES_HOT_LIST){
   const choice=PLEIADES_PHOTOMETER_CHOICES.find(c=>c.hotlistRecord===row.index)!;
   expect(choice.hotlistLabel).toBe(row.id);
   if(row.admitted){
    const target=PLEIADES_PHOTOMETER_TARGETS.find(t=>t.catalogId===row.catalogId)!;
    expect(choice.targetId).toBe(row.catalogId);expect(target.hotlistRecord).toBe(row.index);expect(target.hotlistLabel).toBe(row.id);expect(target.nativeName).toBe(row.nativeName);
    expect(target.pointing.ra).toBe(row.ra);expect(target.pointing.dec).toBe(row.dec);
    const object=buildPhotometerTargetField(row.catalogId,'object').pointing,sky=buildPhotometerTargetField(row.catalogId,'sky').pointing;
    expect(object.ra).toBe(row.ra);expect(object.dec).toBe(row.dec);
    expect(pleiadesStarAt(object)?.index).toBe(row.index);expect(pleiadesStarAt(sky)).toBeNull();
   }else{expect(choice.targetId).toBeNull();expect(choice.reason).toBe(row.reason);}
  }
  expect(PLEIADES_HOT_LIST.filter(r=>!r.admitted).map(r=>r.index)).toEqual([2,7,12,14,22]);
  expect(PLEIADES_HOT_LIST.filter(r=>!r.admitted).every(r=>!r.admitted&&r.reason==='unvalidated-pointing-association')).toBe(true);
  expect(new Set(PLEIADES_HOT_LIST.map(r=>`${r.ra}/${r.dec}`)).size).toBe(24);
 });
 it('identity is exact: no native-prefix aliasing, case/space folding or 1-ulp coordinate tolerance',()=>{
  const first=PLEIADES_HOT_LIST[0];
  expect(pleiadesRowIdentity({id:'N2230-01442',remarks:'',ra:first.ra,dec:first.dec})).toBeNull();
  for(const id of [' 01799-01442','01799-01442 ','01799 -01442'])expect(pleiadesRowIdentity({id,remarks:'',ra:first.ra,dec:first.dec})).toBeNull();
  expect(pleiadesRowIdentity({id:first.id,remarks:'',ra:next(first.ra),dec:first.dec})).toBeNull();
  expect(pleiadesStarAt({ra:next(first.ra),dec:first.dec})).toBeNull();expect(pleiadesStarAt({ra:first.ra,dec:next(first.dec)})).toBeNull();
  for(const index of [12,22]){const row=PLEIADES_HOT_LIST[index];expect(row.id.startsWith('N2230-')).toBe(true);expect(row.admitted).toBe(false);expect(pleiadesStarAt(row)?.admitted).toBe(false);}
  expect(PLEIADES_HOT_LIST[12].ra).toBe(3.7806972222222224);expect(PLEIADES_HOT_LIST[12].dec).toBe(23.23938888888889);
  const list=PLEIADES_HOT_LIST.map(r=>({id:r.id,remarks:'',ra:r.ra,dec:r.dec}));
  expect(isPleiadesExerciseList(list)).toBe(true);expect(isPleiadesExerciseList(list.slice(1))).toBe(false);expect(isPleiadesExerciseList([list[1],list[0],...list.slice(2)])).toBe(false);expect(isPleiadesExerciseList(null)).toBe(false);
 });
 it('the browser pointing guard has a fixed precedence and admits only the exact field pointing',()=>{
  const field={ra:3.6883333,dec:23.96667},base={fieldPointing:field,pointing:field,domeOpen:true,mode:'telescope' as const,moving:false};
  expect(photometerPointingAccess(base)).toBe('ready');
  expect(photometerPointingAccess({...base,pointing:{ra:next(field.ra),dec:field.dec}})).toBe('pointing');
  expect(photometerPointingAccess({...base,domeOpen:false,pointing:{ra:0,dec:0}})).toBe('dome');
  expect(photometerPointingAccess({...base,mode:'finder',domeOpen:false})).toBe('finder');
  expect(photometerPointingAccess({...base,moving:true,mode:'finder'})).toBe('moving');
 });
});
