/** Catalog Object (TRefInfoForm1) and the Telescope-view pick (TObsrvtry.CRT1MouseUp), Front O FO-CO; docs/OBJECT-INFO-FORMS.md.
 * CLEA_VEO.exe 781bc970…c54c, static only (analysis/front-o-info-forms/RECOVERY-A-catalog-object.md §1–3, corrected by
 * RECOVERY-E §1–3). Records come from a certified field population (fieldEngine, read-only):
 * - star (NewGSC reader 0x59ad98): ID = band + '-' + the 5-character name at record +0x15 (0x59b125..0x59b196); RA/Dec Double;
 *   V, B−V, U−B Int16/1000 Singles; +0x35 = Int16 +0x12 unscaled; flags byte +0x14 bits 1/2/4/8 → spectral/luminosity/B−V/U−B
 *   assigned; spectral code Int32 +8; type 0; no GCVS record (+0x5b nil: the engine ports only the false variable merge).
 * - QSO (loader 0x5987e4): type 3, code 99, B−V/U−B flags from the QSO record, +0x35 = z.
 * - galaxy (GLX loader 0x598ed2..0x599069): colours and code always assigned from the morphology T (table below).
 * FormActivate 0x56005c + view pass (Telescope) 0x56058d/0x56096a + final 0x560a26: see catalogObjectView. In the web every edit
 * is read-only (record-edit-unavailable) and Update stays unavailable (update-master-catalog: 0x59a54c rewrites GSC\<band>.DAT).
 * Pick: 0x599f1c/0x59a010 (strict nearest below 350 px, first in list order on ties), star iff galaxyDist > starDist. Pure. */
import {createNativeSelectionScene,nearestCatalogObject,type ProjectedCatalogObject,type ProjectedGalaxy} from './objectSelection';
import {compactSpectralIndex} from './starTemplates';
import {formatObservationType} from './observationResults';
import {delphiFixed} from './variableStars';
import type {NativeFieldStar} from './pinnedNativeField';
import type {NativeQso} from './qsoMerge';
import type {NativeGalaxy} from './pinnedGalaxyField';
import type {FieldPopulation,FieldVariableInsertedStar} from './fieldEngine';
import {fieldStarVariable,type FieldStarVariable} from './variableDispatch';

export const CATALOG_OBJECT_LITERALS=Object.freeze({
 caption:'Catalog Object',type:'Type:',id:'ID #:',ra:'RA:',dec:'Dec:',mag:'V Mag:',bv:'B-V:',ub:'U-B:',spectral:'Spectral Type:',z:'Z:',size:'Size:',sizeHint:'Arc Minutes',
 ledHint:'If Red, value is assigned based on spectral/morphological type.',spLedHint:'If Red, entire classificaion is assigned.  If Yellow, luminosity class is assigned.',
 ok:'&OK',cancel:'&Cancel',update:'&Update',gcvs:'&GCVS',gcvsHint:'Access General Catalog of Varible Stars Data',
 variableStar:'Variable Star',star:'Star',asteroid:'Asteroid',nonStellar:'Non-Stellar',galaxy:'Galaxy',
 spectrum:'Spectrum:',redshiftedQso:'Redshifted QSO',typeLabel:'Type:',galaxyType:'Galaxy Type:',
 updateConfirm:'Are you sure you want to make changes to the Master Catalog?',updateConfirmCaption:'Update Master File?',
});
/** TiLedRound colours (DFM InactiveColor clLime; view pass ActiveColor $FF red in the Telescope view). */
export const LED_COLOURS=Object.freeze({inactive:'#00ff00',active:'#ff0000'});
/** TypeEd colours: $FF00FF (magenta) for variable/non-stellar, clWindow otherwise. */
export const TYPE_COLOURS=Object.freeze({highlight:'#ff00ff',window:null});

export type CatalogStarRecord=Readonly<{kind:'star';id:string;type:0|3;ra:number;dec:number;v:number;bv:number;ub:number;aux:number;
 flags:Readonly<{spectral:boolean;luminosity:boolean;bv:boolean;ub:boolean}>;code:number;variable:CatalogVariable|null}>;
