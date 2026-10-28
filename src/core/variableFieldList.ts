/** TVarFldLstForm1 "Variable Stars in … Field" (Front O, docs/OBJECT-INFO-FORMS.md, FO-VF). CLEA_VEO.exe 781bc970…c54c,
 * static only (analysis/front-o-info-forms/RECOVERY-C-variable-field-list.md and dossiers/varfld-*.asm).
 * Openers VariableStars1Click 0x53dafc (mode 1, "All GCVS") and VIREOModeled1Click 0x53db54 (mode 0); fill 0x52f7fc.
 * Area 0x53bc7b..0x53bd5b (finder) / 0x53becb..0x53bf78 (instrument): centre = telescope pointing; half-height
 * H = FieldCreationFactor (default 3, 0x5a2a74) × FinderField 2.5° / 2 or × InstrField 15′ / 120; Dec limits Dec ∓ H;
 * RA limits RA ∓ H/(15·cos Dec) wrapped into [0,24); limiting magnitude Single 14 (finder) / 20 (instrument).
 * Predicate 0x59848c: RA and Dec inclusive, then the record's max magnitude (Single +0x27) ≤ limit (0.0 passes).
 * Order (RECOVERY-E §4): the variable stage 0x5981a0 scans from a binary search on RA and inserts each admitted record with
 * the sorted cursor insert 0x492728 under comparator 0x4bc950 (RA, then Dec, ascending); a wrapping area is read by the caller
 * 0x597ac8 in two passes, [minRA, 24) then [0, maxRA], so the list is ascending (RA, Dec) with exact duplicates ordered by the
 * cursor rule (fieldEngine.nativeCursorInsert, read-only).
 * Mode 0 admits a record only when the light-curve dispatch 0x51ec48 returns true on a stack temp whose bytes +0x3d/+0x39/
 * +0x3a are never initialised (0x52fbd7..0x52fc2d): the modeled rows are the typed reason `modeled-uninitialised`.
 * Numbers: Number arithmetic (not x87 Extended); limits computed once per area. Pure. */
import {delphiFixed,formatNativeSexagesimal,type VariableStarRecord} from './variableStars';
import type {HtlFields} from './hotList';
import {nativeCursorInsert} from './fieldEngine';

export type VariableFieldView='finder'|'instrument';
export type VariableFieldMode='gcvs'|'modeled';
export type VariableFieldArea=Readonly<{view:VariableFieldView;centerRa:number;centerDec:number;minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number;limitingMagnitude:number}>;
export type VariableFieldReason='polar-area'|'modeled-uninitialised';
export class VariableFieldError extends Error{constructor(readonly code:'input'){super(`Variable field list: ${code}`);this.name='VariableFieldError';}}

/** Compiled option defaults (0x5a29e2 FinderField 2.5°, 0x5a29f6 InstrField 15′, 0x5a2a74 FieldCreationFactor 3). */
export const VARIABLE_FIELD_DEFAULTS=Object.freeze({finderDegrees:2.5,instrumentArcminutes:15,creationFactor:3,finderLimit:Math.fround(14),instrumentLimit:Math.fround(20)});
/** Original literals (DFM TVARFLDLSTFORM1, fill 0x52f7fc, row 0x52feb4, selection handlers). Never translated. */
export const VARIABLE_FIELD_LITERALS=Object.freeze({
 menu:Object.freeze({fieldInformation:'&Field Information',variableStars:'&Variable Stars',gcvs:'&All GCVS variables in region.',modeled:'&VIREO-modeled varibles in region.'}),
 captionFinder:'Variable Stars in Finder Field',captionInstrument:'Variable Stars in Instrument Field',
 center:'Field Center:',ra:'RA: ',dec:'Dec:',limits:'Field Limits:',to:'to',
 note:'(Visible field is 1/3 of loaded field and may not be centered.)',
 empty:'No variable stars found in field!',headGcvs:'All variables from GCVS in region:',headModeled:'Variables modeled in VIREO in region:',
 columns:'Name          Rt. Ascension    Declination   Max   Min  Type',
 listMenu:Object.freeze({list:'&List',search:'&Search...',print:'&Print...',saveText:'Save &Text',asDisplayed:'As &Displayed...',commaDelimit:'&Comma Delimit (for Spreadsheet)...',close:'&Close'}),
 selectionMenu:Object.freeze({selection:'&Selection',data:'&Get Selection Data...',slew:'&Slew to Selection...',add:'&Add Selection to Current Hot List',start:'Start &New Hot List with Selection'}),
 addedHead:'Object ',addedTail:' Added to Current Hot List.',confirmation:'Confirmation',
 newList:'New Hot List Created - Object ',newListTail:' Added to New Hot List.',
 unsavedText:'The current observation Hot List has been updated.  You will lose the updates if you do not save it.\r\n\r\nDo you want to save it now?',unsavedCaption:'Current Hot List not Saved!',
 csvText:'Comma-Delimited Output not Available for Displayed Material.',csvCaption:'Not Available',
 savedHead:'Report Text Written to ',savedTail:'.',savedCaption:'Text File Written',
});

