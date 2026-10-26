import {describe,expect,it} from 'vitest';
import provenance from '../../docs/RADIO-ANTENNA-PROVENANCE.json';
import {
 INITIAL_RADIO_LAB,NOTICE_BUTTONS,RADIO_COMPILED_OPTIONS,activateRadioLab,answerNotice,cancelRadioHotListSearch,cancelSkyCoords,changeSlewRate,closeRadioHotList,
 editRadioHotListSearch,isRadioLabModal,openRadioHotList,openRadioHotListSearch,openSetCoordinates,radioClockTick,radioLabManualRefusal,selectRadioHotListIndex,
 slewToHotListSelection,submitRadioHotListSearch,toggleTracking,type RadioLabState,type RadioLabTransition,type RadioPointing,
} from './radioAntenna';
import {INITIAL_RADIO_HOT_LIST_SEARCH} from './radioHotListSearch';

// Chosen implementation contract for the list Search transitions (RA-HL-09, WEB-HL-09..11); expected rows hand-derived, not
// a native oracle. Row texts are short synthetic strings: the transitions take any projection texts.
const O=RADIO_COMPILED_OPTIONS;
const ids=new Set([...provenance.contracts,...provenance.hotList.contracts,...provenance.epoch.contracts].map(c=>c.id));
const ok=(t:RadioLabTransition)=>{expect(t.changed).toBe(true);expect(Object.isFrozen(t.state)).toBe(true);for(const step of t.steps)expect(ids.has(step)).toBe(true);return t.state;};
const tracking=():RadioLabState=>ok(toggleTracking(ok(activateRadioLab(INITIAL_RADIO_LAB,O)),O));
const TEXTS=Object.freeze(['Twin end','next pair','Café µ°','Omega last']);
const POINTS:readonly RadioPointing[]=Object.freeze([{ra:1,dec:30},{ra:2,dec:10},{ra:3,dec:-5},{ra:4,dec:20}]);
const shown=(s=tracking())=>ok(openRadioHotList(s,O,TEXTS.length));
const find=(s:RadioLabState,query:string,mode:'top'|'next'='top',matchCase=false,texts:readonly string[]=TEXTS)=>{
 const opened=ok(openRadioHotListSearch(s));
 const edited=opened.hotListSearch.dialog!.query===query&&opened.hotListSearch.dialog!.matchCase===matchCase?opened:ok(editRadioHotListSearch(opened,query,matchCase));
 return submitRadioHotListSearch(edited,mode,texts);
};
/** Keys of the state whose values differ, compared by value (identity is not the point here; a frozen highlight keeps it). */
const changedKeys=(a:RadioLabState,b:RadioLabState)=>(Object.keys(a) as (keyof RadioLabState)[]).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).sort();

describe('opening and editing the Find dialog (Activate 0x492aa4)',()=>{
 it('opens only over the shown list with nothing above it; the draft is the remembered query and case',()=>{
  expect(openRadioHotListSearch(tracking())).toMatchObject({outcome:'hot-list-search-not-open',changed:false});
  const s=shown(),t=openRadioHotListSearch(s);
  expect(t).toMatchObject({outcome:'hot-list-search-opened',steps:['RA-HL-09']});
  expect(t.state.hotListSearch).toEqual({query:'',matchCase:false,dialog:{query:'',matchCase:false},found:null});
  expect(Object.isFrozen(t.state.hotListSearch)&&Object.isFrozen(t.state.hotListSearch.dialog)).toBe(true);
  expect(openRadioHotListSearch(t.state)).toMatchObject({outcome:'modal-open',changed:false});
  const boxed=ok(slewToHotListSelection(s,O,[]));// remembered index 0, empty projection: the no-selection box
  expect(boxed.notice?.kind).toBe('hot-list-no-selection');
  expect(openRadioHotListSearch(boxed)).toMatchObject({outcome:'modal-open',changed:false});
 });
 it('edits keep within 80 characters and never touch the remembered values',()=>{
  const open=ok(openRadioHotListSearch(shown()));
  const e=ok(editRadioHotListSearch(open,'twin',true));
  expect(e.hotListSearch).toMatchObject({query:'',matchCase:false,dialog:{query:'twin',matchCase:true}});
  expect(editRadioHotListSearch(e,'twin',true)).toMatchObject({outcome:'hot-list-search-edited',changed:false});
  expect(editRadioHotListSearch(e,'x'.repeat(81),true)).toMatchObject({outcome:'hot-list-search-too-long',changed:false});
  expect(ok(editRadioHotListSearch(e,'x'.repeat(80),false)).hotListSearch.dialog!.query).toHaveLength(80);
  expect(editRadioHotListSearch(shown(),'a',false).outcome).toBe('hot-list-search-not-open');
  expect(()=>editRadioHotListSearch(e,1 as unknown as string,false)).toThrow(TypeError);
  expect(()=>editRadioHotListSearch(e,'a','yes' as unknown as boolean)).toThrow(TypeError);
 });
 it('the Find dialog is modal over the list: selection, Slew, Close and panel actions are refused',()=>{
  const open=ok(openRadioHotListSearch(shown()));
  expect(isRadioLabModal(open)).toBe(true);
  for(const t of [selectRadioHotListIndex(open,1,4),slewToHotListSelection(open,O,POINTS),closeRadioHotList(open),toggleTracking(open,O),openSetCoordinates(open,O),changeSlewRate(open,O,'up')])
   expect(t).toMatchObject({outcome:'modal-open',changed:false});
  expect(radioLabManualRefusal(open,O,'north')).toBe('modal-open');
 });
});