/** Front T: the variable record (+0x5b) a TRUE dispatch left on this star (variableDispatch.ts fieldStarVariable); `valuesAvailable`
 * false when the field was built without an observatory-clock JD (variable-time-required). */
export type CatalogVariable=Readonly<{recordIndex:number;gcvsId:string;valuesAvailable:boolean;
 /** Cepheid Init (classes 0/1) wrote 50 into a zero M−m/D word of the field-list copy +0x5b points to (0x51f2d8). */
 riseWordDefaulted:boolean}>;
export type CatalogGalaxyRecord=Readonly<{kind:'galaxy';id:string;ra:number;dec:number;v:number;major:number;minor:number;z:number;morphology:number;bar:string;luminosity:string;ring:string}>;
export type CatalogRecord=CatalogStarRecord|CatalogGalaxyRecord;
export type CatalogObjectReason='variable-values-unavailable'|'galaxy-colour-residue'|'galaxy-type-fault'|'spectral-code-unformattable'|'instructor-value-masked';
export class CatalogObjectError extends Error{constructor(readonly code:'record'){super(`Catalog object: ${code}`);this.name='CatalogObjectError';}}

const bytesOf=(hex:string)=>Uint8Array.from(hex.match(/../g)!,x=>parseInt(x,16));
/** 0x59ad98: the 95-byte star record of one compact GSC record. */
export function catalogRecordFromStar(s:NativeFieldStar):CatalogStarRecord{
 const b=bytesOf(s.rawHex),len=b[0x15];
 if(len>5)throw new CatalogObjectError('record');
 let name='';for(let i=0;i<len;i++)name+=String.fromCharCode(b[0x16+i]);
 const q=s.qualityByte;
 return Object.freeze({kind:'star',id:`${s.band}-${name}`,type:0,ra:s.ra,dec:s.dec,v:s.magnitude,bv:s.photometry2Single,ub:s.photometry3Single,aux:s.auxiliarySingle,
  flags:Object.freeze({spectral:(q&1)!==0,luminosity:(q&2)!==0,bv:(q&4)!==0,ub:(q&8)!==0}),code:'fsc' in s&&s.fsc===true?0:compactSpectralIndex(s.rawHex),variable:null});
}
/** Front T, a star the TRUE dispatch kept (0x59864d / 0x59873e, then 0x51ec48): its name is the GCVS ID (0x403c5c), V, B−V,
 * U−B and the spectral code are the model's at the field's frozen JD, the flags are the dispatch's (+0x39/+0x3a := 0 with a code,
 * +0x3b/+0x3c := 0 when a colour was assigned), and +0x5b is the record. A miss-path star has no GSC record. Without a JD the
 * values are not shown (typed variable-values-unavailable). */
export function catalogRecordFromVariableStar(s:NativeFieldStar|FieldVariableInsertedStar,variable:FieldStarVariable):CatalogStarRecord{
 const gsc='rawHex' in s?catalogRecordFromStar(s):null,values=variable.values,computed=values.status==='computed'?values:null;
 return Object.freeze({kind:'star',id:variable.gcvsId,type:0,ra:s.ra,dec:s.dec,v:computed?computed.v:30,bv:computed?computed.bMinusV:30,ub:computed?computed.uMinusB:30,aux:gsc?gsc.aux:0,
  flags:Object.freeze(computed?{spectral:computed.flags.spectral,luminosity:computed.flags.luminosity,bv:computed.flags.bMinusV,ub:computed.flags.uMinusB}:{spectral:true,luminosity:true,bv:true,ub:true}),
  code:computed?computed.spectralCode:0,variable:Object.freeze({recordIndex:variable.recordIndex,gcvsId:variable.gcvsId,valuesAvailable:!!computed,riseWordDefaulted:variable.riseWordDefaulted})});
}
/** 0x5987e4: a merged QSO (type 3, code 99, +0x35 = z, B−V/U−B flags from the record). */
export function catalogRecordFromQso(q:NativeQso):CatalogStarRecord{
 return Object.freeze({kind:'star',id:q.name,type:3,ra:q.ra,dec:q.dec,v:q.magnitude,bv:q.colorBV,ub:q.colorUB,aux:q.redshift,
  flags:Object.freeze({spectral:false,luminosity:false,bv:q.flags[0]!==0,ub:q.flags[1]!==0}),code:99,variable:null});
}
/** GLX loader: morphology byte +34, bar/luminosity/ring characters +35/+36/+37 of the 59-byte record; the name is the
 * population's (renamed to its photograph when one is associated, 0x59911b). */
