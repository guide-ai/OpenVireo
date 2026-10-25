import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {PULSAR_CATALOG_COLUMNS,parsePulsarCatalog,type PulsarCatalog,type PulsarRecord} from './radioPulsarCatalog';
import {
 PULSAR_FIND_CAPTIONS,PULSAR_PARAMETERS_CAPTIONS,PULSAR_PARAMETERS_CONSTANTS,PULSAR_PARAMETERS_WEB_POLICY,
 cancelPulsarFind,choosePulsarFindMode,confirmPulsarFind,dismissPulsarNotice,editPulsarDate,editPulsarDensity,editPulsarFindQuery,exitPulsarParameters,
 movePulsarListCursor,nextPulsar,openPulsarFind,openPulsarParameters,previousPulsar,pulsarDerivedDistance,pulsarDerivedPeriod,pulsarDerivedTexts,pulsarNameContains,
 pulsarParametersOpenRefusal,pulsarSeedFor,pulsarSourceTexts,resetPulsarDerived,updatePulsarDerived,type PulsarParametersTransition,type PulsarParametersWindow,
} from './radioPulsarParameters';
import {pulsarPickerCursor,pulsarSeedFromBuffer} from './radioPulsarList';
import type {RadioSourceBuffer} from './radioReceiver';

// Synthetic records only (no original catalog rows). Expected strings are worked out by hand from the listing contracts
// (PP-01..PP-09) and the declared web policies; they test the chosen implementation contract, not the native runtime.
const rec=(o:Partial<PulsarRecord>={}):PulsarRecord=>Object.freeze({primaryName:'J0000+0000',legacyName:'B0000+00',ra:0.25,dec:-10.5,
 x2a:0.5,x34:1e-15,x3e:2450000,s48:Math.fround(28.2),s4c:Math.fround(30),s50:Math.fround(12.5),s54:Math.fround(14),s58:Math.fround(9),s5c:Math.fround(3),...o});
const CATALOG:PulsarCatalog=Object.freeze([
 rec({primaryName:'0045-7319',legacyName:'0045-73'}),
 rec({primaryName:'1927+18A',legacyName:'1925+18'}),
 rec({primaryName:'1927+18',legacyName:'1925+188'}),
 rec({primaryName:'2048-1616',legacyName:'2045-16'}),
]);
const win=(t:PulsarParametersTransition):PulsarParametersWindow=>{if(t.window===null)throw new Error('no window');return t.window;};
const opened=(seedJD:number|null=2450001,catalog=CATALOG,seed=null as ReturnType<typeof pulsarSeedFor>)=>win(openPulsarParameters(null,catalog,seed,seedJD));
/** Find with no name in the live shared buffer (never written or cleared). */
const findNoSeed=(w:PulsarParametersWindow)=>openPulsarFind(w,null);

describe('constants and captions (PP-01, PP-02, PP-05)',()=>{
 it('keeps the Single literals and the Extended density, whose nearest double is exactly 0.03 without a tie',()=>{
  const k=PULSAR_PARAMETERS_CONSTANTS;
  expect(k.mjdOffset).toBe(2400000);expect(k.mjdOffset).not.toBe(2400000.5);expect(k.secondsPerDay).toBe(86400);
  expect(k.defaultDensity).toBe(0.03);
  // 64-bit significand → 53 bits drops 11 bits 0x28f = 0b01010001111: the leading dropped bit is 0, so it rounds down.
  expect(0xf5c28f5c28f5c28fn&0x7ffn).toBe(0x28fn);expect((0xf5c28f5c28f5c28fn>>10n)&1n).toBe(0n);
  expect(k.openLimit).toBe(2);expect(k.queryMaxLength).toBe(12);
  expect(PULSAR_PARAMETERS_WEB_POLICY.webInitialFindMode).toBe(1);
 });
 it('keeps raw DFM captions with accelerators and hints',()=>{
  expect(PULSAR_PARAMETERS_CAPTIONS).toMatchObject({form:'Pulsar Parameters',epoch:'PEpoch (MJD):',dm:'Dispersion (pc/cm^3):',find:'Find &Pulsar...',
   update:'&Update',dateHint:'Julian Date minus 2,400,000',densityHint:'Electrons/cm^3',flux:'Time Averaged Flux Densities (mJy):'});
  expect(PULSAR_FIND_CAPTIONS).toEqual({form:'Find Pulsar Data',name:'Pulsar Name:',type:'Type',b1950:'B1950 Name',j2000:'J2000 Name',ok:'&Ok',cancel:'&Cancel'});
  expect(Object.isFrozen(PULSAR_PARAMETERS_CAPTIONS)&&Object.isFrozen(PULSAR_PARAMETERS_CONSTANTS)).toBe(true);
 });
});

