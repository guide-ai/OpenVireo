import {createContext} from 'react';
/** Front R4c: the session options that VIREO's forms read themselves (Monochrome Displays, Print in Color, Time-Dependent Data),
 * provided once by OpenVireo so the HR views and the observation results need no prop threading. Compiled defaults: all off. */
export type VireoOptions=Readonly<{monochromeDisplays:boolean;printInColor:boolean;timeDependentData:boolean}>;
export const VIREO_OPTIONS_DEFAULT:VireoOptions=Object.freeze({monochromeDisplays:false,printInColor:false,timeDependentData:false});
export const VireoOptionsContext=createContext<VireoOptions>(VIREO_OPTIONS_DEFAULT);
