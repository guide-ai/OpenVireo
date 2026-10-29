import {serializeDotDecimalVireoSpectrum} from './legacySpectrumFile';
import {STAR_TARGET,type StarState} from './starExposure';
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
 return serializeDotDecimalVireoSpectrum({object:STAR_TARGET.id,pointingRa:STAR_TARGET.ra,pointingDec:STAR_TARGET.dec,apparentMagnitude:STAR_TARGET.magnitudeSingle,minimum:3700,step:1000/600,counts:state.exposure.counts});
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
