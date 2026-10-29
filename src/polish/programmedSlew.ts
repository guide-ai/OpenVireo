import {createContext} from 'react';
/** Front P (OB-SC-02): TelescopeMotion tells the slew menu whether a programmed slew (+0x64d ≠ 0) is running and how to stop
 * it, so Set Coordinates can ask "Terminate Current Slew?" instead of being disabled. Manual N/S/E/W motion is not a
 * programmed slew. null outside TelescopeMotion. */
export type ProgrammedSlew=Readonly<{moving:boolean;terminate:()=>void}>;
export const ProgrammedSlewContext=createContext<ProgrammedSlew|null>(null);
