import {describe,it,expect} from 'vitest';
import {
 ID_MAX_LENGTH,INITIAL_RADIO_DATE,RADIO_DATE_WEB_LIMITS,SET_DATE_MENU_CAPTION,UNKNOWN_ID,UT_DIALOG_CAPTIONS,cancelRadioDateDialog,confirmRadioDateDialog,dialogEntryInstant,
 dialogPrefill,dismissRadioDateError,editRadioDateField,isDialogLeapYear,markRadioActivationReached,openRadioDateDialog,parseDialogTime,radioDateGate,scanDialogDate,
 type RadioDateGate,type RadioDateGateInput,type RadioDateState,
} from './radioDateDialog';
// RC-12…RC-17 and WEB-DATE-01…04. The date vectors restate the static reading of ScanDate 0x40e3e8 and TryEncodeDate
// 0x40d1b8 (G1: Gregorian tables and leap rule); they are not native runtime observations. Time vectors are the chosen
// browser subset: an 'unsupported' result is a web refusal, never a recovered native parse error.
const T=(y:number,mo:number,d:number,h=0,mi=0,s=0)=>Date.UTC(y,mo-1,d,h,mi,s);
const ok=(date:string,time:string)=>{const r=dialogEntryInstant(date,time);expect(r.status,`${date} ${time}`).toBe('ok');return r.status==='ok'?r.utMs:NaN;};
const failure=(date:string,time:string)=>{const r=dialogEntryInstant(date,time);expect(r.status,`${date} ${time}`).toBe('failed');return r.status==='failed'?r.failure:null;};
const UT=T(2009,6,1,4,5,6)+789;
const AVAILABLE:RadioDateGate={status:'available',utMs:UT};
const OPEN_INPUT:RadioDateGateInput={exerciseEntered:true,antennaActivated:false,panelShown:false,utMs:UT,stoppedAtEnd:false};
const opened=(s:RadioDateState=INITIAL_RADIO_DATE)=>{const t=openRadioDateDialog(s,AVAILABLE);expect(t.outcome).toBe('opened');return t.state;};
const edit=(s:RadioDateState,field:'id'|'date'|'time',text:string)=>{const t=editRadioDateField(s,field,text);expect(t.outcome,`${field}=${text}`).toBe('field-edited');return t.state;};

describe('RC-12/RC-14 literals',()=>{
 it('keeps the DFM captions, the UNKNOWN ShortString and the ID bound',()=>{
  expect(SET_DATE_MENU_CAPTION).toBe('Set Observation &Date/Time, ID...');
  expect(UT_DIALOG_CAPTIONS).toMatchObject({form:'Set Date/Time, ID',id:'ID # of Unknown Object',idSource:'(From Lab Sheet or Instructor)',date:'Observation Date',dateFormat:'YYYY/MM/DD',time:'Universal Time (UTC) ',timeFormat:'HH:MM:SS'});
  expect(UNKNOWN_ID).toBe('UNKNOWN');expect(ID_MAX_LENGTH).toBe(18);
  expect(new Date(RADIO_DATE_WEB_LIMITS.maxUTMS).toISOString()).toBe('2099-12-31T23:59:59.000Z');expect(new Date(RADIO_DATE_WEB_LIMITS.minUTMS).toISOString()).toBe('1900-01-01T00:00:00.000Z');
 });
});