describe('display 0x568e10 (PP-01)',()=>{
 it('formats each field with the recorded selector',()=>{
  const s=pulsarSourceTexts(rec({x2a:0.714519699726,x34:2.4e-15,x3e:46473+2400000,s48:Math.fround(28.2),s4c:Math.fround(30.1),s50:Math.fround(12.5),
   s54:Math.fround(14),s58:Math.fround(9.25),s5c:Math.fround(0.1)}));
  expect(s).toMatchObject({j2000:'J0000+0000',b1950:'B0000+00',raHours:'0',raMinutes:'15',raSeconds:'0.00',decDegrees:'-10',decMinutes:'30',decSeconds:'0.0',
   period:'0.714519699726',periodDot:'2.4000E-15',epoch:'46473.0000',sky:'28.2',dm:'30.10',width:'12.5',s400:'14.0',s600:'9.3',s1400:'0.1'});
  expect(s.issues).toEqual([]);
 });
 it('subtracts 2400000 from PEpoch, not 2400000.5, through the codec',()=>{
  const chars=Array.from({length:454},()=>' ');
  const put=(field:keyof typeof PULSAR_CATALOG_COLUMNS,text:string)=>{const c=PULSAR_CATALOG_COLUMNS[field];text.padStart(c.width).split('').forEach((ch,i)=>{chars[c.start+i]=ch;});};
  for(const f of ['ra','dec','x2a','x34','s48','s4c','s50','s54','s58','s5c'] as const)put(f,'1');
  put('x3e','46473.25');
  const parsed=parsePulsarCatalog(Uint8Array.from(chars.join(''),c=>c.charCodeAt(0)));if(!parsed.ok)throw new Error('refused');
  expect(pulsarSourceTexts(parsed.catalog[0]).epoch).toBe('46473.2500');
 });
 it('keeps the Dec sign quirk of IntToStr(sign × degrees) and the RA/Dec carries of 0x486bc0',()=>{
  expect(pulsarSourceTexts(rec({dec:-0.5}))).toMatchObject({decDegrees:'0',decMinutes:'30'});
  expect(pulsarSourceTexts(rec({ra:23+59/60+59.999/3600}))).toMatchObject({raHours:'24',raMinutes:'0',raSeconds:'0.00'});
 });
 it('leaves fixed fields outside |v| < 1e15 empty and lists them',()=>{
  const s=pulsarSourceTexts(rec({x2a:1e15,s4c:Math.fround(-2e15)}));
  expect(s.period).toBe('');expect(s.dm).toBe('');expect(s.issues).toEqual(['period','dm']);
 });
});

describe('derived routines 0x5690c4 and 0x56919c (PP-02, PP-03)',()=>{
 it('period = P + PDot × ((J − PEpoch) × 86400)',()=>{
  expect(pulsarDerivedPeriod(rec({x2a:1,x34:1e-15,x3e:2450000}),2450001)).toBe(1+1e-15*86400);
  const d=pulsarDerivedTexts(rec({x2a:1,x34:1e-15,x3e:2450000}),2450001,0.03);
  expect(d).toMatchObject({dateText:'50001.00000000',periodText:'1.000000000086',densityText:'0.030',distanceText:'1000',issues:[]});
 });
 it('rounds the distance quotient ties to even and never prints -0',()=>{
  const at=(dm:number,density:number)=>pulsarDerivedDistance(rec({s4c:Math.fround(dm)}),density);
  expect([at(3,2),at(5,2),at(7,2),at(-3,2),at(3,-2),at(-1,2),at(1,4)]).toEqual([2,2,4,-2,-2,0,0]);
  expect(Object.is(at(-1,2),-0)).toBe(false);
 });
 it('reports a zero, non-finite or unsafe distance and a huge period as unsupported, not as a number',()=>{
  expect(pulsarDerivedDistance(rec(),0)).toBeNull();expect(pulsarDerivedDistance(rec(),-0)).toBeNull();
  expect(pulsarDerivedDistance(rec(),Number.NaN)).toBeNull();expect(pulsarDerivedDistance(rec(),1e-17)).toBeNull();
  const d=pulsarDerivedTexts(rec({x34:1}),2400000+1e12,0);
  expect(d).toMatchObject({dateText:'1000000000000.00000000',periodText:'',densityText:'0.000',distanceText:''});
  expect(d.issues).toEqual(['period-domain','distance-domain']);
  expect(pulsarDerivedTexts(rec(),null,0.03)).toMatchObject({dateText:'',periodText:'',distanceText:'1000',issues:['no-clock']});
 });
});

