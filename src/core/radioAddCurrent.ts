/** Radio Slew ▸ Hot List ▸ Add Current Item to List... (TRadioLab +0x480 AddCurrentItemtoList1, PListAddClick 0x567c5c; Front R1,
 * docs/RADIO-ADD-CURRENT.md). Static reading of CLEA_VEO.exe (781bc970…c54c), research analysis/front-r1-radio-camera/
 * A-radio-addcurrent-savedata.md and C-radio-options-sound.md. Pure.
 * - Coordinates: the pulsar buffer's catalogue position when Exact Pos for Hot List (options byte 0x93e, compiled default 0 at
 *   0x5a9098) is set and the buffer holds a pulsar; otherwise the current antenna pointing.
 * - ID: Pulsar Identification (byte 0x939, compiled default 1 "Use B1950 Name" at 0x5a908a): 0 none, 1 the B1950 name, 2 the
 *   J2000 name. The copy does not test whether a pulsar is in the buffer (an empty buffer gives an empty ID). Remarks are always
 *   cleared. In the Object X exercise the ID is "ObjX-" + the target ID instead.
 * - The record goes to the shared THOVerifyDlg and, on OK, to 0x590588 (Front P RA-ordered placement). */
import type {HtlFields} from './hotList';
import type {PulsarRecord} from './radioPulsarCatalog';

export const RADIO_ADD_CURRENT_COMPILED=Object.freeze({exactPosition:false,pulsarIdentification:1 as 0|1|2});
export type RadioAddCurrentOptions=Readonly<{exactPosition:boolean;pulsarIdentification:0|1|2}>;
/** `objectXLabel`: the web's Object X label for the pointing (e.g. "ObjX-7"), standing for VIREO's "ObjX-" + target ID. */
export function radioAddCurrentFields(pointing:Readonly<{ra:number;dec:number}>,buffer:PulsarRecord|null,options:RadioAddCurrentOptions=RADIO_ADD_CURRENT_COMPILED,objectXLabel:string|null=null):HtlFields{
 const useCatalog=options.exactPosition&&buffer!==null;
 const id=objectXLabel!==null?objectXLabel:options.pulsarIdentification===1?(buffer?.legacyName??''):options.pulsarIdentification===2?(buffer?.primaryName??''):'';
 return Object.freeze({id:id.trim().slice(0,24),remarks:'',ra:useCatalog?buffer!.ra:pointing.ra,dec:useCatalog?buffer!.dec:pointing.dec});
}
