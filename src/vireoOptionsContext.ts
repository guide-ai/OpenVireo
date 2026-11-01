import {createContext} from 'react';
import type {ShownCurrentObject} from './core/currentObject';
import type {Pointing} from './core/sky';
/** Front R4c: the session options that VIREO's forms read themselves (Monochrome Displays, Print in Color, Time-Dependent Data),
 * provided once by OpenVireo so the HR views and the observation results need no prop threading. Compiled defaults: all off.
 * Front R4d: Show Object ID, Show Object Mag and Edit Mode for the spectrometer and Multi-Spec, and the page's current-object
 * reader (0x53cf94 behind the Object X gate, io/currentObjectAt.ts); null where no page provides one.
 * Front S3: allowRangeChange is Allow User Change (env+0x2e8b, compiled on): it enables the spectrometer's Spectral Range item. */
export type CurrentObjectReader=(pointing:Pointing,signal?:AbortSignal)=>Promise<ShownCurrentObject>;
export type VireoOptions=Readonly<{monochromeDisplays:boolean;printInColor:boolean;timeDependentData:boolean;
 showObjectId:boolean;showObjectMag:boolean;editMode:boolean;currentObject:CurrentObjectReader|null;allowRangeChange:boolean}>;
export const VIREO_OPTIONS_DEFAULT:VireoOptions=Object.freeze({monochromeDisplays:false,printInColor:false,timeDependentData:false,showObjectId:false,showObjectMag:false,editMode:false,currentObject:null,allowRangeChange:true});
export const VireoOptionsContext=createContext<VireoOptions>(VIREO_OPTIONS_DEFAULT);
