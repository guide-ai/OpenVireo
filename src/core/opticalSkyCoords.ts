/** Optical Slew ▸ Set Coordinates (OB-SC, docs/OPTICAL-OBSERVATORY-PROVENANCE.json). CLEA_VEO.exe 781bc970…c54c,
 * static listings only. TObsrvtry.CoordBtnClick 0x5393ec shows the shared TSkyCoordsDlg instance [0x5b5e0c] that the radio
 * panel also uses, so the field captions, the RA-08 prefill (skyCoordsFieldsFor), the RA-09 OK parse (parseSkyCoords) and
 * the RA-EP-01..03 epoch conversion (precessSkyCoords) are the already-recovered radio contracts, imported unchanged.
 *
 * Optical caller (OB-SC-01): when no slew runs (+0x64d = 0) and both stored target cells ([0x5b5e20] RA, [0x5b5604] Dec)
 * equal Single 0.0 (0x5395c8), they are seeded from the current pointing (+0x65f / +0x669) before the dialog opens; a
 * running slew instead asks to stop it (not modelled here: the web UI disables Set Coordinates while the telescope moves).
 *
 * WEB-OB-01 (coordinator decision): the B1950 flag (+0x3c5 of the shared dialog) and the stored target are local to the
 * optical observatory; the radio panel keeps its own (WEB-EP-02 precedent). Pure state: no React, timers or I/O. */
import {SKY_COORDS_FIELDS,SKY_COORDS_FIELD_MAX_LENGTH,formatFixed,parseSkyCoords,roundHalfEven,splitSexagesimal,skyCoordsDraftTarget,skyCoordsFieldsFor,type SkyCoordsDialog,type SkyCoordsField,type SkyCoordsUnsupportedReason} from './radioAntenna';
import {precessSkyCoords,type RadioEpochConversion} from './radioEpoch';
import type {Pointing} from './sky';

export type OpticalSkyCoordsNotice=Readonly<{kind:'ra-invalid'}|{kind:'dec-invalid'}|{kind:'ra-unsupported';reason:SkyCoordsUnsupportedReason}|{kind:'dec-unsupported';reason:SkyCoordsUnsupportedReason}>;
export type OpticalSkyCoordsState=Readonly<{
 /** Stored target cells. J2000 except after a converting open (targetHoldsB1950), as natively. */
 target:Pointing;
 /** +0x3c5 analogue: the last confirmed entry used B1950.0. */
 b1950:boolean;
 targetHoldsB1950:boolean;
 dialog:SkyCoordsDialog|null;
 /** RA-09 error box; the dialog stays open under it. */
 notice:OpticalSkyCoordsNotice|null;
}>;
export const INITIAL_OPTICAL_SKY_COORDS:OpticalSkyCoordsState=Object.freeze({target:Object.freeze({ra:0,dec:0}),b1950:false,targetHoldsB1950:false,dialog:null,notice:null});

/** A confirmed entry: the J2000 slew target and, for a B1950 entry, its conversion (branch and pole sign note). */
export type OpticalSlewRequest=Readonly<{target:Pointing;conversion:RadioEpochConversion|null}>;
export type OpticalSkyCoordsStep=Readonly<{state:OpticalSkyCoordsState;slew:OpticalSlewRequest|null}>;

const freeze=(s:OpticalSkyCoordsState):OpticalSkyCoordsState=>Object.freeze({...s});
const keep=(s:OpticalSkyCoordsState):OpticalSkyCoordsStep=>Object.freeze({state:s,slew:null});
const checkPointing=(p:Pointing)=>{if(!p||!Number.isFinite(p.ra)||!Number.isFinite(p.dec)||p.ra<0||p.ra>=24||Math.abs(p.dec)>90)throw new RangeError('Invalid pointing');};

/** OB-SC-01 CoordBtnClick: seed (both cells exactly 0) then TSkyCoordsDlg.FormActivate: with the B1950 flag set the stored
 * J2000 target is converted to B1950 and written back (RA-EP-02, no rollback on Cancel); the fields show it (RA-08). */
