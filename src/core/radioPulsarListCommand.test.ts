import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {RadioPulsarListMenu} from './radioAccessOptions';
import type {PulsarCatalog,PulsarRecord} from './radioPulsarCatalog';
import {preparePulsarListCommand,type PulsarListCommandInput,type PulsarListCommandPrepared,type PulsarListCommandResult} from './radioPulsarListCommand';
import {pulsarPickerCursor,pulsarSeedFromBuffer} from './radioPulsarList';
import {
 PULSAR_PARAMETERS_CONSTANTS,confirmPulsarFind,dismissPulsarNotice,editPulsarDate,editPulsarFindQuery,openPulsarFind,openPulsarParameters,type PulsarParametersWindow,
} from './radioPulsarParameters';
import {
 addReceiverWindow,completeRecordArming,createRadioReceiverSession,editReceiverSeed,markPointerDown,openReceiverWindow,pressRecord,reassociateReceivers,receiverSessionOpen,
 requestReceiverClose,tickReceivers,toggleReceiverMode,type RadioReceiverSession,type ReceiverSessionTransition,
} from './radioReceiverSession';
import {EMPTY_RADIO_RECORD_HEADER} from './radioReceiver';

// [W] contract checks of the R-RX8 composition (WEB-PP-LIST-04): synthetic records and states only, not native oracles. The
// picker, session write and activation are the existing ported functions, covered by their own tests; these cases check
// what the composition adds: gate order before any computation, the post-write seed, the final cursor and the receivers
// left untouched at the click.
const rec=(o:Partial<PulsarRecord>={}):PulsarRecord=>Object.freeze({primaryName:'J0000+00',legacyName:'B0000+00',ra:6,dec:10,x2a:0.5,x34:0,x3e:2451545,
 s48:Math.fround(30),s4c:Math.fround(10),s50:Math.fround(5),s54:Math.fround(8),s58:Math.fround(4),s5c:Math.fround(2),...o});
const cat=(...rows:PulsarRecord[]):PulsarCatalog=>Object.freeze(rows);
const H=rec({primaryName:'J1200-30',legacyName:'B1157-29',ra:12,dec:-30});
const A=rec({primaryName:'J0600+10',legacyName:'B0557+10'});
const B=rec({primaryName:'J0612+10',legacyName:'B0609+10',ra:6.2,x2a:0.25});
const CAT=cat(H,A,B);
// At AT_A the picker hits A; at AT_B it hits B (A is 0.2 h × 15 / cos 10° ≈ 3.05° away); FAR is outside every run.
const AT_A=Object.freeze({ra:6,dec:10}),AT_B=Object.freeze({ra:6.2,dec:10}),FAR=Object.freeze({ra:18,dec:-40});
const JD=2451545.25,ON:RadioPulsarListMenu=Object.freeze({enabled:true,visible:true,activationSeen:true});
let clock=1000;
const now=()=>(clock+=1e-6);
const take=(t:ReceiverSessionTransition)=>{if(t.outcome.kind!=='ok')throw new Error(JSON.stringify(t.outcome));return t.session;};
const opened=(catalog:PulsarCatalog=CAT,pointing=AT_A,s=createRadioReceiverSession())=>take(openReceiverWindow(s,{catalog,pointing}));
const mode=(s:RadioReceiverSession)=>toggleReceiverMode(s,{jd:JD,now:now()});
const tick=(s:RadioReceiverSession)=>tickReceivers(s,{jd:JD,now:now()});
const snap=(rows:number)=>({generation:1,rows,saved:false,analysisBusy:false,leaseHeld:false});
const input=(o:Partial<PulsarListCommandInput>={}):PulsarListCommandInput=>({host:{active:true,busy:false,pageVisible:true},menu:ON,catalog:CAT,reading:false,modal:false,
 session:createRadioReceiverSession(),window:null,pointing:AT_B,clockJD:JD,...o});
const ok=(r:PulsarListCommandResult):PulsarListCommandPrepared=>{if(!r.ok)throw new Error(r.reason);return r;};
const after=(r:PulsarListCommandPrepared)=>r.session.session;
const at=(w:PulsarParametersWindow)=>({index:w.index,shown:w.shownIndex,cursor:w.listCursor});

