import {describe,expect,it} from 'vitest';
import {COMPILED_RESTRICT_SCOPE_ACCESS,RESTRICT_SCOPE_ACCESS_CAPTIONS,SCOPE_BOX_LITERALS,SCOPE_MENU_CAPTIONS,acceptingRequestsText,answerScopeAward,exerciseRestriction,exerciseScopeAccess,
 initialScopeAccess,requestDeniedText,requestScopeTime,scopeAccessOffered,scopeInstrumentUse,scopeMenuUpdate,scopeRandomFloat,scopeRandomInt,scopeReapplyMs,scopeReapplyTimer,
 scopeTelescopeChanged,scopeUseAllowed,timeAwardedText,type ScopeAccessState,type ScopeProfiles} from './scopeAccess';
import {SCOPE_PROFILES} from './opticalTelescope';
import type {ExerciseCode} from './opticalOptions';

// Front T5 contracts (analysis/front-teacher/t5/RECOVERY.md). CLEA_VEO.exe 781bc970…c54c, static reading only: these tests check
// the port against that reading; they are not an oracle for VIREO.
const P=SCOPE_PROFILES;
/** The RandSeed that makes the next draw return `next` (inverse of low32(s·0x08088405 + 1)). */
function seedBefore(next:number):number{
 const m=1n<<32n,a=0x08088405n;let inv=1n;for(let i=0;i<31;i++)inv=(inv*(2n-a*inv))%m;inv=(inv%m+m)%m;
 return Number((((BigInt(next)-1n+m)%m)*inv)%m);
}
const restricted=(code:ExerciseCode=3)=>exerciseScopeAccess(initialScopeAccess(P),code,true,P);
/** A seed whose first draw grants the scope and whose second gives `offset` (0 = the minimum). */
const grantSeed=(scope:1|2)=>seedBefore(Math.floor(P[scope].availability*0x1_0000_0000)-5);

describe('Front T5: the option and the compiled scope records',()=>{
 it('is on in the compiled defaults (0x5a2b04) with the DFM caption and hint',()=>{
  expect(COMPILED_RESTRICT_SCOPE_ACCESS).toBe(true);
  expect(RESTRICT_SCOPE_ACCESS_CAPTIONS).toMatchObject({box:'Restrict Scope Access',hint:'If unchecked, all telescopes are always available.',record:'+0x27d1',env:'+0x2e85'});
  expect(SCOPE_MENU_CAPTIONS.request).toEqual({1:'Request &1.0 Meter Telescope',2:'Request &4.0 Meter Telescope'});
 });
 it('reads availability 1 / 0.5 / 0.25, uses 12–24 and 8–16, waits 10 and 15 minutes (0x5a3174)',()=>{
  expect(P.map(p=>[p.availability,p.minimumAllocationUses,p.maximumAllocationUses,p.reapplyWaitMinutes])).toEqual([[1,255,255,0],[0.5,12,24,10],[0.25,8,16,15]]);
  expect(P.map(p=>p.name)).toEqual(['0.4m (16") Telescope','KPNO 0.9m (36") Telescope','KPNO 4m (158") Mayall Telescope']);
 });
});