describe('RC-15 ScanDate (YMD, "/"), exact integer port',()=>{
 it('accepts spaces around numbers and separators, leading zeros, one trailing "/" and Gregorian leap days',()=>{
  expect(scanDialogDate('2009/06/01')).toEqual({status:'ok',year:2009,month:6,day:1});
  expect(scanDialogDate(' 2009 / 6 / 1 / ')).toEqual({status:'ok',year:2009,month:6,day:1});
  expect(scanDialogDate('00002009/06/01')).toEqual({status:'ok',year:2009,month:6,day:1});
  expect(scanDialogDate('2000/02/29')).toEqual({status:'ok',year:2000,month:2,day:29});
  expect(scanDialogDate('2008/02/29').status).toBe('ok');
  expect(scanDialogDate('0009/06/01')).toEqual({status:'ok',year:9,month:6,day:1});// natively valid; outside the browser domain below
 });
 it('reports the native errors: syntax, text after the date and TryEncodeDate',()=>{
  for(const [text,reason] of [['2009/06/01//','trailing'],['2009/06/01 x','trailing'],['2009-06-01','syntax'],['2009/06/','syntax'],['','syntax'],['\t2009/06/01','syntax'],
   ['20091/06/01','syntax'],['2009/13/01','calendar'],['1900/02/29','calendar'],['2100/02/29','calendar'],['2009/04/31','calendar'],['2009/00/10','calendar'],['2009/06/00','calendar'],['0000/01/01','calendar'],
   ['2009/06 x','trailing'],['/06/01','syntax'],['2009//01','syntax']] as const)
   expect(scanDialogDate(text),JSON.stringify(text)).toEqual({status:'error',reason});
 });
 it('refuses host-year dates (two numbers, or a year of at most two digits) as unsupported',()=>{
  for(const text of ['09/06/01','06/01','2009/06','9/6/1','2009/06 '])expect(scanDialogDate(text),text).toEqual({status:'unsupported',reason:'host-year'});
 });
 it('uses the Gregorian leap rule of 0x40d17c',()=>{
  expect([1900,2000,2004,2100,2400,2023].map(isDialogLeapYear)).toEqual([false,true,true,false,true,false]);
 });
});

describe('RC-16 time tokens (WEB-DATE-02 whole-number subset)',()=>{
 it('splits hours by ":", minutes by ":", seconds by space; missing parts are 0; PM adds 12 h only for the exact remainder',()=>{
  const cases:[string,number][]=[['12',12*3600],['12:',12*3600],['12::30',12*3600+30*60],['25:00:00',25*3600],['-1',-3600],['12:00:00 PM',24*3600],['1:00:00 PM',13*3600],
   ['12:00:00 pm',12*3600],['12:00:00  PM',12*3600],['12:00:00 junk',12*3600],[' 12 : 30 : 15',12*3600+30*60+15],['04:05:06',4*3600+5*60+6],['+1:-30:90',3600-1800+90],[':12',12*3600]];
  for(const [text,seconds] of cases)expect(parseDialogTime(text),text).toEqual({status:'ok',seconds});
 });
 it('refuses spellings outside the float grammar, non-integer forms and large parts as browser limits',()=>{
  for(const text of ['12:30 PM','12:00:00PM','12: ','','PM','1 2','12:30:15:20'])expect(parseDialogTime(text),text).toEqual({status:'unsupported',reason:'spelling'});
  for(const text of ['1.0','1e1','12:1.5','.5'])expect(parseDialogTime(text),text).toEqual({status:'unsupported',reason:'form'});
  expect(parseDialogTime('1000001')).toEqual({status:'unsupported',reason:'large'});expect(parseDialogTime('0:-1000001')).toEqual({status:'unsupported',reason:'large'});
  expect(parseDialogTime('1000000')).toEqual({status:'ok',seconds:3_600_000_000});
 });
});

describe('dialogEntryInstant: date, then time, then the browser range',()=>{
 it('combines exact integer seconds, also across day boundaries',()=>{
  expect(ok('2009/06/01','04:05:06')).toBe(T(2009,6,1,4,5,6));
  expect(ok('2009/06/01','25:00:00')).toBe(T(2009,6,2,1));
  expect(ok('2009/06/01','-1')).toBe(T(2009,5,31,23));
  expect(ok('1899/12/31','24:00:00')).toBe(T(1900,1,1));
  expect(ok('2099/12/31','23:59:59')).toBe(T(2099,12,31,23,59,59));
  expect(ok('1900/01/01','0:0:0')).toBe(T(1900,1,1));
 });
 it('reports the first failing step and refuses results outside 1900…2099 as unsupported:domain',()=>{
  expect(failure('2009/13/01','x')).toEqual({field:'date',kind:'error',reason:'calendar'});
  expect(failure('09/06/01','1.5')).toEqual({field:'date',kind:'unsupported',reason:'host-year'});
  expect(failure('2009/06/01','1e1')).toEqual({field:'time',kind:'unsupported',reason:'form'});
  expect(failure('2099/12/31','24:00:00')).toEqual({field:'range',kind:'unsupported',reason:'domain'});
  expect(failure('1900/01/01','0:0:-1')).toEqual({field:'range',kind:'unsupported',reason:'domain'});
  expect(failure('0009/06/01','00:00:00')).toEqual({field:'range',kind:'unsupported',reason:'domain'});
  expect(failure('0009/06/01','1000000')).toEqual({field:'range',kind:'unsupported',reason:'domain'});
 });
});