describe('C01/C05/C06 the command writes, the reference Open only reads',()=>{
 it('same catalog, pointing and session: the reference activation reads the earlier buffer; the command activates on the record it wrote',()=>{
  const s=opened();// Receiver Open at AT_A wrote A
  const reference=openPulsarParameters(null,CAT,pulsarSeedFromBuffer(s.bank.sourceBuffer),JD).window!;
  expect(at(reference)).toEqual({index:1,shown:1,cursor:1});expect(s.bank.sourceBuffer.record).toEqual(A);
  const r=ok(preparePulsarListCommand(input({session:s,pointing:AT_B})));
  expect(r).toMatchObject({source:'hit',name:'J0612+10',reused:false});expect(r.before).toEqual({session:s,window:null});
  expect(after(r).bank.sourceBuffer).toEqual({record:B,primaryNameCleared:false});
  expect(at(r.window)).toEqual({index:2,shown:2,cursor:2});
  // The seed comes from the buffer after the write (B), not from the buffer the reference Open read (A).
  expect(r.window.seed).toEqual({primaryName:'J0612+10',legacyName:'B0609+10'});
  expect(s.bank.sourceBuffer.record).toEqual(A);// the input session is not mutated
 });
 it('C05 hit on a non-first record with no receivers: none is created, the seed count and RNG stay; the window follows the activation',()=>{
  const s=createRadioReceiverSession(),r=ok(preparePulsarListCommand(input({session:s})));
  const n=after(r);
  expect(receiverSessionOpen(n)).toBe(false);expect(n.seed).toBe(s.seed);expect(n.bank.random).toBe(s.bank.random);expect(n.bank.profile).toBe(s.bank.profile);
  expect(n.bank.slots).toEqual(s.bank.slots);expect(n.canvases).toBe(s.canvases);
  expect(at(r.window)).toEqual({index:2,shown:2,cursor:2});expect(r.window.localJD).toBe(JD);
 });
 it('C06 a miss clears only the J2000 name; the activation falls back to the head and Find gets no stale B1950 seed',()=>{
  const hit=after(ok(preparePulsarListCommand(input())));
  const r=ok(preparePulsarListCommand(input({session:hit,pointing:FAR})));
  expect(r).toMatchObject({source:'miss',name:null});
  expect(after(r).bank.sourceBuffer).toEqual({record:{...B,primaryName:''},primaryNameCleared:true});
  expect(r.window.seed).toBeNull();expect(at(r.window)).toEqual({index:0,shown:0,cursor:0});
  const find=openPulsarFind(r.window,pulsarSeedFromBuffer(after(r).bank.sourceBuffer)).window!;
  expect(find.find).toEqual({text:'',mode:1});
 });
 it('C06b a hit on a record with an empty J2000 name copies the whole record but gives no seed, as a miss does',()=>{
  const U=rec({primaryName:'',legacyName:'B0609+10',ra:6.2,x2a:0.25,s4c:Math.fround(3)}),c=cat(H,A,U);
  const s=opened(c,AT_A);// Receiver Open at AT_A wrote A
  const r=ok(preparePulsarListCommand(input({catalog:c,session:s,pointing:AT_B})));
  expect(r).toMatchObject({source:'hit',name:''});
  expect(after(r).bank.sourceBuffer).toEqual({record:U,primaryNameCleared:false});// numbers and legacy name copied
  expect(r.window.seed).toBeNull();expect(at(r.window)).toEqual({index:0,shown:0,cursor:0});
  expect(openPulsarFind(r.window,pulsarSeedFromBuffer(after(r).bank.sourceBuffer)).window!.find).toEqual({text:'',mode:1});// no stale B0557+10
  // The seed alone cannot tell this hit from a miss: only the command's source/name can.
  const m=ok(preparePulsarListCommand(input({catalog:c,session:s,pointing:FAR})));
  expect(m).toMatchObject({source:'miss',name:null});
  expect(after(m).bank.sourceBuffer).toEqual({record:{...A,primaryName:''},primaryNameCleared:true});
  expect(m.window.seed).toBeNull();
 });
});