export function catalogRecordFromGalaxy(g:NativeGalaxy,name:string=g.id):CatalogGalaxyRecord{
 const b=bytesOf(g.rawHex);if(b.length!==59)throw new CatalogObjectError('record');
 const ch=(i:number)=>String.fromCharCode(b[i]);
 return Object.freeze({kind:'galaxy',id:name,ra:g.ra,dec:g.dec,v:g.magnitude,major:g.majorArcminutes,minor:g.minorArcminutes,z:g.redshift,morphology:g.morphology,bar:ch(35),luminosity:ch(36),ring:ch(37)});
}
export function catalogRecords(p:FieldPopulation):Readonly<{stars:readonly CatalogStarRecord[];galaxies:readonly CatalogGalaxyRecord[]}>{
 const renames=new Map((p.photographAssociations??[]).map(a=>[a.recordIndex,a.name]));
 return Object.freeze({
  stars:Object.freeze(p.stars.map(s=>{
   if(s.type===3)return catalogRecordFromQso(s as NativeQso);
   const variable=fieldStarVariable(p,s.id);
   return variable?catalogRecordFromVariableStar(s as NativeFieldStar|FieldVariableInsertedStar,variable):catalogRecordFromStar(s as NativeFieldStar);
  })),
  galaxies:Object.freeze(p.galaxies.map(g=>catalogRecordFromGalaxy(g,renames.get(g.recordIndex)??g.id))),
 });
}

/** 0x598ed2..0x599069: B−V, U−B and spectral text assigned from T (the '05' literal is the original's). T 17–19 and > 20 leave
 * uninitialised values: typed `galaxy-colour-residue`. */
export function galaxyColours(t:number):Readonly<{bv:number;ub:number}>|null{
 const f=Math.fround;
 if(t===-9)return {bv:f(-.35),ub:f(-1.15)};
 if(t<=-5)return {bv:f(.92),ub:f(.5)};if(t<=0)return {bv:f(.92),ub:f(.48)};if(t<=2)return {bv:f(.82),ub:f(.28)};
 if(t===3)return {bv:f(.81),ub:f(.27)};if(t===4)return {bv:f(.63),ub:f(-.02)};if(t<=9)return {bv:f(.52),ub:f(-.12)};
 if(t<=16)return {bv:f(.5),ub:f(-.2)};if(t===20)return {bv:f(.7),ub:f(0)};return null;
}
const GALAXY_TYPES:Readonly<Record<number,string>>=Object.freeze({[-9]:'QSO/AGN',[-8]:'',[-7]:'Unclassified Elliptical',[-6]:'Compact Elliptical',[-5]:'E, dwarf E',[-4]:'E/SO',[-3]:'L-, S0-',[-2]:'L, S0',[-1]:'L+, S0+',0:'S0/a, S0-a',1:'Sa',2:'Sab',3:'Sb',4:'Sbc',5:'Sc',6:'Scd',7:'Sd',8:'Sdm',9:'Sm',10:'Im',11:'Compact Irregular',15:'Peculiar, Unclassifiable',16:'Irr II',20:'Unclassified Spiral'});
const LUMINOSITY=['','I','I-II','II','II-III','III','III-IV','IV','IV-V','V'];
/** 0x596820 (tables 0x5b51df, 0x5b5465). A bar character with a base lacking 'S'/'I' dereferences nil natively: typed fault. */
export function galaxyTypeText(g:Pick<CatalogGalaxyRecord,'morphology'|'bar'|'luminosity'|'ring'>):string|null{
 // The table at 0x5b51df + 31·T is read for T −9..20 (T −9 'QSO/AGN' at 0x5b50c8, review 1 L1); outside that range: typed.
 if(!Number.isInteger(g.morphology)||g.morphology<-9||g.morphology>20)return null;
 let s=GALAXY_TYPES[g.morphology]??'';
 if(g.bar!==' '){
  const i=[...s].findIndex(c=>c==='S'||c==='I');if(i<0)return null;s=s.slice(i);
  if(g.bar==='X')s=s.slice(0,1)+'AB'+s.slice(1);else if(g.bar==='B')s=s.slice(0,1)+'B'+s.slice(1);
 }
 if(g.ring!==' ')s+='('+g.ring+')';
 if(g.luminosity!==' '){const n=/^[0-9]$/.test(g.luminosity)?Number(g.luminosity):NaN;if(!(n>=1&&n<=9))return null;s+=' '+LUMINOSITY[n];}
 return s;
}
/** FloatToStrF(x, ffExponent, 4, 2) (0x48634c → RTL 0x40cf28): d.dddE±XX. */
export function floatToStrFExponent4(x:number):string{
 if(!Number.isFinite(x))throw new CatalogObjectError('record');
 if(x===0)return '0.000E+00';
 const [m,e]=x.toExponential(3).split('e'),n=Number(e);
 return `${m}E${n<0?'-':'+'}${String(Math.abs(n)).padStart(2,'0')}`;
}
/** 0x55d4f4 for the codes the field records carry: the ported formatter (formatObservationType, equal for valid codes),
 * code 99 (QSO) → '0' (RECOVERY-E §2); any other code the port cannot format is a typed reason (0x55d4f4 never raises). */