describe('submitting (Top 0x492b24 / Next 0x492bc0 → Search1Click)',()=>{
 it('HS-13/HS-18: a hit sets only the highlight; the selection, target, pointing and slew stay',()=>{
  const s=shown(),t=find(s,'OMEGA');
  expect(t).toMatchObject({outcome:'hot-list-search-found',steps:['RA-HL-09']});
  expect(t.state.hotListSearch).toEqual({query:'omega',matchCase:false,dialog:null,found:{index:3,text:'Omega last'}});
  expect(t.state.hotListIndex).toBe(0);
  expect(changedKeys(s,t.state)).toEqual(['hotListSearch']);
  expect(Object.isFrozen(t.state.hotListSearch.found)).toBe(true);
 });
 it('HS-07: case-insensitive queries are remembered folded, Match case ones as typed',()=>{
  expect(ok(find(shown(),'TWIN')).hotListSearch).toMatchObject({query:'twin',matchCase:false,found:{index:0}});
  const exact=find(shown(),'TWIN','top',true);
  expect(exact.outcome).toBe('hot-list-search-not-found');expect(exact.state.hotListSearch).toMatchObject({query:'TWIN',matchCase:true,found:null});
  // The next Activate prefills what was remembered.
  expect(ok(openRadioHotListSearch(ok(find(shown(),'TWIN')))).hotListSearch.dialog).toEqual({query:'twin',matchCase:false});
 });
 it('HS-06 cross-row boundary through the transition: separator → successor, inside the current row → current',()=>{
  expect(ok(find(shown(),'end next')).hotListSearch.found).toEqual({index:0,text:'Twin end'});
  expect(ok(find(shown(),' next')).hotListSearch.found).toEqual({index:1,text:'next pair'});
 });
 it('Next continues after the highlight, then after the remembered index; HS-04 after the last row gives the miss box',()=>{
  const first=ok(find(shown(),'e'));// 'twin end' → row 0 ('e' at pos 6)
  expect(first.hotListSearch.found!.index).toBe(0);
  const second=ok(find(first,'e','next'));// start 1: 'next pair café µ°' → row 1
  expect(second.hotListSearch.found!.index).toBe(1);
  const third=ok(find(second,'a','next'));// start 2: 'café µ° omega last' → row 2 ('a' at pos 2)
  expect(third.hotListSearch.found!.index).toBe(2);
  const last=ok(find(third,'last','next'));// start 3 = Count − 1: first pass on the last row (WEB-HL-09)
  expect(last.hotListSearch.found).toEqual({index:3,text:'Omega last'});
  const after=find(last,'last','next');// start 4 = Count: no wrap
  expect(after).toMatchObject({outcome:'hot-list-search-not-found',steps:['RA-HL-09']});
  expect(after.state.notice).toEqual({kind:'hot-list-search-miss',query:'last'});
  expect(after.state.hotListSearch).toMatchObject({query:'last',dialog:null,found:{index:3,text:'Omega last'}});
  expect(after.state.hotListShown).toBe(true);expect(NOTICE_BUTTONS['hot-list-search-miss']).toEqual(['ok']);
  // Without a highlight Next starts after the remembered index (row 2 chosen → start 3).
  const chosen=ok(selectRadioHotListIndex(shown(),2,4));
  expect(ok(find(chosen,'a','next')).hotListSearch.found!.index).toBe(3);// 'omega last'
 });
 it('HS-02/HS-03 the last row as the first pass: a one-row list and Next from the penultimate selection',()=>{
  const one=ok(openRadioHotList(tracking(),O,1));
  expect(ok(find(one,'solo','top',false,['Solo'])).hotListSearch.found).toEqual({index:0,text:'Solo'});
  const penultimate=ok(selectRadioHotListIndex(shown(),2,4));
  expect(ok(find(penultimate,'omega','next')).hotListSearch.found).toEqual({index:3,text:'Omega last'});
 });
 it('HS-01: an empty projection (rows removed while the list was hidden) gives the miss box',()=>{
  const t=find(shown(),'twin','top',false,[]);
  expect(t.outcome).toBe('hot-list-search-not-found');expect(t.state.notice).toEqual({kind:'hot-list-search-miss',query:'twin'});
 });
 it('a miss keeps the highlight and, after OK, the list and the remembered query (no reentrant reset)',()=>{
  const found=ok(find(shown(),'pair'));
  const miss=ok(find(found,'nowhere'));
  expect(miss.hotListSearch.found).toEqual(found.hotListSearch.found);expect(changedKeys(found,miss)).toEqual(['hotListSearch','notice']);
  for(const t of [openRadioHotListSearch(miss),selectRadioHotListIndex(miss,1,4),closeRadioHotList(miss)])expect(t).toMatchObject({outcome:'modal-open',changed:false});
  const back=ok(answerNotice(miss,O,'hot-list-search-miss','ok'));
  expect(back).toMatchObject({hotListShown:true,notice:null});
  expect(back.hotListSearch).toEqual({query:'nowhere',matchCase:false,dialog:null,found:{index:1,text:'next pair'}});
 });
 it('HS-10: an empty submit remembers "" and the check box; Cancel remembers nothing; neither searches',()=>{
  const remembered=ok(find(shown(),'TWIN','top',true));// miss box, query 'TWIN', case true
  const cleared=ok(answerNotice(remembered,O,'hot-list-search-miss','ok'));
  const cancelled=ok(cancelRadioHotListSearch(ok(editRadioHotListSearch(ok(openRadioHotListSearch(cleared)),'zzz',false))));
  expect(cancelled.hotListSearch).toEqual({query:'TWIN',matchCase:true,dialog:null,found:null});
  expect(cancelRadioHotListSearch(cancelled)).toMatchObject({outcome:'hot-list-search-not-open',changed:false});
  const empty=find(cancelled,'','next',false);
  expect(empty).toMatchObject({outcome:'hot-list-search-empty',steps:['RA-HL-09']});
  expect(empty.state.hotListSearch).toEqual({query:'',matchCase:false,dialog:null,found:null});
  expect(empty.state.notice).toBeNull();
 });
 it('refuses a submit without the dialog or with a box over it, and invalid inputs',()=>{
  expect(submitRadioHotListSearch(shown(),'top',TEXTS)).toMatchObject({outcome:'hot-list-search-not-open',changed:false});
  const open=ok(editRadioHotListSearch(ok(openRadioHotListSearch(shown())),'twin',false));
  expect(()=>submitRadioHotListSearch(open,'wrap' as 'top',TEXTS)).toThrow(RangeError);
  expect(()=>submitRadioHotListSearch(open,'top',[1] as unknown as string[])).toThrow(TypeError);
 });
});

