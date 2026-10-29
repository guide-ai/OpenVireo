import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {VSTRS_FILE_BYTES,VariableStarError,decodeExtended,decodeVariableStarCatalog,decodeVariableStarRecord,delphiFixed,exactFromNumber,floatToStrFFixed,formatNativeSexagesimal,searchVariableStars,variableStarDataLines,variableStarSaveFileName,variableStarSaveText,variableStarTypes} from './variableStars';
import {LIGHT_CURVE_BOX,LightCurveError,cepheidMagnitude,cepheidModel,lightCurveBounds,lightCurvePlot} from './lightCurve';
import witness from './variableStars.controls.json';
import manifest from '../../docs/LOCAL-RESOURCES.json';
import {BUNDLED_VARIABLE_STARS,BUNDLED_VARIABLE_TYPE_HELP,BundledVariableFileError,fetchBundledVariableFile,verifyBundledVariableFile} from '../io/bundledVariableStars';

// Witness: research analysis/front-v-variable-stars/tools/variable_witness.py (Python struct + fractions + math, written
// separately from this port). It implements the same reading of the binary, so it checks the port, not the reading; it is
// evidence of the chosen contract, not of original-runtime equivalence. Its SHA-256 is pinned below.
const WITNESS_SCRIPT_SHA256='8efffbbf8dd153190b586d56131b6679441944e328ce64f0aa5d741da63982ca';
const FILE=new Uint8Array(readFileSync(new URL('../../public/original/variables/CLEA_VStrs.dat',import.meta.url)));
const HELP=new Uint8Array(readFileSync(new URL('../../public/original/variables/VarTypeHlp.TXT',import.meta.url)));
const fromHex=(hex:string)=>Uint8Array.from(hex.match(/../g)!,v=>parseInt(v,16));
const catalog=decodeVariableStarCatalog(FILE);

describe('CLEA_VStrs.dat bundled identity',()=>{
 it('is the manifested byte-exact file the witness read',()=>{
  expect(FILE.length).toBe(VSTRS_FILE_BYTES);
  const sha=createHash('sha256').update(FILE).digest('hex');
  expect(sha).toBe(BUNDLED_VARIABLE_STARS.sha256);expect(witness.source.sha256).toBe(sha);expect(witness.source.witnessSha256).toBe(WITNESS_SCRIPT_SHA256);
  for(const id of [BUNDLED_VARIABLE_STARS,BUNDLED_VARIABLE_TYPE_HELP])expect(manifest.files).toContainEqual({path:'public'+id.path,bytes:id.bytes,sha256:id.sha256});
  expect(createHash('sha256').update(HELP).digest('hex')).toBe(BUNDLED_VARIABLE_TYPE_HELP.sha256);
 });
 it('decodes every record with the witness statistics',()=>{
  expect(catalog).toHaveLength(witness.stats.records);
  expect(catalog[0].name).toBe(witness.stats.firstName);expect(catalog.at(-1)!.name).toBe(witness.stats.lastName);
  expect(catalog.filter(r=>r.period.value===0)).toHaveLength(witness.stats.periodZero);
  expect(catalog.filter(r=>r.riseWord===0)).toHaveLength(witness.stats.riseZero);
  expect(catalog.every((r,i)=>i===0||catalog[i-1].raHours<=r.raHours)).toBe(witness.stats.sortedByRa);
 });
 it('rejects other sizes and malformed records',()=>{
  expect(()=>decodeVariableStarCatalog(FILE.subarray(0,FILE.length-1))).toThrow(VariableStarError);
  const bad=FILE.slice(0,92);bad[0]=11;expect(()=>decodeVariableStarRecord(bad,0)).toThrow(VariableStarError);
  const badExt=FILE.slice(0,92);badExt[51+7]&=0x7f;expect(()=>decodeVariableStarRecord(badExt,0)).toThrow(VariableStarError);
  expect(()=>decodeVariableStarRecord(FILE,31147)).toThrow(VariableStarError);
 });
});

