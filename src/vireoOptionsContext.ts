import {createContext} from 'react';
import type {ShownCurrentObject} from './core/currentObject';
import type {Pointing} from './core/sky';
import {COMPILED_INSTRUMENT_PARAMETERS,type InstrumentParameters} from './core/instrumentParameters';
/** Front R4c: the session options that VIREO's forms read themselves (Monochrome Displays, Print in Color, Time-Dependent Data),
 * provided once by OpenVireo so the HR views and the observation results need no prop threading. Compiled defaults: all off.
 * Front R4d: Show Object ID, Show Object Mag and Edit Mode for the spectrometer and Multi-Spec, and the page's current-object
 * reader (0x53cf94 behind the Object X gate, io/currentObjectAt.ts); null where no page provides one.
 * Front S3: allowRangeChange is Allow User Change (env+0x2e8b, compiled on): it enables the spectrometer's Spectral Range item.
 * Front T4 (core/photometerTabOptions.ts): setEBmV (env+0x2e90, compiled on) locks a database cluster's E(B−V) at its catalogue
 * value; detectSky (env+0x2e83, compiled off) lets the photometer decide Object or Sky at each activation.
 * Front T6 (core/instrumentParameters.ts): the Photometer and Spectrometer tabs' parameters (compiled values by default). */
export type CurrentObjectReader=(pointing:Pointing,signal?:AbortSignal)=>Promise<ShownCurrentObject>;
export type VireoOptions=Readonly<{monochromeDisplays:boolean;printInColor:boolean;timeDependentData:boolean;
 showObjectId:boolean;showObjectMag:boolean;editMode:boolean;currentObject:CurrentObjectReader|null;allowRangeChange:boolean;setEBmV:boolean;detectSky:boolean;instrumentParameters:InstrumentParameters}>;
export const VIREO_OPTIONS_DEFAULT:VireoOptions=Object.freeze({monochromeDisplays:false,printInColor:false,timeDependentData:false,showObjectId:false,showObjectMag:false,editMode:false,currentObject:null,allowRangeChange:true,setEBmV:true,detectSky:false,instrumentParameters:COMPILED_INSTRUMENT_PARAMETERS});
export const VireoOptionsContext=createContext<VireoOptions>(VIREO_OPTIONS_DEFAULT);
