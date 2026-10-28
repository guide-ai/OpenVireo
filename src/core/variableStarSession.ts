import {variableStarDataLines,type VariableStarRecord} from './variableStars';
/** Window state of the Variable Star Data / Simulated Light Curve pair (RECOVERY.md §1–§2, §6), kept out of React.
 * - opening a record: a fresh GCVS click — the previous list window is closed by Catalog Object OK/Cancel (0x560c5a,
 *   0x560fe4), whose FormClose 0x52dde8 also closes the light curve; FormShow 0x52d34c then rebuilds the eleven lines from
 *   the in-memory record;
 * - Display Light Curve (0x52d2d4): SetRecord → CepheidTypeObj Init, which writes 50 into a zero M−m/D word of the
 *   in-memory record (0x51f2d8); the list already shown is not rebuilt;
 * - List Type Codes (0x52d334) only toggles its own check mark.
 * `riseDefaulted` lives for the page only; it is never saved, nor shared with the field engine [W]. */
export type VariableStarSession=Readonly<{
 list:Readonly<{index:number;lines:readonly string[]}>|null;
 curve:number|null;
 riseDefaulted:ReadonlySet<number>;
 listTypeCodes:boolean;
 help:boolean;
}>;
export const INITIAL_VARIABLE_STAR_SESSION:VariableStarSession=Object.freeze({list:null,curve:null,riseDefaulted:Object.freeze(new Set<number>()),listTypeCodes:true,help:false});
export function openVariableStarList(s:VariableStarSession,record:VariableStarRecord):VariableStarSession{
 return Object.freeze({...s,curve:null,help:false,list:Object.freeze({index:record.index,lines:variableStarDataLines(record,s.riseDefaulted.has(record.index))})});
}
export function displayLightCurve(s:VariableStarSession,record:VariableStarRecord):VariableStarSession{
 if(!s.list||s.list.index!==record.index)return s;
 const riseDefaulted=record.riseWord===0&&!s.riseDefaulted.has(record.index)?Object.freeze(new Set([...s.riseDefaulted,record.index])):s.riseDefaulted;
 return Object.freeze({...s,curve:record.index,riseDefaulted});
}
export const closeVariableStarList=(s:VariableStarSession):VariableStarSession=>Object.freeze({...s,list:null,curve:null,help:false});
export const exitLightCurve=(s:VariableStarSession):VariableStarSession=>Object.freeze({...s,curve:null});
export const toggleListTypeCodes=(s:VariableStarSession):VariableStarSession=>Object.freeze({...s,listTypeCodes:!s.listTypeCodes});
export const toggleVariableHelp=(s:VariableStarSession):VariableStarSession=>s.list?Object.freeze({...s,help:!s.help}):s;