describe('activation and navigation (PP-05, PP-07)',()=>{
 it('opens at the head without a seed, with the clock JD and the compiled density; Update starts disabled',()=>{
  const w=opened();
  expect(w).toMatchObject({index:0,localJD:2450001,density:0.03,dateText:'50001.00000000',densityText:'0.030',distanceText:'1000',updateEnabled:false,
   find:null,notice:null,findMemory:{query:'',mode:0}});
  expect(Object.isFrozen(w)).toBe(true);
 });
 it('seeds with a literal substring of the J2000 name: the first containing record wins, else the head',()=>{
  const seed=pulsarSeedFor(CATALOG[2]);expect(seed).toEqual({primaryName:'1927+18',legacyName:'1925+188'});
  expect(opened(null,CATALOG,seed).index).toBe(1);// '1927+18A' contains '1927+18' and comes first
  expect(opened(null,CATALOG,{primaryName:'048-16',legacyName:''}).index).toBe(3);
  expect(opened(null,CATALOG,{primaryName:'1925+18',legacyName:''}).index).toBe(0);// a B1950 name is not searched here
  expect(opened(null,CATALOG,{primaryName:'j2048',legacyName:''}).index).toBe(0);// case-sensitive
  expect(pulsarSeedFor(null)).toBeNull();expect(pulsarSeedFor(rec({primaryName:''}))).toBeNull();
 });
 it('moves without wrap; ends set a boundary status and move nothing; pending edits are overwritten and Update disabled',()=>{
  let w=opened();
  const first=previousPulsar(w);expect(first.outcome).toBe('at-first');expect(win(first)).toMatchObject({index:0,boundary:'first'});
  w=win(editPulsarDate(w,'123'));expect(w.updateEnabled).toBe(true);
  w=win(nextPulsar(w));expect(w).toMatchObject({index:1,dateText:'50001.00000000',updateEnabled:false,boundary:null});
  w=win(nextPulsar(win(nextPulsar(w))));expect(w.index).toBe(3);
  const last=nextPulsar(w);expect(last.outcome).toBe('at-last');expect(win(last)).toMatchObject({index:3,boundary:'last'});
  expect(win(previousPulsar(win(last))).index).toBe(2);
 });
 it('reopen keeps the Find memory and re-seeds; Exit drops it; another catalog starts fresh',()=>{
  const w=win(confirmPulsarFind(win(editPulsarFindQuery(win(findNoSeed(opened())),'2045'))));
  expect(w).toMatchObject({index:3,notice:null,findMemory:{query:'2045',mode:1}});
  const re=openPulsarParameters(w,CATALOG,null,null);expect(re.outcome).toBe('reopened');
  expect(win(re)).toMatchObject({index:0,localJD:null,findMemory:{query:'2045',mode:1}});
  expect(exitPulsarParameters(w)).toMatchObject({window:null,outcome:'exited',changed:true});
  const other=Object.freeze([...CATALOG]);
  expect(win(openPulsarParameters(w,other,null,null)).findMemory).toEqual({query:'',mode:0});
 });
});

