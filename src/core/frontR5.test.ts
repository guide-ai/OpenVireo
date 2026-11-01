import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {addHtlRow,newHtlEditor,parseHtl,serializeHtl} from './hotList';
import {OPTICAL_HOT_LIST_SAVE_LITERALS as S,opticalHotListEditEnabled,opticalHotListEditedRowFormat,opticalHotListSaveRecords,opticalHotListRowFormat,opticalHotListRowText,opticalHotListRows,opticalHotListSaveEnabled,opticalHotListSaveOutcome,opticalHotListSavedText} from './opticalHotList';
import {INITIAL_RADIO_ACCESS,applyDemonstrationGate,applyEditModeGate,openPreferences,radioAccessSnapshot,restoredRadioAccessState} from './radioAccessOptions';
import {COMPILED_EDIT_MODE,limitSlewingBox} from './editMode';
import {COMPILED_OPTICAL_OPTIONS,OPTICAL_OPTIONS_CAPTIONS,OPTIONS_RESET_DEFAULTS,OPTIONS_RESET_LITERALS,OPTIONS_RESET_NOT_PORTED} from './opticalOptions';
import {TEACHER_DEFERRED} from './teacherDeferred';

// Front R5 contracts (analysis/front-plans/front-r5.md); addresses are CLEA_VEO.exe 781bc970…c54c, static only.
const hubble=()=>parseHtl(new Uint8Array(readFileSync(new URL('../../public/original/hotlists/Hubble.HTL',import.meta.url))));

describe('R5 hot-list rows follow Edit Mode (fill 0x5905e8, edited row 0x591488)',()=>{
 it('exercise 0 shows the ordinal row outside Edit Mode and the full row in Edit Mode',()=>{
  expect(opticalHotListRowFormat(false)).toBe('ordinal');expect(opticalHotListRowFormat(true)).toBe('full');
  const rows=opticalHotListRows(hubble());
  rows.forEach((r,i)=>{
   const ordinal=opticalHotListRowText(r.record,i+1,opticalHotListRowFormat(false)),full=opticalHotListRowText(r.record,i+1,opticalHotListRowFormat(true));
   expect(ordinal).toBe(opticalHotListRowText(r.record,i+1));
   expect(ordinal.startsWith(String(i+1).padStart(4,' '))).toBe(true);
   expect(full.startsWith(r.record.id.padEnd(24,' '))).toBe(true);
   expect(full.endsWith(r.record.remarks)).toBe(true);
  });
 });
});

describe('R5 review 1 M2: rows and Edit/Delete follow the exercise byte',()=>{
 it('fill: full for exercise 5 or 6 or Edit Mode; edited row: 6 or Edit Mode; Edit/Delete: Edit Mode or exercise 0',()=>{
  for(const code of [0,1,2,3,4,5,6,7]){
   expect(opticalHotListRowFormat(false,code)).toBe(code===5||code===6?'full':'ordinal');expect(opticalHotListRowFormat(true,code)).toBe('full');
   expect(opticalHotListEditedRowFormat(false,code)).toBe(code===6?'full':'ordinal');expect(opticalHotListEditedRowFormat(true,code)).toBe('full');
   expect(opticalHotListEditEnabled(false,code)).toBe(code===0);expect(opticalHotListEditEnabled(true,code)).toBe(true);
  }
 });
});

describe('R5 List › Save (SaveList1Click 0x5919b4)',()=>{
 it('review 1 M1: writes the shown (RA cursor insertion) order: a new low-RA row in RA position, Hubble.HTL rows 7 and 8 swapped',()=>{
  const list=hubble(),rows=opticalHotListRows(list),out=parseHtl(serializeHtl(opticalHotListSaveRecords(rows)));
  expect(out.map(r=>r.id)).toEqual(rows.map(r=>r.record.id));
  expect(rows.map(r=>r.sourceIndex).slice(7,9)).toEqual([8,7]);
  const bytes=new Uint8Array(readFileSync(new URL('../../public/original/hotlists/Hubble.HTL',import.meta.url))),saved=serializeHtl(opticalHotListSaveRecords(rows));
  expect(Buffer.from(saved.subarray(7*86,8*86)).equals(Buffer.from(bytes.subarray(8*86,9*86)))).toBe(true);
  const added=addHtlRow({...newHtlEditor(),list},{id:'LOW',remarks:'',ra:0.01,dec:5}).list;
  expect(added[added.length-1].id).toBe('LOW');
  expect(parseHtl(serializeHtl(opticalHotListSaveRecords(opticalHotListRows(added))))[0].id).toBe('LOW');
 });
 it('is enabled from Edit Mode at each show, by Edit/Delete, kept by Undo and reset from Edit Mode after a save',()=>{
  for(const em of [false,true]){
   let on=opticalHotListSaveEnabled('show',em,true);expect(on).toBe(em);
   on=opticalHotListSaveEnabled('undo',em,on);expect(on).toBe(em);
   on=opticalHotListSaveEnabled('edit',em,on);expect(on).toBe(true);
   expect(opticalHotListSaveEnabled('delete',em,false)).toBe(true);
   on=opticalHotListSaveEnabled('undo',em,on);expect(on).toBe(true);
   expect(opticalHotListSaveEnabled('saved',em,on)).toBe(em);
  }
 });
 it('saves only in Edit Mode, with the recovered literals',()=>{
  expect(opticalHotListSaveOutcome(false)).toBe('edit-mode-required');expect(opticalHotListSaveOutcome(true)).toBe('save');
  expect(S.editModeRequiredCaption).toBe('Edit Mode Required!');
  expect(S.editModeRequiredText).toBe('You must be in Edit Mode to save a new or modified Hot List.\r\nFor information on setting Edit Mode, see the VIREO manual.');
  expect(S.savedCaption).toBe('Observation List File Saved');
  expect(opticalHotListSavedText('Hubble.HTL')).toBe('Observation list saved in Hubble.HTL');
  expect([S.dialogTitle,S.filter,S.item]).toEqual(['Save Hot List File','*.HTL','&Save List']);
 });
 it('writes the list as 86-byte records in file order (Rewrite 0x56 at 0x591b12)',()=>{
  const bytes=new Uint8Array(readFileSync(new URL('../../public/original/hotlists/Hubble.HTL',import.meta.url))),list=parseHtl(bytes);
  const out=serializeHtl(list);
  expect(out.length).toBe(list.length*86);
  expect(parseHtl(out)).toEqual(list);
 });
});