describe('RC-14 prefill (FormatDateTime of the truncated instant)',()=>{
 it('drops the milliseconds without rounding, also before 1970 where Unix milliseconds are negative',()=>{
  expect(dialogPrefill(UT)).toEqual({date:'2009/06/01',time:'04:05:06'});
  expect(dialogPrefill(T(2009,6,1,4,5,6)+999)).toEqual({date:'2009/06/01',time:'04:05:06'});
  expect(dialogPrefill(T(1969,12,31,23,59,59)+500)).toEqual({date:'1969/12/31',time:'23:59:59'});
  expect(T(1969,12,31,23,59,59)+500).toBeLessThan(0);
  expect(dialogPrefill(T(1900,1,1,0,0,0)+999)).toEqual({date:'1900/01/01',time:'00:00:00'});
  expect(dialogPrefill(Date.UTC(2099,11,31,23,59,59,999))).toEqual({date:'2099/12/31',time:'23:59:59'});
  expect(()=>dialogPrefill(NaN)).toThrow();
 });
});

describe('WEB-DATE-01 gate and sticky activation latch',()=>{
 it('names every refusal in priority order',()=>{
  const g=(patch:Partial<RadioDateGateInput>,s=INITIAL_RADIO_DATE)=>radioDateGate(s,{...OPEN_INPUT,...patch});
  expect(g({})).toEqual({status:'available',utMs:UT});
  expect(g({exerciseEntered:false,utMs:null})).toEqual({status:'refused',reason:'exercise-required'});
  expect(g({antennaActivated:true,utMs:null})).toEqual({status:'refused',reason:'activation-reached'});
  expect(g({panelShown:true})).toEqual({status:'refused',reason:'activation-reached'});
  expect(g({utMs:null})).toEqual({status:'refused',reason:'ut-required'});
  expect(g({stoppedAtEnd:true})).toEqual({status:'refused',reason:'ut-domain'});
  expect(g({utMs:Date.UTC(2100,0,1)})).toEqual({status:'refused',reason:'ut-domain'});
  expect(g({utMs:Date.UTC(1899,11,31,23,59,59)})).toEqual({status:'refused',reason:'ut-domain'});
 });
 it('stays refused after the panel was shown and closed while activation was refused (unsupported profile)',()=>{
  const latched=markRadioActivationReached(INITIAL_RADIO_DATE);
  expect(latched).toMatchObject({outcome:'activation-latched',changed:true,state:{activationReached:true}});
  expect(markRadioActivationReached(latched.state)).toMatchObject({outcome:'unchanged',changed:false,state:latched.state});
  // Panel closed again (RC-11) or switched Off, antenna never activated: the latch alone refuses.
  expect(radioDateGate(latched.state,{...OPEN_INPUT,panelShown:false,antennaActivated:false})).toEqual({status:'refused',reason:'activation-reached'});
  expect(openRadioDateDialog(latched.state,radioDateGate(latched.state,OPEN_INPUT))).toMatchObject({outcome:'refused',reason:'activation-reached',changed:false});
 });
});