export function nativeSpectralText(code:number):string|null{
 if(code===99)return '0';
 try{return formatObservationType(code);}catch{return null;}
}
const F3=(x:number)=>delphiFixed(x,3),blank30=(x:number)=>x>=30?'':F3(x);
export type LedView=Readonly<{active:boolean;colour:string}>;
export type CatalogObjectView=Readonly<{
 type:string;typeHighlight:boolean;id:string;ra:string;dec:string;mag:string;bv:string;ub:string;
 spLabel:string;sp:string;zEnabled:boolean;z:string;sizeEnabled:boolean;size:string;
 bvLed:LedView;ubLed:LedView;spLed:LedView;gcvsEnabled:boolean;reasons:readonly CatalogObjectReason[];
}>;
const led=(active:boolean):LedView=>Object.freeze({active,colour:active?LED_COLOURS.active:LED_COLOURS.inactive});
/** FormActivate + Telescope view pass + final pass for one record. RA 0x486ca0(2,'h ','m ','s'), Dec 0x486ca0(1,'° ',"' ",'"'). */
/** `maskGalaxyRedshift` [W] (review 1 M2): web Edit Mode has no instructor login, and a galaxy's catalogue z is the E01/E02
 * answer, so the web masks it (typed instructor-value-masked); the original keeps it behind the login. */
