import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {readVizierCatalog,selectVizierCatalog,vizierConeUrl,vizierRouteForCamera,wholeSkySelection,VizierCatalogError,type VizierRowContext} from './vizierNomad';

// Recorded CDS response (2026-10-27T17:19:23, vizier.cds.unistra.fr, I/297, RA=56.75 DEC=24.12 SR=0.01).
const recorded=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
const ctx=(band:VizierRowContext['band'],epochOffsetYears=0):VizierRowContext=>({catalog:'I/297',band,epochOffsetYears,queryBrightMagnitude:1,queryFaintMagnitude:21.5});
const enc=(s:string)=>new TextEncoder().encode(s);
/** SYNTHETIC test documents (authored here, not VizieR output). */
const synthetic=(fields:string[],rows:string[][],info='')=>enc(`<?xml version="1.0"?><VOTABLE version="1.4">${info}<RESOURCE><TABLE>${fields.map(f=>`<FIELD name="${f}" datatype="char"/>`).join('')}<DATA><TABLEDATA>${rows.map(r=>`<TR>${r.map(c=>c===''?'<TD/>':`<TD>${c}</TD>`).join('')}</TR>`).join('')}</TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`);
const nomadFields=['NOMAD1','RAJ2000','DEJ2000','pmRA','pmDE','Bmag','Vmag','Rmag','Jmag','Hmag','Kmag'];

