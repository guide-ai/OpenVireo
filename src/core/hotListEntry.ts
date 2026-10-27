/** Slew ▸ Observation Hot List ▸ Add Current Item/Position to List (OB-AC, docs/OPTICAL-OBSERVATORY-PROVENANCE.json).
 * CLEA_VEO.exe 781bc970…c54c, static listings only. 0x53f0fc prefills an 86-byte record (ID := the object under the
 * pointing or empty; remarks := its kind when no exercise is loaded; RA/Dec := current pointing) and shows THOVerifyDlg
 * ("Add/Edit Hot List Entry"). FormActivate 0x4f8740 (OB-AC-02) splits RA/Dec into the six edits; OKBtnClick 0x4f8898
 * (OB-AC-03) parses them; 0x590588 (OB-AC-04) appends the record and a box confirms it.
 * Web policy: StrToFloat is the radio grammar parseDelphiFloat (finite binary64, '.' decimal separator); the split uses the
 * ported sibling 0x486bc0 (splitSexagesimal) because 0x486b20's seconds rounding/carry is not re-derived; RA exactly 24 h
 * (natively accepted) is refused because the HTL codec stores 0 ≤ RA < 24. Pure: no React or I/O. */
import type {HtlFields} from './hotList';
import {formatFixed,parseDelphiFloat,splitSexagesimal} from './radioAntenna';
import type {Pointing} from './sky';

export const HOT_LIST_ENTRY_CAPTIONS=Object.freeze({
 form:'Add/Edit Hot List Entry',id:'Object ID:',remarks:'Comments/Notes',raGroup:'Right Ascension',decGroup:'Declination',
 hours:'Hours',minutes:'Minutes',seconds:'Seconds',degrees:'Degs',
 hints:Object.freeze({id:'(12 Chars. Max)',remarks:'(40 Chars. Max)',raHours:'0-23',raMinutes:'0-59',raSeconds:'0.0-59.99',decDegrees:'+89 - -89',decMinutes:'0-59',decSeconds:'0.0-59.99'}),
 maxLength:Object.freeze({id:16,remarks:40,raHours:2,raMinutes:2,raSeconds:5,decDegrees:3,decMinutes:2,decSeconds:5}),
 raError:'Right Ascension is Invalid!',decError:'Declination is Invalid!',
 addedCaption:'Observation List',addedHead:'Object ',addedTail:' added to Observation List.',positionAdded:'Position added to Observation List.',
 menu:'&Add Current Item/Position to List...',kinds:Object.freeze(['Star','Galaxy','Asteroid','QSO']as const),
});
export type HotListEntryField='id'|'remarks'|'raHours'|'raMinutes'|'raSeconds'|'decDegrees'|'decMinutes'|'decSeconds';
export type HotListEntryDraft=Readonly<Record<HotListEntryField,string>>;
export const HOT_LIST_ENTRY_FIELDS:readonly HotListEntryField[]=Object.freeze(['id','remarks','raHours','raMinutes','raSeconds','decDegrees','decMinutes','decSeconds']);

/** OB-AC-02: IntToStr hours/minutes, ffFixed 2 seconds; Dec IntToStr(sign × degrees) (a Dec in (−1°, 0°) shows "0"),
 * minutes, ffFixed 1 seconds. */
export function hotListEntryDraft(record:HtlFields):HotListEntryDraft{
 const ra=splitSexagesimal(record.ra,2),dec=splitSexagesimal(record.dec,1),deg=dec.sign*dec.whole;
 return Object.freeze({id:record.id,remarks:record.remarks,raHours:String(ra.whole),raMinutes:String(ra.minutes),raSeconds:formatFixed(ra.seconds,2),
  decDegrees:String(deg===0?0:deg),decMinutes:String(dec.minutes),decSeconds:formatFixed(dec.seconds,1)});
}
/** OB-AC-01 prefill. `objectId` is the object the observatory identifies at the pointing (null when none). */
export function addCurrentPrefill(pointing:Pointing,objectId:string|null,kind:string=''):HtlFields{
 return Object.freeze({id:objectId??'',remarks:objectId?kind:'',ra:pointing.ra,dec:pointing.dec});
}
export type HotListEntryResult=Readonly<{status:'ok';fields:HtlFields}|{status:'ra-invalid'}|{status:'dec-invalid'}|{status:'ra-unsupported'}>;
/** OB-AC-03 OK. RA errors win. Dec sign is −1 only when the degree VALUE is negative ("-0" is positive). */
export function parseHotListEntry(d:HotListEntryDraft):HotListEntryResult{
 const h=parseDelphiFloat(d.raHours),m=parseDelphiFloat(d.raMinutes),s=parseDelphiFloat(d.raSeconds);
 if(h===null||m===null||s===null)return Object.freeze({status:'ra-invalid'});
 const ra=h+m/60+s/3600;
 if(!Number.isFinite(ra)||ra<0||ra>24)return Object.freeze({status:'ra-invalid'});
 const deg=parseDelphiFloat(d.decDegrees),dm=parseDelphiFloat(d.decMinutes),ds=parseDelphiFloat(d.decSeconds);
 if(deg===null||dm===null||ds===null)return Object.freeze({status:'dec-invalid'});
 const sign=deg<0?-1:1,dec=deg+sign*dm/60+sign*ds/3600;
 if(!Number.isFinite(dec)||dec<-90||dec>90)return Object.freeze({status:'dec-invalid'});
 if(ra>=24)return Object.freeze({status:'ra-unsupported'});
 return Object.freeze({status:'ok',fields:Object.freeze({id:d.id.slice(0,24),remarks:d.remarks.slice(0,40),ra,dec:Object.is(dec,-0)?0:dec})});
}
/** OB-AC-04 confirmation box text. */
export function hotListEntryAddedText(id:string):string{
 const C=HOT_LIST_ENTRY_CAPTIONS;return id?C.addedHead+id+C.addedTail:C.positionAdded;
}
