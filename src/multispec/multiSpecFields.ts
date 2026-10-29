// Front M (M3/M4): which bundled field a Multi-Spec view is built from. Pure; no React, no I/O.
//  - Observatory (D1): only an exact listed pointing of a bundled Multi-Spec pack (the nine LSS survey packs, the Hubble engine
//    Coma/Boötes packs; the same exact-pointing rule as Front O's certified fields, io/fieldInfoPacks.ts). Anywhere else the form
//    still opens (the native Access has no field gate) but no field is shown: typed 'no-field'.
//  - Object X (E08, exercise mode 1): the ObjectX.HTL spectroscopy row whose coordinates the chosen target has
//    (core/objectXSpectrometer.ts OBJECT_X_SPECTRUM_ROWS). Pulsar and asteroid rows have no field: typed 'no-field'. The pack id
//    names the row, so it never reaches the DOM.
import engineTargets from '../../data/hubble/engine-targets.json';
import {LSS_ROWS} from '../core/lssFields';
import {OBJECT_X_SPECTRUM_ROWS} from '../core/objectXSpectrometer';
import {objectXCode} from '../core/objectXLab';
import type {HtlList} from '../core/hotList';
import type {FieldTelescope} from '../core/fieldEngine';
import type {MultiSpecFieldRequest} from '../io/multiSpec';

/** Object X rule (plan §4): a field is masked when its centre lies within OBJECT_X_HIDE_DEGREES + this half-width (the ±0.375°
 * bounded field area) of an Object X position. */
export const MULTISPEC_MASK_REACH=0.375;
type Pointing=Readonly<{ra:number;dec:number}>;
const at=(p:Pointing)=>Object.freeze({ra:p.ra,dec:p.dec});
export function observatoryMultiSpecField(pointing:Pointing,telescope:FieldTelescope):MultiSpecFieldRequest|null{
 // The Hubble engine packs first (as io/fieldInfoPacks.ts): their pointings are also LSS rows, and the Hubble route's options
 // merge the QSO catalogue where the LSS 'gate' mode types the field.
 const hubble=engineTargets.targets.find(t=>t.pointing.ra===pointing.ra&&t.pointing.dec===pointing.dec);
 if(hubble&&(hubble.pack==='hubble-engine-coma'||hubble.pack==='hubble-engine-bootes'))return Object.freeze({pack:hubble.pack,pointing:at(pointing),telescope});
 const lss=LSS_ROWS.find(r=>r.ra===pointing.ra&&r.dec===pointing.dec);
 if(lss)return Object.freeze({pack:`lss-field-0${lss.field}` as MultiSpecFieldRequest['pack'],pointing:at(pointing),telescope});
 return null;
}
export function objectXMultiSpecField(list:HtlList,code:string,telescope:FieldTelescope):MultiSpecFieldRequest|null{
 const row=list.findIndex(r=>objectXCode(r.id)===code);
 if(row<0||!OBJECT_X_SPECTRUM_ROWS.some(x=>x.row===row))return null;
 return Object.freeze({pack:`objectx-row-${row}` as const,pointing:at(list[row]),telescope});
}
/** A stable key of a field request (a new key regenerates the field: 0x53a741 → Clear Objects). */
export const multiSpecFieldKey=(f:MultiSpecFieldRequest|null)=>f?`${f.pack}|${f.pointing.ra}|${f.pointing.dec}|${f.telescope}|${f.variableTime?.jd??''}`:'none';
