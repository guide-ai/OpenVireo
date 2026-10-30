/** Front G (G4a, analysis/front-plans/front-g-gsc.md §11): VIREO's single-slit spectrometer at a field, shared by Object X (at
 * its exact ObjectX.HTL coordinates) and the generic route (at any telescope pointing, with a pack assembled from the compact
 * GSC tiles). VIREO builds the field at every pointing (0x53be70) and the slit takes the nearest object (0x59a0fc); the
 * spectrometer is the default instrument in modes 0/1/2/4/5 (0x538062) and its Access (RdngBtnClick 0x53cce4) has no pointing
 * check. Pure: the caller supplies the identity-checked inputs. No equivalence with the original program is claimed. */
import {evaluateField,glxyspLookup,FIELD_MULTIPLIER,type FieldOptions,type FieldResult,type FieldTelescope,type FieldQsoCatalog,type FieldPhotographs} from './fieldEngine';
import type {FieldPack} from './fieldPack';
import type {QsoSpectrumFile} from './qsoSpectrum';
import {lookupStarTemplate,type StarIndexEntry} from './starTemplates';
import type {UniformSpectrum} from './acquisition';

/** The normal spectrometer's interval: the configured range's compiled default 3700–4700 Å (0x5a2a1e/0x5a2a28); see
 * objectXSpectrometer.ts for the copy chain. */
export const SPECTROMETER_INTERVAL=Object.freeze({minimum:3700,maximum:4700});
/** Everything the spectrometer reads besides the field pack. */
export type SpectrometerInputs=Readonly<{glx:Uint8Array;qsoCatalog:FieldQsoCatalog;qsoSpectrum:QsoSpectrumFile;starIndex:readonly StarIndexEntry[];
 starTemplates:ReadonlyMap<string,UniformSpectrum>;glxyspLines:readonly string[];galaxySpectra:ReadonlyMap<string,readonly Readonly<{wavelength:number;intensity:number}>[]>;photographs:FieldPhotographs}>;
/** The spectrometer's field result at a pointing: QSO 'merge', the recovered variable dispatch, the GLXYSP guard, photographs,
 * 'start-time' continuation, star and QSO observation; a selected galaxy with its own bundled GLXYSP.LST spectrum takes the
 * matched branch (0x55e55c, factor 1). A selected star whose JSPEC2 template is named but not bundled is typed
 * 'star-template-not-bundled' (only the templates that approved fields need are bundled), never another template. */
export function spectrometerFieldResult(inputs:SpectrometerInputs,pack:FieldPack,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):FieldResult{
 const at={ra:pointing.ra,dec:pointing.dec};
 const starObservation={templateFor:(index:number)=>{const file=lookupStarTemplate(inputs.starIndex,index);const spectrum=file?inputs.starTemplates.get(file):undefined;return file&&spectrum?{file,spectrum}:null;}};
 const options:FieldOptions={glxyspLines:inputs.glxyspLines,variableDispatch:'recovered',photographs:inputs.photographs,qso:'merge',qsoCatalog:inputs.qsoCatalog,continuation:'start-time',spectralInterval:SPECTROMETER_INTERVAL,starObservation,qsoObservation:{file:inputs.qsoSpectrum,...SPECTROMETER_INTERVAL}};
 let r=evaluateField(pack,inputs.glx,at,telescope,options);
 const own=r.target?glxyspLookup(inputs.glxyspLines,r.target.id):null;
 if(r.target&&own&&r.reasons.includes('spectrum-mapping')&&inputs.galaxySpectra.has(own))r=evaluateField(pack,inputs.glx,at,telescope,{...options,librarySpectrum:{targetId:r.target.id,file:own,samples:inputs.galaxySpectra.get(own)!}});
 return refineStarTemplateReason(inputs,r);
}
export type SpectrometerReason=FieldResult['reasons'][number]|'star-template-not-bundled';
/** The engine reports a star without a usable template as 'star-selected'; when JSPEC2.SPI names a template that is simply not
 * bundled, say so. */
function refineStarTemplateReason(inputs:SpectrometerInputs,r:FieldResult):FieldResult{
 if(!r.starTarget||!r.reasons.includes('star-selected'))return r;
 const raw=Uint8Array.from(r.starTarget.rawHex.match(/../g)!,x=>parseInt(x,16)),index=new DataView(raw.buffer).getInt32(8,true),file=lookupStarTemplate(inputs.starIndex,index);
 if(!file||inputs.starTemplates.has(file))return r;
 return Object.freeze({...r,reasons:Object.freeze(r.reasons.map(x=>x==='star-selected'?'star-template-not-bundled':x) as FieldResult['reasons'])});
}

/** Journal policy of the generic route: the exact binary64 pointing and the telescope (G4a). */
export const FIELD_SPECTRUM_POLICY_PREFIX='openvireo-field-spectrum-v1';
export function fieldSpectrumPolicy(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):string{
 if(!Number.isFinite(pointing?.ra)||!Number.isFinite(pointing?.dec)||pointing.ra<0||pointing.ra>=24||Math.abs(pointing.dec)>90||![0,1,2].includes(telescope))throw new RangeError('field spectrum policy');
 return `${FIELD_SPECTRUM_POLICY_PREFIX}:${pointing.ra},${pointing.dec}:T${telescope}`;
}
export function parseFieldSpectrumPolicy(policy:unknown):Readonly<{pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope}>|null{
 if(typeof policy!=='string')return null;
 const m=/^openvireo-field-spectrum-v1:([^,:]+),([^,:]+):T([012])$/.exec(policy);if(!m)return null;
 const pointing={ra:Number(m[1]),dec:Number(m[2])},telescope=Number(m[3]) as FieldTelescope;
 try{return fieldSpectrumPolicy(pointing,telescope)===policy?Object.freeze({pointing:Object.freeze(pointing),telescope}):null;}catch{return null;}
}
/** What an exposure needs from an available result (the same shape as the Object X display). */
export type FieldSpectrumCalibration=Readonly<{sourceMeans:readonly number[];skyMean:number;multiplier:number;continuationSource?:NonNullable<FieldResult['calibration']>['continuationSource']}>;
export function fieldSpectrumCalibration(r:FieldResult):FieldSpectrumCalibration|null{
 if(r.reasons.length||!r.calibration)return null;
 const c=r.calibration;
 return Object.freeze({sourceMeans:c.sourceMeans,skyMean:c.amplitude.sky,multiplier:FIELD_MULTIPLIER,...(c.continuationSource?{continuationSource:c.continuationSource}:{})});
}
