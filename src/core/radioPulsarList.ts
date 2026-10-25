// The shared catalog list cursor ([+0x5cd]+4) and the live-buffer seed as the web reaches them (CLEA_VEO.exe SHA-256
// 781bc970…c54c); see docs/RADIO-PULSAR-PARAMETERS.md (PP-05, PP-11, WEB-PP-ACT-01, WEB-PP-CUR-01). Pure helpers only: no
// React, I/O, clock, RNG, receiver session or window state. Nothing here writes the buffer: Receiver Open and the clock write
// it (the picker stays selectNearestPulsar); the modelled PulsarList1Click write has no UI caller (WEB-PP-LIST-03).
import type {RadioPointing} from './radioAntenna';
import type {PulsarCatalog} from './radioPulsarCatalog';
import type {PulsarSeed} from './radioPulsarParameters';
import type {RadioSourceBuffer} from './radioReceiver';
import {PULSAR_SELECT_CONSTANTS} from './radioPulsarSelect';

/**
 * End position of the shared list cursor after the picker 0x562830 (list helpers 0x492628..0x4926db: Reset, Next, Prior,
 * AtTail). Reset; loop 1 steps Next until |ΔRA| < 1 h (setb: NaN counts as inside) or AtTail, so with nothing inside the
 * cursor ends on the tail; otherwise Prior + Next return to that record and loop 2 steps Next until |ΔRA| > 1 h (ja: NaN and
 * equality continue) or AtTail. The end position never depends on the limit (2.0 at Open/PulsarList, 5.0 at the clock).
 * null: the cursor is untouched (a null catalog stands for Ready = 0; an empty array is the web guard of selectNearestPulsar).
 */
export function pulsarPickerCursor(catalog:PulsarCatalog|null,pointing:RadioPointing):number|null{
 if(catalog===null||catalog.length===0)return null;
 const span=PULSAR_SELECT_CONSTANTS.raWindowHours,last=catalog.length-1,gap=(i:number)=>Math.abs(pointing.ra-catalog[i].ra);
 let i=0;
 while(!(gap(i)<span||Number.isNaN(gap(i)))){if(i===last)return last;i++;}
 while(!(gap(i)>span)&&i!==last)i++;
 return i;
}

/** The names FormActivate 0x568c4c and the Find FormActivate 0x5685bc read from the live +0x5f7 buffer: both act only when
 * its J2000 length byte is non-zero, so a never-written buffer or a cleared name (miss) gives no seed, and the stale B1950
 * name behind a cleared J2000 name is never used, whatever the Find mode. */
export const pulsarSeedFromBuffer=(buffer:RadioSourceBuffer|null):PulsarSeed|null=>
 buffer===null||buffer.record===null||buffer.record.primaryName===''?null
  :Object.freeze({primaryName:buffer.record.primaryName,legacyName:buffer.record.legacyName});