describe('Update and Reset (PP-04, PP-05, PP-06)',()=>{
 it('editing enables Update; Update stores both, refreshes and disables it',()=>{
  let w=win(editPulsarDensity(win(editPulsarDate(opened(),'50002.5')),'0.06'));
  expect(w.updateEnabled).toBe(true);
  const u=updatePulsarDerived(w);expect(u.outcome).toBe('updated');w=win(u);
  expect(w).toMatchObject({localJD:2450002.5,density:0.06,dateText:'50002.50000000',densityText:'0.060',distanceText:'500',updateEnabled:false});
  expect(updatePulsarDerived(w).outcome).toBe('update-disabled');
 });
 it('a blank field keeps the prior local value; whitespace only is an error',()=>{
  let w=win(updatePulsarDerived(win(editPulsarDensity(win(editPulsarDate(opened(),'')),'0.06'))));
  expect(w).toMatchObject({localJD:2450001,density:0.06,dateText:'50001.00000000'});
  w=win(updatePulsarDerived(win(editPulsarDate(w,'   '))));
  expect(w.notice).toEqual({kind:'update-error',field:'date',text:'   '});expect(w.localJD).toBe(2450001);
 });
 it('a Date error stores nothing; a Density error after a good Date keeps the Date, leaves stale derived texts and Update enabled',()=>{
  const base=opened();
  const dateBad=win(updatePulsarDerived(win(editPulsarDensity(win(editPulsarDate(base,'5e')),'0.06'))));
  expect(dateBad).toMatchObject({localJD:2450001,density:0.03,dateText:'5e',densityText:'0.06',updateEnabled:true,notice:{kind:'update-error',field:'date'}});
  const partial=updatePulsarDerived(win(editPulsarDensity(win(editPulsarDate(base,'60000')),'x')));
  expect(partial.outcome).toBe('density-invalid');
  expect(win(partial)).toMatchObject({localJD:2460000,density:0.03,dateText:'60000',densityText:'x',periodText:base.periodText,distanceText:base.distanceText,
   updateEnabled:true,notice:{kind:'update-error',field:'density',text:'x'}});
  // While the box is open everything else is refused; dismissing it keeps the partial store.
  const boxed=win(partial);
  for(const t of [nextPulsar(boxed),updatePulsarDerived(boxed),resetPulsarDerived(boxed,1),findNoSeed(boxed),exitPulsarParameters(boxed),editPulsarDate(boxed,'1')])
   expect(t).toMatchObject({outcome:'modal',changed:false});
  const after=win(dismissPulsarNotice(boxed));expect(after).toMatchObject({notice:null,localJD:2460000,updateEnabled:true});
  // A later display (Next) shows the stored Date, not the stale text, and disables Update.
  expect(win(nextPulsar(after))).toMatchObject({dateText:'60000.00000000',updateEnabled:false});
 });
 it('refuses edits beyond the web bound without truncating',()=>{
  const w=opened(),long='1'.repeat(PULSAR_PARAMETERS_WEB_POLICY.fieldMaxLength+1);
  expect(editPulsarDate(w,long)).toMatchObject({outcome:'field-too-long',changed:false,window:w});
 });
 it('Reset reads the supplied JD (or none) and the compiled density, refreshes and disables Update',()=>{
  const w=win(editPulsarDensity(win(updatePulsarDerived(win(editPulsarDensity(opened(),'1')))),'9'));
  expect(win(resetPulsarDerived(w,2450010))).toMatchObject({localJD:2450010,density:0.03,dateText:'50010.00000000',densityText:'0.030',updateEnabled:false});
  expect(win(resetPulsarDerived(w,null))).toMatchObject({localJD:null,dateText:'',periodText:'',derivedIssues:['no-clock']});
  expect(()=>resetPulsarDerived(w,Number.NaN)).toThrow();
 });
});

describe('Find (PP-08, PP-09)',()=>{
 it('first open: B1950 mode and the seed B1950 name are written to the memory; Cancel keeps that activation write',()=>{
  const w=opened(null,CATALOG,pulsarSeedFor(CATALOG[3]));
  const f=win(openPulsarFind(w,pulsarSeedFor(CATALOG[3])));
  expect(f.find).toEqual({text:'2045-16',mode:1});expect(f.findMemory).toEqual({query:'2045-16',mode:1});
  const c=win(cancelPulsarFind(win(editPulsarFindQuery(f,'zzz'))));
  expect(c).toMatchObject({find:null,index:w.index,findMemory:{query:'2045-16',mode:1}});
  expect(win(findNoSeed(c)).find).toEqual({text:'2045-16',mode:1});// the stored query is kept, whatever the buffer holds now
 });
 it('without a seed the memory stays empty and is re-seeded at the next open',()=>{
  const f=win(findNoSeed(opened()));expect(f.find).toEqual({text:'',mode:1});
  const reopened=win(openPulsarParameters(win(cancelPulsarFind(f)),CATALOG,pulsarSeedFor(CATALOG[0]),null));
  expect(win(openPulsarFind(reopened,pulsarSeedFor(CATALOG[0]))).find).toEqual({text:'0045-73',mode:1});
 });
 it('OK commits 12 characters as typed and searches the chosen name field by literal substring',()=>{
  let w=win(findNoSeed(opened()));
  w=win(choosePulsarFindMode(win(editPulsarFindQuery(w,'27+18')),2));
  const hit=confirmPulsarFind(w);expect(hit.outcome).toBe('found');expect(win(hit)).toMatchObject({index:1,findMemory:{query:'27+18',mode:2}});
  const b=win(confirmPulsarFind(win(editPulsarFindQuery(win(findNoSeed(win(hit))),'25+188'))));
  expect(b).toMatchObject({index:1,notice:{kind:'not-found',query:'25+188',mode:2}});// mode 2 kept: J2000 names do not contain it
  const legacy=win(confirmPulsarFind(win(choosePulsarFindMode(win(findNoSeed(win(dismissPulsarNotice(b)))),1))));
  expect(legacy).toMatchObject({index:2,findMemory:{query:'25+188',mode:1}});
  const long=win(confirmPulsarFind(win(editPulsarFindQuery(win(findNoSeed(legacy)),' 2048-1616XYZW'))));
  expect(long.findMemory.query).toBe(' 2048-1616XY');expect(long.notice).toMatchObject({kind:'not-found'});// leading space kept
 });
 it('a miss restores the record without a display (pending edits stay); a hit keeps the local JD and density',()=>{
  let w=win(nextPulsar(opened()));w=win(editPulsarDate(w,'777'));
  const miss=win(confirmPulsarFind(win(editPulsarFindQuery(win(findNoSeed(w)),'1927+18a'))));
  expect(miss).toMatchObject({index:1,dateText:'777',updateEnabled:true,notice:{kind:'not-found',query:'1927+18a',mode:1}});
  const empty=win(confirmPulsarFind(win(editPulsarFindQuery(win(findNoSeed(win(dismissPulsarNotice(miss)))),''))));
  expect(empty.notice).toMatchObject({kind:'not-found',query:''});// an empty needle never matches
  const tuned=win(updatePulsarDerived(win(editPulsarDensity(win(dismissPulsarNotice(empty)),'0.5'))));
  const hit=win(confirmPulsarFind(win(choosePulsarFindMode(win(editPulsarFindQuery(win(findNoSeed(tuned)),'0045')),2))));
  expect(hit).toMatchObject({index:0,localJD:2400777,density:0.5,densityText:'0.500',updateEnabled:false});
 });
 it('refuses Find edits past the draft bound and Find actions without a dialog',()=>{
  const f=win(findNoSeed(opened()));
  expect(editPulsarFindQuery(f,'x'.repeat(PULSAR_PARAMETERS_WEB_POLICY.findDraftMaxLength+1))).toMatchObject({outcome:'find-too-long',changed:false});
  const w=opened();
  for(const t of [confirmPulsarFind(w),cancelPulsarFind(w),editPulsarFindQuery(w,'a'),choosePulsarFindMode(w,2)])expect(t).toMatchObject({outcome:'no-find',changed:false});
  expect(findNoSeed(f)).toMatchObject({outcome:'modal',changed:false});
  expect(dismissPulsarNotice(w)).toMatchObject({outcome:'no-notice',changed:false});
  expect(pulsarNameContains('1927+18','')).toBe(false);expect(pulsarNameContains('1927+18','7+1')).toBe(true);
 });
});

