import{describe,expect,it}from'vitest';
import controls from'./clusterNativeObservationHr.controls.json';
import{parseNativeObservationResults,nativeObservationBytes,NativeObservationError,type NativeObservationData}from'./nativeObservationResults';
import{buildNativeResultList}from'./nativeResultList';
import{clusterNativeHrReport as report0,CLUSTER_NATIVE_HR_INITIAL_TRIAL as initial0}from'./clusterNativeObservationHr';
import{addClusterNativeHrPending,armClusterNativeHrReplace,beginClusterNativeHrRead,cancelClusterNativeHrPending,cancelClusterNativeHrRead,clearClusterNativeHrOverlays,clusterNativeHrBlockedRows,clusterNativeHrFrame,clusterNativeHrPlot,clusterNativeHrRecords,clusterNativeHrReport,completeClusterNativeHrRead,confirmClusterNativeHrReplace,disarmClusterNativeHrReplace,dismissClusterNativeHrError,dyadicDecimal,EMPTY_CLUSTER_NATIVE_HR,failClusterNativeHrRead,fistpInt64,plotClusterNativeHrObservations,roundExtended,setClusterNativeHrTrial,ClusterNativeFpuGate,ClusterNativeHrStateError,type ClusterNativeHrTrial,type ClusterNativeHrWorkspace}from'./clusterNativeObservationHr';

// ---- synthetic DAT encoder(test-only;not an original writer)
type Operand=Readonly<{kind:string;value?:string;coefficient?:string;power?:number}>;
type Dy={n:bigint;e:number};
function decimalDyadic(text:string):Dy{const negative=text.startsWith('-'),body=negative?text.slice(1):text,[i,f='']=body.split('.');let n=BigInt(i+f),k=f.length;const five=5n**BigInt(k);if(n%five!==0n)throw new Error('not dyadic '+text);n/=five;return{n:negative?-n:n,e:-k};}
function operandDyadic(o:Operand):Dy|string{if(o.kind==='decimal')return decimalDyadic(o.value!);if(o.kind==='dyadic')return{n:BigInt(o.coefficient!),e:o.power!};return o.value!;}
function extended(value:Dy|string):Uint8Array{
 const out=new Uint8Array(10),put=(m:bigint,exp:number,neg:boolean)=>{for(let i=0;i<8;i++)out[i]=Number(m>>BigInt(8*i)&0xffn);const top=exp|(neg?0x8000:0);out[8]=top&0xff;out[9]=top>>8;};
 if(typeof value==='string'){if(value==='+0')put(0n,0,false);else if(value==='-0')put(0n,0,true);else if(value==='nan')put(0xc000000000000000n,0x7fff,false);else if(value==='+inf')put(0x8000000000000000n,0x7fff,false);else throw new Error(value);return out;}
 if(value.n===0n){put(0n,0,false);return out;}const neg=value.n<0n,c=neg?-value.n:value.n,L=c.toString(2).length,biased=value.e+L-1+16383;
 if(biased>=1)put(c<<BigInt(64-L),biased,neg);else put(c<<BigInt(value.e+16445),0,neg);return out;
}
function record(o:Readonly<{time:number;object?:string;kind?:number;v:Dy|string;b:Dy|string}>):Uint8Array{
 const r=new Uint8Array(144),view=new DataView(r.buffer),name=o.object??'STAR';r[0]=name.length;for(let i=0;i<name.length;i++)r[1+i]=name.charCodeAt(i);view.setFloat64(16,o.time,true);r.set(extended(o.b),54);r.set(extended(o.v),64);r[94]=o.kind??1;return r;
}
function dat(rows:readonly Uint8Array[]):NativeObservationData{const bytes=new Uint8Array(rows.length*144);rows.forEach((r,i)=>bytes.set(r,i*144));return parseNativeObservationResults(bytes);}
const add=(a:Dy,b:Dy):Dy=>{const e=Math.min(a.e,b.e);return{n:(a.n<<BigInt(a.e-e))+(b.n<<BigInt(b.e-e)),e};};
function control(id:string){const c=controls.plots.find(p=>p.id===id)!;const v=operandDyadic(c.v as Operand),b=c.b.kind==='dyadic-plus-half-of-v'?add(v as Dy,{n:1n,e:-1}):operandDyadic(c.b as Operand);return{c,v,b};}

