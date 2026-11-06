/** Front T2 (analysis/front-plans/front-teacher.md §T2, D3): VIREO's DemoBox ("Demonstration Mode", hint 'In Demonstration Mode,
 * the Login is not required.'), stored inverted as record+0x27c6 "login required" (OK 0x5a60b5; compiled 1 = off, 0x5a2abe).
 * At start-up FormCreate opens the instructor gate when the byte is 0 (0x587c50..0x587c73).
 * WEB-DM-01 [W]: here it is a per-browser setting in localStorage, off by default and changed only in the instructor options;
 * anyone using that browser then gets instructor mode at every page load. Leaving instructor mode does not clear it. Off is
 * stored as no key at all, so a browser that never turned it on keeps its storage empty. Every access is wrapped: unavailable
 * or failing storage reads as off and a failed write is reported to the caller. */
export const DEMONSTRATION_MODE_KEY='openvireo.demonstrationMode';
const ON='1';
type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const browserStorage=():StorageLike|null=>{try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}};

export function readDemonstrationMode(storage:()=>StorageLike|null=browserStorage):boolean{
 try{return storage()?.getItem(DEMONSTRATION_MODE_KEY)===ON;}catch{return false;}
}
/** Returns whether the browser kept the value. */
export function writeDemonstrationMode(on:boolean,storage:()=>StorageLike|null=browserStorage):boolean{
 if(typeof on!=='boolean')throw new TypeError('Invalid Demonstration Mode value');
 try{const s=storage();if(!s)return false;if(on)s.setItem(DEMONSTRATION_MODE_KEY,ON);else s.removeItem(DEMONSTRATION_MODE_KEY);return s.getItem(DEMONSTRATION_MODE_KEY)===(on?ON:null);}
 catch{return false;}
}
