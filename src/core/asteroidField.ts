/** E08 Object X (X4): the "Current Observable Asteroids" list (0x519e94) and the moving pairs that ComputeMovers 0x59940c
 * hands to the CCD field (0x522718). Pure. Evidence: research notes-x0b.md (front-x-objectx-20261027), docs/OBJECT-X.md.
 *
 * Recovered: every record is evaluated with the mode-2 ephemeris at the list date; it is kept when V ≤ the limiting magnitude
 * (default 16, single at 0x5bc94b) and either a near-Earth flag is set (AST byte 0x9c ∈ {1,2,4}; MPC byte 0xa0 ∈ {2,3,4}) or
 * its RA lies within ±3 h of the antisolar point (wrap-aware; Dec unrestricted). A record whose ephemeris fails is skipped and
 * the list continues (the original continues past a bad record, 0x5159aa → 0x515abd); the web also counts it with its typed
 * reason. Moving pairs: one position at T (exposure start) and one at T + exposure, magnitude V at T stored as Single, name
 * "(number) name" trimmed to 24 characters.
 *
 * Web adaptations (labelled): the observable list is sorted by RA (the original comparator is not recovered); the CCD field box
 * that pre-filters the list (0x51a4d8) is not recovered, so the web keeps list entries within FIELD_BOX_DEGREES of the pointing
 * at their list position; at most MAX_FIELD_PAIRS pairs, brightest first (the composer accepts 256 extras). */
import {orbitRecordCount,readOrbitRecord,type OrbitRecord} from './orbitFile';
import {EphemerisError,astrometricPosition,eclipticToEquatorial,elementsFromState,separationDegrees,sunGeometric} from './ephemeris';
import type {CameraExtraSource} from './cameraExposure';

/** 0x519357: type by file name (upper-cased): OBJX_AST → 0, OBJX_MPC → 1, else 2 (no list is built). */
export type OrbitFileType=0|1|2;
export function orbitFileType(name:string):OrbitFileType{
 const upper=String(name).toUpperCase();
 return upper.includes('OBJX_AST')?0:upper.includes('OBJX_MPC')?1:2;
}
export const DEFAULT_LIMITING_MAGNITUDE=16;
export const OPPOSITION_WINDOW_HOURS=3;
/** [W] Half-size of the web field box around the pointing (the original CCD field box source is not recovered). */
export const FIELD_BOX_DEGREES=2;
/** [W] Cap of moving pairs per exposure (the composer accepts at most 256 extra sources). */
export const MAX_FIELD_PAIRS=128;

export type AsteroidErrorCode='ephemeris'|'record';
export type AsteroidError=Readonly<{index:number;code:AsteroidErrorCode;reason:string}>;
export type ObservableAsteroid=Readonly<{
 index:number;label:string;raHours:number;decDeg:number;
 /** V and Δ (AU) as Singles, as the list entry stores them. */
 magnitude:number;deltaAu:number;
 nea:boolean;
 /** The four note columns (1)–(4), 0 when blank. */
 notes:readonly [number,number,number,number];
}>;
export type ObservableList=Readonly<{
 jd:number;fileType:OrbitFileType;limit:number;oppositionRaHours:number;records:number;
 entries:readonly ObservableAsteroid[];neaCount:number;oppositionCount:number;errors:readonly AsteroidError[];
}>;

/** "(number) name" with trailing blanks trimmed, at most 24 characters; just the name when the number is empty. */
export function asteroidLabel(record:Pick<OrbitRecord,'name'|'number'>):string{
 const text=record.number?`(${record.number}) ${record.name}`:record.name;
 return text.replace(/ +$/,'').slice(0,24);
}
/** RA (hours) of the antisolar point at jd: the Sun's geometric longitude + π on the ecliptic, to equatorial. */
export function oppositionRaHours(jd:number):number{
 const sun=sunGeometric(jd);
 const eq=eclipticToEquatorial({jd,longitude:sun.longitude+Math.PI,latitude:0});
 let h=eq.ra*12/Math.PI;while(h<0)h+=24;while(h>=24)h-=24;return h;
}
/** Wrap-aware RA window test [lo, hi] in hours. */
export function raInWindow(ra:number,lo:number,hi:number):boolean{
 return lo<=hi?ra>=lo&&ra<=hi:ra>=lo||ra<=hi;
}
function neaFlag(r:OrbitRecord,type:OrbitFileType):boolean{
 return type===0?[1,2,4].includes(r.flags[0]):[2,3,4].includes(r.flags[4]);
}
function notes(r:OrbitRecord,type:OrbitFileType):readonly [number,number,number,number]{
 const f=r.flags;// flags[k] = byte 0x9c + k
 return Object.freeze(type===0?[f[0],f[1],f[3],f[5]]:[f[4],f[1],f[2],f[5]]) as readonly [number,number,number,number];
}
const reasonOf=(e:unknown)=>e instanceof EphemerisError?e.code:e instanceof Error?e.name:'unknown';