describe('highlight versus selection (WEB-HL-11) and the parent lifecycle (WEB-HL-10)',()=>{
 it('HS-16: Slew to Selection after a hit uses the remembered row; after an explicit selection the found row',()=>{
  const hit=ok(find(shown(),'omega'));
  expect(ok(slewToHotListSelection(hit,O,POINTS)).target).toEqual(POINTS[0]);
  const chosen=ok(selectRadioHotListIndex(hit,3,4));
  expect(chosen).toMatchObject({hotListIndex:3});expect(chosen.hotListSearch.found).toBeNull();
  expect(ok(slewToHotListSelection(chosen,O,POINTS)).target).toEqual(POINTS[3]);
 });
 it('HS-14/HS-15: choosing the highlighted row that is already the selection still ends the highlight; invalid indices change nothing',()=>{
  const hit=ok(find(shown(),'twin'));
  expect(hit.hotListSearch.found!.index).toBe(0);expect(hit.hotListIndex).toBe(0);
  const t=selectRadioHotListIndex(hit,0,4);
  expect(t).toMatchObject({outcome:'hot-list-index-selected',changed:true});expect(t.state.hotListSearch.found).toBeNull();
  for(const bad of [-1,4,0.5])expect(selectRadioHotListIndex(hit,bad,4)).toMatchObject({outcome:'hot-list-index-invalid',changed:false});
  expect(selectRadioHotListIndex(t.state,0,4)).toMatchObject({changed:false});
 });
 it('the highlight keeps its identity across non-hit transitions; a repeated hit and a mutable host value get a new frozen one',()=>{
  const hit=ok(find(shown(),'omega')),f=hit.hotListSearch.found!;
  const opened=ok(editRadioHotListSearch(ok(openRadioHotListSearch(hit)),'zzz',false));
  expect(opened.hotListSearch.found).toBe(f);
  expect(ok(cancelRadioHotListSearch(opened)).hotListSearch.found).toBe(f);
  expect(ok(find(hit,'')).hotListSearch.found).toBe(f);
  const miss=ok(find(hit,'nowhere'));
  expect(miss.hotListSearch.found).toBe(f);
  expect(ok(answerNotice(miss,O,'hot-list-search-miss','ok')).hotListSearch.found).toBe(f);
  expect(ok(radioClockTick(hit,O,{utMs:Date.UTC(2000,0,1,12),jd:2451545,lstHours:12})).hotListSearch.found).toBe(f);
  const again=ok(find(hit,'omega')).hotListSearch.found;
  expect(again).toEqual(f);expect(again).not.toBe(f);
  const loose={index:3,text:'Omega last'};
  const host:RadioLabState={...hit,hotListSearch:{...hit.hotListSearch,found:loose}};
  const copied=ok(openRadioHotListSearch(host)).hotListSearch.found;
  expect(copied).toEqual(loose);expect(copied).not.toBe(loose);expect(Object.isFrozen(copied)).toBe(true);
 });
 it('a stale highlight (projection changed) is ignored by Next, which falls back to the remembered index',()=>{
  const hit=ok(find(shown(),'café'));// row 2
  const shorter=['Twin end','next pair','Omega last'];// the Café row was removed while the list was hidden
  const t=ok(find(hit,'a','next',false,shorter));// remembered 0 → start 1: 'next pair omega last' → row 1
  expect(t.hotListSearch.found).toEqual({index:1,text:'next pair'});
 });
 it('HS-17: the search state resets on View/Select and on the coordinate-dialog Cancel re-show only',()=>{
  const hit=ok(find(shown(),'TWIN'));
  const closed=ok(closeRadioHotList(hit));
  expect(closed.hotListSearch).toEqual(hit.hotListSearch);
  const reopened=ok(openRadioHotList(closed,O,4));
  expect(reopened.hotListSearch).toEqual(INITIAL_RADIO_HOT_LIST_SEARCH);
  const selected=ok(slewToHotListSelection(ok(find(reopened,'pair')),O,POINTS));
  expect(selected.hotListSearch.query).toBe('pair');
  const back=cancelSkyCoords(selected);
  expect(back).toMatchObject({outcome:'hot-list-reopened',steps:['RA-07','RA-HL-07']});
  expect(back.state.hotListSearch).toEqual(INITIAL_RADIO_HOT_LIST_SEARCH);
  // The empty-list box path does not show the list and does not reset.
  const empty=ok(openRadioHotList(closed,O,0));
  expect(empty.hotListSearch).toEqual(hit.hotListSearch);
 });
 it('a clock horizon-limit box over the Find dialog keeps the dialog and its draft; OK returns to it',()=>{
  const o={...O,limitsEnabled:true},s=ok(openRadioHotList(tracking(),o,4));
  const open=ok(editRadioHotListSearch(ok(openRadioHotListSearch(s)),'Omega',true));
  const t=radioClockTick(open,o,{utMs:Date.UTC(2000,0,1,12),jd:2451545,lstHours:12});
  expect(t.outcome).toBe('clock-altitude-limit');
  expect(t.state.hotListSearch).toEqual(open.hotListSearch);
  for(const r of [submitRadioHotListSearch(t.state,'top',TEXTS),cancelRadioHotListSearch(t.state),editRadioHotListSearch(t.state,'x',false)])expect(r).toMatchObject({outcome:'modal-open',changed:false});
  const back=ok(answerNotice(t.state,o,'altitude-limit-tracking','ok'));
  expect(back.hotListSearch.dialog).toEqual({query:'Omega',matchCase:true});
  expect(ok(submitRadioHotListSearch(back,'top',TEXTS)).hotListSearch.found).toEqual({index:3,text:'Omega last'});
 });
});

describe('provenance',()=>{
 it('binds RA-HL-09, the eighteen acceptance cases and WEB-HL-09..11 without an equivalence claim',()=>{
  const c=provenance.hotList.contracts.find(x=>x.id==='RA-HL-09') as unknown as {acceptance:{cases:{id:string;basis:string}[]};ranges:string[]};
  expect(c.acceptance.cases.map(x=>x.id)).toEqual(Array.from({length:18},(_,i)=>`HS-${String(i+1).padStart(2,'0')}`));
  expect(c.acceptance.cases.find(x=>x.id==='HS-02')!.basis).toBe('decision required');
  expect(c.ranges.some(r=>r.includes('6a959e3e8d7f43501f5d24892e2d5526a8bf2a6559fdf4c5eab19e625999f62a'))).toBe(true);
  const policies=provenance.hotList.webPolicies.filter(p=>['WEB-HL-09','WEB-HL-10','WEB-HL-11'].includes(p.id)) as unknown as {differsFromNative:string;noEquivalenceClaim:boolean}[];
  expect(policies).toHaveLength(3);
  for(const p of policies){expect(p.noEquivalenceClaim).toBe(true);expect(p.differsFromNative.length).toBeGreaterThan(0);}
 });
});