describe('Front T5: the exercise menus and the menu updater 0x589bd8',()=>{
 it('copies the option in Stellar Spectra, Photometry and HR Diagrams, clears it in Object X, Hubble and LSS, and leaves it in Pulsars',()=>{
  for(const option of [true,false]){
   expect([2,3,7].map(c=>exerciseRestriction(c as ExerciseCode,option))).toEqual([option,option,option]);
   expect([1,4,5].map(c=>exerciseRestriction(c as ExerciseCode,option))).toEqual([false,false,false]);
   expect(exerciseRestriction(6,option)).toBeNull();expect(exerciseRestriction(0,option)).toBe(false);// review 1 L1: Access All Instruments 0x58afdd
  }
  expect(()=>exerciseRestriction(8 as ExerciseCode,true)).toThrow(TypeError);
 });
 it('starts unrestricted: every Access on, Request Time off, the 1.0 m counter 1 (0x537bdc) and the 4.0 m counter 0',()=>{
  const s=initialScopeAccess(P);
  expect(s).toMatchObject({restricted:false,access:[true,true,true],requestTime:false,uses:[1,0],waiting:[false,false],pending:null,counted:0,open:[],random:null});
  expect(Object.isFrozen(s)).toBe(true);
 });
 it('restricted: Access 1.0 / 4.0 m only at availability 1.0, Request where Access is off and availability > 0, Request Time if either',()=>{
  for(const code of [2,3,7] as const){const s=restricted(code);expect(s).toMatchObject({restricted:true,access:[true,false,false],request:[true,true],requestTime:true});}
  const custom=[P[0],{...P[1],availability:1},{...P[2],availability:0}] as unknown as ScopeProfiles;
  expect(exerciseScopeAccess(initialScopeAccess(custom),3,true,custom)).toMatchObject({access:[true,true,false],request:[false,false],requestTime:false});
  const tiny=[P[0],{...P[1],availability:1e-9},P[2]] as unknown as ScopeProfiles;
  expect(exerciseScopeAccess(initialScopeAccess(tiny),3,true,tiny)).toMatchObject({access:[true,false,false],request:[true,true]});
 });
 it('the option off, Hubble, LSS and Object X leave all three telescopes open; Pulsars keeps the last restriction',()=>{
  expect(exerciseScopeAccess(initialScopeAccess(P),3,false,P)).toMatchObject({restricted:false,access:[true,true,true],requestTime:false});
  for(const code of [1,4,5] as const)expect(exerciseScopeAccess(restricted(),code,true,P)).toMatchObject({restricted:false,access:[true,true,true],requestTime:false});
  expect(exerciseScopeAccess(restricted(),6,false,P)).toMatchObject({restricted:true,access:[true,false,false]});
  expect(scopeAccessOffered(restricted(),0)).toBe(true);expect(scopeAccessOffered(restricted(),1)).toBe(false);
 });
 it('unrestricted leaves the Request items as they were and turns only the parent off',()=>{
  const r=restricted(),denied=requestScopeTime(r,1,P,seedBefore(0xffff_ffff)).state;expect(denied.request).toEqual([false,true]);
  expect(scopeMenuUpdate({...denied,restricted:false},P)).toMatchObject({request:[false,true],requestTime:false,access:[true,true,true]});
 });
});

