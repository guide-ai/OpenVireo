import{describe,expect,it}from'vitest';
import{WEDGE_LIMITS,WEDGE_NATIVE_HEADER,wedgeAbsInt32,wedgeHasTxtExtension,wedgeParseLssText,wedgeParseRow,type WedgeParseResult}from'./wedgeLssText';
import{wedgeBitsHex}from'./wedgeNumeric';
// Synthetic LSS text vectors written for these tests from the recovered layout
// (header 0x57ae64, parser 0x57b488). They are not CLEA observations or original files.
const latin1=(s:string)=>Uint8Array.from(s,c=>{const b=c.charCodeAt(0);if(b>255)throw new Error('latin1');return b;});
const file=(...lines:string[])=>latin1(lines.join('\r\n')+'\r\n');
const ok=(r:WedgeParseResult)=>{if(!r.ok)throw new Error(JSON.stringify(r.failure));return r.file;};
const DEG='°';
describe('LSS saved-data header gate and admission',()=>{
 it('accepts the original header as a velocity file and a Z header as a redshift file',()=>{
  expect(ok(wedgeParseLssText(file(WEDGE_NATIVE_HEADER),'.'))).toMatchObject({hasZ:false,rows:[]});
  expect(ok(wedgeParseLssText(file('Object ID  MJD  RA  Dec  Z  Comments'),'.')).hasZ).toBe(true);
 });
 it('applies Pos("Object ID")=1 and Pos("RA")>0 literally',()=>{
  for(const h of[' Object ID RA','Object Id RA','Object ID ra Dec','',]) expect(wedgeParseLssText(file(h),'.')).toEqual({ok:false,failure:{kind:'header'}});
  expect(wedgeParseLssText(new Uint8Array(),'.')).toEqual({ok:false,failure:{kind:'header'}});
 });
 it('rejects blank rows, lone CR, unadmitted bytes, oversize lines/rows/files without partial results',()=>{
  expect(wedgeParseLssText(file(WEDGE_NATIVE_HEADER,'A','','B'),'.')).toEqual({ok:false,failure:{kind:'unsupported',code:'blank-line',line:3}});
  expect(wedgeParseLssText(latin1(WEDGE_NATIVE_HEADER+'\r\nA\r\n\r\n'),'.')).toMatchObject({ok:false,failure:{code:'blank-line'}});
  expect(wedgeParseLssText(latin1(WEDGE_NATIVE_HEADER+'\rA'),'.')).toMatchObject({ok:false,failure:{code:'cr',line:1}});
  expect(wedgeParseLssText(latin1(WEDGE_NATIVE_HEADER+'\nCafé'),'.')).toMatchObject({ok:false,failure:{code:'bytes',line:2}});
  expect(wedgeParseLssText(Uint8Array.from([...latin1(WEDGE_NATIVE_HEADER+'\nA 1 12h0m0s 0'),0xc2,0xb0]),'.')).toMatchObject({ok:false,failure:{code:'bytes'}});
  expect(wedgeParseLssText(latin1(WEDGE_NATIVE_HEADER+'\tX'),'.')).toMatchObject({ok:false,failure:{code:'bytes'}});
  expect(wedgeParseLssText(file(WEDGE_NATIVE_HEADER,'x'.repeat(WEDGE_LIMITS.lineBytes+1)),'.')).toMatchObject({ok:false,failure:{code:'line-length'}});
  expect(wedgeParseLssText(file(WEDGE_NATIVE_HEADER,...Array(WEDGE_LIMITS.rows+1).fill('A')),'.')).toMatchObject({ok:false,failure:{code:'rows'}});
  expect(wedgeParseLssText(new Uint8Array(WEDGE_LIMITS.fileBytes+1).fill(0x41),'.')).toMatchObject({ok:false,failure:{code:'size'}});
  expect(ok(wedgeParseLssText(latin1(WEDGE_NATIVE_HEADER+'\nA'),'.')).rows).toHaveLength(1);
 });
 it('aborts the file when the c·z product would overflow binary32 outside the native try block',()=>{
  expect(wedgeParseLssText(file('Object ID RA Z','A          1 12h0m0s 0'+DEG+"0'0\" 1e38 x"),'.')).toEqual({ok:false,failure:{kind:'unsupported',code:'overflow',line:2}});
 });
 it('uses ExtractFileExt+UpperCase=".TXT"',()=>{
  expect(['r.txt','R.TXT','a.b.Txt','dir\\x.txt','.txt'].every(wedgeHasTxtExtension)).toBe(true);
  expect(['r.dat','txt','r.txt.bak','r.tx','r.csv'].some(wedgeHasTxtExtension)).toBe(false);
 });
});
describe('LSS row parser 0x57b488',()=>{
 it('splits the 11-character object field, MJD, RA, Dec, velocity and one comment token',()=>{
  const r=wedgeParseRow("LSS-0001   54321.123 13h30m00.0s +29"+DEG+"30'00.0\"   6000.0 synthetic-row extra",2,false,'.');
  if(r==='overflow')throw new Error();
  expect(r).toMatchObject({objectId:'LSS-0001',mjdRaw:'54321.123',raRaw:'13h30m00.0s',decRaw:'+29'+DEG+"30'00.0\"",redshiftRaw:'6000.0',comment:'synthetic-row',ra:{status:'value',hours:13.5,h:13,m:30,s:0},dec:{status:'value',degrees:29.5,signLost:false}});
  if(r.redshift.status!=='value')throw new Error();
  expect(r.redshift.source).toBe('velocity');expect(wedgeBitsHex(r.redshift.velocity)).toBe('45bb8000');
  expect(r.redshift.z.value).toBe(Math.fround(6000/299792.458));
 });
 it('keeps the object field even when it contains spaces or is longer than 11 characters',()=>{
  const r=wedgeParseRow('NGC 4889 AB12h  1 12h0m0s',2,false,'.');if(r==='overflow')throw new Error();
  expect(r.objectId).toBe('NGC 4889 AB');expect(r.mjdRaw).toBe('12h');expect(r.raRaw).toBe('1');
 });
 it('marks definite empty-field zero fill separately from unadmitted spellings',()=>{
  const short=wedgeParseRow('ONLYID',2,false,'.');if(short==='overflow')throw new Error();
  expect(short).toMatchObject({objectId:'ONLYID',ra:{status:'native-zero-fill'},dec:{status:'native-zero-fill'},redshift:{status:'native-zero-fill'},comment:''});
  const odd=wedgeParseRow('X          1 12:30:00 0'+DEG+"0'0\" 1.5e3x note",2,false,'.');if(odd==='overflow')throw new Error();
  expect(odd).toMatchObject({ra:{status:'unadmitted'},dec:{status:'value'},redshift:{status:'unadmitted'},comment:null});
 });
 it('drops the sign of "-0°" as 0x485960 does and keeps negative degrees otherwise',()=>{
  const a=wedgeParseRow("X          1 12h0m0s -00"+DEG+"30'00\" 100 n",2,false,'.'),b=wedgeParseRow("X          1 12h0m0s -01"+DEG+"30'00\" 100 n",2,false,'.');
  if(a==='overflow'||b==='overflow')throw new Error();
  expect(a.dec).toEqual({status:'value',degrees:0.5,signLost:true});expect(b.dec).toEqual({status:'value',degrees:-1.5,signLost:false});
 });
 it('follows the helper rules: leading delimiters skipped, missing trailing unit tolerated, trailing junk ignored',()=>{
  const r=wedgeParseRow("X          1 h14h15m30sJUNK 10"+DEG+"0'0 100 n",2,false,'.');if(r==='overflow'||r.ra.status!=='value'||r.dec.status!=='value')throw new Error();
  expect(r.ra.hours).toBeCloseTo(14+15/60+30/3600,12);expect(r.dec.degrees).toBe(10);
 });
 it('honours the explicit decimal separator and truncates comments to string[36]',()=>{
  const line="X          1 12h0m0,5s 0"+DEG+"0'0\" 6000,5 "+'c'.repeat(40);
  const comma=wedgeParseRow(line,2,false,','),dot=wedgeParseRow(line,2,false,'.');
  if(comma==='overflow'||dot==='overflow')throw new Error();
  expect(comma).toMatchObject({ra:{status:'value',s:0.5},redshift:{status:'value'},comment:'c'.repeat(36)});
  expect(dot).toMatchObject({ra:{status:'unadmitted'},redshift:{status:'unadmitted'},comment:null});
 });
 it('applies the signed 32-bit abs of 0x486c40/0x57b72b: INT_MIN keeps its sign, minutes stay signed',()=>{
  // Static captures dms-helper.asm (486c53..486c5f: cdq/xor/sub on the DWORD, FILD DWORD) and
  // lss-row-parser.asm (RA 57b65e..57b693 sign byte 1; Dec 57b6fe..57b757 sign 0x485960 then
  // cdq/xor/sub at 57b72b). Two's-complement abs(−2^31) = −2^31; FILD reads it as signed.
  const parse=(ra:string,dec:string)=>{const r=wedgeParseRow('INTMIN'.padEnd(11)+'1 '+ra+' '+dec+' 100 n',2,false,'.');if(r==='overflow'||r.ra.status!=='value'||r.dec.status!=='value')throw new Error(JSON.stringify(r));return r;};
  const a=parse('-2147483648h0m0s','-2147483648'+DEG+"0'0\"");
  // Pre-fix values (Math.abs) were RA +2147483648 and Dec −2147483648 (COORDINATOR pre-fix-facts.json).
  expect(a.ra).toEqual({status:'value',hours:-2147483648,h:-2147483648,m:0,s:0});
  expect(a.dec).toEqual({status:'value',degrees:2147483648,signLost:false});
  // Minutes and seconds are added to the wrapped DWORD before the sign multiply.
  const b=parse('-2147483648h30m36s','-2147483648'+DEG+"30'36\"");
  if(b.ra.status!=='value'||b.dec.status!=='value')throw new Error();
  expect(b.ra.hours).toBe((-2147483648+30/60)+36/3600);expect(b.dec.degrees).toBe(-((-2147483648+30/60)+36/3600));
  // Neighbours keep the ordinary magnitude; minutes are never abs'd (negative minutes stay negative).
  const c=parse('-2147483647h-30m0s','+2147483647'+DEG+"-30'0\"");
  if(c.ra.status!=='value'||c.dec.status!=='value')throw new Error();
  expect(c.ra.hours).toBe(2147483647-0.5);expect(c.dec.degrees).toBe(2147483647-0.5);
  const d=parse('-5h-30m0s','-5'+DEG+"-30'0\"");
  if(d.ra.status!=='value'||d.dec.status!=='value')throw new Error();
  expect(d.ra.hours).toBe(4.5);expect(d.dec.degrees).toBe(-4.5);
  // An INT_MIN minutes field is an ordinary signed value (no abs on minutes).
  const e=parse('1h-2147483648m0s','1'+DEG+"-2147483648'0\"");
  if(e.ra.status!=='value'||e.dec.status!=='value')throw new Error();
  expect(e.ra.hours).toBe(1-2147483648/60);expect(e.dec.degrees).toBe(1-2147483648/60);
  // Outside the 32-bit range stays unadmitted (raw row retained), as before.
  const f=wedgeParseRow('X'.padEnd(11)+'1 -2147483649h0m0s 2147483648'+DEG+"0'0\" 100 n",2,false,'.');
  if(f==='overflow')throw new Error();
  expect(f).toMatchObject({raRaw:'-2147483649h0m0s',ra:{status:'unadmitted',reason:'hours-integer-range'},dec:{status:'unadmitted',reason:'degrees-integer-range'}});
 });
 it('wedgeAbsInt32 is the two\'s-complement abs on a signed DWORD',()=>{
  expect([0,1,-1,2147483647,-2147483647,-2147483648].map(wedgeAbsInt32)).toEqual([0,1,1,2147483647,2147483647,-2147483648]);
  // Idempotent: the Dec caller (57b72b) and the helper (486c53) both apply it.
  for(const v of[0,-7,2147483647,-2147483648])expect(wedgeAbsInt32(wedgeAbsInt32(v))).toBe(wedgeAbsInt32(v));
  for(const bad of[2147483648,-2147483649,0.5,NaN])expect(()=>wedgeAbsInt32(bad)).toThrow(RangeError);
 });
 it('reads Z files as Single z and derives v=Single(c·z)',()=>{
  const f=ok(wedgeParseLssText(file('Object ID MJD RA Dec Z Comments','A          1 12h0m0s 0'+DEG+"0'0\" 0.04 z-row"),'.'));
  const r=f.rows[0].redshift;if(r.status!=='value')throw new Error();
  expect(wedgeBitsHex(r.z)).toBe('3d23d70a');expect(r.velocity.value).toBe(Math.fround(Math.fround(0.04)*299792.458));expect(r.source).toBe('z');
 });
});