describe('C07/C08 picked buffer row vs displayed row',()=>{
 it('prefix collision: the picker selects B and ends its cursor on C; the activation scan shows A and sets the final cursor to A',()=>{
  const PA=rec({primaryName:'J0000+01',ra:6.2}),PB=rec({primaryName:'J0000',ra:6}),PC=rec({primaryName:'J0001+00',ra:7.2});
  const c=cat(PA,PB,PC);
  expect(pulsarPickerCursor(c,AT_A)).toBe(2);// where a picker-cursor notification would leave it
  const r=ok(preparePulsarListCommand(input({catalog:c,pointing:AT_A})));
  expect(after(r).bank.sourceBuffer.record).toEqual(PB);
  expect(at(r.window)).toEqual({index:0,shown:0,cursor:0});expect(r.window.source.j2000).toBe('J0000+01');
  // The result carries no picker cursor: nothing can move the cursor after the activation.
  expect(Object.keys(r).sort()).toEqual(['before','name','ok','reused','session','source','window']);
 });
 it('duplicate names with different numbers: the buffer takes the later, nearer row; the window shows the first occurrence',()=>{
  const D1=rec({primaryName:'J0600+10',ra:6.1,x2a:0.75}),D2=rec({primaryName:'J0600+10',ra:6,x2a:0.125});
  const r=ok(preparePulsarListCommand(input({catalog:cat(D1,D2),pointing:AT_A})));
  expect(after(r).bank.sourceBuffer.record).toEqual(D2);
  expect(r.window.index).toBe(0);expect(r.window.source.period).toBe('0.750000000000');
 });
});

describe('C09/C10 the recovered picker through the command',()=>{
 it('first in-window run in file order (not the global nearest) and no RA wrap',()=>{
  const c=cat(rec({primaryName:'first',ra:5,dec:1.5}),rec({primaryName:'break',ra:10,dec:0}),rec({primaryName:'closer',ra:5,dec:0.1}));
  expect(ok(preparePulsarListCommand(input({catalog:c,pointing:{ra:5,dec:0}}))).name).toBe('first');
  expect(ok(preparePulsarListCommand(input({catalog:cat(rec({primaryName:'A',ra:0.1,dec:0})),pointing:{ra:23.9,dec:0}}))).source).toBe('miss');
 });
 it('a separation equal to the limit misses; a tie keeps the earlier row',()=>{
  expect(ok(preparePulsarListCommand(input({catalog:cat(rec({primaryName:'A',ra:3,dec:2})),pointing:{ra:3,dec:0}}))).source).toBe('miss');
  expect(PULSAR_PARAMETERS_CONSTANTS.openLimit).toBe(2);
  const tie=ok(preparePulsarListCommand(input({catalog:cat(rec({primaryName:'up',ra:3,dec:1,x2a:1}),rec({primaryName:'down',ra:3,dec:-1,x2a:2})),pointing:{ra:3,dec:0}})));
  expect(tie.name).toBe('up');expect(after(tie).bank.sourceBuffer.record!.x2a).toBe(1);
 });
});

