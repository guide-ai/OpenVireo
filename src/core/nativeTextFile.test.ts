import {describe,it,expect} from 'vitest';
import {nativeTextFileLines,takeQuotedToken,cutFloatToken,nativeFloatSpelling,strToFloatErrorText,NATIVE_TEXT_BUFFER_BYTES} from './nativeTextFile';
import {formatNativeUnits,NATIVE_UNITS_LITERALS,NativeUnitsRangeError} from './nativeUnitsText';
import {formatReceiverBeam,RECEIVER_DISPLAY_LITERALS} from './radioReceiverDisplay';
// Contracts of the chosen ports (Front LSSPARSE, static reading of CLEA_VEO.exe 781bc970…c54c); they are not an oracle.
const bytes=(s:string)=>Uint8Array.from(s,c=>c.charCodeAt(0));
describe('Eof 0x403d88 + ReadLString 0x404084/0x403fec + ReadLn 0x4040f0 with tfCRLF (0x5ae034 = 1)',()=>{
 it('CR LF or LF ends a line; a final line break adds no line; a missing one keeps the last line',()=>{
  expect(nativeTextFileLines(bytes('A\r\nB\r\n'))).toEqual(['A','B']);
  expect(nativeTextFileLines(bytes('A\nB'))).toEqual(['A','B']);
  expect(nativeTextFileLines(bytes(''))).toEqual([]);
 });
 it('blank lines are lines; nothing is trimmed',()=>{
  expect(nativeTextFileLines(bytes('A\r\n\r\n  B  \r\n'))).toEqual(['A','','  B  ']);
 });
 it('a CR not followed by LF is dropped; CR CR LF is one line break',()=>{
  expect(nativeTextFileLines(bytes('A\rB\r\nC'))).toEqual(['AB','C']);
  expect(nativeTextFileLines(bytes('A\r\r\nB'))).toEqual(['A','B']);
 });
 it('^Z at the start of a line ends the file',()=>{
  expect(nativeTextFileLines(bytes('A\r\n\x1aB\r\nC'))).toEqual(['A']);
  expect(nativeTextFileLines(bytes('\x1a'))).toEqual([]);
 });
 it('^Z inside a buffer ends the line, is consumed, and the rest of that line is skipped',()=>{
  expect(nativeTextFileLines(bytes('AB\x1aCD\r\nEF\r\n'))).toEqual(['AB','EF']);
  // ReadLn's character reader 0x403f80 never consumes ^Z: a second one on the skipped part ends the file.
  expect(nativeTextFileLines(bytes('AB\x1aC\x1aD\r\nEF'))).toEqual(['AB']);
 });
 it('^Z as the first byte of a refilled 128-byte buffer is not consumed, so it ends the file',()=>{
  const x='x'.repeat(NATIVE_TEXT_BUFFER_BYTES);
  expect(nativeTextFileLines(bytes(x+'\x1aCD\r\nEF'))).toEqual([x]);
  expect(nativeTextFileLines(bytes(x+'y\x1aCD\r\nEF'))).toEqual([x+'y','EF']);
 });
 it('lines longer than one 255-character ShortString chunk are read whole',()=>{
  const long='z'.repeat(600);expect(nativeTextFileLines(bytes(long+'\r\nB'))).toEqual([long,'B']);
 });
});
describe('token helpers 0x4867fc and 0x48690c',()=>{
 it('0x4867fc: skips blanks and delimiters, takes the first character as the quote, deletes token + quote + one character',()=>{
  expect(takeQuotedToken("  'LSS_Field01.HTL' 12.0 29",' ')).toEqual(['LSS_Field01.HTL','12.0 29']);
  expect(takeQuotedToken('"A B"x rest',' ')).toEqual(['A B',' rest']);
  expect(takeQuotedToken("'unterminated",' ')).toEqual(['unterminated','']);
  expect(takeQuotedToken('LSS_Field01.HTL 12 29',' ')).toEqual(['SS_Field01.HT','12 29']);
  expect(takeQuotedToken('   ',' ')).toEqual(['','']);
  expect(takeQuotedToken(",,'a',b",',')).toEqual(['a','b']);
 });
 it('0x48690c: skips blanks and delimiters and cuts at the next delimiter',()=>{
  expect(cutFloatToken('   12.5   29',' ')).toEqual(['12.5','  29']);
  expect(cutFloatToken('29',' ')).toEqual(['29','']);
  expect(cutFloatToken('',' ')).toEqual(['','']);
 });
});
describe('StrToFloat 0x40cf60 / TextToFloat 0x40cdb4 lexical acceptance ([W] separator ".")',()=>{
 it('accepts sign, digits, separator, digits and an exponent with optional sign and digits; blanks around',()=>{
  const v=(t:string)=>{const s=nativeFloatSpelling(t);return s===null?null:Number(s);};
  expect(v('12.00000')).toBe(12);expect(v('+5')).toBe(5);expect(v('-.5')).toBe(-0.5);expect(v('5.')).toBe(5);
  expect(v(' 12 ')).toBe(12);expect(v('1E+2')).toBe(100);expect(v('1e')).toBe(1);expect(v('2e-')).toBe(2);
  expect(v('.')).toBe(0);// the separator alone counts as read input
  expect(v('12\0junk')).toBe(12);// PChar: the text ends at NUL
  expect(v('1e0000000005')).toBe(1e5);
 });
 it('rejects empty, sign-only, other characters, another separator and exponent digits left over at 500',()=>{
  for(const t of ['','-','+',' ','12a','1,5','1.2.3','e5','0x10','1e5000','\t1'])expect(nativeFloatSpelling(t),t).toBeNull();
  // The marker test is (byte and 0xdf) = 0x45 on 8-bit AL: 0xc5 'Å' and 0xe5 'å' keep bit 7 (→ 0xc5), so they are not markers.
  for(const t of ['1\u00e55','1\u00c55'])expect(nativeFloatSpelling(t),t).toBeNull();
  expect(Number(nativeFloatSpelling('1e5'))).toBe(1e5);expect(Number(nativeFloatSpelling('1E5'))).toBe(1e5);
  expect(Number(nativeFloatSpelling('1e1000'))).toBe(Infinity);// accepted lexically; the range is the caller's
 });
 it('SInvalidFloat (resource 0xfff1) names the whole text',()=>{
  expect(strToFloatErrorText('')).toBe("'' is not a valid floating point value");
  expect(strToFloatErrorText('12a')).toBe("'12a' is not a valid floating point value");
 });
});
describe('0x486f4c shared formatter',()=>{
 it('the beam text is the one-decimal case; the literals are the beam table cells',()=>{
  for(const v of [0,0.6990085,1.1,0.9999,360.5,719.25,-1.5,12345.5,-0.25,59.999])expect(formatNativeUnits(v,1,' Deg ',"'")).toBe(formatReceiverBeam(v));
  expect(NATIVE_UNITS_LITERALS).toEqual({pad:RECEIVER_DISPLAY_LITERALS.beamPad,zero:RECEIVER_DISPLAY_LITERALS.beamZero});
 });
 it('no decimal: whole minutes, the 60-minute carry, the 0 prefix',()=>{
  expect(formatNativeUnits(12.75,0,'Hr ','Min')).toBe('  12Hr 45Min');
  expect(formatNativeUnits(29,0,'° ',"'")).toBe("  29° 00'");
  expect(formatNativeUnits(Math.fround(12.33333),0,'Hr ','Min')).toBe('  12Hr 20Min');
  expect(formatNativeUnits(1.9999,0,'Hr ','Min')).toBe('   2Hr 0Min');// prefix tested on the pre-carry 60 (quirk kept)
  expect(formatNativeUnits(-3.1,0,'° ',"'")).toBe("  -3° 06'");
 });
 it('[W] range: the whole part must stay a positive signed dword after the carry; in range, mod 360 equals the loop',()=>{
  for(const v of [Infinity,-Infinity,NaN,2**53,-(2**31),0x7fffffff,0x7fffffff+0.5])expect(()=>formatNativeUnits(v,1,' Deg ',"'"),String(v)).toThrow(NativeUnitsRangeError);
  const loop=(w:number)=>{while(w>=360)w-=360;return w;};
  for(const w of [0,359,360,719,720,123456,0x7ffffffe,0x7fffffff])expect(w%360).toBe(loop(w));
  expect(formatNativeUnits(0x7ffffffe,0,'° ',"'")).toBe(` ${0x7ffffffe%360}° 00'`);
  expect(formatNativeUnits(-0x7ffffffe-0.9999,1,' Deg ',"'")).toBe(`-${0x7fffffff%360} Deg 0.0'`);// carry to 2^31 − 1, then mod 360
  expect(formatReceiverBeam(12345.5)).toBe(" 105 Deg 30.0'");
 });
});