describe('original observation HR plot 0x542990',()=>{
 for(const p of controls.plots)it(`control ${p.id}`,()=>{
  const{c,v,b}=control(p.id),result=clusterNativeHrPlot(dat([record({time:1,v,b})]));
  if(c.expect.status==='blocked'){expect(result).toEqual({status:'blocked',reason:c.expect.reason,recordIndex:1,field:c.expect.field,plottedBefore:0});return;}
  expect(result.status).toBe('plotted');if(result.status!=='plotted')return;const row=result.rows[0]!;expect(row.status).toBe(c.expect.status);
  if(c.expect.status==='plotted'){expect(row.pixel).toEqual({x:c.expect.x,y:c.expect.y});if('bMinusV'in c.expect)expect(row.bMinusV!.exact).toBe(c.expect.bMinusV);expect(result.count).toBe(1);expect(result.countLabel).toBe('# of Stars: 1');}
  else{expect(row.pixel).toBeNull();expect(result.count).toBe(0);expect(result.countLabel).toBe('# of Stars: 0');}
 });
 it('control coefficients are the documented derivations',()=>{
  expect(BigInt(control('extended-just-below-tie').c.v.coefficient!)).toBe(17n*2n**59n-1n);
  expect(7n*BigInt(control('extended-product-rounds-onto-tie').c.v.coefficient!)).toBe(929n*2n**56n+1n);
 });
 it('exact Extended differs from a binary64 port where the controls say so',()=>{
  const binary64Y=(v:Dy)=>Math.round((Number(v.n)*2**v.e-2)*28)+15;
  expect(binary64Y(control('extended-just-below-tie').v as Dy)).toBe(19);
  expect(binary64Y(control('v-tie-rounds-down-to-even').v as Dy)).toBe(26);
 });
 it('plots head-to-tail in native list order,skips zeros,counts only drawn records and reports kinds',()=>{
  const data=dat([record({time:3,object:'C',v:decimalDyadic('11'),b:decimalDyadic('11.75')}),record({time:1,object:'A',kind:0,v:decimalDyadic('1200'),b:decimalDyadic('800')}),record({time:2,object:'B',v:'+0',b:decimalDyadic('5')}),record({time:4,object:'D',kind:7,v:decimalDyadic('19'),b:decimalDyadic('20')})]);
  const list=buildNativeResultList(data),plot=clusterNativeHrPlot(list.data);
  expect(plot.status).toBe('plotted');if(plot.status!=='plotted')return;
  expect(plot.rows.map(r=>[r.object,r.status])).toEqual([['A','plotted'],['B','skipped-v-zero'],['C','plotted'],['D','plotted']]);
  expect(plot.count).toBe(3);expect(plot.countLabel).toBe('# of Stars: 3');expect(plot.plottedCountKind).toBe(1);expect(plot.plottedOtherKind).toBe(1);
  expect(plot.rows[0]!.pixel).toEqual({x:-47860,y:33559});expect(plot.rows[0]!.inFrame).toBe(false);
  expect(plot.rows[2]!.pixel).toEqual({x:230,y:267});expect(plot.rows[2]!.inFrame).toBe(true);
  expect(plot.rows[3]!.inFrame).toBe(false);
 });
 it('an exception-path record aborts the whole plot and reports drawn predecessors',()=>{
  const plot=clusterNativeHrPlot(dat([record({time:1,v:decimalDyadic('12'),b:decimalDyadic('12.5')}),record({time:2,v:'nan',b:decimalDyadic('1')}),record({time:3,v:decimalDyadic('13'),b:decimalDyadic('13.5')})]));
  expect(plot).toEqual({status:'blocked',reason:'operand',recordIndex:2,field:'v',plottedBefore:1});
 });
 it('bounds exact decimal presentation for1000 distinct Extended subnormal results without changing pixels or bytes',()=>{
  const data=dat(Array.from({length:1000},(_,i)=>record({time:i+1,v:{n:1n,e:-16445},b:{n:BigInt(i+2),e:-16445}})));
  const before=nativeObservationBytes(data),plot=clusterNativeHrPlot(data);
  expect(plot.status).toBe('plotted');if(plot.status!=='plotted')return;
  expect(plot.count).toBe(1000);expect(plot.rows[0]!.bMinusV!.exact).toBe('1 × 2^-16445');
  expect(new Set(plot.rows.map(r=>r.bMinusV!.exact)).size).toBe(1000);
  for(const row of plot.rows){expect(row.bMinusV!.exact.length).toBeLessThan(40);expect(row.pixel).toEqual({x:140,y:-41});}
  expect(nativeObservationBytes(data)).toEqual(before);
  expect(dyadicDecimal({n:1n,e:257})).toBe('1 × 2^257');expect(dyadicDecimal({n:1n,e:-97})).toBe('1 × 2^-97');
  expect(dyadicDecimal({n:1n,e:-96})).toMatch(/^0\./);expect(dyadicDecimal({n:-1n,e:-16445})).toBe('-1 × 2^-16445');
 });
 it('marks web diagnostics before,at,and after a blocking row without computing partial values or changing bytes',()=>{
  const data=dat([record({time:1,object:'DRAWN',v:decimalDyadic('12'),b:decimalDyadic('12.5')}),record({time:2,object:'ZERO',v:'+0',b:decimalDyadic('1')}),record({time:3,object:'BAD',v:'nan',b:decimalDyadic('1')}),record({time:4,object:'LATER',v:decimalDyadic('13'),b:decimalDyadic('14')})]);
  const before=nativeObservationBytes(data),plot=clusterNativeHrPlot(data);expect(plot.status).toBe('blocked');if(plot.status!=='blocked')return;
  const rows=clusterNativeHrBlockedRows(data,plot);expect(rows.map(r=>[r.object,r.status])).toEqual([['DRAWN','before-block'],['ZERO','before-block'],['BAD','blocking'],['LATER','after-block']]);expect(rows[2]!.storedV.kind).toBe('nan');expect(rows[2]!.v).toBeNull();for(const row of rows){expect(row.bMinusV).toBeNull();expect(row.pixel).toBeNull();}expect(nativeObservationBytes(data)).toEqual(before);
 });
 it('successful and blocked rows preserve the same raw signed nonfinite metadata for translated presentation',()=>{
  const inf=record({time:1,v:'+inf',b:decimalDyadic('1')});inf[73]|=0x80;const data=dat([inf]),plot=clusterNativeHrPlot(data);expect(plot.status).toBe('blocked');if(plot.status!=='blocked')return;const blocked=clusterNativeHrBlockedRows(data,plot)[0]!;expect(blocked.v).toBeNull();expect(blocked.storedV).toMatchObject({kind:'infinity',negative:true});
  const zero=Uint8Array.from(inf);zero.set(extended('+0'),54);const skipped=clusterNativeHrPlot(dat([zero]));expect(skipped.status).toBe('plotted');if(skipped.status!=='plotted')return;expect(skipped.rows[0]!.storedV).toEqual(blocked.storedV);expect(skipped.rows[0]!.v).toBeNull();expect(skipped.rows[0]!.status).toBe('skipped-b-zero');
 });
 it('an empty list is a valid plot with zero stars(no emptiness check in0x542ed8)',()=>{expect(clusterNativeHrPlot(dat([]))).toMatchObject({status:'plotted',count:0,countLabel:'# of Stars: 0',rows:[]});});
 it('Extended rounding helpers keep nearest-even,overflow and Int64 gates',()=>{
  expect(roundExtended({n:(1n<<64n)+1n,e:0})).toEqual({n:1n,e:64});
  expect(roundExtended({n:(1n<<65n)+3n,e:0})).toEqual({n:(1n<<63n)+1n,e:2});
  expect(()=>roundExtended({n:1n,e:16384})).toThrow(ClusterNativeFpuGate);
  expect(fistpInt64({n:5n,e:-1})).toBe(2n);expect(fistpInt64({n:-5n,e:-1})).toBe(-2n);expect(fistpInt64({n:7n,e:-1})).toBe(4n);
  expect(()=>fistpInt64({n:1n,e:63})).toThrow(ClusterNativeFpuGate);expect(fistpInt64({n:-1n,e:63})).toBe(-(1n<<63n));
  expect(dyadicDecimal({n:-7n,e:-4})).toBe('-0.4375');expect(()=>dyadicDecimal({n:1n<<100000n,e:0})).toThrow(RangeError);expect(()=>dyadicDecimal({n:-(1n<<100000n),e:-1})).toThrow(RangeError);
 });
});