describe('Front T5: the request 0x58ba88',()=>{
 it('uses VIREO\'s generator: Random = state·2⁻³², Random(N) = high32(N·state)',()=>{
  expect(scopeRandomFloat(0)).toEqual({state:1,value:1/0x1_0000_0000});
  expect(scopeRandomFloat(1).state).toBe(0x08088406);
  // Review 1 nit: high32 of the 64-bit MUL is exact even for a wrapped range (max < min, reachable only with T8).
  {const st=seedBefore(0xffff_ffff),range=0xffff_fffc;expect(scopeRandomInt(st,range).value).toBe(Number((BigInt(range)*0xffff_ffffn)>>32n));expect(scopeRandomInt(st,range).value).toBe(0xffff_fffb);}
  expect(scopeRandomInt(0,12)).toEqual({state:1,value:0});expect(scopeRandomInt(seedBefore(0xffff_ffff),12).value).toBe(11);
  expect(scopeRandomInt(seedBefore(0x8000_0000),8).value).toBe(4);
  expect(()=>scopeRandomFloat(-1)).toThrow(TypeError);expect(()=>scopeRandomInt(0,-1)).toThrow(TypeError);
 });
 it('grants when the draw is at most the availability Single (equality grants), with min + Random(max − min) uses',()=>{
  const at=requestScopeTime(restricted(),1,P,seedBefore(0x8000_0000));// u = 0.5 exactly
  expect(at.box?.kind).toBe('time-awarded');expect(at.state.random?.draws).toBe(2);
  const above=requestScopeTime(restricted(),1,P,seedBefore(0x8000_0001));expect(above.box?.kind).toBe('request-denied');expect(above.state.random?.draws).toBe(1);
  const quarter=requestScopeTime(restricted(),2,P,seedBefore(0x4000_0000));expect(quarter.box?.kind).toBe('time-awarded');
  expect(requestScopeTime(restricted(),2,P,seedBefore(0x4000_0001)).box?.kind).toBe('request-denied');
  const seen=[new Set<number>(),new Set<number>()];
  for(let k=0;k<4000;k++){const s=(Math.imul(k,0x9e3779b1)>>>0);for(const scope of [1,2] as const){const r=requestScopeTime(restricted(),scope,P,s);if(r.state.pending)seen[scope-1]!.add(r.state.pending.uses);}}
  expect(Math.min(...seen[0]!)).toBe(12);expect(Math.max(...seen[0]!)).toBe(23);expect(Math.min(...seen[1]!)).toBe(8);expect(Math.max(...seen[1]!)).toBe(15);
 });
 it('shows VIREO\'s award box (0x31, OK / Cancel) and commits only on OK: uses written, Access on, Request off',()=>{
  const r=requestScopeTime(restricted(),1,P,0);
  expect(r.box).toEqual({kind:'time-awarded',caption:'Observing Time Awarded',flags:0x31,buttons:'ok-cancel',scope:1,
   text:'Your request for observing time on the\r\nKPNO 0.9m (36") Telescope\r\nhas been granted.\r\n\r\nYou may use the telescope to obtain and record\r\ndata for 12 stars or other objects.'});
  expect(r.state.pending).toEqual({scope:1,uses:12});expect(requestScopeTime(r.state,2,P).refused).toBe('busy');
  const ok=answerScopeAward(r.state,true);expect(ok).toMatchObject({pending:null,uses:[12,0],access:[true,true,false],request:[false,true]});
  expect(scopeAccessOffered(ok,1)).toBe(true);expect(requestScopeTime(ok,1,P).refused).toBe('not-offered');
 });
 it('Cancel commits nothing and keeps the request offered, but the two draws are spent',()=>{
  const r=requestScopeTime(restricted(),1,P,0),c=answerScopeAward(r.state,false);
  expect(c).toMatchObject({pending:null,uses:[1,0],access:[true,false,false],request:[true,true],random:{state:r.state.random!.state,draws:2}});
  const again=requestScopeTime(c,1,P);expect(again.state.random!.draws).toBeGreaterThan(2);
 });
 it('a refusal starts the reapply timer, shows the 0x10 box and disables the item',()=>{
  const r=requestScopeTime(restricted(),2,P,seedBefore(0xf000_0000));
  expect(r.box).toEqual({kind:'request-denied',caption:'Telescope Not Available',flags:0x10,buttons:'ok',scope:2,
   text:'Due to the high demand for time on the\r\nKPNO 4m (158") Mayall Telescope, your\r\nrequest cannot be granted at this time.\r\n\r\nYou may reapply for time on this\r\ntelescope in 15 Minutes.'});
  expect(r.state).toMatchObject({waiting:[false,true],request:[true,false],uses:[1,0],pending:null});
  expect(requestDeniedText('X',1).endsWith('telescope in 1 Minute.')).toBe(true);
 });
 it('needs a seed only for the first draw and refuses an item that is not offered',()=>{
  expect(()=>requestScopeTime(restricted(),1,P)).toThrow(TypeError);
  expect(requestScopeTime(initialScopeAccess(P),1,P,0)).toMatchObject({refused:'not-offered',box:null});
  const first=requestScopeTime(restricted(),2,P,seedBefore(0xf000_0000)).state;
  expect(requestScopeTime(first,1,P,123).state.random!.draws).toBe(2);// the page stream continues; the new seed is ignored
 });
});

