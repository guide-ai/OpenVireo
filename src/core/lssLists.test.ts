import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../../docs/LOCAL-RESOURCES.json';
import {LSS_FIELDS_LST,GLIMAGES_LST,GLXYSP_LST,parseLssFieldsList,readLssFieldsList,parseLssFieldsLine,lssFieldsItemText,LSS_FIELDS_ITEM,parseGlimagesPositions,parseGlxyspNames,hasLibrarySpectrum,OriginalListError,LSS_FIELDS_FILE_ERROR,lssFieldsFileErrorText} from './lssLists';
const read=(path:string)=>new Uint8Array(readFileSync(new URL('../../public'+path,import.meta.url)));
const read_=read;
const code=(f:()=>unknown)=>{try{f();return 'ok';}catch(e){return e instanceof OriginalListError?'list':'other';}};
describe('byte-exact LSSFields.LST, GLIMAGES.LST and GLXYSP.LST (approval of 2026-10-27)',()=>{
 it('are the manifested identities',()=>{
  for(const id of [LSS_FIELDS_LST,GLIMAGES_LST,GLXYSP_LST]){const b=read(id.path);expect(b.byteLength).toBe(id.bytes);expect(createHash('sha256').update(b).digest('hex')).toBe(id.sha256);expect(manifest.files).toContainEqual({path:'public'+id.path,bytes:id.bytes,sha256:id.sha256});}
 });
 it('LSSFields.LST names the nine lists in order with their original labels and centres',()=>{
  const f=parseLssFieldsList(read(LSS_FIELDS_LST.path));
  expect(f.map(x=>x.label)).toEqual(Array.from({length:9},(_,i)=>`Survey Field ${i+1}`));
  expect(f.map(x=>x.ra)).toEqual([12,12.33333,12.75,13,13.25,13.75,14.41667,14.66667,15.5].map(Math.fround));expect(new Set(f.map(x=>x.dec))).toEqual(new Set([29]));
  const tampered=read(LSS_FIELDS_LST.path);tampered[3]=0x58;expect(code(()=>parseLssFieldsList(tampered))).toBe('list');
 });
 it('GLIMAGES.LST gives 183 positions; GLXYSP.LST 48 library names with the native key',()=>{
  const p=parseGlimagesPositions(read(GLIMAGES_LST.path));expect(p).toHaveLength(183);expect(p[0]).toEqual({index:0,ra:.16483,dec:25.9241});
  const s=parseGlxyspNames(read(GLXYSP_LST.path));expect(s.size).toBe(48);expect(hasLibrarySpectrum(s,'NGC 4670')).toBe(true);expect(hasLibrarySpectrum(s,'NGC 4080')).toBe(false);
  expect(code(()=>parseGlxyspNames(new TextEncoder().encode('x y\r\n')))).toBe('list');
 });
});
describe('Front L4: TLSSFieldsForm1 FormShow file error (0x52ac24, strings 0x52afd0/0x52aff8/0x52affc)',()=>{
 it('prefix + path + CRLF CRLF + reason, caption File Error!, MB_ICONSTOP',()=>{
  expect(LSS_FIELDS_FILE_ERROR).toEqual({prefix:'Cannot access LSS fields file ',separator:'\r\n\r\n',caption:'File Error!',flags:0x10});
  expect(lssFieldsFileErrorText('/original/hotlists/LSSFields.LST','why')).toBe('Cannot access LSS fields file /original/hotlists/LSSFields.LST\r\n\r\nwhy');
 });
});
describe('Front LSSPARSE: TLSSFieldsForm1 FormShow read loop 0x52ad25, line parser 0x52b00c, list item 0x52b10c',()=>{
 const enc=(s:string)=>Uint8Array.from(s,c=>c.charCodeAt(0));
 const RA=['12.00000','12.33333','12.75000','13.00000','13.25000','13.75000','14.41667','14.66667','15.50000'];
 it('the bundled bytes: nine records, file ShortString[71], Single RA/Dec, label ShortString[24], no failure',()=>{
  const read=readLssFieldsList(read_(LSS_FIELDS_LST.path));
  expect(read.failure).toBeNull();
  expect(read.records.map(r=>r.file)).toEqual(Array.from({length:9},(_,i)=>`LSS_Field0${i+1}.HTL`));
  expect(read.records.map(r=>r.ra)).toEqual(RA.map(t=>Math.fround(Number(t))));
  expect(read.records[1].ra).toBe(12.333330154418945);
  expect(read.records.every(r=>r.dec===29)).toBe(true);
  expect(read.records.map(r=>r.label)).toEqual(Array.from({length:9},(_,i)=>`Survey Field ${i+1}`));
  expect(parseLssFieldsList(read_(LSS_FIELDS_LST.path)).map(({field,...r})=>({field,r}))).toEqual(read.records.map((r,i)=>({field:i+1,r})));
 });
 it('[W] binary64-then-fround equals a direct binary32 rounding for the bundled values (far from a rounding boundary)',()=>{
  for(const t of [...RA,'29.00']){
   const v=Number(t),s=Math.fround(v),ulp=2**(Math.floor(Math.log2(s))-23);
   expect(Math.abs(Math.abs(v-s)-ulp/2)).toBeGreaterThan(ulp*1e-6);
  }
 });
 it('the bundled list items: label padded to 17, RA and Dec through 0x486f4c with no decimal',()=>{
  const items=parseLssFieldsList(read_(LSS_FIELDS_LST.path)).map(lssFieldsItemText);
  expect(items).toEqual(['00','20','45','00','15','45','25','40','30'].map((m,i)=>`Survey Field ${i+1}   `+`  ${[12,12,12,13,13,13,14,14,15][i]}Hr ${m}Min`+"   29° 00'"));
  expect(LSS_FIELDS_ITEM).toEqual({width:17,raUnit:'Hr ',raMinutes:'Min',decUnit:'° ',decMinutes:"'"});
 });
 it('VIREO line endings: LF-only lines and a missing ^Z or final line break read the same records',()=>{
  const text=new TextDecoder('latin1').decode(read_(LSS_FIELDS_LST.path)),base=readLssFieldsList(read_(LSS_FIELDS_LST.path)).records;
  for(const v of [text.replace(/\r\n/g,'\n'),text.replace(/\x1a$/,''),text.replace(/\r\n\x1a$/,''),text+'ignored after ^Z'])expect(readLssFieldsList(enc(v)).records).toEqual(base);
 });
 it('tokens: any quote character, runs of blanks, extra tokens ignored, missing label empty, ShortString cuts',()=>{
  expect(parseLssFieldsLine(`"A.HTL"   1.5    -2   "Lab el"  junk`,1)).toEqual({file:'A.HTL',ra:1.5,dec:-2,label:'Lab el'});
  expect(parseLssFieldsLine(`'A.HTL' 1 2`,1)).toEqual({file:'A.HTL',ra:1,dec:2,label:''});
  expect(parseLssFieldsLine(`LSS_Field01.HTL 12 29 'X'`,1)).toEqual({file:'SS_Field01.HT',ra:12,dec:29,label:'X'});
  expect(parseLssFieldsLine(`'${'f'.repeat(80)}' 1 2 '${'L'.repeat(30)}'`,1)).toEqual({file:'f'.repeat(71),ra:1,dec:2,label:'L'.repeat(24)});
  expect(parseLssFieldsLine(`'A' 1e1 -0 'B'`,1)).toEqual({file:'A',ra:10,dec:0,label:'B'});
 });
 it('blank, short and comment-like lines are not skipped: StrToFloat fails with SInvalidFloat',()=>{
  expect(parseLssFieldsLine('',3)).toEqual({line:3,field:'ra',token:'',kind:'convert',message:"'' is not a valid floating point value"});
  expect(parseLssFieldsLine(`'A' 12.5`,4)).toEqual({line:4,field:'dec',token:'',kind:'convert',message:"'' is not a valid floating point value"});
  expect(parseLssFieldsLine(`; comment 1 2`,5)).toMatchObject({field:'ra',token:'',kind:'convert'});// ';' is the quote: no closing one
  expect(parseLssFieldsLine(`#note# 1 2 'L'`,5)).toEqual({file:'note',ra:1,dec:2,label:'L'});// no comment syntax
  expect(parseLssFieldsLine(`'A' 12,5 29 'B'`,6)).toMatchObject({field:'ra',token:'12,5',kind:'convert'});
  expect(parseLssFieldsLine(`'A' 1e39 29 'B'`,7)).toEqual({line:7,field:'ra',token:'1e39',kind:'range',message:null});
 });
 it('a failing line ends the read; the records before it stay (no Close, no list box fill)',()=>{
  const r=readLssFieldsList(enc(`'A' 1 2 'a'\r\n'B' 3 4 'b'\r\n\r\n'C' 5 6 'c'\r\n`));
  expect(r.records.map(x=>x.file)).toEqual(['A','B']);expect(r.failure).toMatchObject({line:3,field:'ra',kind:'convert'});
  expect(readLssFieldsList(enc(''))).toEqual({records:[],failure:null});
  expect(readLssFieldsList(enc(Array.from({length:40},(_,i)=>`'F${i}' ${i} 0 'x'`).join('\r\n'))).records).toHaveLength(40);// no count limit
 });
 it('[W] the web guard: a failure, another count or another file name is OriginalListError',()=>{
  const text=new TextDecoder('latin1').decode(read_(LSS_FIELDS_LST.path)),err=(s:string)=>{try{parseLssFieldsList(enc(s));return null;}catch(e){return e instanceof OriginalListError?e.line:'other';}};
  expect(err(text)).toBeNull();
  expect(err(text.replace("'Survey Field 9'\r\n","'Survey Field 9'\r\n\r\n"))).toBe(10);
  expect(err(text.split('\r\n').slice(0,8).join('\r\n'))).toBe(0);
  expect(err(text.replace('LSS_Field04','LSS_Field4X'))).toBe(4);
  expect(err(text.replace('13.25000','13.2500O'))).toBe(5);
 });
});
