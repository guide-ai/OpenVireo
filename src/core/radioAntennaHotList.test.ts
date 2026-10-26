import {describe,expect,it} from 'vitest';
import provenance from '../../docs/RADIO-ANTENNA-PROVENANCE.json';
import {
 INITIAL_RADIO_LAB,NOTICE_BUTTONS,RADIO_COMPILED_OPTIONS,RADIO_HOT_LIST_FORM_CAPTIONS,RADIO_HOT_LIST_LITERALS,RADIO_LAB_CAPTIONS,activateRadioLab,answerNotice,cancelSkyCoords,changeSlewRate,closeRadioHotList,confirmSkyCoords,editSkyCoordsField,
 isRadioLabModal,openRadioHotList,openSetCoordinates,pressManualSlew,radioClockTick,radioLabManualRefusal,selectRadioHotListIndex,selectSkyCoordsEpoch,skyCoordsFieldsFor,
 slewToHotListSelection,toggleTracking,type RadioLabOptions,type RadioLabState,type RadioLabTransition,type RadioPointing,
} from './radioAntenna';
import {precessSkyCoords} from './radioEpoch';

// Chosen implementation contract for Slew ▸ Hot List ▸ View/Select (RA-HL-05..07, WEB-HL-02/03); not a native oracle.
const O=RADIO_COMPILED_OPTIONS,UNSUPPORTED:RadioLabOptions={...O,rateBase:0};
const ids=new Set([...provenance.contracts,...provenance.hotList.contracts,...provenance.epoch.contracts].map(c=>c.id));
const ok=(t:RadioLabTransition)=>{expect(t.changed).toBe(true);expect(Object.isFrozen(t.state)).toBe(true);for(const step of t.steps)expect(ids.has(step)).toBe(true);return t.state;};
const tracking=():RadioLabState=>ok(toggleTracking(ok(activateRadioLab(INITIAL_RADIO_LAB,O)),O));
const ROWS:readonly RadioPointing[]=Object.freeze([{ra:5.5,dec:-12.25},{ra:-0,dec:-0},{ra:23.999,dec:89.5}]);
const shown=(s=tracking())=>ok(openRadioHotList(s,O,ROWS.length));

describe('opening the hot list (PListSelectClick 0x567b28)',()=>{
 it('refuses before activation, while modal, with the Slew menu disabled, during a programmed slew or under unsupported options',()=>{
  expect(openRadioHotList(INITIAL_RADIO_LAB,O,3)).toMatchObject({outcome:'not-activated',changed:false});
  const off=ok(activateRadioLab(INITIAL_RADIO_LAB,O));
  expect(openRadioHotList(off,O,3)).toMatchObject({outcome:'menu-disabled',changed:false});
  const held=ok(pressManualSlew(tracking(),O,'north'));expect(held.slewMenuEnabled).toBe(false);
  expect(openRadioHotList(held,O,3)).toMatchObject({outcome:'menu-disabled',changed:false});
  const dialog=ok(openSetCoordinates(tracking(),O));
  expect(openRadioHotList(dialog,O,3)).toMatchObject({outcome:'modal-open',changed:false});
  const confirm=ok(confirmSkyCoords(ok(editSkyCoordsField(dialog,'raHours','6')),O));expect(confirm.notice?.kind).toBe('confirm-slew');
  const slewing=ok(answerNotice(confirm,O,'confirm-slew','yes'));expect(slewing.slewing).toBe(true);
  const refused=openRadioHotList(slewing,O,3);expect(refused).toMatchObject({outcome:'hot-list-slewing',changed:false});expect(refused.state).toBe(slewing);
  const paused=ok(openSetCoordinates(slewing,O));expect(paused.notice?.kind).toBe('stop-slew');
  const resumed=ok(answerNotice(paused,O,'stop-slew','no'));expect(openRadioHotList(resumed,O,3).outcome).toBe('hot-list-slewing');
  expect(openRadioHotList(tracking(),UNSUPPORTED,3)).toMatchObject({outcome:'options-unsupported',changed:false});
  expect(()=>openRadioHotList(tracking(),O,-1)).toThrow();expect(()=>openRadioHotList(tracking(),O,1.5)).toThrow();
 });
 it('an empty list gives the decoded 0x40 box only; OK closes it',()=>{
  const s=tracking(),t=openRadioHotList(s,O,0);
  expect(t).toMatchObject({outcome:'hot-list-empty',steps:['RA-HL-06']});
  expect(t.state.notice).toEqual({kind:'hot-list-empty'});expect(t.state.hotListShown).toBe(false);expect(NOTICE_BUTTONS['hot-list-empty']).toEqual(['ok']);
  const closed=ok(answerNotice(t.state,O,'hot-list-empty','ok'));
  expect(closed).toEqual({...s,notice:null});expect(isRadioLabModal(closed)).toBe(false);
 });
 it('shows the list modally: every other action is refused, timers still apply',()=>{
  const s=shown();
  expect(s.hotListShown).toBe(true);expect(s.hotListIndex).toBe(0);expect(isRadioLabModal(s)).toBe(true);
  for(const t of [toggleTracking(s,O),openSetCoordinates(s,O),changeSlewRate(s,O,'up'),openRadioHotList(s,O,3)])expect(t).toMatchObject({outcome:'modal-open',changed:false});
  expect(radioLabManualRefusal(s,O,'north')).toBe('modal-open');
  expect(cancelSkyCoords(s).outcome).toBe('dialog-closed');
 });
});