describe('R-RX6 shared buffer (read-only) and shared list cursor (PP-05, PP-11, WEB-PP-ACT-01, WEB-PP-CUR-01, WEB-PP-FIND-02′/04)',()=>{
 // Distinct DM per record so Distance shows which record the pointer names (density 0.03).
 const DM=Object.freeze([rec({primaryName:'0045-7319',legacyName:'0045-73',s4c:Math.fround(30)}),rec({primaryName:'1927+18A',legacyName:'1925+18',s4c:Math.fround(3)}),
  rec({primaryName:'1927+18',legacyName:'1925+188',s4c:Math.fround(6)}),rec({primaryName:'2048-1616',legacyName:'2045-16',s4c:Math.fround(9)})]) as PulsarCatalog;
 const buffer=(r:PulsarRecord):RadioSourceBuffer=>Object.freeze({record:r,primaryNameCleared:false});
 const clearedBuffer=(r:PulsarRecord):RadioSourceBuffer=>Object.freeze({record:Object.freeze({...r,primaryName:''}),primaryNameCleared:true});
 const at=(w:PulsarParametersWindow)=>({index:w.index,shown:w.shownIndex,cursor:w.listCursor});
 it('activation scans the live buffer name: the first substring match among duplicates; a cleared or never-written buffer gives the head',()=>{
  const w=win(openPulsarParameters(null,DM,pulsarSeedFromBuffer(buffer(DM[2])),null));
  expect(at(w)).toEqual({index:1,shown:1,cursor:1});expect(w.seed).toEqual({primaryName:'1927+18',legacyName:'1925+188'});
  expect(at(win(openPulsarParameters(null,DM,pulsarSeedFromBuffer(clearedBuffer(DM[3])),null)))).toEqual({index:0,shown:0,cursor:0});
  expect(at(win(openPulsarParameters(null,DM,pulsarSeedFromBuffer(null),null)))).toEqual({index:0,shown:0,cursor:0});
  // A name no record contains: the head, and the window keeps the name it scanned with (the Open note names it).
  const absent=win(openPulsarParameters(null,DM,pulsarSeedFromBuffer(buffer(rec({primaryName:'J9999+99',legacyName:'B9999+99'}))),null));
  expect(at(absent)).toEqual({index:0,shown:0,cursor:0});expect(absent.seed).toEqual({primaryName:'J9999+99',legacyName:'B9999+99'});
 });
 it('a picker move changes only the cursor; Next then reports the last record while another is shown, Prev steps from the cursor',()=>{
  const w=win(editPulsarDate(opened(2450001,DM),'777'));
  const t=movePulsarListCursor(w,DM,3);expect(t).toMatchObject({outcome:'cursor-moved',changed:true});
  const m=win(t);
  expect(at(m)).toEqual({index:0,shown:0,cursor:3});expect(m.source).toBe(w.source);expect(m).toMatchObject({dateText:'777',updateEnabled:true,distanceText:w.distanceText});
  const last=nextPulsar(m);expect(last.outcome).toBe('at-last');expect(at(win(last))).toEqual({index:0,shown:0,cursor:3});expect(win(last).source).toBe(w.source);
  const prev=win(previousPulsar(m));expect(at(prev)).toEqual({index:2,shown:2,cursor:2});expect(prev.source.j2000).toBe('1927+18');
  const next=win(nextPulsar(win(movePulsarListCursor(w,DM,1))));expect(at(next)).toEqual({index:2,shown:2,cursor:2});
  const first=previousPulsar(win(movePulsarListCursor(win(nextPulsar(w)),DM,0)));expect(first.outcome).toBe('at-first');expect(at(win(first))).toEqual({index:1,shown:1,cursor:0});
 });
 it('cursor moves: unchanged and other-catalog or out-of-range inputs change nothing; accepted while Find or a box is open',()=>{
  const w=opened(2450001,DM);
  for(const [catalog,index,outcome] of [[DM,0,'cursor-unchanged'],[DM,null,'cursor-unchanged'],[CATALOG,2,'cursor-ignored'],[null,2,'cursor-ignored'],
   [DM,4,'cursor-ignored'],[DM,-1,'cursor-ignored'],[DM,1.5,'cursor-ignored']] as const){
   const t=movePulsarListCursor(w,catalog,index);expect(t,`${index}`).toMatchObject({outcome,changed:false});expect(t.window).toBe(w);
  }
  const f=win(editPulsarFindQuery(win(findNoSeed(w)),'draft'));
  const moved=win(movePulsarListCursor(f,DM,2));expect(moved.find).toEqual(f.find);expect(moved.listCursor).toBe(2);
  const boxed=win(updatePulsarDerived(win(editPulsarDate(w,'x'))));expect(boxed.notice).not.toBeNull();
  expect(win(movePulsarListCursor(boxed,DM,3))).toMatchObject({listCursor:3,notice:boxed.notice});
  expect(movePulsarListCursor(w,DM,pulsarPickerCursor(DM,{ra:12,dec:0})).outcome).toBe('cursor-moved');// every RA 0.25 h: no run, so the tail
 });
 it('Find seeds from the live buffer at Find activation: a name changed after Open, a cleared name blocks the stale B1950 name, a stored query stays',()=>{
  const w=win(openPulsarParameters(null,DM,pulsarSeedFromBuffer(buffer(DM[0])),null));
  expect(win(openPulsarFind(w,pulsarSeedFromBuffer(buffer(DM[3])))).find).toEqual({text:'2045-16',mode:1});// reassociated after Open
  const blocked=win(openPulsarFind(w,pulsarSeedFromBuffer(clearedBuffer(DM[3]))));
  expect(blocked.find).toEqual({text:'',mode:1});expect(blocked.findMemory).toEqual({query:'',mode:1});
  expect(win(openPulsarFind(w,{primaryName:'',legacyName:'2045-16'})).find).toEqual({text:'',mode:1});// gate on the J2000 length, in B1950 mode too
  const stored=win(confirmPulsarFind(win(editPulsarFindQuery(win(findNoSeed(w)),'2048'))));
  expect(win(openPulsarFind(win(dismissPulsarNotice(stored)),pulsarSeedFromBuffer(buffer(DM[0])))).find).toEqual({text:'2048',mode:1});
 });
 it('Find miss after a move: pointer and cursor return to the cursor saved at OK, nothing is redrawn; Reset and Update then use the pointer record',()=>{
  let w=win(editPulsarDate(opened(2450001,DM),'777'));
  w=win(findNoSeed(w));// the dialog opens with the cursor on record 0 …
  w=win(movePulsarListCursor(w,DM,3));// … a clock reassociation moves it while the dialog is open
  const miss=win(confirmPulsarFind(win(editPulsarFindQuery(w,'none'))));
  expect(at(miss)).toEqual({index:3,shown:0,cursor:3});
  expect(miss).toMatchObject({dateText:'777',updateEnabled:true,notice:{kind:'not-found',query:'none',mode:1}});
  expect(miss.source).toBe(w.source);expect(miss.source.dm).toBe('30.00');
  const reset=win(resetPulsarDerived(win(dismissPulsarNotice(miss)),2450001));
  expect(reset.distanceText).toBe('300');expect(reset.source.dm).toBe('30.00');expect(at(reset)).toEqual({index:3,shown:0,cursor:3});// DM 9 / 0.03
  const updated=win(updatePulsarDerived(win(editPulsarDensity(win(dismissPulsarNotice(miss)),'0.09'))));
  expect(updated.distanceText).toBe('100');expect(updated.source.dm).toBe('30.00');
  expect(nextPulsar(reset).outcome).toBe('at-last');
  expect(at(win(previousPulsar(reset)))).toEqual({index:2,shown:2,cursor:2});
 });
 it('Find hit sets pointer, cursor and shown record; Cancel keeps a cursor moved while the dialog was open',()=>{
  const moved=win(movePulsarListCursor(win(findNoSeed(opened(2450001,DM))),DM,3));
  const hit=win(confirmPulsarFind(win(editPulsarFindQuery(moved,'1925+18'))));
  expect(at(hit)).toEqual({index:1,shown:1,cursor:1});expect(hit.distanceText).toBe('100');
  const cancelled=win(cancelPulsarFind(moved));expect(at(cancelled)).toEqual({index:0,shown:0,cursor:3});
 });
 it('reuse resynchronises pointer, shown record and cursor from the live buffer, keeps the Find memory and drops edits; the precheck names the modal case',()=>{
  const w=win(editPulsarFindQuery(win(findNoSeed(win(editPulsarDate(opened(2450001,DM),'777')))),'none'));
  const miss=win(dismissPulsarNotice(win(confirmPulsarFind(win(movePulsarListCursor(w,DM,3))))));
  expect(pulsarParametersOpenRefusal(null)).toBeNull();expect(pulsarParametersOpenRefusal(miss)).toBeNull();
  expect(pulsarParametersOpenRefusal(w)).toBe('modal');
  expect(pulsarParametersOpenRefusal(win(confirmPulsarFind(w)))).toBe('modal');
  const re=win(openPulsarParameters(miss,DM,pulsarSeedFromBuffer(buffer(DM[3])),2450002));
  expect(at(re)).toEqual({index:3,shown:3,cursor:3});
  expect(re).toMatchObject({findMemory:{query:'none',mode:1},dateText:'50002.00000000',updateEnabled:false,find:null,notice:null,boundary:null});
  expect(Object.isFrozen(re)).toBe(true);
 });
});