const sha=(text:string)=>createHash('sha256').update(Buffer.from(text,'latin1')).digest('hex');
describe('whole-catalog digests against the witness',()=>{
 it('every list, before and after the M−m/D default',()=>{
  expect(sha(catalog.flatMap(r=>variableStarDataLines(r)).join('\r\n'))).toBe(witness.digests.allLinesSha256);
  expect(sha(catalog.flatMap(r=>variableStarDataLines(r,true)).join('\r\n'))).toBe(witness.digests.allLinesAfterDefaultSha256);
 },30_000);
 it('every plot: bounds, labels, ticks and curve pixels or the typed fault',()=>{
  let inverted=0;
  const lines=catalog.map((r,i)=>{
   let p;try{p=lightCurvePlot(r);}catch(e){if(e instanceof LightCurveError)return `${i}|${e.code}`;throw e;}
   if(p.faintBound<p.brightBound)inverted++;
   const head=`${i}|${p.faintBound}|${p.brightBound}|`+p.texts.map(x=>`${x.x},${x.y},${x.text},${x.anchor}`).join(';')+'|'+p.ticks.map(s=>`${s.x1},${s.y1},${s.x2},${s.y2}`).join(';');
   return head+'|'+('points' in p.curve?p.curve.points.map(q=>q[1]).join(','):p.curve.unavailable);
  });
  expect(sha(lines.join('\n'))).toBe(witness.digests.allPlotsSha256);
  expect(inverted).toBe(witness.stats.invertedRange);
 },60_000);// 31,147 plots with up to 556 curve samples each
});

describe('Variable Star Data lines (0x52ccec) against the witness',()=>{
 for(const c of witness.cases)it(`${c.index} ${c.name}`,()=>{
  const r=decodeVariableStarRecord(fromHex(c.rawHex),0);
  expect(r).toEqual({...catalog[c.index],index:0});
  expect(variableStarDataLines(r)).toEqual(c.lines);
  expect(variableStarDataLines(r,true)).toEqual(c.linesAfterDefault);
 });
 it('formats the sexagesimal and Extended cases explicitly',()=>{
  expect(formatNativeSexagesimal(0.0009929221987460951,2,['h ','m ','s'])).toBe('   0h 00m 03.57s');
  expect(formatNativeSexagesimal(-2.9742248625257863,1,['° ',"' ",'"'])).toBe('  -2° 58\' 27.2"');
  expect(formatNativeSexagesimal(23.99999999,2,['h ','m ','s'])).toBe('  24h 00m 00.00s');
  const e=decodeExtended(Uint8Array.from([0,0,0,0,0,0,0,0x80,0xff,0x3f]),0);// 1.0
  expect(e.value).toBe(1);expect(floatToStrFFixed(e,2)).toBe('1.00');
  expect(floatToStrFFixed(decodeExtended(new Uint8Array(10),0),5)).toBe('0.00000');
  // FloatToDecimal 0x40cbb5: 18 digits ties to even, then half up at the decimals; differs from exact rounding here.
  for(const p of witness.fixedPolicy){const r=catalog[p.index];expect(floatToStrFFixed(r[p.field as 'period'],8)).toBe(p.delphi);}
  expect(witness.fixedPolicy.map(p=>p.index)).toEqual([6370,7570,7813,28572,29323]);
  expect(delphiFixed(0.125,2)).toBe('0.13');expect(delphiFixed(-1.005,2)).toBe('-1.00');expect(delphiFixed(0.9999,2)).toBe('1.00');
  expect(delphiFixed(-0.001,2)).toBe('0.00');expect(delphiFixed(123456789.123,0)).toBe('123456789');expect(delphiFixed(1e-30,5)).toBe('0.00000');
  expect(exactFromNumber(Math.fround(12.3)).value).toBe(Math.fround(12.3));
 });
});