describe('C11/C14/C15 receivers at the click',()=>{
 it('only the shared buffer changes: slots, profile, RNG, seed, canvases, overlays, marks, Record state and card order stay',()=>{
  let s=take(mode(opened()));s=tick(s).session;
  const r=ok(preparePulsarListCommand(input({session:s}))),n=after(r);
  expect(n.bank.sourceBuffer.record).toEqual(B);
  expect(n.bank.slots).toEqual(s.bank.slots);expect(n.bank.slots[0]!.trace).toBe(s.bank.slots[0]!.trace);
  for(const k of ['profile','random','options','timerEnabled','recording','align'] as const)expect(n.bank[k],k).toEqual(s.bank[k]);
  expect(n.bank.random).toBe(s.bank.random);expect(n.bank.profile).toBe(s.bank.profile);
  expect(n.seed).toBe(s.seed);expect(n.canvases).toBe(s.canvases);expect(n.markOverlays).toBe(s.markOverlays);expect(n.record).toBe(s.record);expect(n.arrangement).toBe(s.arrangement);
  expect(r.session.host).toBeUndefined();
 });
 it('armed Record, capturing and a pending stop are admitted and keep the lease and rows; a mark lease and a tick error stay',()=>{
  let s=opened();s=take(pressRecord(s,snap(0)));s=take(completeRecordArming(s,{ok:true,seed:EMPTY_RADIO_RECORD_HEADER}));
  const armed=after(ok(preparePulsarListCommand(input({session:s}))));expect(armed.record).toBe(s.record);expect(armed.bank.recording).toEqual(s.bank.recording);
  const receiving=take(mode(armed));expect(receiving.bank.recording.header!.name).toBe('B0609+10');// the next Receive header reads the new buffer
  const capturing=after(ok(preparePulsarListCommand(input({session:receiving,pointing:AT_A}))));
  expect(capturing.bank.recording).toEqual(receiving.bank.recording);expect(capturing.record).toBe(receiving.record);
  const stopping=take(mode(capturing));expect(stopping.bank.slots[0]!.stopPending).toBe(true);
  expect(ok(preparePulsarListCommand(input({session:stopping}))).source).toBe('hit');
  const leased=take(markPointerDown(opened(),{pointerId:1,pointerType:'mouse',button:0,slot:0,code:0,x:80}));
  expect(after(ok(preparePulsarListCommand(input({session:leased})))).markLease).toBe(leased.markLease);
  const P=rec({primaryName:'J0001+00',legacyName:'B0001+00',s54:Math.fround(1e8)}),A0=rec();
  let e=take(mode(opened(cat(A0),AT_A)));e=tick(e).session;e=take(reassociateReceivers(e,{catalog:[P],pointing:AT_A}));e=tick(e).session;
  expect(e.tickError).toMatchObject({kind:'poisson-mean-domain'});
  expect(after(ok(preparePulsarListCommand(input({session:e,catalog:cat(P),pointing:AT_A})))).tickError).toBe(e.tickError);
 });
});

describe('C02/C03/C16/C17/C18/C21 refusals come before any computation and carry no outputs',()=>{
 const refused=(o:Partial<PulsarListCommandInput>)=>{
  const i=input(o),json=JSON.stringify([i.session,i.window,i.menu]);
  const r=preparePulsarListCommand(i);
  expect(JSON.stringify([i.session,i.window,i.menu])).toBe(json);
  if(r.ok)throw new Error('admitted');
  expect(Object.keys(r).sort()).toEqual(['ok','reason']);expect(Object.isFrozen(r)).toBe(true);
  return r.reason;
 };
 it('host, menu history, catalog and read in order',()=>{
  expect(refused({host:{active:false,busy:false,pageVisible:true}})).toBe('inactive');
  expect(refused({host:{active:true,busy:true,pageVisible:true}})).toBe('inactive');
  expect(refused({host:{active:true,busy:false,pageVisible:false},menu:{enabled:false,visible:false,activationSeen:false}})).toBe('inactive');
  expect(refused({menu:{enabled:false,visible:false,activationSeen:false}})).toBe('menu-hidden');
  expect(refused({menu:{enabled:true,visible:false,activationSeen:true}})).toBe('menu-hidden');// hidden-enabled
  expect(refused({menu:{enabled:false,visible:true,activationSeen:true},catalog:null})).toBe('menu-disabled');
  expect(refused({catalog:null,reading:true})).toBe('no-catalog');expect(refused({catalog:cat()})).toBe('no-catalog');
  expect(refused({reading:true})).toBe('reading');
 });
 it('modal surfaces, the window\'s own Find and box, the receiver boxes, the session and the pointing',()=>{
  expect(refused({modal:true})).toBe('modal');
  const w=ok(preparePulsarListCommand(input())).window;
  const finding=openPulsarFind(w,null).window!;
  expect(refused({window:finding})).toBe('modal');
  const notice=confirmPulsarFind(editPulsarFindQuery(finding,'zzz').window!).window!;expect(notice.notice?.kind).toBe('not-found');
  expect(refused({window:notice})).toBe('modal');
  const boxed=take(requestReceiverClose(take(addReceiverWindow(take(addReceiverWindow(opened())))),1));
  expect(refused({session:boxed})).toBe('close-box-open');
  expect(refused({session:take(pressRecord(opened(),snap(3)))})).toBe('record-dialog-open');
  expect(refused({session:null})).toBe('unavailable');
  expect(refused({pointing:{ra:Number.NaN,dec:10}})).toBe('pointing-invalid');
  expect(refused({clockJD:Number.NaN})).toBe('prepare-failed');expect(refused({clockJD:Number.POSITIVE_INFINITY})).toBe('prepare-failed');
 });
});

