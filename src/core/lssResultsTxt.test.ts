import {describe,it,expect} from 'vitest';
import {lssResultsTxtBytes,lssResultsTxtRow,LSS_RESULTS_TXT} from './lssResultsTxt';
import {wedgeParseLssText,WEDGE_NATIVE_HEADER} from './wedgeLssText';

const row=(o:Partial<Parameters<typeof lssResultsTxtRow>[0]>={})=>({object:'SYNTH-00001',jd:2454389.199819,ra:13.5,dec:29.5,velocitySingle:6000,remarks:'',...o});
describe('Front L2: native LSS results .TXT writer 0x57af74 / row 0x57b8e4',()=>{
 it('builds the row from the decoded rules (research constructed example)',()=>{
  expect(lssResultsTxtRow(row())).toBe(`SYNTH-00001 4389.199819  13h30m00.0s  29°30'00"  6.000E+03 `);
 });
 it('cuts the ID to 11, writes 12 spaces for v = 0, signs a negative Dec, and V\'s trailing space precedes the remarks',()=>{
  expect(lssResultsTxtRow(row({object:'ABCDEFGHIJKLMNO',velocitySingle:0,dec:-5.25,remarks:'note'}))).toBe(`ABCDEFGHIJK 4389.199819  13h30m00.0s  -5°15'00"            note`);
  expect(lssResultsTxtRow(row({remarks:'x'.repeat(40)})).endsWith("x".repeat(36))).toBe(true);
  expect(lssResultsTxtRow(row({remarks:'x'.repeat(40)})).length).toBe(12+11+13+11+12+LSS_RESULTS_TXT.remarks);
 });
 it('file: header + rows, CR LF, ANSI (° = 0xB0); empty refused',()=>{
  const b=lssResultsTxtBytes([row(),row({object:'B',ra:12.25})]);
  const text=String.fromCharCode(...b);
  expect(text.split('\r\n')).toEqual([WEDGE_NATIVE_HEADER,lssResultsTxtRow(row()),lssResultsTxtRow(row({object:'B',ra:12.25})),'']);
  expect([...b].filter(n=>n===0xb0)).toHaveLength(2);expect([...b].some(n=>n>0xff)).toBe(false);
  expect(()=>lssResultsTxtBytes([])).toThrow();
 });
 it('round trip through the recovered wedge reader 0x57b488: V reads back with and without remarks; the comment survives',()=>{
  const ok=wedgeParseLssText(lssResultsTxtBytes([row()]),'.');
  expect(ok.ok).toBe(true);if(!ok.ok)return;
  const r=ok.file.rows[0];expect(r.objectId).toBe('SYNTH-00001');expect(ok.file.hasZ).toBe(false);
  expect(r.ra).toMatchObject({status:'value',h:13,m:30});expect(r.redshift).toMatchObject({status:'value',source:'velocity'});
  expect(lssResultsTxtRow(row({remarks:'note'})).endsWith(' 6.000E+03 note')).toBe(true);
  const remarked=wedgeParseLssText(lssResultsTxtBytes([row({remarks:'note'})]),'.');
  expect(remarked.ok).toBe(true);if(!remarked.ok)return;
  const r2=remarked.file.rows[0];expect(r2.redshift).toMatchObject({status:'value',source:'velocity'});expect(r2.comment).toBe('note');
  if(r2.redshift.status==='value'&&r.redshift.status==='value')expect(r2.redshift.velocity).toEqual(r.redshift.velocity);
 });
});
