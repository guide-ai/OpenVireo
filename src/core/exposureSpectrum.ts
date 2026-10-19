import {serializeDotDecimalVireoSpectrum} from './legacySpectrumFile';
import {STAR_TARGET,type StarState} from './starExposure';
import {galaxyStateDefinition,type GalaxyState} from './galaxyExposure';

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