describe('provenance record',()=>{
 const json=JSON.parse(readFileSync(new URL('../../docs/RADIO-PULSAR-PARAMETERS-PROVENANCE.json',import.meta.url),'utf8'));
 const doc=readFileSync(new URL('../../docs/RADIO-PULSAR-PARAMETERS.md',import.meta.url),'utf8');
 it('lists the 31 dossier files with SHA-256, both resources, PP-01..PP-11 and every web policy documented',()=>{
  expect(json.artifact.sha256).toBe('781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c');
  expect(json.dossier.files).toHaveLength(31);expect(json.dossier.manifest.files).toBe(31);
  expect(json.dossier.files.every((f:{sha256:string})=>/^[0-9a-f]{64}$/.test(f.sha256))).toBe(true);
  expect(new Set(json.dossier.files.map((f:{file:string})=>f.file)).size).toBe(31);
  expect(json.resources.TPLSRDATAFORM1.sha256.startsWith('42e248a8')&&json.resources.TSEARCHINPUT1.sha256.startsWith('c80e48ad')).toBe(true);
  expect(json.contracts.map((c:{id:string})=>c.id)).toEqual(['PP-01','PP-02','PP-03','PP-04','PP-05','PP-06','PP-07','PP-08','PP-09','PP-10','PP-11']);
  for(const policy of json.webPolicies as string[])expect(doc,policy).toContain(`**${policy}`);
  // R-RX6 evidence: the coordinator-verified hashes, each 64 hex digits; the entry listing matches the dossier copy.
  const rx6=json.rx6Evidence.files as {path:string;sha256:string}[];
  expect(rx6).toHaveLength(11);expect(rx6.every(f=>/^[0-9a-f]{64}$/.test(f.sha256))).toBe(true);
  const dossier=new Map((json.dossier.files as {file:string;sha256:string}[]).map(f=>[f.file,f.sha256]));
  for(const f of rx6){const d=dossier.get(f.path.split('/').at(-1)!);if(d!==undefined)expect(f.sha256,f.path).toBe(d);}
  for(const id of ['PP-10','PP-11'])expect(doc).toContain(`| ${id} |`);
  // PulsarList1 availability: the five coordinator-verified hashes and the initial DFM state (initial only, not always hidden).
  const avail=json.pulsarListAvailability,files=avail.files as {path:string;sha256:string}[];
  expect(files.map(f=>f.sha256)).toEqual(['4eba439dc2f55cf60c83f247db6b7a91375a9108784f1d888a740600064b79f8','840c968eab9c1c678e6b3e92496aa878a4d6f69618bf942d13667253775867e6',
   '12b9844378c08a29313254c0e7793a4199fd8bea25db2098e23b24b3a9105418','1d915b45e5589617eb75fa3fe718b8d0172752fbca567d86cb8d97ed283883b0','c3df4c2a3e02fdfe19ba8e874aa0eabe935e87906cbd0bbed263c7aa784629e1']);
  expect(avail.initialDFM).toEqual({parent:'File1',name:'PulsarList1',Caption:'Pulsar &List...',Enabled:false,Visible:false,OnClick:'PulsarList1Click'});
  expect(avail.activation.writes).toHaveLength(2);expect(avail.receiverOpen.write).toContain('Enabled := False');
  // G9 stays listed, partially resolved by R-RX7 (owner and close routing), with the classroom value and delivery still open.
  const g9=(json.gaps as {id:string;text:string}[]).find(g=>g.id==='G9');
  expect(g9?.text).toContain('Partially resolved by R-RX7');expect(g9?.text).toContain('delivered by File ▸ Pulsar List... (R-RX8)');
  expect(g9?.text).toContain('no classroom availability is claimed');
  // R-RX8 evidence: the 21 copies with their quoted SHA-256 (64 hex digits); a copy of an R-RX6 source keeps the R-RX6 hash.
  const rx8=json.rx8Evidence.files as {path:string;source:string;sha256:string}[];
  expect(rx8).toHaveLength(21);expect(new Set(rx8.map(f=>f.path)).size).toBe(21);expect(rx8.every(f=>/^[0-9a-f]{64}$/.test(f.sha256))).toBe(true);
  expect(json.rx8Evidence.manifestSHA256).toBe('37a7ed51605d983ceb9581b62e2b1b58272569d64481c30682af84ca9e787e7d');
  expect(json.rx8Evidence.staticChecksPassed).toBe(67);
  const rx6BySource=new Map(rx6.map(f=>[f.path,f.sha256]));let overlap=0;
  for(const f of rx8){const h=rx6BySource.get(f.source);if(h!==undefined){overlap++;expect(f.sha256,f.source).toBe(h);}}
  expect(overlap).toBeGreaterThanOrEqual(10);
  expect(json.webPolicies).toContain('WEB-PP-LIST-04');expect(doc).toContain('| PP-10 |');
  expect(json.contracts.find((c:{id:string})=>c.id==='PP-10').web.join(' ')).not.toMatch(/pulsarListEntryFor|pulsarParametersOpenRefusal/);
  expect(json.externalCatalog.sha256).toBe('ba94ee94c359e2afd4acce940266d69983d24a93893719cca20d3e23ef3dceaa');
 });
});

