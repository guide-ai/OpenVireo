// Front M (M3/M4): which field a Multi-Spec view is built from. Pure; no React, no I/O.
//  - Observatory (D1): an exact listed pointing of a bundled Multi-Spec pack (the nine LSS survey packs, the Hubble engine
//    Coma/Boötes packs; the same exact-pointing rule as Front O's certified fields, io/fieldInfoPacks.ts). Front G (G4b): VIREO
//    builds the instrument field at every pointing (0x53be70) and does not gate Multi-Spec by pointing (Access 0x53ce0c; the
//    selection gate is the mode, MouseDown 0x53cfa8), so every other pointing uses a pack assembled from the compact GSC tiles
//    ('gsc-tiles').
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
import {nativeFieldCacheHolds} from '../core/fieldCache';

/** Object X rule (plan §4): a field is masked when its centre lies within OBJECT_X_HIDE_DEGREES + this reach of an Object X
 * position. The reach covers the whole instrument field area, corners included (G-merge review L1): Dec ± 0.375°, RA ±
 * 0.375/(15·cos Dec) h puts the corners 0.53° from the centre at the ObjectX.HTL declinations (multiSpecMaskReach.test.ts), and
 * the review measured assembled populations reaching 0.53–0.61°. The camera's CAMERA_FIELD_MASK_REACH (Front O) takes the same value. */
export const MULTISPEC_MASK_REACH=0.62;
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
/** Front G G4b: the field at any pointing, the certified pack first (its populations equal the assembled ones where both exist). */
export function anyMultiSpecField(pointing:Pointing,telescope:FieldTelescope):MultiSpecFieldRequest{
 return observatoryMultiSpecField(pointing,telescope)??Object.freeze({pack:'gsc-tiles',pointing:at(pointing),telescope});
}
/** Front G G4b: where the observatory's Multi-Spec field is loaded. The previous anchor is kept while VIREO's cached-field rule
 * holds for the current pointing (0.25°, core/fieldCache.ts) and the telescope is unchanged; a certified pointing reached exactly
 * always loads its own pack. Returns the same object when nothing changes. */
export type MultiSpecAnchor=Readonly<{pointing:Pointing;telescope:FieldTelescope}>;
export function multiSpecAnchor(previous:MultiSpecAnchor|null,pointing:Pointing,telescope:FieldTelescope):MultiSpecAnchor{
 const keep=previous&&previous.telescope===telescope&&nativeFieldCacheHolds(previous.pointing,pointing)
  &&!(observatoryMultiSpecField(pointing,telescope)!==null&&(previous.pointing.ra!==pointing.ra||previous.pointing.dec!==pointing.dec));
 return keep?previous:Object.freeze({pointing:at(pointing),telescope});
}
export function objectXMultiSpecField(list:HtlList,code:string,telescope:FieldTelescope):MultiSpecFieldRequest|null{
 const row=list.findIndex(r=>objectXCode(r.id)===code);
 if(row<0||!OBJECT_X_SPECTRUM_ROWS.some(x=>x.row===row))return null;
 return Object.freeze({pack:`objectx-row-${row}` as const,pointing:at(list[row]),telescope});
}
/** A stable key of a field request (a new key regenerates the field: 0x53a741 → Clear Objects). */
export const multiSpecFieldKey=(f:MultiSpecFieldRequest|null)=>f?`${f.pack}|${f.pointing.ra}|${f.pointing.dec}|${f.telescope}|${f.variableTime?.jd??''}`:'none';
