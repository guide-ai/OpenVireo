import {describe,expect,it} from 'vitest';
import {splitSexagesimal} from './radioAntenna';
import {RADIO_RECEIVER_COMPILED_OPTIONS,activateReceiver,createRadioReceiverBank,openMainReceiver,type RadioReceiver,type RadioReceiverResult} from './radioReceiver';
import {
 RECEIVER_DISPLAY_COLOURS,RECEIVER_DISPLAY_GEOMETRY,RECEIVER_DISPLAY_LITERALS,RECEIVER_STEP_CAPTIONS,appendReceiverTrace,createReceiverTrace,formatReceiverBeam,
 receiverAnnotationOps,receiverApertureBase,receiverCaption,receiverChildTitle,receiverFovText,receiverFrameOps,receiverGridTicks,receiverHpbwText,receiverLabels,
 receiverMainTitle,receiverPaintOps,receiverTraceAt,resetReceiverTrace,type ReceiverDisplayOp,
} from './radioReceiverDisplay';

// [W] contract checks of the chosen implementation (docs/RADIO-RECEIVER-MONITOR.md); expectations are computed by hand
// from the cited listings, not taken from a native run. Synthetic records only.
const ok=(r:RadioReceiverResult)=>{if(!r.ok)throw new Error(r.error.kind);return r;};
function receiver(patch:Partial<RadioReceiver>={}):RadioReceiver{
 const bank=ok(createRadioReceiverBank(RADIO_RECEIVER_COMPILED_OPTIONS)).bank;
 const opened=ok(activateReceiver(ok(openMainReceiver(bank,{catalog:null,pointing:{ra:0,dec:0},createSeed:1})).bank,0)).bank;
 return Object.freeze({...opened.slots[0]!,...patch});
}

describe('typed literals (RADIO-TYPED-CELLS.json, RECEIVER-DISPLAY-LITERALS-VERIFIED.json)',()=>{
 it('keeps the decoded texts by VA',()=>{
  const L=RECEIVER_DISPLAY_LITERALS;
  expect([L.openCaption,L.receive,L.stop,L.yes,L.no,L.on,L.off]).toEqual(['Receiver 1','Receive','Stop','Yes','No','On','Off']);
  expect([L.aperture,L.meters,L.arcmin,L.deg,L.fov,L.fovDeg,L.hpbw]).toEqual(['   Aperture: ',' Meters    ',"'",' Deg ','Effective FOV: ',' Deg','Beam (HPBW): ']);
  expect([L.pulsar,L.noPulsar,L.receiver,L.slave,L.receiver1]).toEqual(['Pulsar ','No Pulsar in Beam!','Receiver ',' (Slave)','Receiver 1']);
  expect([L.sec,L.mhz,L.pad,L.beamPad,L.beamZero]).toEqual([' Sec ',' MHz ',' ',' ','0']);
  expect(RECEIVER_STEP_CAPTIONS.slice(1)).toEqual(['0.01','0.10','1.00','10.0','100']);
  expect(RECEIVER_DISPLAY_COLOURS).toEqual({background:0x808000,grid:0xff00,trace:0xffff});
 });
});