const wrapHours=(h:number)=>((h%24)+24)%24;
/** Area record of the field load (finder or instrument) for a telescope pointing. */
export function variableFieldArea(pointing:Readonly<{ra:number;dec:number}>,view:VariableFieldView):VariableFieldArea|Readonly<{reason:'polar-area'}>{
 if(!pointing||!Number.isFinite(pointing.ra)||!Number.isFinite(pointing.dec)||pointing.ra<0||pointing.ra>=24||Math.abs(pointing.dec)>90||(view!=='finder'&&view!=='instrument'))throw new VariableFieldError('input');
 const D=VARIABLE_FIELD_DEFAULTS,h=view==='finder'?D.creationFactor*D.finderDegrees/2:D.creationFactor*D.instrumentArcminutes/120;
 const cos=Math.cos(pointing.dec*Math.PI/180),hr=h/(15*cos);
 if(!Number.isFinite(hr)||hr>=12)return Object.freeze({reason:'polar-area' as const});
 return Object.freeze({view,centerRa:pointing.ra,centerDec:pointing.dec,minimumRa:wrapHours(pointing.ra-hr),maximumRa:wrapHours(pointing.ra+hr),minimumDec:pointing.dec-h,maximumDec:pointing.dec+h,limitingMagnitude:view==='finder'?D.finderLimit:D.instrumentLimit});
}
export const areaWraps=(a:VariableFieldArea)=>a.minimumRa>=a.maximumRa;
/** 0x59848c for one scan range (inclusive bounds, then max magnitude ≤ limit). */
const inRange=(r:VariableStarRecord,minRa:number,maxRa:number,a:VariableFieldArea)=>r.raHours>=minRa&&r.raHours<=maxRa&&r.decDegrees>=a.minimumDec&&r.decDegrees<=a.maximumDec&&r.max<=a.limitingMagnitude;
export function variableInArea(r:VariableStarRecord,a:VariableFieldArea):boolean{
 return areaWraps(a)?inRange(r,a.minimumRa,24,a)||inRange(r,0,a.maximumRa,a):inRange(r,a.minimumRa,a.maximumRa,a);
}
/** Comparator 0x4bc950: RA, then Dec. */
const greater=(a:VariableStarRecord,b:VariableStarRecord)=>a.raHours>b.raHours||a.raHours===b.raHours&&a.decDegrees>b.decDegrees;
export type VariableFieldMembers=Readonly<{status:'ok';records:readonly VariableStarRecord[]}|{status:'unavailable';reason:VariableFieldReason}>;
/** Field list +0x4b for the area, in catalog (RA) order. */
export function variableFieldMembers(records:readonly VariableStarRecord[],area:VariableFieldArea|Readonly<{reason:'polar-area'}>):VariableFieldMembers{
 if('reason' in area)return Object.freeze({status:'unavailable',reason:area.reason});
 const read=areaWraps(area)?[...records.filter(r=>inRange(r,area.minimumRa,24,area)),...records.filter(r=>inRange(r,0,area.maximumRa,area))]:records.filter(r=>inRange(r,area.minimumRa,area.maximumRa,area));
 return Object.freeze({status:'ok',records:Object.freeze([...nativeCursorInsert(read,greater)])});
}
const pad=(s:string,n:number)=>s.length>=n?s:s+' '.repeat(n-s.length);
const magCell=(m:number)=>m!==0?delphiFixed(m,2).padStart(5,' ')+' ':'      ';
/** Row 0x52feb4: name padded to ≥ 11, RA, Dec, max, min (flag characters are not shown), type. */
export function variableFieldRow(r:VariableStarRecord):string{
 return pad(r.name,11)+formatNativeSexagesimal(r.raHours,2,['h ','m ','s '])+formatNativeSexagesimal(r.decDegrees,1,['° ',"' ",'" '])+magCell(r.max)+magCell(r.min)+r.type;
}
export type VariableFieldList=Readonly<{
 caption:string;lines:readonly string[];
 /** Displayed records, one per data row (+0x3fb). */
 records:readonly VariableStarRecord[];
 /** +0x41a/+0x41e: data rows; first > last when nothing is selectable. */
 first:number;last:number;
 /** A typed reason that replaces the data rows (the header lines still show). */
 reason:VariableFieldReason|null;
}>;
/** The ListBox lines of the fill for one mode. */
export function variableFieldList(all:readonly VariableStarRecord[],pointing:Readonly<{ra:number;dec:number}>,view:VariableFieldView,mode:VariableFieldMode):VariableFieldList{
 const L=VARIABLE_FIELD_LITERALS,caption=view==='finder'?L.captionFinder:L.captionInstrument;
 const area=variableFieldArea(pointing,view);
 if('reason' in area)return Object.freeze({caption,lines:Object.freeze([]),records:Object.freeze([]),first:0,last:-1,reason:area.reason});
 const lines=[L.center,L.ra+formatNativeSexagesimal(area.centerRa,2,['h ','m ','s']),L.dec+formatNativeSexagesimal(area.centerDec,1,['° ',"' ",'"']),'',
  L.limits,L.ra+formatNativeSexagesimal(area.minimumRa,2,['h ','m ','s '])+L.to+formatNativeSexagesimal(area.maximumRa,2,['h ','m ','s ']),
  L.dec+formatNativeSexagesimal(area.minimumDec,1,['° ',"' ",'" '])+L.to+formatNativeSexagesimal(area.maximumDec,1,['° ',"' ",'" ']),L.note,''];
 const members=variableFieldMembers(all,area);
 if(members.status!=='ok')return Object.freeze({caption,lines:Object.freeze(lines),records:Object.freeze([]),first:lines.length,last:lines.length-1,reason:members.reason});
 if(!members.records.length){lines.push(L.empty);return Object.freeze({caption,lines:Object.freeze(lines),records:Object.freeze([]),first:lines.length-1,last:lines.length-2,reason:null});}
 lines.push(mode==='gcvs'?L.headGcvs:L.headModeled,L.columns);
 if(mode==='modeled')return Object.freeze({caption,lines:Object.freeze(lines),records:Object.freeze([]),first:lines.length,last:lines.length-1,reason:'modeled-uninitialised'});
 const first=lines.length;for(const r of members.records)lines.push(variableFieldRow(r));
 return Object.freeze({caption,lines:Object.freeze(lines),records:members.records,first,last:lines.length-1,reason:null});
}
/** MouseUp/KeyUp 0x52f388/0x52f518: the selection is ItemIndex − first when first ≤ ItemIndex ≤ last, else −1. */
export function listSelection(itemIndex:number,first:number,last:number):number{return Number.isInteger(itemIndex)&&itemIndex>=first&&itemIndex<=last?itemIndex-first:-1;}
/** Hot-list record 0x5300f0: name (max 24), RA, Dec, remark := variability type (max 40). */
export function variableHotListFields(r:VariableStarRecord):HtlFields{return Object.freeze({id:r.name.slice(0,24),remarks:r.type.slice(0,40),ra:r.raHours,dec:r.decDegrees});}
export const variableAddedText=(name:string)=>VARIABLE_FIELD_LITERALS.addedHead+name+VARIABLE_FIELD_LITERALS.addedTail;
export const variableNewListText=(name:string)=>VARIABLE_FIELD_LITERALS.newList+name+VARIABLE_FIELD_LITERALS.newListTail;
/** WEB download name: the original dialog starts from an empty stem (+0x3eb has no writer) with `.TXT`. */
export const VARIABLE_FIELD_SAVE_NAME='Variable_Stars.TXT';