export function catalogObjectView(r:CatalogRecord,format:(v:number,d:1|2,s:readonly [string,string,string])=>string,options:Readonly<{maskGalaxyRedshift?:boolean}>={}):CatalogObjectView{
 const L=CATALOG_OBJECT_LITERALS,ra=format(r.ra,2,['h ','m ','s']),dec=format(r.dec,1,['° ',"' ",'"']),reasons:CatalogObjectReason[]=[];
 if(r.kind==='galaxy'){
  const c=galaxyColours(r.morphology);if(!c)reasons.push('galaxy-colour-residue');
  const type=galaxyTypeText(r);if(type===null)reasons.push('galaxy-type-fault');
  if(options.maskGalaxyRedshift)reasons.push('instructor-value-masked');
  return Object.freeze({type:L.galaxy,typeHighlight:false,id:r.id,ra,dec,mag:F3(r.v),bv:c?blank30(c.bv):'',ub:c?blank30(c.ub):'',spLabel:L.galaxyType,sp:type??'',
   zEnabled:true,z:options.maskGalaxyRedshift?'':floatToStrFExponent4(r.z),sizeEnabled:true,size:r.major===0?'':delphiFixed(r.major,1)+(r.minor!==0?'x'+delphiFixed(r.minor,1):''),
   bvLed:led(true),ubLed:led(true),spLed:led(false),gcvsEnabled:false,reasons:Object.freeze(reasons)});
 }
 if(r.type===3)return Object.freeze({type:L.nonStellar,typeHighlight:true,id:r.id,ra,dec,mag:blank30(r.v),bv:blank30(r.bv),ub:blank30(r.ub),spLabel:L.spectrum,sp:L.redshiftedQso,
  zEnabled:true,z:F3(r.aux),sizeEnabled:false,size:'',bvLed:led(r.flags.bv),ubLed:led(r.flags.ub),spLed:led(false),gcvsEnabled:false,reasons:Object.freeze([])});
 const unavailable=r.variable!==null&&!r.variable.valuesAvailable;if(unavailable)reasons.push('variable-values-unavailable');
 const sp=unavailable?'':nativeSpectralText(r.code);if(sp===null)reasons.push('spectral-code-unformattable');
 return Object.freeze({type:r.variable?L.variableStar:L.star,typeHighlight:!!r.variable,id:r.id,ra,dec,mag:blank30(r.v),bv:blank30(r.bv),ub:blank30(r.ub),spLabel:L.spectral,sp:sp??'',
  zEnabled:false,z:'',sizeEnabled:false,size:'',bvLed:led(r.flags.bv),ubLed:led(r.flags.ub),spLed:led(r.flags.spectral||r.flags.luminosity),
  gcvsEnabled:r.type===0&&r.variable!==null,reasons:Object.freeze(reasons)});
}

/** Fresh unpanned telescope frame (936² raster over 0.75°, crop 312² anchored at 468 ± 156: FIELD-ENGINE §6). */
export type CatalogFrame=Readonly<{width:number;height:number;fieldDegrees:number;crop:number;cropOrigin:number}>;
export const TELESCOPE_FRAME:CatalogFrame=Object.freeze({width:936,height:936,fieldDegrees:.75,crop:312,cropOrigin:312});
export type CatalogScene=Readonly<{stars:readonly ProjectedCatalogObject[];galaxies:readonly ProjectedGalaxy[];records:Readonly<{stars:readonly CatalogStarRecord[];galaxies:readonly CatalogGalaxyRecord[]}>}>;
/** Front G5: the finder frame (0x53bae4/0x5949c8: 936² over 3 × Finder Field 2.50° = 7.5°, the same 312² crop). */
export const FINDER_CATALOG_FRAME:CatalogFrame=Object.freeze({width:936,height:936,fieldDegrees:7.5,crop:312,cropOrigin:312});
export function catalogScene(p:FieldPopulation,center:Readonly<{ra:number;dec:number}>,provenance:string,F:CatalogFrame=TELESCOPE_FRAME):CatalogScene{
 const records=catalogRecords(p);
 const scene=createNativeSelectionScene(records.stars.map((s,i)=>({id:`s${i}`,ra:s.ra,dec:s.dec})),records.galaxies.map((g,i)=>({id:`g${i}`,ra:g.ra,dec:g.dec,majorArcminutes:g.major})),
  {width:F.width,height:F.height,fieldDegrees:F.fieldDegrees,center,population:{coverage:'complete',provenance}});
 return Object.freeze({stars:scene.stars,galaxies:scene.galaxies,records});
}
/** Click (control pixels of the 312² Telescope display) → raster point: px := X + 312 for a fresh unpanned field [I/W: the
 * view-offset terms E[+0x41c439]−E[+0x6a6] are untraced]. Then MouseUp step 5. */
export function pickCatalogObject(scene:CatalogScene,controlX:number,controlY:number):CatalogRecord|null{
 const x=Math.trunc(controlX)+TELESCOPE_FRAME.cropOrigin,y=Math.trunc(controlY)+TELESCOPE_FRAME.cropOrigin;
 const star=nearestCatalogObject(scene.stars,x,y),galaxy=nearestCatalogObject(scene.galaxies,x,y);
 const sd=star?star.distance:1000,gd=galaxy?galaxy.distance:1000;
 if(star&&gd>sd)return scene.records.stars[star.index];
 if(galaxy)return scene.records.galaxies[galaxy.index];
 return null;
}
