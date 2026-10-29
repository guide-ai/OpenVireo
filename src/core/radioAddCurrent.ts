/** Radio Slew ▸ Hot List ▸ Add Current Item to List... (TRadioLab +0x480 AddCurrentItemtoList1, PListAddClick 0x567c5c; Front R1,
 * docs/RADIO-CAMERA-R1.md). Static reading of CLEA_VEO.exe (781bc970…c54c), research analysis/front-r1-radio-camera/
 * A-radio-addcurrent-savedata.md and C-radio-options-sound.md. Pure.
 * - Coordinates: the pulsar buffer's catalogue position when Exact Pos for Hot List (options byte 0x93e, compiled default 0 at
 *   0x5a9098) is set and the buffer's name ShortString (length byte +0x5f7) is non-empty; a receiver miss clears that name,
 *   which the web buffer models by an empty primaryName. Otherwise the current antenna pointing. Unreachable while Exact Pos
 *   is the read-only compiled 0.
 * - ID: Pulsar Identification (byte 0x939, compiled default 1 "Use B1950 Name" at 0x5a908a): 0 none, 1 the B1950 name, 2 the
 *   J2000 name. The copy does not test whether a pulsar is in the buffer (an empty buffer gives an empty ID). Remarks are always
 *   cleared. The ID is copied as stored (no trim), cut to the edit's 24 characters.
 * - In the Object X exercise (env+0x383f = 1, 0x567d1e) the ID is ALWAYS "ObjX-" + the target ID (or UNKNOWN), whatever the
 *   pointing or the buffer holds (review M2): the caller passes the web's label for the hidden target. [W] After the reveal the
 *   web no longer hides the target and uses the pulsar name.
 * - The record goes to the shared THOVerifyDlg and, on OK, to 0x590588 (Front P RA-ordered placement). */
import type {HtlFields} from './hotList';
import type {PulsarRecord} from './radioPulsarCatalog';

export const RADIO_ADD_CURRENT_COMPILED=Object.freeze({exactPosition:false,pulsarIdentification:1 as 0|1|2});
export type RadioAddCurrentOptions=Readonly<{exactPosition:boolean;pulsarIdentification:0|1|2}>;
/** `objectXLabel`: the web's label of the hidden Object X target, standing for VIREO's "ObjX-" + target ID; when given, the
 * buffer's names are never read. */
export function radioAddCurrentFields(pointing:Readonly<{ra:number;dec:number}>,buffer:PulsarRecord|null,options:RadioAddCurrentOptions=RADIO_ADD_CURRENT_COMPILED,objectXLabel:string|null=null):HtlFields{
 const useCatalog=options.exactPosition&&buffer!==null&&buffer.primaryName!=='';
 const id=objectXLabel!==null?objectXLabel:options.pulsarIdentification===1?(buffer?.legacyName??''):options.pulsarIdentification===2?(buffer?.primaryName??''):'';
 return Object.freeze({id:id.slice(0,24),remarks:'',ra:useCatalog?buffer!.ra:pointing.ra,dec:useCatalog?buffer!.dec:pointing.dec});
}