describe('fixed frame 0x542480',()=>{
 const frame=clusterNativeHrFrame();
 it('matches the control ticks,axis and FloatToStrF labels',()=>{
  expect(frame.ticks).toHaveLength(controls.frame.tickCount);expect(frame.texts).toHaveLength(controls.frame.textCount);expect(frame.axis).toEqual(controls.frame.axis);
  for(const t of controls.frame.texts)expect(frame.texts).toContainEqual(t);
 });
 it('never labels a negative colour major and keeps every tick inside the drawn axes',()=>{
  expect(frame.texts.filter(t=>t.y===468).map(t=>t.text).sort()).toEqual(['+0.5','+1.0','+1.5','+2.0','+2.5','-0.5','0.0']);
  for(const t of frame.ticks){expect(Math.min(t.x1,t.x2)).toBeGreaterThanOrEqual(80);expect(Math.max(t.x1,t.x2)).toBeLessThanOrEqual(440);expect(Math.min(t.y1,t.y2)).toBeGreaterThanOrEqual(15);expect(Math.max(t.y1,t.y2)).toBeLessThanOrEqual(463);}
 });
});

describe('View/Print Parameters report 0x543d90',()=>{
 for(const r of controls.reports)it(`control ${r.id}`,()=>{const report=clusterNativeHrReport(r.trial as ClusterNativeHrTrial);expect(report.caption).toBe('Cluster Age/Distance Parameters');expect(report.lines).toEqual(r.lines);expect(report.clusterNameGap).toBe(true);});
 it('rejects out-of-range slider positions',()=>{for(const bad of[{modulusTicks:1501},{ebvTicks:-1},{ageIndex:50},{offsetTicks:101},{modelIndex:6},{modulusTicks:1.5}])expect(()=>clusterNativeHrReport({...controls.reports[0]!.trial,...bad}as ClusterNativeHrTrial)).toThrow(RangeError);});
});