describe('CepheidTypeObj model and plot (0x51f33c, 0x52b6f4, 0x52b9cc, 0x52c090) against the witness',()=>{
 for(const c of witness.cases)it(`${c.index} ${c.name}`,()=>{
  const r=decodeVariableStarRecord(fromHex(c.rawHex),0),plot=lightCurvePlot(r),w=c.plot;
  expect([plot.faintBound,plot.brightBound]).toEqual([w.faintBound,w.brightBound]);
  if(c.periodZero){expect(plot.curve).toEqual({unavailable:'period-zero'});return;}
  if(!('points' in plot.curve))throw new Error('curve expected');
  expect(plot.curve.points.map(p=>p[1])).toEqual(w.curveY);
  expect(plot.curve.points.map(p=>p[0])).toEqual(w.curveY!.map((_,i)=>LIGHT_CURVE_BOX.left+i));
  const m=cepheidModel(r),step=m.period*1.5/(LIGHT_CURVE_BOX.right-LIGHT_CURVE_BOX.left);
  for(const [i,v] of w.samples!)expect(cepheidMagnitude(m,i*step+m.epoch)).toBe(v);
 });
 it('starts at maximum, reaches minimum at f and repeats each period',()=>{
  const r=catalog[30234],m=cepheidModel(r);// del Cep, M−m/D 25 %
  expect(m.declineFraction).toBe(0.75);
  expect(cepheidMagnitude(m,m.epoch)).toBe(r.max);
  expect(cepheidMagnitude(m,m.epoch+0.75*m.period)).toBeCloseTo(r.min,5);
  expect(cepheidMagnitude(m,m.epoch+m.period)).toBeCloseTo(r.max,5);
 });
 it('defaults a zero M−m/D to 50 and reports it',()=>{
  const r=catalog[2];expect(r.riseWord).toBe(0);
  const m=cepheidModel(r);expect([m.riseWord,m.riseDefaulted,m.declineFraction]).toEqual([50,true,0.5]);
 });
 it('names the original faults instead of drawing a curve',()=>{
  const r=catalog[100];expect(r.period.value).toBe(0);
  expect(()=>cepheidMagnitude(cepheidModel(r),r.epoch.value)).toThrow(LightCurveError);
  const p=lightCurvePlot(r);expect(p.curve).toEqual({unavailable:'period-zero'});expect(p.ticks.length).toBeGreaterThan(0);
  const zero={...cepheidModel(catalog[0]),declineFraction:0,riseWord:100};
  expect(()=>cepheidMagnitude(zero,zero.epoch)).toThrow(expect.objectContaining({code:'zero-decline-fraction'}));
 });
 it('draws no magnitude ticks for an inverted range and lets the curve leave the box',()=>{
  expect(lightCurvePlot(catalog[44])).toMatchObject({brightBound:11,faintBound:0.5,curve:{unavailable:'period-zero'}});// VW And
  const r=catalog[6870],p=lightCurvePlot(r);expect(r.name).toBe('QS Pup');
  expect([p.brightBound,p.faintBound]).toEqual([5.5,0.5]);
  expect(p.ticks.filter(s=>s.y1===s.y2)).toHaveLength(0);
  if(!('points' in p.curve))throw new Error('curve expected');
  expect(Math.max(...p.curve.points.map(q=>q[1]))).toBeGreaterThan(LIGHT_CURVE_BOX.bottom);
 });
 it('names the synthetic faults: equal bounds, empty magnitude system, signed word',()=>{
  const r=catalog[30234];
  expect(()=>lightCurvePlot({...r,max:Math.fround(10.8),min:10})).toThrow(expect.objectContaining({code:'axis-range-zero'}));
  const p=lightCurvePlot({...r,system:''});expect(p.curve).toEqual({unavailable:'magnitude-system-empty'});
  expect(p.texts.map(x=>x.text)).toEqual(['4.50','3.00','3.50','4.00','del Cep','DCEP']);
  const bytes=FILE.slice(30234*92,30235*92);bytes[72]=0;bytes[73]=0x80;expect(()=>decodeVariableStarRecord(bytes,0)).toThrow(VariableStarError);
 });
 it('names a non-finite model value (defensive reason)',()=>{
  const r=catalog[30234],m=cepheidModel(r);
  expect(()=>cepheidMagnitude(m,Number.NaN)).toThrow(expect.objectContaining({code:'non-finite'}));
  expect(lightCurvePlot({...r,epoch:{...r.epoch,value:Number.POSITIVE_INFINITY}}).curve).toEqual({unavailable:'non-finite'});
 });
 it('bounds the type text at 10 characters (offsets 27..37, maxFlag at 38; PStrNCat 27 at 0x52ce11)',()=>{
  expect(Math.max(...catalog.map(r=>r.type.length))).toBe(10);
  const bytes=FILE.slice(30234*92,30235*92);bytes[27]=11;expect(()=>decodeVariableStarRecord(bytes,0)).toThrow(VariableStarError);
  bytes.fill(0x41,28,38);bytes[27]=10;expect(decodeVariableStarRecord(bytes,0).type).toBe('AAAAAAAAAA');
 });
 it('uses the recovered half-magnitude bounds',()=>{
  expect(lightCurveBounds(12.3,11.6)).toEqual({faintBound:12.5,brightBound:11});// 11.6 − 11 is not > 0.6
  expect(lightCurveBounds(12.5,12.5)).toEqual({faintBound:12.5,brightBound:11.5});// Round(12.5) = 12 (ties to even)
  expect(lightCurveBounds(13.5,13.5)).toEqual({faintBound:14,brightBound:13});
 });
 it('lays out the axes and texts as decoded',()=>{
  const p=lightCurvePlot(catalog[30234]),t=Object.fromEntries(p.texts.map(x=>[x.text,x]));
  expect(t['del Cep']).toMatchObject({x:90,y:44});expect(t['DCEP']).toMatchObject({x:615,y:44,anchor:'end'});
  expect(t['V mag']).toMatchObject({x:30,y:10});expect(t['Phase']).toMatchObject({x:352,y:310,anchor:'middle'});
  expect(t['0.0']).toMatchObject({x:65,y:295});expect(t['1.5']).toMatchObject({x:620,y:295});
  expect(t['0.5']).toMatchObject({x:250,y:295});expect(t['1.0']).toMatchObject({x:435,y:295});
  expect(t['3.00']).toMatchObject({x:35,y:32});expect(t['4.50']).toMatchObject({x:35,y:282});
  expect(p.texts.map(x=>x.text)).toEqual(['4.50','3.00','3.50','4.00','del Cep','DCEP','V mag','0.0','1.5','0.5','1.0','Phase']);
  // Magnitude steps of 0.5 mag over 250 px: three major marks on each edge plus four minor marks each.
  expect(p.ticks.filter(s=>s.y1===s.y2)).toHaveLength(3*2*5);expect(p.ticks.filter(s=>s.x1===s.x2)).toHaveLength(3*5);
 });
});