export function openOpticalSkyCoords(s:OpticalSkyCoordsState,pointing:Pointing):OpticalSkyCoordsState{
 checkPointing(pointing);
 if(s.dialog)return s;
 const seeded=s.target.ra===0&&s.target.dec===0?Object.freeze({ra:pointing.ra,dec:pointing.dec}):s.target;
 if(!s.b1950)return freeze({...s,target:seeded,targetHoldsB1950:false,notice:null,dialog:Object.freeze({fields:skyCoordsFieldsFor(seeded),epochIndex:0,epochEnabled:true})});
 const b=precessSkyCoords('J2000->B1950',seeded),target=Object.freeze({ra:b.ra,dec:b.dec});
 const dialog:SkyCoordsDialog=Object.freeze({fields:skyCoordsFieldsFor(target),epochIndex:1,epochEnabled:true,...(b.southPoleSignLost?{openSouthPoleSignLost:true as const}:{})});
 return freeze({...s,target,targetHoldsB1950:true,notice:null,dialog});
}
/** OB-HL View/Select path: the selected row's coordinates are copied, +0x3c5 := 0 and EpochGrp is disabled (J2000 only). */
export function openOpticalSkyCoordsFromHotList(s:OpticalSkyCoordsState,row:Pointing):OpticalSkyCoordsState{
 checkPointing(row);
 const target=Object.freeze({ra:row.ra,dec:row.dec});
 return freeze({...s,target,b1950:false,targetHoldsB1950:false,notice:null,dialog:Object.freeze({fields:skyCoordsFieldsFor(target),epochIndex:0,epochEnabled:false,origin:'hot-list'})});
}
export function editOpticalSkyCoordsField(s:OpticalSkyCoordsState,field:SkyCoordsField,text:string):OpticalSkyCoordsState{
 if(!s.dialog||s.notice||!SKY_COORDS_FIELDS.includes(field)||typeof text!=='string'||text.length>SKY_COORDS_FIELD_MAX_LENGTH||s.dialog.fields[field]===text)return s;
 return freeze({...s,dialog:Object.freeze({...s.dialog,fields:Object.freeze({...s.dialog.fields,[field]:text})})});
}
export function selectOpticalSkyCoordsEpoch(s:OpticalSkyCoordsState,index:0|1):OpticalSkyCoordsState{
 if(!s.dialog||s.notice||!s.dialog.epochEnabled||(index!==0&&index!==1)||s.dialog.epochIndex===index)return s;
 return freeze({...s,dialog:Object.freeze({...s.dialog,epochIndex:index})});
}
/** Cancel commits nothing and starts no slew; a converting open keeps its B1950 write (RA-EP-02). */
export function cancelOpticalSkyCoords(s:OpticalSkyCoordsState):OpticalSkyCoordsState{
 if(!s.dialog||s.notice)return s;
 return freeze({...s,dialog:null});
}
export function dismissOpticalSkyCoordsNotice(s:OpticalSkyCoordsState):OpticalSkyCoordsState{
 return s.notice?freeze({...s,notice:null}):s;
}
/** RA-09 OK: an invalid entry raises its box and keeps the dialog; a valid entry closes it, stores the J2000 target, sets
 * the B1950 flag from the epoch used (RA-EP-03) and requests the programmed slew. */
export function confirmOpticalSkyCoords(s:OpticalSkyCoordsState):OpticalSkyCoordsStep{
 if(!s.dialog||s.notice)return keep(s);
 const parsed=parseSkyCoords(s.dialog.fields);
 if(parsed.status!=='ok'){
  const notice:OpticalSkyCoordsNotice=parsed.status==='ra-unsupported'||parsed.status==='dec-unsupported'?Object.freeze({kind:parsed.status,reason:parsed.reason}):Object.freeze({kind:parsed.status});
  return Object.freeze({state:freeze({...s,notice}),slew:null});
 }
 const draft=skyCoordsDraftTarget(s.dialog)!,target=Object.freeze({ra:draft.ra,dec:draft.dec});
 return Object.freeze({state:freeze({...s,dialog:null,notice:null,target,b1950:draft.conversion!==null,targetHoldsB1950:false}),slew:Object.freeze({target,conversion:draft.conversion})});
}

/** OB-SC-05/06 coordinate text of the ProgrammedSlew boxes: 0x486ca0 (the field layout of radioHotListFormat's field(),
 * repeated here because that helper is private to a radio module) with the slew separators RA 'h   ','m   ','s' (digits 2)
 * and Dec '°  ',"'   ",'"' (digits 1). Web policy as WEB-HL-07: binary64, toFixed, U+00B0. */
function slewField(value:number,digits:1|2,[a,b,c]:readonly [string,string,string]):string{
 const s=splitSexagesimal(value,digits);let whole=s.whole;while(whole>=360)whole-=360;
 const scale=digits===1?10:100;
 const first=((s.sign<0?'-':' ')+whole).padStart(4,' '),minutes=String(s.minutes).padStart(2,'0');
 const seconds=(Math.trunc(roundHalfEven(scale*s.seconds)/scale)<10?'0':'')+formatFixed(s.seconds,digits);
 return first+a+minutes+b+seconds+c;
}
export const OPTICAL_SLEW_LITERALS=Object.freeze({
 confirmHead:'Slew Telescope to Target Coordinates?\r\n\r\nRA:  ',decHead:'Dec: ',lineBreak:'\r\n',confirmCaption:'Confirm Slew',
 b1950Separator:'\r\n\r\n',b1950Note:'(Input B1950.0 Coordinates Precessed to J2000.0.)',
 belowHead:'Target Coordinates are Below the Horizon!\r\n\r\nRA:  ',belowCaption:'Cannot Perform Slew',
 sameText:'Telescope is at Target Coordinates!',sameCaption:'No Slew Needed!',
 terminateText:'Terminate Current Slew?',terminateCaption:'Slew Suspended',
});
export const formatSlewRa=(ra:number)=>slewField(ra,2,['h   ','m   ','s']);
export const formatSlewDec=(dec:number)=>slewField(dec,1,['°  ',"'   ",'"']);
/** OB-SC-06 confirmation text (J2000 target; the B1950 line when the flag is set). */
export function opticalSlewConfirmText(target:Pointing,b1950:boolean):string{
 const L=OPTICAL_SLEW_LITERALS;
 return L.confirmHead+formatSlewRa(target.ra)+L.lineBreak+L.decHead+formatSlewDec(target.dec)+(b1950?L.b1950Separator+L.b1950Note:'');
}
/** OB-SC-05 horizon refusal text. */
export function opticalSlewBelowText(target:Pointing):string{
 const L=OPTICAL_SLEW_LITERALS;return L.belowHead+formatSlewRa(target.ra)+L.lineBreak+L.decHead+formatSlewDec(target.dec);
}
