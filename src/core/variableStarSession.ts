import {variableStarDataLines,type VariableStarRecord} from './variableStars';
import {cepheidModel,lightCurveBounds} from './lightCurve';
/** Window state of the Variable Star Data / Simulated Light Curve pair (RECOVERY.md §1–§2, §6), kept out of React.
 * - opening a record: a fresh GCVS click — the previous list window is closed by Catalog Object OK/Cancel (0x560c5a,
 *   0x560fe4), whose FormClose 0x52dde8 also closes the light curve; FormShow 0x52d34c then rebuilds the eleven lines from
 *   the in-memory record;
 * - Display Light Curve (0x52d2d4): SetRecord → CepheidTypeObj Init, which writes 50 into a zero M−m/D word of the
 *   in-memory record (0x51f2d8); the list already shown is not rebuilt. When the axis range is zero, SetRecord 0x52b6f4
 *   divides by it (0x52b940) before Init (0x52b991) is reached, so the word stays 0 [D; synthetic records only];
 * - List Type Codes (0x52d334) only toggles its own check mark.
 * `riseDefaulted` lives for the page only; it is never saved, nor shared with the field engine [W]. */
export type VariableStarSession=Readonly<{
 /** `riseDefaulted`: these lines were built from the 50 that Init wrote (FormShow rebuilt them after the mutation). */
 list:Readonly<{index:number;lines:readonly string[];riseDefaulted:boolean}>|null;
 curve:number|null;
 riseDefaulted:ReadonlySet<number>;
 listTypeCodes:boolean;
}>;
export const INITIAL_VARIABLE_STAR_SESSION:VariableStarSession=Object.freeze({list:null,curve:null,riseDefaulted:Object.freeze(new Set<number>()),listTypeCodes:true});
export function openVariableStarList(s:VariableStarSession,record:VariableStarRecord):VariableStarSession{
 const defaulted=record.riseWord===0&&s.riseDefaulted.has(record.index);
 return Object.freeze({...s,curve:null,list:Object.freeze({index:record.index,lines:variableStarDataLines(record,defaulted),riseDefaulted:defaulted})});
}
/** Front T review 1 L1: GCVS in Catalog Object (0x561244) opens Variable Star Data on the field-list copy +0x5b points to; when
 * the dispatch's Cepheid Init wrote 50 into its zero word (0x51f2d8 [D]), the list shows 0.50 [I: FormShow rebuilds the lines from
 * that copy after the field load]. The page's own riseDefaulted set records it for this record index. */
export function openVariableStarListFromField(s:VariableStarSession,record:VariableStarRecord,riseWordDefaulted:boolean):VariableStarSession{
 const seeded=riseWordDefaulted&&record.riseWord===0&&!s.riseDefaulted.has(record.index)?Object.freeze({...s,riseDefaulted:Object.freeze(new Set([...s.riseDefaulted,record.index]))}):s;
 return openVariableStarList(seeded,record);
}
export function displayLightCurve(s:VariableStarSession,record:VariableStarRecord):VariableStarSession{
 if(!s.list||s.list.index!==record.index)return s;
 const reachesInit=initReached(record);
 const riseDefaulted=reachesInit&&record.riseWord===0&&!s.riseDefaulted.has(record.index)?Object.freeze(new Set([...s.riseDefaulted,record.index])):s.riseDefaulted;
 return Object.freeze({...s,curve:record.index,riseDefaulted});
}
/** False when SetRecord faults on a zero axis range before calling Init (the 'axis-range-zero' reason). */
function initReached(record:VariableStarRecord):boolean{
 const m=cepheidModel(record),b=lightCurveBounds(m.faint,m.bright);return b.faintBound-b.brightBound!==0;
}
export const closeVariableStarList=(s:VariableStarSession):VariableStarSession=>Object.freeze({...s,list:null,curve:null});
export const exitLightCurve=(s:VariableStarSession):VariableStarSession=>Object.freeze({...s,curve:null});
export const toggleListTypeCodes=(s:VariableStarSession):VariableStarSession=>Object.freeze({...s,listTypeCodes:!s.listTypeCodes});
