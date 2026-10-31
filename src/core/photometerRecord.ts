/** Front R4c (analysis/front-r4/D-wedge-time-dependent.md §2.3; analysis/front-plans/front-r4c.md §2): the record rule of
 * TPhotometer.Record1Click 0x501e7c, through the Observational Results find-or-add 0x54a73c (core/recordReuse.ts). Static
 * reading of CLEA_VEO.exe 781bc970…c54c; nothing executed. Pure, and NOT wired: the web photometer notebook keeps one entry
 * per reading, not VIREO's per-star record with five band slots, and TObsRsltsDlg1's review and Cancel are not recovered, so
 * the photometer keeps its typed reason (docs/OPTICAL-OPTIONS.md).
 * - Time-Dependent Data off (compiled): the first record whose ID equals the star ID is reused (time +0x10 kept); RA/Dec
 *   (+0x18/+0x22) are filled from the pointing only when either is 0 (0x501ecb–0x501f2d); kind +0x5e := the reading's kind
 *   (0x501f31); band slot i (+0x2c + 10·i) is overwritten only by a nonzero reading (0x501f3d–0x501f89).
 * - On, or no match: a new zeroed record with the ID and the reading's time, filled the same way. */
import {recordReuseTarget,RECORD_ID_LENGTH} from './recordReuse';
export const PHOTOMETER_BANDS=5;
export type PhotometerResultRecord=Readonly<{id:string;time:number;ra:number;dec:number;kind:number;bands:readonly number[]}>;
export type PhotometerReadingInput=Readonly<{id:string;time:number;ra:number;dec:number;kind:number;bands:readonly number[]}>;
export function photometerRecord(records:readonly PhotometerResultRecord[],reading:PhotometerReadingInput,timeDependent:boolean):Readonly<{records:readonly PhotometerResultRecord[];index:number;reused:boolean}>{
 if(reading.bands.length!==PHOTOMETER_BANDS)throw new RangeError('bands');
 const hit=recordReuseTarget(records.map(r=>r.id),reading.id,timeDependent);
 const base:PhotometerResultRecord=hit===null?{id:reading.id.slice(0,RECORD_ID_LENGTH),time:reading.time,ra:0,dec:0,kind:0,bands:Array(PHOTOMETER_BANDS).fill(0)}:records[hit]!;
 const position=base.ra===0||base.dec===0?{ra:reading.ra,dec:reading.dec}:{ra:base.ra,dec:base.dec};
 const next:PhotometerResultRecord=Object.freeze({...base,...position,kind:reading.kind,bands:Object.freeze(base.bands.map((v,i)=>reading.bands[i]!==0?reading.bands[i]!:v))});
 const out=hit===null?[...records,next]:records.map((r,i)=>i===hit?next:r);
 return Object.freeze({records:Object.freeze(out),index:hit??out.length-1,reused:hit!==null});
}
