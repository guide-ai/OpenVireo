import {describe,expect,it} from 'vitest';
import {fixIndonesianSource,fixIndonesianTypography,indonesianTypography,indonesianTypographyFindings} from './indonesianTypography';
// Front ID0 (plan front-i18n-id.md §4.3–§4.4): the Indonesian typography fixer (quotes and thousands only) and the paired checks.
const N='\u202f';
describe('Front ID0: the Indonesian typography fixer',()=>{
 it('turns straight quote pairs into “ ”, and into ‘ ’ inside an existing “ ”',()=>{
  expect(fixIndonesianTypography('Pilih "Buka" lalu "Simpan".')).toBe('Pilih “Buka” lalu “Simpan”.');
  expect(fixIndonesianTypography('Klik “Pilih "Data" di sini”.')).toBe('Klik “Pilih ‘Data’ di sini”.');
  // An odd number of straight quotes is not a pair (a VIREO fragment that another piece closes): left for the lint's quotes rule.
  expect(fixIndonesianTypography('Tidak ditemukan: "')).toBe('Tidak ditemukan: "');
  expect(fixIndonesianTypography('Anda belum mencatat "',{quotes:false})).toBe('Anda belum mencatat "');
  expect(fixIndonesianTypography('Teks "a" dan "b"',{quotes:false})).toBe('Teks "a" dan "b"');
 });
 it('writes U+202F between thousands for a comma, a space or U+00A0, and never touches decimals, dates or coordinates',()=>{
  expect(fixIndonesianTypography('24,000 bintang, 2 400 000 dan 31\u00a0147')).toBe(`24${N}000 bintang, 2${N}400${N}000 dan 31${N}147`);
  expect(fixIndonesianTypography('Nilai 1.5, 0.650 dan 1.234')).toBe('Nilai 1.5, 0.650 dan 1.234');
  expect(fixIndonesianTypography('AR 12 30 45.6, Dek. +26 07 59, versi 1.64.1, 10 November 2026')).toBe('AR 12 30 45.6, Dek. +26 07 59, versi 1.64.1, 10 November 2026');
  // A comma after a lone 0 is a decimal comma (the digits rule fails it), never a thousands group.
  expect(fixIndonesianTypography('B−V 0,650')).toBe('B−V 0,650');
  // Placeholders, URLs and ?lang= values are kept.
  expect(fixIndonesianTypography('{count} dari https://openvireo.space/?lang=id "x"')).toBe('{count} dari https://openvireo.space/?lang=id “x”');
 });
 it('is idempotent and reports each change',()=>{
  for(const s of ['Pilih "Buka".','24,000','Klik “Pilih "Data"”.','2 400 000 "a" "b"']){const once=fixIndonesianTypography(s);expect(fixIndonesianTypography(once),s).toBe(once);}
  expect(indonesianTypography('Pilih "Buka", 1,000').changes.map(c=>c.label)).toEqual(['thousands','“ ” instead of straight quotes']);
  expect(indonesianTypography('Pilih “Buka”, 1\u202f000').changes).toEqual([]);
 });
 it('rewrites the string literals of a map source with characters, and keeps comments, keys and import paths',()=>{
  const source="import x from './a';\n// \"komentar\" 1,000\nexport const M={'key \"k\"':'Pilih \"Buka\"',b:`Total ${n} dari 1,000`,c:\"Hingga 24,000\"};\n";
  const fixed=fixIndonesianSource(source);
  expect(fixed).toBe(`import x from './a';\n// "komentar" 1,000\nexport const M={'key "k"':'Pilih “Buka”',b:\`Total \${n} dari 1${N}000\`,c:"Hingga 24${N}000"};\n`);
  expect(fixed).not.toMatch(/\\u202[fF]/);
  expect(fixIndonesianSource(fixed)).toBe(fixed);
 });
});
describe('Front ID0: the Indonesian checks that read the English',()=>{
 it('fails a period between thousands where the English groups with a comma, and a decimal grouped as thousands',()=>{
  expect(indonesianTypographyFindings('Hingga 24.000 bintang.','Up to 24,000 stars.').map(f=>f.label)).toEqual(['period between thousands']);
  expect(indonesianTypographyFindings('Nilai 1.234.','The value is 1.234.')).toEqual([]);
  expect(indonesianTypographyFindings(`Nilai 1${N}234.`,'The value is 1.234.').map(f=>f.label)).toEqual(['decimal grouped as thousands']);
  expect(indonesianTypographyFindings(`Hingga 24${N}000 bintang.`,'Up to 24,000 stars.')).toEqual([]);
 });
 it('fails title case only where the English has no run of three capitalised words; «Anda» and brackets do not count',()=>{
  expect(indonesianTypographyFindings('Opsi Simulasi Optik','Optical simulation options').map(f=>f.label)).toEqual(['title case']);
  expect(indonesianTypographyFindings('Opsi Simulasi Optik','Optical Simulation Options')).toEqual([]);
  expect(indonesianTypographyFindings('Simpan Investigasi Anda','Save your investigation').map(f=>f.label)).toEqual([]);
  expect(indonesianTypographyFindings('Opsi simulasi (Optical Simulation Options) Baru','New optical simulation options')).toEqual([]);
  expect(indonesianTypographyFindings('Temukan Data Pulsar','Find Pulsar Data')).toEqual([]);
 });
 it('reports straight quotes as the fixer’s, and nothing for clean text',()=>{
  expect(indonesianTypographyFindings('Pilih "Buka".','Choose "Open".').map(f=>f.label)).toEqual(['“ ” instead of straight quotes']);
  expect(indonesianTypographyFindings('Pilih “Buka”.','Choose "Open".')).toEqual([]);
 });
});