describe('workspace transitions',()=>{
 const file=(name:string,rows:readonly Uint8Array[])=>({name,sha256:name.padEnd(64,'0'),data:dat(rows)});
 const one=file('a.dat',[record({time:2,v:decimalDyadic('12'),b:decimalDyadic('12.5')})]),two=file('b.dat',[record({time:1,v:decimalDyadic('13'),b:decimalDyadic('13.25')}),record({time:3,v:decimalDyadic('14'),b:decimalDyadic('14.75')})]);
 const load=(w:ClusterNativeHrWorkspace,token:number,f:typeof one)=>completeClusterNativeHrRead(beginClusterNativeHrRead(w,token,f.name),token,f);
 it('review → add → add merges in native order;cancel keeps current results',()=>{
  let w=load(EMPTY_CLUSTER_NATIVE_HR,1,one);expect(w.pending?.name).toBe('a.dat');expect(clusterNativeHrRecords(w)).toBe(0);
  w=addClusterNativeHrPending(w);expect(clusterNativeHrRecords(w)).toBe(1);expect(w.pending).toBeNull();
  const before=w;w=cancelClusterNativeHrPending(load(w,2,two));expect(w.list).toBe(before.list);expect(w.receipts).toBe(before.receipts);
  w=addClusterNativeHrPending(load(w,3,two));expect(clusterNativeHrRecords(w)).toBe(3);expect(w.receipts.map(r=>[r.name,r.records,r.action])).toEqual([['a.dat',1,'add'],['b.dat',2,'add']]);
  expect(w.list!.data.records.map(r=>r.fields.find(f=>f.id==='time')!.value.decimal)).toEqual(['1','2','3']);
 });
 it('replace needs a second confirmation when results exist;disarm and cancel keep them',()=>{
  let w=addClusterNativeHrPending(load(EMPTY_CLUSTER_NATIVE_HR,1,one));const kept=w.list;w=armClusterNativeHrReplace(load(w,2,two));expect(w.replaceArmed).toBe(true);expect(w.list).toBe(kept);
  w=disarmClusterNativeHrReplace(w);expect(w.replaceArmed).toBe(false);expect(()=>confirmClusterNativeHrReplace(w)).toThrow(ClusterNativeHrStateError);
  w=confirmClusterNativeHrReplace(armClusterNativeHrReplace(w));expect(clusterNativeHrRecords(w)).toBe(2);expect(w.receipts).toEqual([{name:'b.dat',sha256:two.sha256,records:2,action:'replace'}]);
  const empty=armClusterNativeHrReplace(load(EMPTY_CLUSTER_NATIVE_HR,9,two));expect(empty.replaceArmed).toBe(false);expect(clusterNativeHrRecords(empty)).toBe(2);
 });
 it('late,cancelled and failed reads never replace current work',()=>{
  const base=addClusterNativeHrPending(load(EMPTY_CLUSTER_NATIVE_HR,1,one));let w=beginClusterNativeHrRead(base,5,'late.dat');
  expect(completeClusterNativeHrRead(w,4,two)).toBe(w);w=cancelClusterNativeHrRead(w);expect(w.reading).toBeNull();expect(completeClusterNativeHrRead(w,5,two)).toBe(w);expect(w.list).toBe(base.list);
  for(const[error,code]of[[new NativeObservationError('layout'),'layout'],[new NativeObservationError('size'),'size'],[new NativeObservationError('text',2),'text'],[new Error('disk'),'read']]as const){const failed=failClusterNativeHrRead(beginClusterNativeHrRead(base,6,'bad.dat'),6,error);expect(failed.error).toBe(code);expect(failed.list).toBe(base.list);expect(dismissClusterNativeHrError(failed).error).toBeNull();}
  expect(failClusterNativeHrRead(base,6,new Error('x'))).toBe(base);
 });
 it('unordered NaN keys are rejected as invalid data without a pending review',()=>{
  const r=record({time:1,v:decimalDyadic('12'),b:decimalDyadic('12.5')});new DataView(r.buffer).setFloat64(16,NaN,true);const w=load(EMPTY_CLUSTER_NATIVE_HR,1,file('nan.dat',[r]));expect(w.error).toBe('key');expect(w.pending).toBeNull();
 });
 it('combined lists above1000 records report a limit and keep both the list and the review',()=>{
  const many=(start:number,n:number)=>file('m.dat',Array.from({length:n},(_,i)=>record({time:start+i,v:decimalDyadic('12'),b:decimalDyadic('12.5')})));
  let w=addClusterNativeHrPending(load(EMPTY_CLUSTER_NATIVE_HR,1,many(1,600)));w=addClusterNativeHrPending(load(w,2,many(601,401)));expect(w.error).toBe('limit');expect(clusterNativeHrRecords(w)).toBe(600);expect(w.pending).not.toBeNull();
 });
 it('busy states,plot flag identity and trial validation',()=>{
  const reading=beginClusterNativeHrRead(EMPTY_CLUSTER_NATIVE_HR,1,'x');expect(()=>beginClusterNativeHrRead(reading,2,'y')).toThrow(ClusterNativeHrStateError);expect(()=>addClusterNativeHrPending(EMPTY_CLUSTER_NATIVE_HR)).toThrow(ClusterNativeHrStateError);
  const plotted=plotClusterNativeHrObservations(EMPTY_CLUSTER_NATIVE_HR);expect(plotted.observationsPlotted).toBe(true);expect(plotClusterNativeHrObservations(plotted)).toBe(plotted);
  let w=setClusterNativeHrTrial(plotted,{zamsShown:true,isochroneShown:true,modulusTicks:950});expect(()=>setClusterNativeHrTrial(w,{ebvTicks:251})).toThrow(ClusterNativeHrStateError);
  w=clearClusterNativeHrOverlays(w);expect(w.trial).toMatchObject({zamsShown:false,isochroneShown:false,modulusTicks:950});expect(cancelClusterNativeHrRead(w)).toBe(w);expect(cancelClusterNativeHrPending(w)).toBe(w);
 });
});

// Front R4b (dossier C §1.2 lines 6 and 11, §4): ffFixed 0 through the ported FloatToStrF (delphiFixed).
describe('View/Print Parameters ffFixed 0',()=>{
 it('distance and age lines',()=>{
  const r=report0({...initial0,zamsShown:true,isochroneShown:true,distanceOption:true,modulusTicks:950,ebvTicks:3,ageIndex:36});
  expect(r.caption).toBe('Cluster Age/Distance Parameters');
  expect(r.lines).toContain('  Estimated Cluster Distance: 762 Parsecs');
  expect(r.lines).toContain('  Estimated Cluster Age: 3981 Million Years');
 });
});
