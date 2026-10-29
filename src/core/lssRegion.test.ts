import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseGlxCatalog} from './glxCatalog';
import {checkLssRegion,extractLssRegion,lssRegionSummary,lssRegionTexts,LSS_REGION_INITIAL,LSS_REGION_TEXT,floatToStrFExponent3} from './lssRegion';

const catalogue=parseGlxCatalog(new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_GLX.DAT',import.meta.url))));
const text=(o:Partial<Record<string,string>>={})=>({raMin:'12',raMax:'13',decMin:'27',decMax:'28',zMin:'0',zMax:'0.05',...o});
describe('Front L2: TLSSRgnDlg (0x5853f4 / 0x585510 / 0x584d0c)',()=>{
 it('FormShow texts of the initial (zero) bounds',()=>{
  expect(lssRegionTexts(LSS_REGION_INITIAL)).toEqual({raMin:'0.00',raMax:'0.00',decMin:'0.00',decMax:'0.00',zMin:'0.00E+00',zMax:'0.00E+00'});
  expect(floatToStrFExponent3(0.02346)).toBe('2.35E-02');expect(floatToStrFExponent3(-1.5)).toBe('-1.50E+00');
 });
 it('OK validation: non-numeric, then the inconsistency rules (the untouched zero defaults fail RAmin < RAmax)',()=>{
  expect(checkLssRegion(lssRegionTexts(LSS_REGION_INITIAL))).toEqual({ok:false,message:LSS_REGION_TEXT.inconsistent});
  expect(checkLssRegion(text({decMax:'x'}))).toEqual({ok:false,message:LSS_REGION_TEXT.nonNumeric});
  for(const bad of [{raMax:'24.5'},{raMin:'-1'},{raMin:'13'},{decMin:'-91'},{decMax:'27'},{zMin:'0.05'}])expect(checkLssRegion(text(bad)).ok,JSON.stringify(bad)).toBe(false);
  expect(checkLssRegion(text({zMin:'-5',zMax:'99'})).ok).toBe(true);// Z has no range limit
  expect(checkLssRegion(text())).toEqual({ok:true,bounds:{raMin:12,raMax:13,decMin:27,decMax:28,zMin:0,zMax:0.05}});
 });
 it('extraction: inclusive bounds over all 24069 records, ordered by RA; summary text',()=>{
  const c=checkLssRegion(text());if(!c.ok)throw Error();
  const r=extractLssRegion(catalogue,c.bounds);
  expect(r.searched).toBe(24069);expect(r.rows.length).toBeGreaterThan(0);
  for(const g of r.rows)expect(g.ra>=12&&g.ra<=13&&g.dec>=27&&g.dec<=28&&g.z>=0&&g.z<=0.05).toBe(true);
  const expected=catalogue.filter(g=>g.redshift>=0&&g.redshift<=0.05&&g.ra>=12&&g.ra<=13&&g.dec>=27&&g.dec<=28).length;
  expect(r.rows).toHaveLength(expected);
  for(let i=1;i<r.rows.length;i++)expect(r.rows[i-1].ra<=r.rows[i].ra).toBe(true);
  expect(lssRegionSummary(r)).toMatch(/^Galaxy Records Searched: 24069\r\nGalaxies Found in Region: \d+\r\nRange in Z: \d\.\d\dE[+-]\d\d to \d\.\d\dE[+-]\d\d$/);
  // An inclusive bound on a record's own value selects it.
  const g=catalogue[100];const one=extractLssRegion(catalogue,{raMin:g.ra,raMax:g.ra,decMin:g.dec,decMax:g.dec,zMin:g.redshift,zMax:g.redshift});
  expect(one.rows.map(x=>x.recordIndex)).toContain(100);
  // No match: the native initial range 1.0 .. 0.0 is shown.
  expect(lssRegionSummary(extractLssRegion(catalogue,{raMin:0,raMax:24,decMin:-90,decMax:90,zMin:50,zMax:60}))).toBe('Galaxy Records Searched: 24069\r\nGalaxies Found in Region: 0\r\nRange in Z: 1.00E+00 to 0.00E+00');
 });
});
