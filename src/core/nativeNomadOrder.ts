/** Structured sorted-list insertion contract0x492728 with comparator0x59be88.
 * This is a data-structure port,not a CPU/runtime emulator or stable JS sort.
 * Cursor position affects equal-coordinate order. Number keys only. */
type CoordinateEntry=Readonly<{result:Readonly<{row:Readonly<{raHours:number;decDegrees:number}>}>}>;
export function orderNativeNomadEntries<T extends CoordinateEntry>(input:readonly T[]):readonly T[]{
 if(!Array.isArray(input)||input.length>10000||input.some(e=>!e?.result?.row||!Number.isFinite(e.result.row.raHours)||!Number.isFinite(e.result.row.decDegrees)))throw new Error('Unsupported bounded catalog ordering input');
 const ordered:T[]=[];let cursor=0;
 const after=(a:T,b:T)=>a.result.row.raHours===b.result.row.raHours?a.result.row.decDegrees>b.result.row.decDegrees:a.result.row.raHours>b.result.row.raHours;
 for(const value of input){
  if(ordered.length===0){ordered.push(value);continue;}
  let current=ordered[cursor];
  if(after(value,current)){
   while(cursor<ordered.length-1&&!after(current,value))current=ordered[++cursor];
   if(after(current,value))cursor--;
  }else{
   while(cursor>0&&!after(value,current))current=ordered[--cursor];
   if(cursor===0&&after(current,value)){ordered.unshift(value);cursor=0;continue;}
  }
  ordered.splice(++cursor,0,value);
 }
 return Object.freeze(ordered);
}