describe('C19/C22/C23 repeat, seed and menu',()=>{
 it('a repeated command reuses the window: Find memory kept; Date, density and pending edits reset; the activation runs again',()=>{
  const first=ok(preparePulsarListCommand(input()));
  let w=confirmPulsarFind(editPulsarFindQuery(openPulsarFind(first.window,null).window!,'0557').window!).window!;// B1950 hit: A
  expect(at(w)).toEqual({index:1,shown:1,cursor:1});
  w=editPulsarDate(w,'777').window!;expect(w.updateEnabled).toBe(true);
  const again=ok(preparePulsarListCommand(input({session:after(first),window:w,clockJD:JD+1})));
  expect(again.reused).toBe(true);expect(again.window.findMemory).toEqual({query:'0557',mode:1});
  expect(at(again.window)).toEqual({index:2,shown:2,cursor:2});
  expect(again.window).toMatchObject({localJD:JD+1,density:PULSAR_PARAMETERS_CONSTANTS.defaultDensity,updateEnabled:false,find:null,notice:null,boundary:null});
  expect(again.window.dateText).toBe('51546.25000000');
  expect(Object.isFrozen(again.window)).toBe(true);
  // A dismissed notice no longer refuses.
  const missed=dismissPulsarNotice(confirmPulsarFind(editPulsarFindQuery(openPulsarFind(again.window,null).window!,'none').window!).window!).window!;
  expect(ok(preparePulsarListCommand(input({session:after(again),window:missed}))).reused).toBe(true);
 });
 it('C22 an invalid receiver seed is no gate: the command creates no receiver and draws nothing',()=>{
  const bad=take(editReceiverSeed(createRadioReceiverSession(),'abc'));expect(bad.seed.base).toBeNull();
  const n=after(ok(preparePulsarListCommand(input({session:bad}))));
  expect(n.seed).toBe(bad.seed);expect(n.bank.random).toBeNull();expect(receiverSessionOpen(n)).toBe(false);
 });
 it('C23 the menu flags are read only: the same frozen object, nothing about the menu in the result',()=>{
  const menu=Object.freeze({enabled:true,visible:true,activationSeen:true});
  const r=ok(preparePulsarListCommand(input({menu})));
  expect(menu).toEqual({enabled:true,visible:true,activationSeen:true});expect(JSON.stringify(r.window)).not.toContain('activationSeen');
  expect(Object.isFrozen(r)).toBe(true);expect(Object.isFrozen(r.before)).toBe(true);
 });
});

describe('isolation',()=>{
 it('imports the two transitions, their gates and types only; no clock, RNG, storage, network or React',()=>{
  const source=readFileSync(new URL('./radioPulsarListCommand.ts',import.meta.url),'utf8');
  const imports=[...source.matchAll(/^import (type )?.* from '([^']+)';$/gm)].map(m=>[m[1]?'type':'value',m[2]]);
  expect(imports).toEqual([['type','./radioAntenna'],['type','./radioAccessOptions'],['type','./radioPulsarCatalog'],['value','./radioPulsarList'],
   ['value','./radioPulsarParameters'],['value','./radioReceiverSession']]);
  const code=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
  expect(code).not.toMatch(/\bDate\b|performance|Math\.random|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|setTimeout|setInterval|globalThis|\bdocument\b|react/);
 });
});
