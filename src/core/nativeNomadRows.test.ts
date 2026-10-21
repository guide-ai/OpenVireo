import {describe,it,expect} from 'vitest';
import {nativeNomadLayout,readNativeNomadRow,nativeNomadCandidateInSelection,NativeNomadError,type NomadBand,type NomadRowContext} from './nativeNomadRows';
import controls from './nativeNomadRows.controls.json';
const keys=['id','RA','DEC','MuRA','MuDEC','B','V','R','J','H','K']as const;
type Key=typeof keys[number];
const widths:Record<Key,number>={id:28,RA:18,DEC:18,MuRA:18,MuDEC:18,B:18,V:18,R:18,J:18,H:18,K:18};
const values:Record<Key,string>={id:'SYNTHETIC-ONLY',RA:'12.25',DEC:'-30.5',MuRA:'1234.56789',MuDEC:'-765.4321',B:'14.1',V:'13.5',R:'12.8',J:'11.2',H:'10.7',K:'10.3'};
const header=(order:readonly Key[]=keys)=>order.map(k=>(' '+k+'|').padStart(widths[k],' ')).join('');
const line=(changes:Partial<Record<Key,string>>={},order:readonly Key[]=keys)=>order.map(k=>String(changes[k]??values[k]).padStart(widths[k]-1,' ')+' ').join('');
const units=' hh.hhh dd.ddd';
const layout=()=>nativeNomadLayout(header(),units);
const context:NomadRowContext={band:'V',epochOffsetYears:25};
const bits=(v:number)=>{const d=new DataView(new ArrayBuffer(4));d.setFloat32(0,v);return'0x'+d.getUint32(0).toString(16).padStart(8,'0');};
const candidate=(changes:Partial<Record<Key,string>>={},c=context)=>{const r=readNativeNomadRow(layout(),line(changes),c);if(r.kind!=='candidate')throw Error('Expected synthetic candidate');return r.row;};
const fails=(f:()=>unknown,code:NativeNomadError['code'])=>{try{f();expect.fail('Expected admission rejection');}catch(e){expect(e).toBeInstanceOf(NativeNomadError);expect((e as NativeNomadError).code).toBe(code);}};
describe('bounded NOMAD fixed-column decimal candidate reader;not source authority',()=>{
 it.each(controls.cases)('matches independent rational/IEEE32 synthetic controls $name',c=>{
  const r=readNativeNomadRow(layout(),line(c.values),c.context as NomadRowContext);expect(r.kind).toBe(c.expected.kind);if(r.kind!=='candidate')return;
  expect(bits(r.row.motionRaAfterDivision)).toBe(c.expected.muRaBits);expect(bits(r.row.motionDecAfterDivision)).toBe(c.expected.muDecBits);expect(bits(r.row.selectedMagnitude)).toBe(c.expected.magnitudeBits);
  expect(Math.abs(r.row.raHours-c.expected.raHours)).toBeLessThanOrEqual(Number.EPSILON*Math.max(1,Math.abs(c.expected.raHours))*4);
  expect(Math.abs(r.row.decDegrees-c.expected.decDegrees)).toBeLessThanOrEqual(Number.EPSILON*Math.max(1,Math.abs(c.expected.decDegrees))*4);
 });
 it('pins source field offsets and the six-byte MuDEC copy while leaving I absent',()=>{
  const l=layout();expect(l.columns).toHaveLength(12);expect(l.columns[0]).toEqual({field:'id',start:1,length:28});expect(l.columns[1]).toEqual({field:'RA',start:29,length:18});
  expect(l.columns[4].length).toBe(widths.MuDEC-1);expect(l.columns[8]).toEqual({field:'I',start:0,length:0});expect(l.requiredLength).toBe(header().length);
  expect(l.header).toBe(header());expect(l.units).toBe(units);expect(Object.isFrozen(l)).toBe(true);expect(Object.isFrozen(l.columns)).toBe(true);expect(l.columns.every(Object.isFrozen)).toBe(true);
 });
 it('reads native identifier bytes and original fields without attaching observation/catalog authority',()=>{
  const raw=line(),r=candidate();expect(r.originalLine).toBe(raw);expect(r.nativeIdentifier).toBe(values.id+' ');expect(r.rawFields[8]).toBeNull();expect(r.sourceRaHours).toBe(12.25);expect(r.sourceDecDegrees).toBe(-30.5);
  expect(r.magnitudes).toEqual({B:14.1,V:13.5,R:12.8,J:11.2,H:10.7,K:10.3});expect(r).not.toHaveProperty('observation');expect(r).not.toHaveProperty('seed');expect(r).not.toHaveProperty('requestURL');
  expect(Object.isFrozen(r)).toBe(true);expect(Object.isFrozen(r.rawFields)).toBe(true);expect(Object.isFrozen(r.magnitudes)).toBe(true);
  expect(candidate({id:'ABCDEFGHIJKLMNOPQRSTUV'}).nativeIdentifier).toBe('ABCDEFGHIJKLMNOPQR');
 });
 it.each([['B',14.1,1],['V',13.5,2],['R',12.8,3],['J',11.2,5],['H',10.7,6],['K',10.3,7]]as const)('selects only explicit %s and the original band code', (band,magnitude,code)=>{
  const r=candidate({}, {band,epochOffsetYears:0});expect(r.selectedMagnitude).toBe(Math.fround(magnitude));expect(r.nativeBandCode).toBe(code);expect(r.band).toBe(band);
 });
 it('stores motion Single after division before the source-order epoch adjustment',()=>{
  const r=candidate(),ra=Math.fround(1234.56789/1000),dec=Math.fround(-765.4321/1000);
  expect(r.motionRaAfterDivision).toBe(ra);expect(r.motionDecAfterDivision).toBe(dec);expect(r.raHours).toBe(12.25+25*ra/54000);expect(r.decDegrees).toBe(-30.5+25*dec/3600);
  expect(r.raHours).not.toBe(12.25+25*(1234.56789/1000)/54000);
  const zero=candidate({}, {band:'V',epochOffsetYears:0});expect(zero.raHours).toBe(12.25);expect(zero.decDegrees).toBe(-30.5);
 });
 it('preserves selected negative magnitudes but rejects zero or30 after Single rounding without a fallback',()=>{
  for(const V of['0','-0','30','31','29.9999999','1e-50'])expect(readNativeNomadRow(layout(),line({V}),context)).toEqual({kind:'rejected',reason:'selected-magnitude'});
  expect(candidate({V:'-1.25'}).selectedMagnitude).toBe(-1.25);expect(candidate({V:'29.9999'}).selectedMagnitude).toBe(Math.fround(29.9999));
  expect(readNativeNomadRow(layout(),line({V:'0',B:'12'}),context).kind).toBe('rejected');expect(candidate({V:'0'}, {band:'B',epochOffsetYears:0}).selectedMagnitude).toBe(Math.fround(14.1));
 });
 it('does not wrap/clamp motion-adjusted coordinates or apply an inferred cosine correction',()=>{
  const r=candidate({RA:'.001',DEC:'90',MuRA:'-1200000',MuDEC:'1000000'}, {band:'V',epochOffsetYears:1000});expect(r.raHours).toBe(.001+1000*(-1200)/54000);expect(r.raHours).toBeLessThan(0);expect(r.decDegrees).toBeGreaterThan(90);
 });
 it.each([[12,-30,13.5,true],[13,-29,13.5,true],[11.999,-30,13.5,false],[13.001,-30,13.5,false],[12,-30.001,13.5,false],[12,-28.999,13.5,false],[12,-30,13.500001,false]]as const)('uses inclusive native selection RA=%s DEC=%s mag=%s',(raHours,decDegrees,selectedMagnitude,expected)=>{
  const row={...candidate(),raHours,decDegrees,selectedMagnitude:Math.fround(selectedMagnitude)};
  expect(nativeNomadCandidateInSelection(row,{minRAHours:12,maxRAHours:13,minDecDegrees:-30,maxDecDegrees:-29,magnitudeLimit:13.5})).toBe(expected);
 });
 it('keeps the original wrapped and equal-endpoint branches without coordinate normalization',()=>{
  const bounds={minRAHours:23,maxRAHours:1,minDecDegrees:-90,maxDecDegrees:90,magnitudeLimit:20},r=candidate();
  for(const raHours of[23,24,0,1,-.1])expect(nativeNomadCandidateInSelection({...r,raHours},bounds)).toBe(true);
  for(const raHours of[1.001,12,22.999])expect(nativeNomadCandidateInSelection({...r,raHours},bounds)).toBe(false);
  for(const raHours of[0,12,24])expect(nativeNomadCandidateInSelection({...r,raHours},{...bounds,minRAHours:12,maxRAHours:12})).toBe(true);
  expect(nativeNomadCandidateInSelection(r,{...bounds,minRAHours:0,maxRAHours:24,minDecDegrees:10,maxDecDegrees:-10})).toBe(false);
  fails(()=>nativeNomadCandidateInSelection(r,{...bounds,magnitudeLimit:13.1}),'context');fails(()=>nativeNomadCandidateInSelection({...r,raHours:NaN},bounds),'row');
 });
 it('uses actual header positions with reordered columns and retains caller strings',()=>{
  const order=[...keys].reverse(),l=nativeNomadLayout(header(order),units),raw=line({},order),r=readNativeNomadRow(l,raw,context);expect(r.kind).toBe('candidate');if(r.kind!=='candidate')return;
  expect(r.row.raHours).toBe(candidate().raHours);expect(r.row.selectedMagnitude).toBe(candidate().selectedMagnitude);expect(r.row.originalLine).toBe(raw);expect(l.columns[0].start).toBeGreaterThan(l.columns[1].start);
 });
 it('rejects missing/ambiguous headers and unsupported coordinate descriptors without inventing columns',()=>{
  fails(()=>nativeNomadLayout(header().replace(' K|',' X|'),units),'header');fails(()=>nativeNomadLayout(header()+' B|',units),'header');fails(()=>nativeNomadLayout(header().replace(' id|',' ID|'),units),'header');
  fails(()=>nativeNomadLayout(header(),'hh mm ss dd mm ss'),'unsupported-units');fails(()=>nativeNomadLayout(header(),'hh.hhh'),'format');fails(()=>nativeNomadLayout(header(),'HH.HHH DD.DDD'),'format');
 });
 it('rejects invalid numeric cells even in unselected bands,nonfinite motion and unsupported canonical input',()=>{
  for(const V of['','NaN','Infinity','13,5','1e400','0x10'])fails(()=>readNativeNomadRow(layout(),line({V}),context),'number');
  fails(()=>readNativeNomadRow(layout(),line({K:'bad'}),{band:'B',epochOffsetYears:0}),'number');fails(()=>readNativeNomadRow(layout(),line({MuRA:'1e100'}),context),'number');
  fails(()=>readNativeNomadRow(layout(),line({RA:'24.1'}),context),'number');fails(()=>readNativeNomadRow(layout(),line({DEC:'-90.1'}),context),'number');fails(()=>readNativeNomadRow(layout(),line({id:''}),context),'identity');
 });
 it('rejects malformed lines/contexts and JSON layouts atomically instead of inferring epoch,band or data',()=>{
  const l=layout(),before=JSON.stringify(l);for(const raw of['','x','x'.repeat(4097),line()+'\n',line().replace('13.5','١٣.٥')])fails(()=>readNativeNomadRow(l,raw,context),'row');
  fails(()=>nativeNomadLayout(header()+'\t',units),'line');fails(()=>readNativeNomadRow(JSON.parse(JSON.stringify(l)),line(),context),'layout');
  for(const band of['I','NF','__proto__','constructor'])fails(()=>readNativeNomadRow(l,line(),{band:band as NomadBand,epochOffsetYears:0}),'context');
  for(const epochOffsetYears of[NaN,Infinity,1001])fails(()=>readNativeNomadRow(l,line(),{band:'V',epochOffsetYears}),'context');fails(()=>readNativeNomadRow(l,line(),null as unknown as NomadRowContext),'context');
  expect(JSON.stringify(l)).toBe(before);
 });
});