describe('beam formatter 0x486f4c and parameter texts',()=>{
 it('formats decimal minutes with the carry, the 360 wrap, the head padding and the 0 prefix',()=>{
  // 2 · 0.0061 rad · 180/π = 0.6990085… deg → 41.94 arcmin.
  expect(formatReceiverBeam(2*0.0061*57.29577951308232)).toBe("   0 Deg 41.9'");
  expect(formatReceiverBeam(1.1)).toBe("   1 Deg 06.0'");// minutes below 10 take the '0' prefix
  expect(formatReceiverBeam(0.9999)).toBe("   1 Deg 0.0'");// 59.994' rounds to 600 tenths: carry, prefix from the pre-carry 600
  expect(formatReceiverBeam(360.5)).toBe("   0 Deg 30.0'");
  expect(formatReceiverBeam(719.25)).toBe(" 359 Deg 15.0'");
  expect(formatReceiverBeam(-1.5)).toBe("  -1 Deg 30.0'");
  expect(formatReceiverBeam(12345.5)).toBe(" 105 Deg 30.0'");
 });
 it('decomposes as the ported 0x486b20 contract where no carry occurs',()=>{
  for(const v of [0.25,1.75,12.3456,45.0101,-3.21]){
   const p=splitSexagesimal(v,1),text=formatReceiverBeam(v);
   expect(text.startsWith(`${(p.sign<0?'-':' ')+String(p.whole)}`.padStart(4,' ')),`${v}`).toBe(true);
   expect(Number(text.split(' Deg ')[1].slice(0,-1))).toBeCloseTo(p.minutes+p.seconds/60,1);
  }
 });
 it('builds the aperture, HPBW and FOV texts within their ShortString caps',()=>{
  expect(receiverApertureBase(100)).toBe('   Aperture: 100 Meters    ');
  expect(receiverHpbwText(receiverApertureBase(100),2*0.0061*57.29577951308232)).toBe("   Aperture: 100 Meters    Beam (HPBW): 0 Deg 41.9'");
  expect(receiverFovText(receiverApertureBase(100),1.5)).toBe('   Aperture: 100 Meters    Effective FOV: 1.50 Deg');
  expect(receiverFovText('x'.repeat(70),1)).toBe('x'.repeat(60));
  expect(receiverHpbwText('y'.repeat(58),1)).toBe('y'.repeat(58)+'Be');
  expect(receiverApertureBase(10000)).toHaveLength(29);
 });
 it('titles and the caption follow the route branch (383f = 6, 939 = 1)',()=>{
  expect(receiverMainTitle(true,{legacyName:'B2358+38'})).toBe('Pulsar B2358+38');
  expect(receiverMainTitle(true,{legacyName:'B1234+5678XY'})).toBe('Pulsar B1234+56');
  expect(receiverMainTitle(false,{legacyName:'B2358+38'})).toBe('No Pulsar in Beam!');
  expect([1,2].map(receiverChildTitle)).toEqual(['Receiver 2 (Slave)','Receiver 3 (Slave)']);
  expect(receiverCaption('a'.repeat(40),'b'.repeat(60))).toBe('a'.repeat(40)+'b'.repeat(52));
 });
 it('labels: fixed2/fixed1, step caption, ModeDisp, AlignDisp on the main only, RcrdDisp Off',()=>{
  expect(receiverLabels(receiver())).toEqual({frequency:'600.00',step:'100',vertical:'1.00',horizontal:'4.0',mode:'Stop',align:'Yes',record:'Off'});
  expect(receiverLabels(receiver({index:1,receiving:true,stepIndex:1,frequencyMHz:599.99}))).toMatchObject({frequency:'599.99',step:'0.01',mode:'Receive',align:null});
  // R-RX5: AlignDisp is the stored main caption +0x3bc (a stale 'No' or the '' before any refresh is shown as stored).
  expect(['No','',''].map((alignLabel,i)=>receiverLabels(receiver({alignLabel,index:i===2?1:0})).align)).toEqual(['No','',null]);
 });
});

describe('trace store Word semantics (0x5720cc / 0x572130 / 0x5721a8 / 0x5721c4)',()=>{
 it('creates K = 400 entries with max 399, appends only x ≤ 399 as Words and looks up 0 out of range',()=>{
  const t=createReceiverTrace(400);
  expect(t).toMatchObject({maxIndex:399,dt:null,lastX:0});expect(t.rows).toHaveLength(400);expect(receiverTraceAt(t,5)).toBeNull();
  const a=appendReceiverTrace(t,7,-5);expect(receiverTraceAt(a,7)).toBe(65531);expect(a.lastX).toBe(7);
  expect(appendReceiverTrace(a,400,3)).toBe(a);expect(receiverTraceAt(a,400)).toBe(0);expect(receiverTraceAt(a,65535)).toBe(0);
  expect(receiverTraceAt(appendReceiverTrace(a,8,70000),8)).toBe(70000&0xffff);
  const r=resetReceiverTrace(a,0.01);expect(r).toMatchObject({dt:0.01,lastX:0});expect(r.rows.every(v=>v===0)).toBe(true);
  expect(Object.isFrozen(r.rows)).toBe(true);expect(t.rows.every(v=>v===null)).toBe(true);
 });
});

