import type {FieldTelescope} from '../core/fieldEngine';
import type {Pointing} from '../core/sky';

/** Front C6: VIREO's last telescope field load (0x53be70), which writes the region record [0x5b5b30] and paints the source of the
 * CCD overlay (obs+0x550). The sky view publishes the request of every telescope (re)load; the camera reads it at Go (the region)
 * and at preparation (the same shared field, io/skyField.ts). A finder load does not touch it, and leaving the observatory keeps it,
 * as VIREO keeps the global until the next telescope load. */
export type TelescopeFieldLoad=Readonly<{anchor:Pointing;telescope:FieldTelescope;hidden:Pointing|null;currentJd:()=>number}>;
let current:TelescopeFieldLoad|null=null;
export function setTelescopeFieldLoad(load:TelescopeFieldLoad|null){current=load;}
export function telescopeFieldLoad():TelescopeFieldLoad|null{return current;}