describe('isolation',()=>{
 it('never mutates the catalog and returns fresh frozen windows',()=>{
  const snapshot=JSON.stringify(CATALOG);let w=opened();
  for(const step of [nextPulsar,previousPulsar,findNoSeed,confirmPulsarFind,dismissPulsarNotice,(x:PulsarParametersWindow)=>resetPulsarDerived(x,1),
   (x:PulsarParametersWindow)=>movePulsarListCursor(x,CATALOG,2),cancelPulsarFind]){
   const t=step(w);if(t.window){expect(Object.isFrozen(t.window)).toBe(true);w=t.window;}
  }
  expect(JSON.stringify(CATALOG)).toBe(snapshot);expect(w.catalog).toBe(CATALOG);
  expect(()=>openPulsarParameters(null,[],null,null)).toThrow();
 });
 it('imports only the codec types and the existing antenna/recording helpers (no measurement, notebook, session or I/O)',()=>{
  for(const file of ['radioPulsarParameters.ts','radioPulsarReferenceCatalog.ts']){
   const imports=[...readFileSync(new URL(`./${file}`,import.meta.url),'utf8').matchAll(/^import .* from '([^']+)';$/gm)].map(m=>m[1]);
   expect(imports.every(p=>['./radioAntenna','./pulsarRecording','./radioPulsarCatalog'].includes(p)),`${file}: ${imports}`).toBe(true);
  }
 });
});
