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
 * (`revealed`, coordinator decision D4, 2026-10-29) it writes the selected record's catalog magnitude and, as the object, the
 * web field engine's record locator (e.g. `N3730.DAT@513845`, `CLEA_QSO.DAT@522`, `NGC 2403`) [W]: which name VIREO writes
 * for each Object X type is not recovered (research RE-observational-data-metadata.md U6). The pointing is the target's
 * coordinates, which the student was given. */
export const OBJECT_X_HEADER_MAGNITUDE=0;
/** The .SSP file name for an Object X label (review L5): characters other than letters, digits and '-' become '-', never '_',
 * so that VIREO's file-name ID rule (drop through the first '_', 0x5208c0) keeps the whole label (`ObjX-Ana Lopez` stays
 * `ObjX-Ana-Lopez`, not `Lopez`). */
export function objectXSpectrumFileName(label:string):string{return `${label.replace(/[^A-Za-z0-9-]+/g,'-')}.ssp`;}
/** The star route's .SSP file name; Observational Data takes an acquired star's ID from it, as from a saved file (S4). */
export function starSpectrumFileName(targetId:string):string{return `openvireo-star-${targetId.replace(/[^A-Za-z0-9_-]+/g,'_')}.ssp`;}
export function objectXHeaderObject(label:string):string{return label.replace(/[^\x20-\x7e]|,/g,'_').trim().slice(0,24)||'UNKNOWN';}
export function objectXSpectrumBytes(state:JournalState,label:string,pointing:Readonly<{ra:number;dec:number}>,minimum:number,revealed?:Readonly<{object:string;magnitude:number}>|null):Uint8Array {
 return serializeDotDecimalVireoSpectrum({object:revealed?revealed.object.slice(0,24):objectXHeaderObject(label),pointingRa:pointing.ra,pointingDec:pointing.dec,apparentMagnitude:revealed?revealed.magnitude:OBJECT_X_HEADER_MAGNITUDE,minimum,step:1000/600,counts:state.exposure.counts});
}

/** Front G (G4c): the field spectrometer at any pointing, through the same writer. Header object = the slit's record locator
 * (`NGC 4874`, `N0000.DAT@63282`, `CLEA_QSO.DAT@522`; printable ASCII, commas → '_', ≤24) [W]: which name VIREO writes for a GSC
 * star or a QSO is not recovered (research RE-observational-data-metadata.md U6). Magnitude = that record's catalogue magnitude;
 * pointing = the field's pointing (frozen at Use, recorded in the policy); 600 source-plus-sky bins from the calibration's first
 * wavelength with the spectrometer's 1000/600 Å step (the calibration grid must have that spacing). */
export function fieldSpectrumBytes(state:JournalState,result:FieldResult,pointing:Readonly<{ra:number;dec:number}>):Uint8Array {
 const o=result.qsoTarget??result.starTarget??result.target,c=result.calibration;
 if(!o||!c||result.reasons.length||c.wavelengths.length!==600||state.exposure.phase==='running')throw new RangeError('field spectrum');
 // Front S2 review 1 M1: (minimum, step) from the exposure's grid; dialog ranges are 100 Å multiples, step = width/600.
 const w=c.wavelengths,step=Math.round((w[599]-w[0])*600/599/100)*100/600;if(!(step>0))throw new RangeError('field spectrum');
 for(let i=1;i<w.length;i++)if(Math.abs(w[i]-w[i-1]-step)>1e-6)throw new RangeError('field spectrum');
 return serializeDotDecimalVireoSpectrum({object:fieldSpectrumHeaderObject(o.id),pointingRa:pointing.ra,pointingDec:pointing.dec,apparentMagnitude:o.magnitude,minimum:w[0],step,counts:state.exposure.counts});
}
export function fieldSpectrumHeaderObject(id:string):string{return id.replace(/[^\x20-\x7e]|,/g,'_').trim().slice(0,24)||'UNKNOWN';}
/** The field route's .SSP file name: only letters, digits and '-' (others → '-'), so VIREO's file-name ID rule (drop through the
 * first '_', 0x5208c0) keeps the whole locator. */
export function fieldSpectrumFileName(id:string):string{return `field-${id.replace(/[^A-Za-z0-9-]+/g,'-')}.ssp`;}
