import {describe,expect,it} from 'vitest';
import {EAST_ASIAN_WIDTH_UNICODE,WIDE,codePointColumns,cutColumns,displayColumns,graphemes,isLatin1Text,isWideCodePoint} from './textColumns';

// Front SC7 (docs/I18N.md, "Script groundwork: Unicode help (SC7)"): the display-column measure of translated help.
describe('the East Asian Width table',()=>{
 it('is Unicode 16.0.0 W/F as 122 sorted, disjoint inclusive runs',()=>{
  expect(EAST_ASIAN_WIDTH_UNICODE).toBe('16.0.0');
  expect(WIDE.length).toBe(244);
  for(let i=0;i<WIDE.length;i+=2){expect(WIDE[i]).toBeLessThanOrEqual(WIDE[i+1]);if(i)expect(WIDE[i]).toBeGreaterThan(WIDE[i-1]+1);}
 });
 it('marks the wide scripts and full-width forms wide, and not their neighbours',()=>{
  for(const c of ['ᄀ','漢','あ','ア','ー','。','「','\u3000','Ａ','ｚ','！','가','𠮷','😀','〾'])expect(isWideCodePoint(c.codePointAt(0)!),c).toBe(true);
  for(const c of ['A','é','Ж','क','ｱ','￨','‐','—','“','€','〿'])expect(isWideCodePoint(c.codePointAt(0)!),c).toBe(false);
  expect(isWideCodePoint(0x10ffff)).toBe(false);expect(isWideCodePoint(0x3fffd)).toBe(true);expect(isWideCodePoint(0x3fffe)).toBe(false);
 });
});

describe('displayColumns',()=>{
 it('counts one column for every character up to U+00FF, so Latin-1 text measures its length',()=>{
  for(let c=0;c<256;c++){expect(codePointColumns(c)).toBe(1);expect(displayColumns(String.fromCharCode(c))).toBe(1);}
  const all=Array.from({length:256},(_,c)=>String.fromCharCode(c)).join('');
  expect(isLatin1Text(all)).toBe(true);expect(displayColumns(all)).toBe(256);
  expect(displayColumns('Año «x» \u00ad soft')).toBe('Año «x» \u00ad soft'.length);
 });
 it('counts wide characters two, marks and format characters none, the rest one',()=>{
  expect(displayColumns('観測所')).toBe(6);
  expect(displayColumns('ＣＣＤカメラ')).toBe(12);
  expect(displayColumns('ｶﾒﾗ')).toBe(3);// half-width katakana
  expect(displayColumns('𠮷野家')).toBe(6);// a surrogate pair is one character
  expect(displayColumns('e\u0301')).toBe(1);// a combining acute accent
  expect(displayColumns('क्ष')).toBe(2);// virama (Mn) takes no column
  expect(displayColumns('कि')).toBe(2);// the vowel sign i (Mc) advances the pen
  expect(displayColumns('ज\u093cर')).toBe(2);// nukta (Mn)
  expect(displayColumns('a\u200db\u200c')).toBe(2);// ZWJ, ZWNJ
  expect(displayColumns('Съёмка')).toBe(6);
  expect(displayColumns('—“x”…')).toBe(5);// ambiguous width counts one
 });
});

describe('graphemes and cutColumns',()=>{
 it('cuts Latin-1 text exactly as slice',()=>{
  for(const t of ['','abc','Año «x» 12345','x'.repeat(100)])for(const n of [0,1,3,65,80])expect(cutColumns(t,n)).toBe(t.slice(0,n));
 });
 it('never splits a cluster or a surrogate pair, and never exceeds the columns',()=>{
  expect(graphemes('क्षि𠮷e\u0301')).toEqual(['क्षि','𠮷','e\u0301']);
  expect(cutColumns('観測所',5)).toBe('観測');
  expect(cutColumns('観測所',4)).toBe('観測');
  expect(cutColumns('𠮷𠮷',3)).toBe('𠮷');
  expect(cutColumns('ae\u0301b',2)).toBe('ae\u0301');
  expect(cutColumns('ae\u0301b',1)).toBe('a');
  expect(cutColumns('Съёмка',3)).toBe('Съё');
  for(const t of ['ＣＣＤカメラを閉じる','एक्सपोज\u093cर सेट करें','𠮷野家の牛丼'])for(let n=0;n<30;n++){
   const c=cutColumns(t,n);expect(t.startsWith(c)).toBe(true);expect(displayColumns(c)).toBeLessThanOrEqual(n);
   const next=graphemes(t)[graphemes(c).length];if(next)expect(displayColumns(c+next)).toBeGreaterThan(n);
  }
 });
});