describe('selection, the coordinate dialog and Cancel back to the list',()=>{
 it('writes the remembered index only for an existing row and only without a box',()=>{
  const s=shown();
  expect(selectRadioHotListIndex(tracking(),1,3).outcome).toBe('hot-list-not-open');
  for(const bad of [-1,3,1.5,Number.NaN])expect(selectRadioHotListIndex(s,bad,3)).toMatchObject({outcome:'hot-list-index-invalid',changed:false});
  expect(selectRadioHotListIndex(s,0,3)).toMatchObject({outcome:'hot-list-index-selected',changed:false});
  expect(ok(selectRadioHotListIndex(s,2,3)).hotListIndex).toBe(2);
 });
 it('stores the row exactly (−0 kept) before opening the J2000 dialog seeded from it',()=>{
  const s=ok(selectRadioHotListIndex(shown(),1,3)),t=slewToHotListSelection(s,O,ROWS);
  expect(t).toMatchObject({outcome:'hot-list-selected',steps:['RA-HL-05','RA-HL-07','RA-08']});
  expect(Object.is(t.state.target.ra,-0)&&Object.is(t.state.target.dec,-0)).toBe(true);
  // 0x567bb1 +0x3c5 := 0 (J2000); 0x567bc5..0x567bc9 EpochGrp vmt+0x68 with EDX = 0: the epoch group is disabled.
  expect(t.state.dialog).toEqual({fields:skyCoordsFieldsFor(ROWS[1]),epochIndex:0,epochEnabled:false,origin:'hot-list'});
  expect(t.state.hotListShown).toBe(false);expect(t.state.hotListIndex).toBe(1);
  const third=ok(slewToHotListSelection(ok(selectRadioHotListIndex(shown(),2,3)),O,ROWS));expect(third.target).toEqual({ra:23.999,dec:89.5});
 });
 it('the hot-list dialog keeps J2000 with the epoch choice disabled through an error box and Cancel/reselect',()=>{
  const chosen=ok(slewToHotListSelection(shown(),O,ROWS));
  const b=selectSkyCoordsEpoch(chosen,1);
  expect(b).toMatchObject({outcome:'epoch-disabled',changed:false});expect(b.state).toBe(chosen);
  expect(selectSkyCoordsEpoch(chosen,0)).toMatchObject({outcome:'epoch-disabled',changed:false});
  const invalid=ok(confirmSkyCoords(ok(editSkyCoordsField(chosen,'raHours','x')),O));expect(invalid.notice?.kind).toBe('ra-invalid');
  const back=ok(answerNotice(invalid,O,'ra-invalid','ok'));
  expect(back.dialog).toMatchObject({epochIndex:0,epochEnabled:false,origin:'hot-list'});
  expect(selectSkyCoordsEpoch(back,1)).toMatchObject({outcome:'epoch-disabled',changed:false});
  const reselected=ok(slewToHotListSelection(ok(cancelSkyCoords(chosen)),O,ROWS));
  expect(reselected.dialog).toMatchObject({epochIndex:0,epochEnabled:false,origin:'hot-list'});
  // RA-07 0x566b64..0x566b68 (DL = 1) still enables the same group on the ordinary path.
  const declined=ok(answerNotice(ok(confirmSkyCoords(reselected,O)),O,'confirm-slew','no'));
  const plain=ok(openSetCoordinates(declined,O));
  expect(plain.dialog).toMatchObject({epochIndex:0,epochEnabled:true});expect(plain.dialog!.origin).toBeUndefined();
 });
 it('keeps the index chosen by ListBox1MouseUp 0x59208f / KeyUp 0x592114 (+0x588) across Close and reopen',()=>{
  const chosen=ok(selectRadioHotListIndex(shown(),2,3));
  const closed=ok(closeRadioHotList(chosen));expect(closed.hotListShown).toBe(false);expect(closed.hotListIndex).toBe(2);
  const reopened=ok(openRadioHotList(closed,O,3));
  expect(reopened).toEqual({...chosen,hotListShown:true});expect(reopened.target).toEqual(chosen.target);
  expect(ok(slewToHotListSelection(reopened,O,ROWS)).target).toEqual(ROWS[2]);
 });
 it('checks the options profile before writing the stored coordinates',()=>{
  const s=shown(),t=slewToHotListSelection(s,UNSUPPORTED,ROWS);
  expect(t).toMatchObject({outcome:'options-unsupported',changed:false});expect(t.state).toBe(s);
  expect(closeRadioHotList(s).outcome).toBe('hot-list-closed');
 });
 it('an index outside a shorter list gives the 0x30 box over the list and is never repaired',()=>{
  const s=ok(selectRadioHotListIndex(shown(),2,3)),short=ROWS.slice(0,2),t=slewToHotListSelection(s,O,short);
  expect(t.outcome).toBe('hot-list-no-selection');expect(t.state.notice).toEqual({kind:'hot-list-no-selection'});
  expect(t.state.hotListShown).toBe(true);expect(t.state.target).toEqual(s.target);
  for(const r of [selectRadioHotListIndex(t.state,0,2),slewToHotListSelection(t.state,O,short),closeRadioHotList(t.state)])expect(r).toMatchObject({outcome:'modal-open',changed:false});
  const back=ok(answerNotice(t.state,O,'hot-list-no-selection','ok'));
  expect(back.hotListShown).toBe(true);expect(back.hotListIndex).toBe(2);expect(back.notice).toBeNull();
  expect(slewToHotListSelection(back,O,[]).outcome).toBe('hot-list-no-selection');
  expect(()=>slewToHotListSelection(shown(),O,[{ra:24,dec:0}])).toThrow();
 });
 it('Cancel reopens the list keeping the stored coordinates and index; Set Coordinates Cancel is unchanged',()=>{
  const chosen=ok(slewToHotListSelection(ok(selectRadioHotListIndex(shown(),2,3)),O,ROWS));
  const t=cancelSkyCoords(chosen);
  expect(t).toMatchObject({outcome:'hot-list-reopened',steps:['RA-07','RA-HL-07']});
  expect(t.state).toEqual({...chosen,dialog:null,hotListShown:true});
  const again=ok(slewToHotListSelection(t.state,O,ROWS));expect(again).toEqual(chosen);
  const plain=ok(openSetCoordinates(tracking(),O));expect(plain.dialog!.origin).toBeUndefined();
  const cancelled=cancelSkyCoords(plain);expect(cancelled.outcome).toBe('dialog-cancelled');expect(cancelled.state.hotListShown).toBe(false);
 });
 it('a row whose display carries to 24h stores the exact imported RA through selection and Cancel (RA-HL-08, WEB-HL-07)',()=>{
  const CARRY:readonly RadioPointing[]=[{ra:24-2**-20,dec:-0.125}];
  const t=slewToHotListSelection(ok(openRadioHotList(tracking(),O,1)),O,CARRY);
  expect(t.outcome).toBe('hot-list-selected');
  expect(Object.is(t.state.target.ra,24-2**-20)).toBe(true);expect(t.state.target.ra).toBeLessThan(24);expect(t.state.target.dec).toBe(-0.125);
  // The dialog re-splits the same Number and shows the 24h carry; the stored target keeps the exact value.
  expect(t.state.dialog!.fields).toEqual({raHours:'24',raMinutes:'0',raSeconds:'0.00',decDegrees:'0',decMinutes:'7',decSeconds:'30.0'});
  const back=cancelSkyCoords(t.state);
  expect(back.outcome).toBe('hot-list-reopened');
  expect(Object.is(back.state.target.ra,24-2**-20)).toBe(true);expect(back.state.target.dec).toBe(-0.125);
  expect(back.state).toMatchObject({hotListShown:true,hotListIndex:0,dialog:null});
 });
 it('OK continues exactly as the Set Coordinates path; the error box keeps the origin and only Set Coordinates offers B1950 (converted)',()=>{
  const chosen=ok(slewToHotListSelection(shown(),O,ROWS)),viaSet=ok(openSetCoordinates({...chosen,dialog:null},O));
  // Same fields and J2000 index; the flags differ: no origin and the epoch group enabled on the Set Coordinates path.
  expect(viaSet.dialog).toEqual({...chosen.dialog,origin:undefined,epochEnabled:true});
  const a=confirmSkyCoords(chosen,O),b=confirmSkyCoords(viaSet,O);
  expect(a.outcome).toBe('slew-confirm-requested');expect(a.state).toEqual(b.state);expect(a.state.hotListShown).toBe(false);
  const yes=ok(answerNotice(a.state,O,'confirm-slew','yes'));expect(yes.slewing).toBe(true);expect(yes.target).toEqual(ROWS[0]);
  const invalid=ok(confirmSkyCoords(ok(editSkyCoordsField(chosen,'raHours','x')),O));
  expect(invalid.notice?.kind).toBe('ra-invalid');expect(invalid.dialog!.origin).toBe('hot-list');
  const afterBox=ok(answerNotice(invalid,O,'ra-invalid','ok'));expect(afterBox.dialog!.origin).toBe('hot-list');
  expect(cancelSkyCoords(afterBox).state.hotListShown).toBe(true);
  expect(selectSkyCoordsEpoch(chosen,1)).toMatchObject({outcome:'epoch-disabled',changed:false});
  const b1950=ok(confirmSkyCoords(ok(selectSkyCoordsEpoch(viaSet,1)),O)),converted=precessSkyCoords('B1950->J2000',ROWS[0]);
  expect(b1950.notice).toMatchObject({kind:'confirm-slew',b1950:{southPoleSignLost:false}});expect(b1950.dialog).toBeNull();
  expect(b1950.target).toEqual({ra:converted.ra,dec:converted.dec});expect(b1950.skyCoordsB1950).toBe(true);
 });
 it('a hot-list selection resets an ordinary B1950 choice (0x567bb1): J2000 fixed and disabled, no conversion; Close keeps it',()=>{
  const viaSet=ok(openSetCoordinates(tracking(),O));
  const remembered=ok(answerNotice(ok(confirmSkyCoords(ok(selectSkyCoordsEpoch(viaSet,1)),O)),O,'confirm-slew','no'));
  expect(remembered.skyCoordsB1950).toBe(true);
  // Close without a selection writes nothing: the flag stays.
  const closed=ok(closeRadioHotList(ok(openRadioHotList(remembered,O,3))));expect(closed).toMatchObject({skyCoordsB1950:true,target:remembered.target});
  const picked=ok(selectRadioHotListIndex(ok(openRadioHotList(closed,O,3)),2,3));
  const chosen=ok(slewToHotListSelection(picked,O,ROWS));
  expect(chosen).toMatchObject({skyCoordsB1950:false,targetHoldsB1950:false,target:ROWS[2],hotListIndex:2});
  expect(chosen.dialog).toEqual({fields:skyCoordsFieldsFor(ROWS[2]),epochIndex:0,epochEnabled:false,origin:'hot-list'});
  expect(selectSkyCoordsEpoch(chosen,1)).toMatchObject({outcome:'epoch-disabled',changed:false});
  // Cancel back to the list and reselect: still J2000, nothing converted.
  const again=ok(slewToHotListSelection(ok(cancelSkyCoords(chosen)),O,ROWS));expect(again).toEqual(chosen);
  const confirmed=ok(confirmSkyCoords(chosen,O));
  expect(confirmed.notice).toEqual({kind:'confirm-slew',target:ROWS[2],transit:false,hourAngle:null});expect(confirmed.skyCoordsB1950).toBe(false);
  // Set Coordinates afterwards: enabled J2000, no conversion.
  const plain=openSetCoordinates(ok(answerNotice(confirmed,O,'confirm-slew','no')),O);
  expect(plain.steps).toEqual(['RA-07','RA-08']);expect(plain.state.dialog).toMatchObject({epochIndex:0,epochEnabled:true});expect(plain.state.target).toEqual(ROWS[2]);
 });
 it('a selection after a reopen that lost a southern sign drops the web reopen-pole mark (WEB-EP-03)',()=>{
  const entry=ok(editSkyCoordsField(ok(editSkyCoordsField(ok(editSkyCoordsField(ok(openSetCoordinates(tracking(),O)),'raHours','12')),'decDegrees','-89')),'decMinutes','24'));
  const declined=ok(answerNotice(ok(confirmSkyCoords(ok(selectSkyCoordsEpoch(entry,1)),O)),O,'confirm-slew','no'));
  const reopened=ok(openSetCoordinates(declined,O));expect(reopened.dialog?.openSouthPoleSignLost).toBe(true);
  const chosen=ok(slewToHotListSelection(ok(openRadioHotList(ok(cancelSkyCoords(reopened)),O,3)),O,ROWS));
  expect(chosen.dialog).toEqual({fields:skyCoordsFieldsFor(ROWS[0]),epochIndex:0,epochEnabled:false,origin:'hot-list'});
  expect(chosen).toMatchObject({skyCoordsB1950:false,targetHoldsB1950:false});
 });
 it('a clock altitude box over the list returns to the list when answered',()=>{
  const o={...O,limitsEnabled:true},s=ok(openRadioHotList(tracking(),o,3));
  const t=radioClockTick(s,o,{utMs:Date.UTC(2000,0,1,12),jd:2451545,lstHours:12});
  expect(t.outcome).toBe('clock-altitude-limit');expect(t.state.notice?.kind).toBe('altitude-limit-tracking');expect(t.state.hotListShown).toBe(true);
  const back=ok(answerNotice(t.state,o,'altitude-limit-tracking','ok'));
  expect(back.hotListShown).toBe(true);expect(back.notice).toBeNull();expect(back.tracking).toBe(false);
  expect(closeRadioHotList(back).outcome).toBe('hot-list-closed');
 });
 it('binds the hot-list contracts, evidence records and decoded literals in the provenance file',()=>{
  expect(provenance.hotList.contracts.map(c=>c.id)).toEqual(Array.from({length:9},(_,i)=>`RA-HL-${String(i+1).padStart(2,'0')}`));
  expect(provenance.hotList.webPolicies.map(p=>p.id)).toEqual(Array.from({length:11},(_,i)=>`WEB-HL-${String(i+1).padStart(2,'0')}`));
  const captions=provenance.hotList.formCaptions;
  expect(captions.dfmSliceSHA256).toBe('55e515a9b10153cd5e9f906fd3cf8633491337a07af9faa87348f8fd8b7d66cf');
  expect(captions.derivedDFMSHA256).toBe('7b382c1bd51bec4db4c501569667d9b6ff6600d69383b26c950ea1e5322352db');
  expect(captions.items.map(c=>c.text)).toEqual([RADIO_HOT_LIST_FORM_CAPTIONS.form,RADIO_HOT_LIST_FORM_CAPTIONS.slew,RADIO_HOT_LIST_FORM_CAPTIONS.close]);
  expect(provenance.hotList.rea.resourceInventory.evidenceId).toBe('ev_cf8d975fac29b7995f8c12914c7aa9860bcf0d9845be479281659a03048c5028');
  expect(provenance.hotList.rea.fileHeaders.evidenceId).toBe('ev_7dc6bf019bb51fb9459330ede891894f63461ca615942d0b0ea347d926407a39');
  expect(provenance.hotList.literals.items.map(l=>l.text)).toEqual([RADIO_HOT_LIST_LITERALS.emptyCaption,RADIO_HOT_LIST_LITERALS.emptyText]);
  expect(RADIO_LAB_CAPTIONS).toMatchObject({hotList:'"&Hot List"',viewSelect:'&View/Select from List...',addCurrent:'&Add Current Item to List...',loadHotList:'&Load Hot List...'});
 });
 it('Close always ends View/Select (WEB-HL-02) without touching the stored coordinates',()=>{
  const s=shown(),t=closeRadioHotList(s);
  expect(t.state).toEqual({...s,hotListShown:false});expect(closeRadioHotList(t.state).outcome).toBe('hot-list-not-open');
 });
 it('Close after a coordinate-dialog Cancel also exits (WEB-HL-02, the known BL = 0 pass) and keeps the selection',()=>{
  const chosen=ok(slewToHotListSelection(ok(selectRadioHotListIndex(shown(),2,3)),O,ROWS));
  const reopened=cancelSkyCoords(chosen);expect(reopened.outcome).toBe('hot-list-reopened');
  const t=closeRadioHotList(reopened.state);
  expect(t).toMatchObject({outcome:'hot-list-closed',changed:true});
  expect(t.state.hotListShown).toBe(false);expect(t.state.dialog).toBeNull();expect(isRadioLabModal(t.state)).toBe(false);
  expect(t.state.target).toEqual(ROWS[2]);expect(t.state.hotListIndex).toBe(2);expect(t.state.slewing).toBe(false);
 });
});