describe('display ops',()=>{
 it('grid ticks per H: counts, positions, the last major at 400 and the final one at W = 401',()=>{
  const counts=[0.5,1,2,4,8,16].map(h=>receiverGridTicks(h).length);
  expect(counts).toEqual([52,102,22,42,82,82]);
  for(const h of [0.5,1,2,4,8,16]){const t=receiverGridTicks(h);expect(t.at(-2)).toEqual({x:400,bottom:130});expect(t.at(-1)).toEqual({x:401,bottom:130});expect(t[0]).toEqual({x:0,bottom:130});}
  expect(receiverGridTicks(4).slice(0,11).map(t=>[t.x,t.bottom])).toEqual([[0,130],[10,120],[20,120],[30,120],[40,120],[50,120],[60,120],[70,120],[80,120],[90,120],[100,130]]);
  expect(receiverGridTicks(16).slice(0,6).map(t=>[t.x,t.bottom])).toEqual([[0,130],[5,120],[10,120],[15,120],[20,120],[25,130]]);
  expect(receiverGridTicks(0.5).filter(t=>t.bottom===130).map(t=>t.x)).toEqual([0,80,160,240,320,400,401]);
 });
 const kinds=(ops:readonly ReceiverDisplayOp[])=>ops.map(o=>o.kind);
 it('Paint: background, grid, replay only while idle with lastX ≠ 0, baseline to 640, annotation; pen (640, 111)',()=>{
  const idle=receiver(),p=receiverPaintOps(idle),G=RECEIVER_DISPLAY_GEOMETRY;
  expect(p.ops[0]).toEqual({kind:'fill',x0:0,y0:0,x1:401,y1:142});expect(p.ops[1]).toEqual({kind:'pen',colour:0xff00});
  expect(p.pen).toEqual({x:640,y:111});
  const tail=p.ops.slice(-6);
  expect(tail).toEqual([{kind:'pen',colour:0xff00},{kind:'move',x:0,y:G.baselineY},{kind:'line',x:640,y:111},{kind:'pen',colour:0xffff},
   {kind:'text',x:10,y:124,text:'4.0 Sec ',colour:0xff00},{kind:'text',x:307,y:124,text:'600.00 MHz  ',colour:0xff00}]);
  expect(p.ops.filter(o=>o.kind==='line').length).toBe(42+1);// grid ticks + baseline, no replay at lastX 0
  let trace=resetReceiverTrace(idle.trace,0.01);for(const [x,y] of [[1,100],[2,90],[3,95]] as const)trace=appendReceiverTrace(trace,x,y);
  const replay=receiverPaintOps({...idle,trace}).ops,start=replay.findIndex((o,i)=>o.kind==='pen'&&o.colour===0xffff&&i>1);
  expect(replay.slice(start+1,start+5)).toEqual([{kind:'move',x:0,y:0},{kind:'line',x:1,y:100},{kind:'line',x:2,y:90},{kind:'line',x:3,y:95}]);
  expect(kinds(receiverPaintOps({...idle,trace,receiving:true}).ops)).toEqual(kinds(p.ops));
  // A child's never-written entries lift the pen.
  let child=createReceiverTrace(400);child=appendReceiverTrace(appendReceiverTrace(child,2,80),3,81);
  const c=receiverPaintOps({...idle,index:1,trace:child}).ops,cs=c.findIndex((o,i)=>o.kind==='pen'&&o.colour===0xffff&&i>1);
  expect(c.slice(cs+1,cs+4)).toEqual([{kind:'move',x:0,y:0},{kind:'move',x:2,y:80},{kind:'line',x:3,y:81}]);
  expect(receiverAnnotationOps({...idle,frequencyMHz:1400,horizontal:16})).toEqual([{kind:'text',x:10,y:124,text:'16.0 Sec ',colour:0xff00},{kind:'text',x:307,y:124,text:'1400.00 MHz ',colour:0xff00}]);
 });
 it('frame: erase band, Move at 0 or when the pen is to the right, otherwise Line; wrap erase; a null row draws nothing',()=>{
  const fill=(x:number)=>({kind:'fill',x0:x,y0:0,x1:x+10,y1:111});
  expect(receiverFrameOps({position:401,row:100,erasePosition:401,wrapErase:false},{x:640,y:111})).toEqual({ops:[fill(401),{kind:'move',x:401,y:100}],pen:{x:401,y:100}});
  expect(receiverFrameOps({position:5,row:90,erasePosition:5,wrapErase:false},{x:4,y:80})).toEqual({ops:[fill(5),{kind:'line',x:5,y:90}],pen:{x:5,y:90}});
  expect(receiverFrameOps({position:0,row:90,erasePosition:0,wrapErase:false},{x:0,y:80}).ops[1]).toEqual({kind:'move',x:0,y:90});
  expect(receiverFrameOps({position:400,row:70,erasePosition:400,wrapErase:true},{x:399,y:60})).toEqual({ops:[fill(400),{kind:'line',x:400,y:70},fill(0),{kind:'move',x:0,y:70}],pen:{x:0,y:70}});
  expect(receiverFrameOps({position:400,row:70,erasePosition:12,wrapErase:true},{x:11,y:60}).ops[0]).toEqual(fill(12));
  expect(receiverFrameOps({position:7,row:null,erasePosition:7,wrapErase:false},{x:6,y:60})).toEqual({ops:[fill(7)],pen:{x:6,y:60}});
 });
});
