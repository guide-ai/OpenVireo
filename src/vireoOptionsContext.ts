import {createContext} from 'react';
/** Front R4c: the session options that VIREO's forms read themselves (Monochrome Displays, Print in Color, Time-Dependent Data),
 * provided once by OpenVireo so the HR views and the observation results need no prop threading. Compiled defaults: all off. */
/** Front S3: allowRangeChange is Allow User Change (env+0x2e8b, compiled on): it enables the spectrometer's Spectral Range item. */
export type VireoOptions=Readonly<{monochromeDisplays:boolean;printInColor:boolean;timeDependentData:boolean;allowRangeChange:boolean}>;
export const VIREO_OPTIONS_DEFAULT:VireoOptions=Object.freeze({monochromeDisplays:false,printInColor:false,timeDependentData:false,allowRangeChange:true});
export const VireoOptionsContext=createContext<VireoOptions>(VIREO_OPTIONS_DEFAULT);