describe('Save Text and help',()=>{
 it('writes one CRLF line per list item in Latin-1',()=>{
  const r=catalog[30234],bytes=variableStarSaveText(variableStarDataLines(r));
  const text=String.fromCharCode(...bytes);
  expect(text.split('\r\n')).toEqual([...variableStarDataLines(r),'']);
  expect(bytes.includes(0xb0)).toBe(true);
  expect(variableStarSaveFileName(r)).toBe('del_Cep.TXT');
 });
 it('filters the catalog by name and type (web browsing)',()=>{
  expect(searchVariableStars(catalog,{name:'del  CEP',type:null}).rows.map(r=>r.name)).toEqual(['del Cep']);
  const dcep=searchVariableStars(catalog,{name:'',type:'DCEP'});expect(dcep.total).toBe(440);expect(dcep.rows).toHaveLength(100);
  expect(variableStarTypes(catalog)[0]).toEqual({type:'M',count:5220});
  expect(()=>searchVariableStars(catalog,{name:'x'.repeat(41),type:null})).toThrow(VariableStarError);
  expect(()=>searchVariableStars(catalog,{name:'',type:'x'.repeat(11)})).toThrow(VariableStarError);
  // A blank type is a filter of its own, distinct from "all types" (null).
  const blank=searchVariableStars(catalog,{name:'',type:''});expect(blank.total).toBe(428);expect(blank.rows.every(r=>r.type==='')).toBe(true);
  expect(searchVariableStars(catalog,{name:'',type:null}).total).toBe(31147);
 });
});

describe('bundled fetch',()=>{
 it('checks size, then SHA-256, and only fetches same-origin',async()=>{
  const id={...BUNDLED_VARIABLE_TYPE_HELP},calls:string[]=[];
  const ok=(async(input:RequestInfo|URL,init?:RequestInit)=>{calls.push(String(input));expect(init?.credentials).toBe('same-origin');return new Response(HELP.slice());}) as typeof fetch;
  expect(await fetchBundledVariableFile(ok,new AbortController().signal,id)).toEqual(HELP);expect(calls).toEqual([id.path]);
  const code=async(p:Promise<unknown>)=>{try{await p;}catch(e){return e instanceof BundledVariableFileError?e.code:e instanceof DOMException?e.name:'other';}return 'resolved';};
  expect(await code(verifyBundledVariableFile(HELP.slice().buffer,{...id,sha256:'0'.repeat(64)}))).toBe('sha256');
  expect(await code(verifyBundledVariableFile(HELP.slice(1).buffer,id))).toBe('size');
  expect(await code(fetchBundledVariableFile((async()=>new Response('x',{status:404})) as typeof fetch,new AbortController().signal,id))).toBe('download');
  const abort=new AbortController();abort.abort();expect(await code(fetchBundledVariableFile(ok,abort.signal,id))).toBe('AbortError');
 });
});