describe('Front T5: the reapply timers 0x58c094 / 0x58c1d8',()=>{
 it('wait the byte in minutes on the host clock; Interval 0 never fires',()=>{
  expect(scopeReapplyMs(P[1])).toBe(600000);expect(scopeReapplyMs(P[2])).toBe(900000);expect(scopeReapplyMs(P[0])).toBeNull();
 });
 it('turn the timer off, offer the request again and show the 0x40 box',()=>{
  const denied=requestScopeTime(restricted(),1,P,seedBefore(0xf000_0000)).state,r=scopeReapplyTimer(denied,1,P);
  expect(r.state).toMatchObject({waiting:[false,false],request:[true,true]});
  expect(r.box).toEqual({kind:'accepting-requests',caption:'Accepting Observing Requests',flags:0x40,buttons:'ok',scope:1,text:'You may reapply for time on the\r\nKPNO 0.9m (36") Telescope\r\nwhenever you wish.'});
  expect(scopeReapplyTimer(r.state,1,P).box).toBeNull();
  expect(acceptingRequestsText('KPNO 4m (158") Mayall Telescope')).toBe('You may reapply for time on the\r\nKPNO 4m (158") Mayall Telescope\r\nwhenever you wish.');
 });
});

describe('Front T5: the allotment (RdngBtnClick 0x53cce4 and the four use sites)',()=>{
 const grant=(s:ScopeAccessState,scope:1|2)=>answerScopeAward(requestScopeTime(s,scope,P,s.random?undefined:grantSeed(scope)).state,true);
 it('is not counted when unrestricted or at availability 1.0',()=>{
  for(const t of [0,1,2] as const){const r=scopeInstrumentUse(initialScopeAccess(P),'ccd',t,P);expect(r.outcome).toBe('free');expect(r.state.uses).toEqual([1,0]);}
  const r=scopeInstrumentUse(restricted(),'photometer',0,P);expect(r).toMatchObject({outcome:'free',box:null});expect(r.state.open).toEqual(['photometer']);
 });
 it('refuses Access at a restricted scope whose counter is ≤ 0 ("Telescope No Longer Available!", 0x10)',()=>{
  const r=scopeInstrumentUse(restricted(),'ccd',2,P);
  expect(r.outcome).toBe('access-denied');expect(scopeUseAllowed(r.outcome)).toBe(false);
  expect(r.box).toEqual({kind:'access-denied',caption:'Access Denied',text:'Telescope No Longer Available!',flags:0x10,buttons:'ok',scope:2});
  expect(r.state.open).toEqual([]);
 });
 it('counts n uses after a grant; the next use closes the instrument and Access is then refused',()=>{
  let s=grant(restricted(),2);const n=s.uses[1];expect(n).toBeGreaterThanOrEqual(8);
  for(let k=1;k<=n;k++){const r=scopeInstrumentUse(s,k%2?'ccd':'ir',2,P);expect(r).toMatchObject({outcome:'counted',remaining:n-k,box:null});s=r.state;}
  const last=scopeInstrumentUse(s,'ccd',2,P);
  expect(last).toMatchObject({outcome:'allotment-used',remaining:-1});
  expect(last.box).toEqual({kind:'allotment-used',caption:'CCD Camera Will Close!',text:'You have used your allotment of observations on this telescope!',flags:0x10,buttons:'ok',scope:2});
  expect(last.state.open).toEqual(['ir']);
  expect(scopeInstrumentUse(last.state,'ccd',2,P).outcome).toBe('access-denied');
  expect(scopeInstrumentUse(last.state,'ir',2,P)).toMatchObject({outcome:'allotment-used',remaining:-2});
 });
 it('the 1.0 m starts with one use (0x537bdc), and each instrument names itself when it closes',()=>{
  const one=scopeInstrumentUse(restricted(),'photometer',1,P);expect(one).toMatchObject({outcome:'counted',remaining:0});
  expect(scopeInstrumentUse(one.state,'photometer',1,P).box?.caption).toBe('Photometer Will Close!');
  expect(SCOPE_BOX_LITERALS.willClose).toEqual({photometer:'Photometer Will Close!',spectrometer:'Spectrometer Will Close!',ccd:'CCD Camera Will Close!',ir:'IR Camera Will Close!'});
 });
 it('an Access with no use site checks without counting',()=>{
  const s=grant(restricted(),1),r=scopeInstrumentUse(s,'spectrometer',1,P,false);expect(r).toMatchObject({outcome:'free',remaining:null});expect(r.state.uses).toEqual(s.uses);expect(r.state.counted).toBe(1);
 });
 it('a telescope change closes the instruments; a new exercise menu takes Access away but keeps the counter',()=>{
  const used=scopeInstrumentUse(grant(restricted(),1),'ccd',1,P).state;expect(used.open).toEqual(['ccd']);
  expect(scopeTelescopeChanged(used).open).toEqual([]);const idle=scopeTelescopeChanged(used);expect(scopeTelescopeChanged(idle)).toBe(idle);
  const again=exerciseScopeAccess(used,3,true,P);expect(again).toMatchObject({access:[true,false,false],request:[true,true],uses:used.uses});
 });
 it('review 1 M1: an exercise menu closes the open instruments, so the next use re-runs the check under the new restriction',()=>{
  // Free observatory, 4.0 m in use: the photometer is open and free. Opening E04 must not leave it free.
  const free=scopeInstrumentUse(initialScopeAccess(P),'photometer',2,P);expect(free).toMatchObject({outcome:'free'});expect(free.state.open).toEqual(['photometer']);
  const e04=exerciseScopeAccess(free.state,3,true,P);expect(e04).toMatchObject({open:[],counted:0,restricted:true,restrictedBy:3});
  expect(scopeInstrumentUse(e04,'photometer',2,P).outcome).toBe('access-denied');
  // E04 grant, spectrometer counting; Hubble must not keep counting it.
  let s=grant(restricted(),1);for(let k=0;k<3;k++)s=scopeInstrumentUse(s,'spectrometer',1,P).state;expect(s.counted).toBe(1);
  const hubble=exerciseScopeAccess(s,4,true,P);expect(hubble).toMatchObject({open:[],counted:0,restricted:false,restrictedBy:null});
  const left=hubble.uses[0];for(let k=0;k<40;k++){const r=scopeInstrumentUse(hubble,'spectrometer',1,P);expect(r.outcome).toBe('free');expect(r.state.uses[0]).toBe(left);}
 });
 it('review 1 M2/L2: the restricting guide is kept (Pulsars keeps it), and an Access check runs without counting',()=>{
  expect(restricted(7).restrictedBy).toBe(7);expect(exerciseScopeAccess(restricted(2),6,false,P).restrictedBy).toBe(2);
  expect(exerciseScopeAccess(restricted(3),3,false,P)).toMatchObject({restricted:false,restrictedBy:null});
  const spent=scopeInstrumentUse(scopeInstrumentUse(restricted(),'spectrometer',1,P).state,'spectrometer',1,P).state;// 1 use, then closed
  expect(scopeInstrumentUse(scopeTelescopeChanged(spent),'spectrometer',1,P,false).outcome).toBe('access-denied');
 });
 it('validates its inputs',()=>{
  expect(()=>scopeInstrumentUse(restricted(),'radio' as never,1,P)).toThrow(TypeError);
  expect(()=>scopeInstrumentUse(restricted(),'ccd',3 as never,P)).toThrow(TypeError);
  expect(()=>answerScopeAward(restricted(),1 as never)).toThrow(TypeError);
  expect(answerScopeAward(restricted(),true)).toEqual(restricted());
  expect(()=>initialScopeAccess([P[0],P[1]] as never)).toThrow(TypeError);
  expect(timeAwardedText('KPNO 0.9m (36") Telescope',17).endsWith('data for 17 stars or other objects.')).toBe(true);
 });
});