describe('RC-13/RC-14 dialog lifecycle',()=>{
 it('opens fresh with the scenario prefill and an empty ID; edits are bounded printable ASCII and refused edits keep the text',()=>{
  const s=opened();
  expect(s.dialog).toEqual({id:'',date:'2009/06/01',time:'04:05:06',error:null});
  expect(openRadioDateDialog(s,AVAILABLE)).toMatchObject({outcome:'already-open',changed:false});
  expect(openRadioDateDialog(INITIAL_RADIO_DATE,{status:'refused',reason:'ut-required'})).toMatchObject({outcome:'refused',reason:'ut-required',state:INITIAL_RADIO_DATE});
  const id=edit(s,'id','  A 1  ');expect(id.dialog?.id).toBe('  A 1  ');
  expect(editRadioDateField(id,'id','x'.repeat(19))).toMatchObject({outcome:'field-too-long',changed:false,state:id});
  expect(edit(id,'id','x'.repeat(18)).dialog?.id).toBe('x'.repeat(18));
  for(const field of ['id','date','time'] as const){
   expect(editRadioDateField(id,field,'Ä')).toMatchObject({outcome:'field-not-ascii',changed:false});
   expect(editRadioDateField(id,field,'a\tb')).toMatchObject({outcome:'field-not-ascii',changed:false});
  }
  expect(editRadioDateField(id,'date','1'.repeat(33))).toMatchObject({outcome:'field-too-long',changed:false});
  expect(edit(id,'time','1'.repeat(32)).dialog?.time).toBe('1'.repeat(32));
  expect(editRadioDateField(INITIAL_RADIO_DATE,'id','A')).toMatchObject({outcome:'no-dialog',changed:false});
 });
 it('writes the ID before parsing: after a date error it is kept, the dialog stays open, Cancel keeps it and reopening prefills it',()=>{
  const s=edit(edit(opened(),'id','A1'),'date','2009/13/01');
  const failed=confirmRadioDateDialog(s,AVAILABLE);
  expect(failed).toMatchObject({outcome:'entry-failed',state:{storedId:'A1',dialog:{id:'A1',error:{field:'date',kind:'error',reason:'calendar'}}}});
  expect(failed.utMs).toBeUndefined();
  // The error box is answered first: no second OK, no Cancel, no edits behind it.
  expect(confirmRadioDateDialog(failed.state,AVAILABLE)).toMatchObject({outcome:'error-open',changed:false});
  expect(cancelRadioDateDialog(failed.state)).toMatchObject({outcome:'error-open',changed:false});
  expect(editRadioDateField(failed.state,'date','2009/06/01')).toMatchObject({outcome:'error-open',changed:false});
  const dismissed=dismissRadioDateError(failed.state);expect(dismissed).toMatchObject({outcome:'error-dismissed',state:{dialog:{error:null,date:'2009/13/01'}}});
  expect(dismissRadioDateError(dismissed.state)).toMatchObject({outcome:'unchanged',changed:false});
  const cancelled=cancelRadioDateDialog(dismissed.state);expect(cancelled).toMatchObject({outcome:'cancelled',state:{storedId:'A1',dialog:null}});
  expect(opened(cancelled.state).dialog).toEqual({id:'A1',date:'2009/06/01',time:'04:05:06',error:null});
 });
 it('Cancel without OK leaves the stored ID unchanged',()=>{
  const cancelled=cancelRadioDateDialog(edit(opened(),'id','B2'));
  expect(cancelled.state).toEqual({storedId:'',activationReached:false,dialog:null});
  expect(cancelRadioDateDialog(cancelled.state)).toMatchObject({outcome:'no-dialog',changed:false});
 });
 it('success with an empty ID stores UNKNOWN, closes and returns the whole-second instant; spaces are kept as typed',()=>{
  const done=confirmRadioDateDialog(edit(opened(),'time','12:00:00 PM'),AVAILABLE);
  expect(done).toMatchObject({outcome:'applied',utMs:T(2009,6,2),state:{storedId:UNKNOWN_ID,dialog:null}});
  expect(confirmRadioDateDialog(edit(opened(),'id',' '),AVAILABLE).state.storedId).toBe(' ');
  // Reopening shows the written UNKNOWN (the ShortString), not an empty field.
  expect(opened(done.state).dialog?.id).toBe(UNKNOWN_ID);
 });
 it('unsupported inputs write the ID and keep the dialog open with a browser-limit failure',()=>{
  for(const [date,time,f] of [['09/06/01','00:00:00',{field:'date',kind:'unsupported',reason:'host-year'}],['2009/06/01','1e1',{field:'time',kind:'unsupported',reason:'form'}],
   ['2009/06/01','12:30 PM',{field:'time',kind:'unsupported',reason:'spelling'}],['2009/06/01','1000001',{field:'time',kind:'unsupported',reason:'large'}],
   ['0009/06/01','00:00:00',{field:'range',kind:'unsupported',reason:'domain'}]] as const){
   const t=confirmRadioDateDialog(edit(edit(edit(opened(),'id','C'),'date',date),'time',time),AVAILABLE);
   expect(t,`${date} ${time}`).toMatchObject({outcome:'entry-failed',state:{storedId:'C',dialog:{error:f}}});
  }
 });
 it('a gate refused at OK writes nothing and closes; confirm without a dialog does nothing',()=>{
  const t=confirmRadioDateDialog(edit(opened(),'id','D'),{status:'refused',reason:'ut-domain'});
  expect(t).toMatchObject({outcome:'gate-closed',reason:'ut-domain',state:{storedId:'',dialog:null}});
  expect(confirmRadioDateDialog(INITIAL_RADIO_DATE,AVAILABLE)).toMatchObject({outcome:'no-dialog',changed:false});
 });
});
