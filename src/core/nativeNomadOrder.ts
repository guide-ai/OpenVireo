/** Structured sorted-list insertion contract0x492728 with comparator0x59be88.
 * This is a data-structure port,not a CPU/runtime emulator or stable JS sort.
 * Cursor position affects equal-coordinate order. Number keys only.
 *
 * Linear-time equivalent of the cursor walk (front C review fix H1). The native cursor always rests on the record
 * just inserted, so each new record compares with the previous input record:
 *  - greater (comparator 'after') -> the forward walk stops at the first strictly greater record: the new record goes
 *    after every equal record (end of its key group);
 *  - otherwise -> the backward walk stops at the first strictly smaller record: the new record goes before every equal
 *    record (front of its group), except that when no smaller record exists the walk ends on index 0 and the record
 *    goes after that first element (position 1 of a non-empty group at the head of the list).
 * nativeNomadOrder.test.ts checks this against the literal cursor walk on random inputs with many ties. */
type CoordinateEntry=Readonly<{result:Readonly<{row:Readonly<{raHours:number;decDegrees:number}>}>}>;
/** [W] Bound equal to the VizieR reader's row bound; the native list has no fixed cap. */
export const NATIVE_NOMAD_ORDER_LIMIT=60_000;
export class NativeNomadOrderError extends Error {
 constructor(){super('Unsupported bounded catalog ordering input');this.name='NativeNomadOrderError';}
}
export function orderNativeNomadEntries<T extends CoordinateEntry>(input:readonly T[]):readonly T[]{
 if(!Array.isArray(input)||input.length>NATIVE_NOMAD_ORDER_LIMIT||input.some(e=>!e?.result?.row||!Number.isFinite(e.result.row.raHours)||!Number.isFinite(e.result.row.decDegrees)))throw new NativeNomadOrderError();
 const groups=new Map<number,Map<number,T[]>>();let minRa=Infinity,minDec=Infinity,previous:T|null=null;
 const after=(a:T,b:T)=>a.result.row.raHours===b.result.row.raHours?a.result.row.decDegrees>b.result.row.decDegrees:a.result.row.raHours>b.result.row.raHours;
 for(const value of input){
  const {raHours:ra,decDegrees:dec}=value.result.row;
  let byDec=groups.get(ra);if(!byDec){byDec=new Map();groups.set(ra,byDec);}
  let group=byDec.get(dec);if(!group){group=[];byDec.set(dec,group);}
  if(previous===null||after(value,previous))group.push(value);
  else{
   const smallerExists=minRa<ra||(minRa===ra&&minDec<dec);
   if(!smallerExists&&group.length>0)group.splice(1,0,value);else group.unshift(value);
  }
  if(ra<minRa||(ra===minRa&&dec<minDec)){minRa=ra;minDec=dec;}
  previous=value;
 }
 const ordered:T[]=[];
 for(const ra of [...groups.keys()].sort((a,b)=>a-b)){const byDec=groups.get(ra)!;for(const dec of [...byDec.keys()].sort((a,b)=>a-b))ordered.push(...byDec.get(dec)!);}
 return Object.freeze(ordered);
}