describe('VizieR VOTable reader',()=>{
 test('recorded NOMAD response: R band keeps the one star with Rmag, sorted, epoch 0',()=>{
  const c=readVizierCatalog(recorded,ctx('R'));
  expect(c.fieldNames).toContain('NOMAD1');expect(c.maxTuples).toBe(50000);expect(c.matches).toBe(4);
  expect(c.entries).toHaveLength(4);expect(c.catalogEntries).toHaveLength(1);expect(c.rejectedCount).toBe(3);
  const row=c.catalogEntries[0].result.row;
  expect(row.identifier).toBe('1141-0043644');expect(row.raHours).toBe(56.7470833/15);expect(row.decDegrees).toBe(24.1199861);
  expect(row.selectedMagnitude).toBe(Math.fround(18.86));expect(row.motionRaAfterDivision).toBe(Math.fround(-0.002));
 });
 test('Front C5W: recorded IDIA USNO-B1 (I/284) response reads with its I2 column',()=>{
  const bytes=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/usnob1-56.75+24.12-r0.01.xml',import.meta.url)));
  const c=readVizierCatalog(bytes,{catalog:'I/284',band:'I2',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5});
  expect(c.fieldNames).toContain('USNO-B1.0');expect(c.fieldNames).toContain('Imag');expect(c.maxTuples).toBe(50000);expect(c.matches).toBe(4);
  expect(c.entries).toHaveLength(4);
 });
 test('recorded response: B band keeps three, RA-then-DEC order',()=>{
  const c=readVizierCatalog(recorded,ctx('B'));
  expect(c.catalogEntries.map(e=>e.result.row.identifier)).toEqual(['1141-0043630','1141-0043634','1141-0043639']);
 });
 test('proper motion follows the recovered divisors',()=>{
  const c=readVizierCatalog(recorded,ctx('R',10));const r=c.catalogEntries[0].result.row;
  expect(r.raHours).toBe(56.7470833/15+(10*Math.fround(-2/1000))/54000);
  expect(r.decDegrees).toBe(24.1199861+(10*Math.fround(4/1000))/3600);
 });
 test('selection uses the recovered predicate and sentinels',()=>{
  const c=readVizierCatalog(recorded,ctx('B'));
  const all=selectVizierCatalog(c,wholeSkySelection(21.5));expect(all.selectedEntries).toHaveLength(3);
  expect(all.nativeMinimumMagnitude).toBe(Math.fround(20.23));expect(all.nativeMaximumMagnitude).toBe(Math.fround(21.03));
  const none=selectVizierCatalog(c,wholeSkySelection(20));expect(none.selectedEntries).toHaveLength(0);
  expect([none.nativeMinimumMagnitude,none.nativeMaximumMagnitude]).toEqual([25,-2]);
  expect(()=>selectVizierCatalog({...c},wholeSkySelection(21.5))).toThrow(VizierCatalogError);
 });
 test('query window, zero, >=30 and blank selected magnitudes reject; blank motion is invalid, not zero',()=>{
  const c=readVizierCatalog(synthetic(nomadFields,[
   ['a','10','1','0','0','','','0.5','','',''],['b','10','1','0','0','','','21.6','','',''],['c','10','1','0','0','','','0','','',''],
   ['d','10','1','0','0','','','30','','',''],['e','10','1','0','0','','','','','',''],['f','10','1','','0','','','15','','',''],['g','10','1','0','0','','','21.5','','',''],
  ]),ctx('R'));
  expect(c.entries.map(e=>e.result.kind==='rejected'?e.result.reason:e.result.kind==='invalid'?`invalid:${e.result.field}`:'ok'))
   .toEqual(['query-magnitude-window','query-magnitude-window','selected-magnitude','selected-magnitude','selected-magnitude','invalid:MuRA','ok']);
 });
 test('typed refusals: QUERY_STATUS, overflow, binary, missing band, size, encoding',()=>{
  const code=(f:()=>unknown)=>{try{f();}catch(e){return (e as VizierCatalogError).code;}return 'none';};
  expect(code(()=>readVizierCatalog(synthetic(nomadFields,[],'<INFO name="QUERY_STATUS" value="ERROR">bad</INFO>'),ctx('R')))).toBe('query-status');
  expect(code(()=>readVizierCatalog(synthetic(nomadFields,[],'<INFO name="QUERY_STATUS" value="OVERFLOW"/>'),ctx('R')))).toBe('overflow');
  expect(code(()=>readVizierCatalog(synthetic(nomadFields,[['a','1','1','0','0','','','5','','','']],'<INFO name="MaxTuples" value="1"/>'),ctx('R')))).toBe('overflow');
  expect(code(()=>readVizierCatalog(synthetic(nomadFields,[],'<INFO name="matches" value="3"/>'),ctx('R')))).toBe('overflow');
  expect(code(()=>readVizierCatalog(enc('<VOTABLE><RESOURCE><TABLE><FIELD name="x"/><DATA><BINARY><STREAM>AA==</STREAM></BINARY></DATA></TABLE></RESOURCE></VOTABLE>'),ctx('R')))).toBe('binary');
  expect(code(()=>readVizierCatalog(synthetic(nomadFields.filter(f=>f!=='Rmag'),[]),ctx('R')))).toBe('missing-band');
  expect(code(()=>readVizierCatalog(synthetic(nomadFields.filter(f=>f!=='pmDE'),[]),ctx('R')))).toBe('missing-field');
  expect(code(()=>readVizierCatalog(new Uint8Array(0),ctx('R')))).toBe('size');
  expect(code(()=>readVizierCatalog(new Uint8Array([0xff,0xfe]),ctx('R')))).toBe('encoding');
  expect(code(()=>readVizierCatalog(enc('<html>error</html>'),ctx('R')))).toBe('not-votable');
  expect(code(()=>readVizierCatalog(synthetic(nomadFields,[['a','1']]),ctx('R')))).toBe('malformed');
  expect(code(()=>readVizierCatalog(enc('<VOTABLE version="1.4"><RESOURCE type="results"></RESOURCE></VOTABLE>'),ctx('R')))).toBe('table-count');
  expect(code(()=>readVizierCatalog(enc('<VOTABLE version="1.4"><RESOURCE><INFO name="QUERY_STATUS" value="OK"/></RESOURCE></VOTABLE>'),ctx('R')))).toBe('table-count');
  expect(code(()=>readVizierCatalog(synthetic(nomadFields,[],'<INFO name="Error" value="Cone search failed"/>'),ctx('R')))).toBe('query-status');
  expect(code(()=>readVizierCatalog(synthetic(nomadFields,[],'<RESOURCE><PARAM name="Error" value="bad SR" datatype="char"/></RESOURCE>'),ctx('R')))).toBe('query-status');
  expect(code(()=>readVizierCatalog(synthetic(nomadFields,[],'<INFO name="QUERY_STATUS" value="UNKNOWN"/>'),ctx('R')))).toBe('query-status');
  expect(code(()=>readVizierCatalog(enc('<VOTABLE><RESOURCE><TABLE><FIELD name="NOMAD1"/></TABLE></RESOURCE></VOTABLE>'),ctx('R')))).toBe('missing-field');
 });
 test('dense fields: 10,001 admitted rows are ordered; more than the reader bound is a typed row-limit',()=>{
  const rows=Array.from({length:10001},(_,i)=>[`r${i}`,String(10+(i%997)/1e4),String(1+Math.floor(i/997)/1e4),'0','0','','','15','','','']);
  const c=readVizierCatalog(synthetic(nomadFields,rows,'<INFO name="MaxTuples" value="50000"/>'),ctx('R'));
  expect(c.catalogEntries).toHaveLength(10001);expect(selectVizierCatalog(c,wholeSkySelection(21.5)).selectedEntries).toHaveLength(10001);
  const NaNcell=readVizierCatalog(synthetic(nomadFields,[['a','10','1','0','0','','','NaN','','','']]),ctx('R'));
  expect(NaNcell.entries[0].result).toEqual({kind:'rejected',reason:'selected-magnitude'});
 });
 test('empty valid cone is a valid empty catalog, not an error',()=>{
  const c=readVizierCatalog(synthetic(nomadFields,[]),ctx('V'));expect(c.catalogEntries).toEqual([]);
 });
 // USNO-B1 column mapping is tested only with this authored document until a real I/284 response is recorded.
 test('USNO-B1 I2 reads Imag; NOMAD has no I band',()=>{
  const c=readVizierCatalog(synthetic(['USNO-B1.0','RAJ2000','DEJ2000','pmRA','pmDE','B1mag','R1mag','B2mag','R2mag','Imag'],[['1141-0012345','56.7','24.1','4','-2','','','','','17.25']]),{...ctx('I2'),catalog:'I/284'});
  expect(c.catalogEntries[0].result.row.selectedMagnitude).toBe(Math.fround(17.25));
  expect(()=>readVizierCatalog(recorded,{...ctx('I2')})).toThrow(VizierCatalogError);
 });
 test('cone URL carries only RA, DEC and SR in the recovered precisions',()=>{
  expect(vizierConeUrl('I/297',56.75,24.12,0.2282173)).toBe('https://vizier.cds.unistra.fr/viz-bin/conesearch/I/297/out?RA=56.750000&DEC=24.120000&SR=0.23');
  expect(()=>vizierConeUrl('I/297',56.75,24.12,0.001)).toThrow(VizierCatalogError);
 });
 test('camera filter routes',()=>{
  expect([0,1,2,3,4].map(p=>vizierRouteForCamera('ccd',p))).toEqual([
   {catalog:'I/297',band:'R',catalogName:'NOMAD'},{catalog:'I/297',band:'B',catalogName:'NOMAD'},{catalog:'I/297',band:'V',catalogName:'NOMAD'},
   {catalog:'I/297',band:'R',catalogName:'NOMAD'},{catalog:'I/284',band:'I2',catalogName:'USNO-B1'}]);
  expect(vizierRouteForCamera('ir',2)).toEqual({catalog:'I/297',band:'K',catalogName:'NOMAD'});
 });
});