describe('R5 Preferences gate under Edit Mode (0x5887f0, 0x587f70)',()=>{
 it('opens the gate with source edit-mode; it stays open and Preferences then opens',()=>{
  const r=applyEditModeGate(INITIAL_RADIO_ACCESS);
  expect(r.outcome).toBe('gate-opened');expect(r.state.gate).toEqual({open:true,source:'edit-mode'});
  expect(applyEditModeGate(r.state)).toMatchObject({outcome:'gate-already-open',changed:false});
  expect(openPreferences(r.state,null).outcome).toBe('preferences-opened');
  expect(openPreferences(INITIAL_RADIO_ACCESS,null).outcome).toBe('user-options-shown');
 });
 it('keeps a Demonstration gate as it is',()=>{
  const demo=applyDemonstrationGate(INITIAL_RADIO_ACCESS).state;
  expect(applyEditModeGate(demo)).toMatchObject({outcome:'gate-already-open',changed:false});
  expect(demo.gate.source).toBe('demonstration');
 });
 it('is not saved: a file keeps the gate closed, so the format is unchanged',()=>{
  const open=applyEditModeGate(INITIAL_RADIO_ACCESS).state,snap=radioAccessSnapshot(open);
  expect(snap.ok).toBe(true);if(!snap.ok)return;
  expect(snap.snapshot.gate).toEqual({open:false,source:'not-supplied'});
  const plain=radioAccessSnapshot(INITIAL_RADIO_ACCESS);if(!plain.ok)throw new Error('initial snapshot');
  expect(JSON.stringify(snap.snapshot)).toBe(JSON.stringify(plain.snapshot));
  expect(restoredRadioAccessState(snap.snapshot).gate.open).toBe(false);
 });
});

describe('R5 Limit Slewing under Edit Mode (FormActivate 0x5a5985, EditModeBoxClick 0x5a6edc)',()=>{
 it('is disabled and unchecked in Edit Mode, and as stored otherwise',()=>{
  expect(limitSlewingBox(false,false)).toEqual({enabled:true,checked:false});
  expect(limitSlewingBox(false,true)).toEqual({enabled:true,checked:true});
  expect(limitSlewingBox(true,true)).toEqual({enabled:false,checked:false});
  expect(limitSlewingBox(true,false)).toEqual({enabled:false,checked:false});
 });
});

describe('R5 options Reset (ResetBtnClick 0x5a6d24)',()=>{
 it('has the recovered caption, hint and question, and resets to the compiled defaults (0x5a21d0)',()=>{
  expect(OPTIONS_RESET_LITERALS).toEqual({caption:'&Reset',hint:'Restore All Options to Default Values',questionCaption:'Are You Sure?',
   questionText:'Resetting all options to default values\r\nwill remove any changes you have made.\r\n\r\nContinue?'});
  expect(OPTIONS_RESET_DEFAULTS).toEqual({options:COMPILED_OPTICAL_OPTIONS,editMode:COMPILED_EDIT_MODE,virtualObservatory:false});
  expect(COMPILED_OPTICAL_OPTIONS.limitSlewing).toBe(false);
  expect(OPTIONS_RESET_NOT_PORTED).toBe('radio-options-object');
 });
});

describe('R5 deferred teacher options keep a typed reason',()=>{
 it('lists every deferred item once with the teacher-front reason',()=>{
  expect(TEACHER_DEFERRED.map(d=>d.key)).toEqual(['demonstration-mode','test-mode','restrict-scope-access','request-time','detect-sky','set-ebmv','files','scopes','parameters','virtual-observatory-strict','radio-site','radio-options']);
  expect(TEACHER_DEFERRED.every(d=>d.reason==='teacher-front'&&Object.isFrozen(d))).toBe(true);
  for(const caption of ['Demonstration Mode','Test Mode','Restrict Scope Access'])expect(OPTICAL_OPTIONS_CAPTIONS.otherOptions).toContain(caption);
 });
});
