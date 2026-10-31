/** Save Image with VIREO's own header (Front R1): the keyword writer 0x523218 of CLEA_VEO.exe, static reading only
 * (analysis/front-r1-radio-camera/D-camera.md §4). The web FITS in fitsWriter.ts stays the default.
 * [D] Card formatters: logical 0x523ed0 '=' + 20 spaces + T|F + ' /'; numeric 0x524070 '=' + leftpad(value + ' /', 23);
 *     string 0x523f8c "= '" + value padded to 11, "'", padded to 22, ' /' (quotes are not doubled). The comment after '/' is
 *     always empty. Card 0x524124 cuts or pads key + text to 80 characters; the flush pads with blank cards to 2880 and the
 *     data that follow are not padded.
 * [D] Order: SIMPLE BITPIX NAXIS NAXIS1 NAXIS2 OBJECT ORIGIN DATE FILTER RA DEC EPOCH OBSERVAT TELESCOP INSTRUME DETECTOR
 *     OBSERVER EXP DATE-OBS GAIN END. Filter names NONE B V R I (CCD) and J H K (IR). File name `<name>-01.FIT`.
 * [D] The 8-character key column: the keyword table 0x5b3ff8 holds String[8] entries already space-padded ('SIMPLE  ').
 * [D] OBJECT and the file name use the Set Date/Time ID (Front RE5, analysis/front-re5/datetime-id.md): Save 0x522c28 names the
 *     file ID label + '-01.FIT' (0x52310c) and the header writer 0x5239f8 stores 'ObjX-'+ID, or 'UNKNOWN' when no ID was set.
 *     [W] The web's ID source is the Object X lab's ID (the web's Set Date/Time editor for it); an empty ID counts as never set.
 *     [D] The ID is used raw, so a spaces-only ID gives 'ObjX-  -01.FIT' (the Object X lab shows its own empty-ID text; VIREO
 *     does not trim here). [W] An ID outside printable ASCII is refused by CameraControl, because FITS cards cannot hold it.
 *     Object X is never revealed here (the ID is the student's, not the object's); DATE is the exposure time (VIREO's clock Double +0x37f2 is not recovered); DETECTOR and
 *     OBSERVER are empty (their calibration and student strings are not recovered); NAXIS1/2 are the plane's size (VIREO
 *     reads the camera's configuration record, equal for the compiled cameras [I]); OBSERVAT and TELESCOP are the site and
 *     telescope names of the compiled profile. */
import type {CameraExposure} from './cameraExposure';
import {FitsWriterError,jdToIso} from './fitsWriter';
import {formatNativeSexagesimalDigits} from './nativeListFormat';
import {opticalProfile} from './opticalTelescope';

export const NATIVE_FITS_FILTERS=Object.freeze({ccd:Object.freeze(['NONE','B','V','R','I']),ir:Object.freeze(['J','H','K'])});
export const NATIVE_FITS_UNKNOWN_OBJECT='UNKNOWN';
const BLOCK=2880;
function printable(s:string){if(!/^[\x20-\x7e]*$/.test(s))throw new FitsWriterError('card');return s;}
export const nativeLogical=(v:boolean)=>'='+' '.repeat(20)+(v?'T':'F')+' /';
export const nativeNumeric=(v:string)=>'='+(printable(v)+' /').padStart(23);
export const nativeString=(v:string)=>(("= '"+printable(v)).padEnd(11)+"'").padEnd(22)+' /';
const nativeCard=(key:string,text:string)=>(key.padEnd(8)+text).slice(0,80).padEnd(80);
/** FmtSexagesimal with ':' separators, leading spaces cut (RA digits 1, Dec digits 0). */
export function nativeFitsSexagesimal(value:number,digits:0|1):string{return formatNativeSexagesimalDigits(value,digits,[':',':','']).trimStart();}
export function nativeFitsDate(jd:number):string{return jdToIso(jd).slice(0,19);}
/** Front R4: `currentName` is the current object's name when Show Object ID is on and VIREO's 0x522c28 found an object (behind the
 * Object X gate); it then fills OBJECT (String[68]) instead of the Object X label (0x5239f8) and names the file (0x5230dc). */
export function nativeCameraFitsCards(exposure:CameraExposure,jd:number,objectName=NATIVE_FITS_UNKNOWN_OBJECT,currentName?:string):readonly string[]{
 const {plane,recipe}=exposure,profile=opticalProfile(recipe.opticalIndex),ir=recipe.camera==='ir';
 const filter=(ir?NATIVE_FITS_FILTERS.ir:NATIVE_FITS_FILTERS.ccd)[recipe.filterPosition];
 if(filter===undefined||!Number.isInteger(recipe.seconds)||!Number.isInteger(recipe.gain))throw new FitsWriterError('value');
 const object=currentName!==undefined?currentName.slice(0,68):objectName===NATIVE_FITS_UNKNOWN_OBJECT?objectName:'ObjX-'+objectName,date=nativeFitsDate(jd);
 const cards:[string,string][]=[
  ['SIMPLE',nativeLogical(true)],['BITPIX',nativeNumeric('-32')],['NAXIS',nativeNumeric('2')],
  ['NAXIS1',nativeNumeric(String(plane.width))],['NAXIS2',nativeNumeric(String(plane.height))],
  ['OBJECT',nativeString(object)],['ORIGIN',nativeString('CLEA Simulation')],['DATE',nativeString(date)],['FILTER',nativeString(filter)],
  ['RA',nativeString(nativeFitsSexagesimal(recipe.centerRaHours,1))],['DEC',nativeString(nativeFitsSexagesimal(recipe.centerDecDegrees,0))],
  ['EPOCH',nativeString('2000.0')],['OBSERVAT',nativeString(profile.site.name)],['TELESCOP',nativeString(profile.name)],
  ['INSTRUME',nativeString(ir?'Infrared CCD Camera':'CCD Camera')],['DETECTOR',nativeString('')],['OBSERVER',nativeString('')],
  ['EXP',nativeNumeric(String(recipe.seconds))],['DATE-OBS',nativeString(date)],['GAIN',nativeNumeric(String(recipe.gain))],
 ];
 return Object.freeze([...cards.map(([k,t])=>nativeCard(k,t)),nativeCard('END','')]);
}
export function writeNativeCameraFits(exposure:CameraExposure,jd:number,objectName?:string,currentName?:string):Uint8Array{
 const {plane}=exposure;
 if(!plane||plane.pixels.length!==plane.width*plane.height)throw new FitsWriterError('plane');
 const header=nativeCameraFitsCards(exposure,jd,objectName,currentName).join(''),headerBytes=Math.ceil(header.length/BLOCK)*BLOCK;
 const out=new Uint8Array(headerBytes+plane.pixels.length*4);out.fill(0x20,0,headerBytes);
 for(let i=0;i<header.length;i++)out[i]=header.charCodeAt(i);
 const view=new DataView(out.buffer);
 for(let i=0;i<plane.pixels.length;i++){const v=plane.pixels[i];if(!Object.is(v,Math.fround(v)))throw new FitsWriterError('plane');view.setFloat32(headerBytes+i*4,v,false);}
 return out;// no pad after the data (native flush)
}
export function nativeCameraFitsFileName(objectName=NATIVE_FITS_UNKNOWN_OBJECT,currentName?:string):string{return currentName!==undefined?`${currentName}-01.FIT`.slice(0,31):`${objectName===NATIVE_FITS_UNKNOWN_OBJECT?objectName:'ObjX-'+objectName}-01.FIT`;}
