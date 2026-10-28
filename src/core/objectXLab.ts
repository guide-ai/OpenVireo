/** E08 Object X: hidden-identity targets, the student's answer and guide progress. Pure: no React, i18n, clock or I/O.
 *
 * The original manual gives the student only an identifier and coordinates and asks what kind of object it is (star, galaxy,
 * QSO, pulsar or asteroid). ObjectX.HTL holds the 17 targets; both its identifier and its remarks reveal the answer, so the web
 * shows each target as an opaque code (a hash of the identifier, not the file order) with its coordinates until the student
 * reveals it. The kind of each row below is read from the row's own remarks ("Very strong pulse!", "QSO - Z = …", "Galaxy",
 * "Star", "Asteroid", "Fast Moving Asteroid", "TNO - Dwarf Planet", "The 1st pulsar!"); it is used only after the reveal. */
import type {HtlList} from './hotList';
import {separationDegrees} from './ephemeris';

export const OBJECT_X_KINDS=['star','galaxy','qso','pulsar','asteroid'] as const;
export type ObjectXKind=(typeof OBJECT_X_KINDS)[number];
/** Kind of every ObjectX.HTL row, keyed by its trimmed identifier (from the remarks; Pluto counts as a moving solar-system object). */
export const OBJECT_X_ROW_KINDS:Readonly<Record<string,ObjectXKind>>=Object.freeze({
 '0329+54':'pulsar','0450-18':'pulsar','1919+21':'pulsar',
 'HE 0353-3919':'qso','3C 273.0':'qso','HS 1603+3820':'qso',
 'NGC 2403':'galaxy','NGC 4262':'galaxy','NGC 4449':'galaxy','NGC 4631':'galaxy',
 'N6000-00685':'star','N0730-00120':'star','N3730-01103':'star','N3000-01915':'star',
 '(136617) 1994 CC':'asteroid','(134340) Pluto':'asteroid','(433) Eros':'asteroid',
});
/** Original Object X default (TUTTimeDlg 0x4fde9c/0x4fdeb0, exercise 1 with an empty ID). */
export const OBJECT_X_DEFAULT_UTC='2009-06-01T04:00:00';
/** TUTTimeDlg IDEd MaxLength. */
export const OBJECT_X_ID_MAX=18;

/** Opaque, stable code of a target: FNV-1a 32 of the trimmed identifier, base 36, "X-" + 5 characters. */
export function objectXCode(id:string):string{
 let h=0x811c9dc5;
 for(const c of id.trim()){h^=c.charCodeAt(0);h=Math.imul(h,0x01000193)>>>0;}
 return 'X-'+h.toString(36).toUpperCase().padStart(7,'0').slice(-5);
}
export type ObjectXTarget=Readonly<{code:string;ra:number;dec:number}>;
/** Targets as the student sees them before the reveal: code and coordinates only, sorted by code (not file order). */
export function objectXTargets(list:HtlList):readonly ObjectXTarget[]{
 return Object.freeze(list.map(r=>Object.freeze({code:objectXCode(r.id),ra:r.ra,dec:r.dec})).sort((a,b)=>a.code<b.code?-1:a.code>b.code?1:0));
}
export type ObjectXReveal=Readonly<{id:string;remarks:string;kind:ObjectXKind|null}>;
/** Identity of a code (only for the reveal). */
export function revealObjectX(list:HtlList,code:string):ObjectXReveal|null{
 const row=list.find(r=>objectXCode(r.id)===code);if(!row)return null;
 const id=row.id.trim();
 return Object.freeze({id,remarks:row.remarks,kind:OBJECT_X_ROW_KINDS[id]??null});
}
/** "ObjX-<ID>" label of saved data, or "UNKNOWN" when the ID is empty (0x4fe079 and every "ObjX-" use). */
export function objectXDataLabel(id:string):string{
 const v=id.trim().slice(0,OBJECT_X_ID_MAX);return v&&v!=='UNKNOWN'?`ObjX-${v}`:'UNKNOWN';
}

export const OBJECT_X_LAB_STEPS=['target','clock','list','image','repeat','measure','classify','describe','reveal','save'] as const;
export type ObjectXLabStep=(typeof OBJECT_X_LAB_STEPS)[number];
export type ObjectXLabSummary=Readonly<{
 target:boolean;clockSet:boolean;listBuilt:boolean;images:number;imagesOfTarget:number;
 motionMeasured:boolean;answered:boolean;described:boolean;revealed:boolean;saved:boolean;
}>;
export const INITIAL_OBJECT_X_LAB_SUMMARY:ObjectXLabSummary=Object.freeze({target:false,clockSet:false,listBuilt:false,images:0,imagesOfTarget:0,motionMeasured:false,answered:false,described:false,revealed:false,saved:false});
export type ObjectXLabProgress=Readonly<{done:Readonly<Record<ObjectXLabStep,boolean>>;summary:ObjectXLabSummary}>;
/** "done" means the student did the step; nothing judges whether the answer is right before the reveal. "measure" is done
 * when a motion was measured or the student chose a non-moving answer (pulsars, stars, galaxies and QSOs do not move). */
export function objectXLabProgress(s:ObjectXLabSummary,answer:ObjectXKind|null=null):ObjectXLabProgress{
 const done={target:s.target,clock:s.clockSet,list:s.listBuilt,image:s.imagesOfTarget>0,repeat:s.imagesOfTarget>=2,
  measure:s.motionMeasured||(answer!==null&&answer!=='asteroid'),classify:s.answered,describe:s.described,reveal:s.revealed,save:s.saved};
 return Object.freeze({done:Object.freeze(done),summary:s});
}
export const sameObjectXLabSummary=(a:ObjectXLabSummary,b:ObjectXLabSummary)=>(Object.keys(a) as (keyof ObjectXLabSummary)[]).every(k=>a[k]===b[k]);
/** Field radius (degrees) within which an image counts as "of the target": half the 0.4 m field diagonal is ~0.2°. */
export const OBJECT_X_ON_TARGET_DEGREES=0.25;

/** [W] Radius around an unrevealed target inside which no instrument names a catalogue object (review 2 H1): the finder field
 * is 2.5°, so any object an observatory view can show next to the target is covered. */
export const OBJECT_X_HIDE_DEGREES=2;
export function objectXMasks(hidden:Readonly<{ra:number;dec:number}>|null,p:Readonly<{ra:number;dec:number}>):boolean{
 return !!hidden&&separationDegrees(p.ra,p.dec,hidden.ra,hidden.dec)<=OBJECT_X_HIDE_DEGREES;
}

/** What a camera exposure does with the Object X observable list (web wiring, not a recovered contract). A list current for
 * the exposure date is read by both cameras (the original IR copy 0x51e110 also draws moving objects, with IR offsets).
 * Otherwise a CCD exposure asks for a list to be built for the next image once the exercise has started; an IR exposure
 * never does, so IR images leave the Object X session (lists, images, exposures) unchanged. */
export type ObjectXCameraListUse='use'|'build'|'none';
export function objectXCameraListUse(o:Readonly<{camera:'ccd'|'ir';listCurrent:boolean;clockSet:boolean;hasList:boolean}>):ObjectXCameraListUse{
 if(o.listCurrent)return 'use';
 return o.camera==='ccd'&&(o.clockSet||o.hasList)?'build':'none';
}
