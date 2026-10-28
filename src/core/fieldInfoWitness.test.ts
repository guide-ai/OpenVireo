import {readFileSync} from 'node:fs';
import {describe,expect,test} from 'vitest';
import witness from '../../data/fieldinfo/info-witness.json';
import {decodeNativeCompactRecord} from './pinnedNativeField';
import {decodeVariableStarCatalog,delphiFixed,formatNativeSexagesimal} from './variableStars';
import {variableFieldList} from './variableFieldList';
import {catalogObjectView,catalogRecordFromStar,floatToStrFExponent4,galaxyTypeText,nativeSpectralText,pickCatalogObject,type CatalogScene,type CatalogStarRecord} from './catalogObject';
import {FIELD_STAR_LITERALS,fieldStarCsvLines,fieldStarHeader,fieldStarReport,fieldStarRow} from './fieldStarReport';

/** data/fieldinfo/info-witness.json: output of the independent Python witness analysis/front-o-info-forms/tools/info_witness.py
 * (SHA-256 f2aeb514…a08) of the same static reading. Evidence of the chosen contract, not of original-runtime equivalence. */
const records=decodeVariableStarCatalog(new Uint8Array(readFileSync('public/original/variables/CLEA_VStrs.dat')));
describe('TVarFldLstForm1 lines against the witness (mode 1)',()=>{
 for(const v of witness.variableFieldLists)test(`${v.label} · ${v.view}`,()=>{
  const l=variableFieldList(records,{ra:v.pointing[0],dec:v.pointing[1]},v.view==='finder'?'finder':'instrument','gcvs');
  expect(l.lines).toEqual(v.lines);expect(l.records).toHaveLength(v.count);
 });
});
describe('Star Data List row 0x5354e8 and NewGSC record 0x59ad98 against the witness',()=>{
 test('ten pinned N2230/N3000 records',()=>{
  for(const [band,index,raw,row] of witness.starRows as [string,number,string,string][]){
   const r=catalogRecordFromStar(decodeNativeCompactRecord(raw,band,index));
   expect(r.id).toMatch(/^N(2230|3000)-\d{5}$/);expect(fieldStarRow(r)).toBe(row);
  }
 });
 test('synthetic rows: QSO code 99 with 30.0 sentinels; RA carry to 24 and a rounded negative zero',()=>{
  const q:CatalogStarRecord={kind:'star',id:'QSO 1234+567',type:3,ra:12+20/60+44.4/3600,dec:-(45+7/60+24/3600),v:Math.fround(17.5),bv:30,ub:30,aux:0,flags:{spectral:false,luminosity:false,bv:false,ub:false},code:99,variable:null};
  expect(fieldStarRow(q)).toBe(witness.syntheticStarRows[0].row);
  const s:CatalogStarRecord={kind:'star',id:'N0000-00001',type:0,ra:23.99999999,dec:-.0005,v:10,bv:Math.fround(-.05),ub:Math.fround(-.004),aux:0,flags:{spectral:true,luminosity:true,bv:true,ub:false},code:0,variable:null};
  expect(fieldStarRow(s)).toBe(witness.syntheticStarRows[1].row);
 });
 test('spectral text 0x55d4f4: valid codes and 99; codes the port cannot format are typed',()=>{
  for(const [code,text] of Object.entries(witness.spectralText)){
   const t=nativeSpectralText(Number(code));
   if(t!==null)expect(t).toBe(text);else expect(['999','-60405000','5000000','21503000']).toContain(code);
  }
  expect(nativeSpectralText(99)).toBe('0');
 });
 test('ffExponent(4,2) for z and ffFixed 3',()=>{
  for(const [x,t] of Object.entries(witness.zExponent))expect(floatToStrFExponent4(Math.fround(Number(x)))).toBe(t);
  for(const [x,t] of Object.entries(witness.fixed3))expect(delphiFixed(Math.fround(Number(x)),3)).toBe(t);
 });
 test('header, CSV transform (columns 11,20,…,63; spaces removed)',()=>{
  const h=fieldStarHeader({minimumRa:12,maximumRa:12.1,minimumDec:26.5,maximumDec:27.25},{ra:12.05,dec:26.875});
  expect(h).toHaveLength(19);expect(h[17]).toBe('Name/ID           Right Ascn. Declination    V     B-V    U-B    Sp     ');
  expect(h[18].indexOf('°')).toBe(32);expect(h[2]).toBe('  Center:   12h03m00.0s');expect(h[6]).toBe('  Center:   26°52\'30"');
  const [band,index,raw,row]=witness.starRows[0] as [string,number,string,string];
  const rep=fieldStarReport({minimumRa:12,maximumRa:12.1,minimumDec:26.5,maximumDec:27.25},{ra:12.05,dec:26.875},[catalogRecordFromStar(decodeNativeCompactRecord(raw,band,index))]);
  expect([rep.first,rep.last,rep.lines[19]]).toEqual([19,19,row]);
  const csv=fieldStarCsvLines(rep.lines)!;
  expect(csv.slice(-3)).toEqual([FIELD_STAR_LITERALS.csvHead,FIELD_STAR_LITERALS.csvUnits,'N2230-01167,12,03,22.7,+26,40,40,14.88,+1.07*,+0.93*,K4V*#']);
  expect(csv[0]).toBe('Right Ascension of Field');expect(fieldStarCsvLines([...rep.lines.slice(0,19),'short'])).toBeNull();
 });
});
describe('Catalog Object view (0x56005c, Telescope view pass, final pass)',()=>{
 const [band,index,raw]=witness.starRows[0] as [string,number,string,string];
 const star=catalogRecordFromStar(decodeNativeCompactRecord(raw,band,index));
 test('star: fields, red LEDs for assigned values, GCVS disabled (no variable record)',()=>{
  const v=catalogObjectView(star,formatNativeSexagesimal);
  expect([v.type,v.id,v.mag,v.bv,v.ub,v.spLabel,v.sp,v.zEnabled,v.sizeEnabled,v.gcvsEnabled]).toEqual(['Star','N2230-01167','14.877','1.070','0.933','Spectral Type:','K4V',false,false,false]);
  expect(v.ra).toBe('  12h 03m 22.75s');expect([v.bvLed.colour,v.ubLed.colour,v.spLed.colour]).toEqual(['#ff0000','#ff0000','#ff0000']);
 });
 test('QSO and galaxy columns; galaxy type text and typed faults',()=>{
  const q=catalogObjectView({...star,type:3,id:'Q',code:99,aux:Math.fround(.25),flags:{spectral:false,luminosity:false,bv:false,ub:true}},formatNativeSexagesimal);
  expect([q.type,q.typeHighlight,q.spLabel,q.sp,q.z,q.zEnabled,q.sizeEnabled,q.ubLed.active,q.bvLed.active]).toEqual(['Non-Stellar',true,'Spectrum:','Redshifted QSO','0.250',true,false,true,false]);
  const g=catalogObjectView({kind:'galaxy',id:'NGC 4889',ra:13,dec:27.9,v:Math.fround(11.5),major:Math.fround(2.8),minor:Math.fround(1.9),z:Math.fround(.0216),morphology:-4,bar:' ',luminosity:' ',ring:' '},formatNativeSexagesimal);
  expect([g.type,g.mag,g.bv,g.ub,g.spLabel,g.sp,g.z,g.size,g.spLed.active,g.bvLed.active]).toEqual(['Galaxy','11.500','0.920','0.480','Galaxy Type:','E/SO','2.160E-02','2.8x1.9',false,true]);
  expect(galaxyTypeText({morphology:3,bar:'X',ring:'R',luminosity:'3'})).toBe('SABb(R) II');
  expect(galaxyTypeText({morphology:5,bar:'B',ring:' ',luminosity:' '})).toBe('SBc');
  expect(galaxyTypeText({morphology:-4,bar:'B',ring:' ',luminosity:' '})).toBe('SBO');expect(galaxyTypeText({morphology:-5,bar:'B',ring:' ',luminosity:' '})).toBeNull();
  expect(galaxyTypeText({morphology:-9,bar:' ',ring:' ',luminosity:' '})).toBe('QSO/AGN');expect(galaxyTypeText({morphology:-8,bar:' ',ring:' ',luminosity:' '})).toBe('');expect(galaxyTypeText({morphology:-10,bar:' ',ring:' ',luminosity:' '})).toBeNull();
  expect(FIELD_STAR_LITERALS.csvUnits).toBe(",Hr,Mn,Sec,°,',''");expect(FIELD_STAR_LITERALS.csvUnits).toHaveLength(17);
  expect(catalogObjectView({kind:'galaxy',id:'X',ra:1,dec:1,v:1,major:0,minor:0,z:0,morphology:18,bar:' ',luminosity:' ',ring:' '},formatNativeSexagesimal).reasons).toEqual(['galaxy-colour-residue']);
 });
 test('pick: strict nearest below 350 px; the star wins only when the galaxy is strictly farther',()=>{
  const rec=(id:string):CatalogStarRecord=>({...star,id});
  const gal={kind:'galaxy' as const,id:'G',ra:0,dec:0,v:1,major:1,minor:1,z:0,morphology:1,bar:' ',luminosity:' ',ring:' '};
  const scene:CatalogScene={stars:[{id:'s0',x:412,y:412},{id:'s1',x:412,y:412}],galaxies:[{id:'g0',x:432,y:412,majorArcminutes:1}],records:{stars:[rec('A'),rec('B')],galaxies:[gal]}};
  expect((pickCatalogObject(scene,100,100) as CatalogStarRecord).id).toBe('A');// raster (412,412): star 0 at 0 px, galaxy 20 px
  expect(pickCatalogObject(scene,110,100)?.kind).toBe('galaxy');// 10 px from both: tie → galaxy
  expect(pickCatalogObject({stars:[{id:'s0',x:1100,y:312}],galaxies:[],records:{stars:[rec('A')],galaxies:[]}},0,0)).toBeNull();// 350 px exactly is not < 350
 });
});