export type ObservableScan={entries:ObservableAsteroid[];errors:AsteroidError[];neaCount:number;oppositionCount:number};
export const newObservableScan=():ObservableScan=>({entries:[],errors:[],neaCount:0,oppositionCount:0});
/** Scans records [from, to) into `scan` (lets a caller split the work across frames). */
export function scanObservable(bytes:Uint8Array,type:OrbitFileType,jd:number,limit:number,from:number,to:number,scan:ObservableScan):ObservableScan{
 const opp=oppositionRaHours(jd),lo=(opp-OPPOSITION_WINDOW_HOURS+24)%24,hi=(opp+OPPOSITION_WINDOW_HOURS)%24;
 const singleLimit=Math.fround(limit);
 for(let i=from;i<to;i++){
  let record:OrbitRecord;
  try{record=readOrbitRecord(bytes,i);}catch(e){scan.errors.push(Object.freeze({index:i,code:'record',reason:reasonOf(e)}));continue;}
  let p;
  try{p=astrometricPosition(elementsFromState(record),jd);}catch(e){scan.errors.push(Object.freeze({index:i,code:'ephemeris',reason:reasonOf(e)}));continue;}
  if(!Number.isFinite(p.magnitude)){scan.errors.push(Object.freeze({index:i,code:'ephemeris',reason:'nonfinite'}));continue;}
  if(p.magnitudeSingle>singleLimit)continue;
  const nea=neaFlag(record,type);
  if(nea)scan.neaCount++;
  else if(raInWindow(p.raHours,lo,hi))scan.oppositionCount++;
  else continue;
  scan.entries.push(Object.freeze({index:i,label:asteroidLabel(record),raHours:p.raHours,decDeg:p.decDeg,magnitude:p.magnitudeSingle,deltaAu:p.deltaSingle,nea,notes:notes(record,type)}));
 }
 return scan;
}
export function finishObservableList(bytes:Uint8Array,type:OrbitFileType,jd:number,limit:number,scan:ObservableScan):ObservableList{
 const entries=[...scan.entries].sort((a,b)=>a.raHours-b.raHours||a.index-b.index);
 return Object.freeze({jd,fileType:type,limit,oppositionRaHours:oppositionRaHours(jd),records:orbitRecordCount(bytes),
  entries:Object.freeze(entries),neaCount:scan.neaCount,oppositionCount:scan.oppositionCount,errors:Object.freeze([...scan.errors])});
}
/** Whole list at once. Type 2 (unrecognised file name) builds no list, as in the original. */
export function buildObservableList(bytes:Uint8Array,type:OrbitFileType,jd:number,limit=DEFAULT_LIMITING_MAGNITUDE):ObservableList|null{
 if(type===2)return null;
 const n=orbitRecordCount(bytes);
 return finishObservableList(bytes,type,jd,limit,scanObservable(bytes,type,jd,limit,0,n,newObservableScan()));
}

export type MovingPair=Readonly<{index:number;label:string;source:CameraExtraSource;startMagnitude:number;endMagnitude:number}>;
export type MovingPairs=Readonly<{jd:number;seconds:number;pairs:readonly MovingPair[];candidates:number;truncated:number;errors:readonly AsteroidError[]}>;
/** ComputeMovers for one exposure: list entries inside the web field box, each evaluated at T and T + seconds. */
export function movingPairs(bytes:Uint8Array,list:ObservableList,pointing:Readonly<{ra:number;dec:number}>,jd:number,seconds:number):MovingPairs{
 if(!Number.isFinite(jd)||!Number.isFinite(seconds)||seconds<0)throw new RangeError('movingPairs: time');
 const dt=seconds/86400,candidates=list.entries.filter(e=>separationDegrees(e.raHours,e.decDeg,pointing.ra,pointing.dec)<=FIELD_BOX_DEGREES);
 const pairs:MovingPair[]=[],errors:AsteroidError[]=[];
 for(const e of candidates){
  try{
   const el=elementsFromState(readOrbitRecord(bytes,e.index));
   const a=astrometricPosition(el,jd),b=dt===0?a:astrometricPosition(el,jd+dt);
   if(!Number.isFinite(a.magnitudeSingle)||Math.abs(a.magnitudeSingle)>50){errors.push(Object.freeze({index:e.index,code:'ephemeris',reason:'nonfinite'}));continue;}
   pairs.push(Object.freeze({index:e.index,label:e.label,startMagnitude:a.magnitudeSingle,endMagnitude:b.magnitudeSingle,
    source:Object.freeze({raHours:a.raHours,decDeg:a.decDeg,storedMag:a.magnitudeSingle,kind:'pair' as const,end:Object.freeze({raHours:b.raHours,decDeg:b.decDeg})})}));
  }catch(err){errors.push(Object.freeze({index:e.index,code:'ephemeris',reason:reasonOf(err)}));}
 }
 const ordered=pairs.sort((x,y)=>x.startMagnitude-y.startMagnitude||x.index-y.index),kept=ordered.slice(0,MAX_FIELD_PAIRS);
 return Object.freeze({jd,seconds,pairs:Object.freeze(kept),candidates:candidates.length,truncated:ordered.length-kept.length,errors:Object.freeze(errors)});
}
