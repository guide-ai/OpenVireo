import {serializeDotDecimalVireoSpectrum} from './legacySpectrumFile';
import {STAR_TARGET,starSpectralRange,type StarState} from './starExposure';
import {galaxyStateDefinition,type GalaxyState} from './galaxyExposure';
import type {JournalState} from './exposureJournal';
import type {FieldResult} from './fieldEngine';
import type {LssRow} from './lssFields';

/** Recovered save profile, supplied by the bound acquisition configuration.
 * The label edited during analysis must never change these telescope fields.
 * Source PLUS sky counts are passed unchanged; no measured z is serialized.
 * Numerical/byte policy: docs/SPECTRUM-SAVE-CONTRACT.md.
 */
export function starSpectrumBytes(state:StarState):Uint8Array {
 // Front S (S1): rows from the exposure's spectrometer range (Save 0x50fb1c: λ from env+0x2bd4, step (max − min)/600).
 const range=starSpectralRange(state);
 return serializeDotDecimalVireoSpectrum({object:STAR_TARGET.id,pointingRa:STAR_TARGET.ra,pointingDec:STAR_TARGET.dec,apparentMagnitude:STAR_TARGET.magnitudeSingle,minimum:range.minimum,step:(range.maximum-range.minimum)/600,counts:state.exposure.counts});
}
export function galaxySpectrumBytes(state:GalaxyState):Uint8Array {
 const target=galaxyStateDefinition(state).target;
 return serializeDotDecimalVireoSpectrum({object:target.id,pointingRa:target.ra,pointingDec:target.dec,apparentMagnitude:target.magnitude,minimum:4000,step:1000/600,counts:state.exposure.counts});
}
/** Front L2: the LSS route through the same writer. Header object = the selected catalogue galaxy (24 characters, as the
 * header allows), pointing = the row's HTL coordinates (the global telescope pointing), magnitude = that galaxy's Single
 * catalogue magnitude (the field engine's selected record); 600 source-plus-sky bins from the row's 4000 Å interval [W]. */
export function lssSpectrumBytes(state:JournalState,result:FieldResult,row:Pick<LssRow,'ra'|'dec'>):Uint8Array {
 const t=result.target,c=result.calibration;if(!t||!c)throw new RangeError('LSS spectrum');
 return serializeDotDecimalVireoSpectrum({object:t.id,pointingRa:row.ra,pointingDec:row.dec,apparentMagnitude:t.magnitude,minimum:c.wavelengths[0],step:1000/600,counts:state.exposure.counts});
}

/** Front S (S6, docs/OBJECT-X-SPECTRA.md): an Object X spectrum through the same writer. VIREO's header (0x510090) always holds
 * the selected catalog object's name and catalog magnitude. While the identity is hidden OpenVireo writes the student's ObjX
 * label as the object (ASCII, commas and other characters replaced by '_', ≤24) and magnitude 0.000 [W]; after the reveal
 * (`revealed`) it writes the native name and magnitude (coordinator decision D4, 2026-10-29). The pointing is the target's
 * coordinates, which the student was given. */
export const OBJECT_X_HEADER_MAGNITUDE=0;
export function objectXHeaderObject(label:string):string{return label.replace(/[^\x20-\x7e]|,/g,'_').trim().slice(0,24)||'UNKNOWN';}
export function objectXSpectrumBytes(state:JournalState,label:string,pointing:Readonly<{ra:number;dec:number}>,minimum:number,revealed?:Readonly<{object:string;magnitude:number}>|null):Uint8Array {
 return serializeDotDecimalVireoSpectrum({object:revealed?revealed.object.slice(0,24):objectXHeaderObject(label),pointingRa:pointing.ra,pointingDec:pointing.dec,apparentMagnitude:revealed?revealed.magnitude:OBJECT_X_HEADER_MAGNITUDE,minimum,step:1000/600,counts:state.exposure.counts});
}
