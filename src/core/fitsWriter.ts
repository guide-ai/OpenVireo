/** Save Image (front C4): single-plane float32 FITS for a composed CCD or IR exposure.
 * Recovered (NATIVE-FITS-SINGLE-PLANE-01, docs/FITS-IMAGE.md): metadata init 0x523a1a sets SIMPLE T, BITPIX -32,
 * NAXIS 2; plane writer 0x523954 walks y outside / x inside and stores each value as Single; 0x52425c byte-reverses
 * each 4-byte word (big-endian). [W] The native keyword writer 0x523218 is not ported: every other card here is
 * web-authored (time, exposure, filter, gain, telescope, catalog source/hash, seed, TAN WCS), and the data are padded
 * to the FITS 2880-byte block although the captured native flush wrote no pad. */
import type {CameraExposure} from './cameraExposure';
import {compiledCameraProjection} from './cameraProjection';
import {opticalProfile} from './opticalTelescope';

export class FitsWriterError extends Error {
 constructor(readonly code:'plane'|'card'|'value'){super(`FITS writer: ${code}`);this.name='FitsWriterError';}
}
export type CameraFitsContext=Readonly<{
 jd:number;filterName:string;catalogName:string;
 source:Readonly<{mode:'static'|'live';sha256:string;extractId:string|null;url:string}>;
}>;
type Card=readonly [key:string,value:string|number|boolean|null,comment?:string];
const BLOCK=2880;
function printable(s:string){if(!/^[\x20-\x7e]*$/.test(s))throw new FitsWriterError('card');return s;}
function formatValue(v:string|number|boolean):string {
 if(typeof v==='boolean')return (v?'T':'F').padStart(20);
 if(typeof v==='number'){
  if(!Number.isFinite(v))throw new FitsWriterError('value');
  const text=Number.isInteger(v)&&Math.abs(v)<1e15?String(v):v.toExponential(15).replace('e','E');
  return text.padStart(20);
 }
 const quoted=`'${printable(v).replace(/'/g,"''").padEnd(8)}'`;
 if(quoted.length>70)throw new FitsWriterError('card');
 return quoted.padEnd(20);
}
function card([key,value,comment]:Card):string {
 if(!/^[A-Z0-9_-]{1,8}$/.test(key)&&key!=='COMMENT'&&key!=='HISTORY')throw new FitsWriterError('card');
 let text:string;
 if(key==='COMMENT'||key==='HISTORY')text=key.padEnd(8)+printable(String(value??''));
 else text=key.padEnd(8)+'= '+formatValue(value as string|number|boolean)+(comment?' / '+printable(comment):'');
 if(text.length>80)text=text.slice(0,80);
 return text.padEnd(80);
}
/** Calendar date/time (UTC) from a Julian date; Number arithmetic, millisecond resolution. */
export function jdToIso(jd:number):string {
 if(!Number.isFinite(jd)||jd<2_000_000||jd>3_000_000)throw new FitsWriterError('value');
 return new Date(Math.round((jd-2440587.5)*86_400_000)).toISOString().slice(0,23);
}
/** The VizieR host that served the catalog (it is the host of the request URL). */
function fitsCatalogHost(url:string):string {try{return new URL(url).hostname.slice(0,60);}catch{return '';}}
export function cameraFitsCards(exposure:CameraExposure,context:CameraFitsContext):readonly string[] {
 const {plane,recipe}=exposure,profile=opticalProfile(recipe.opticalIndex);
 const ir=recipe.camera==='ir',projection=compiledCameraProjection(recipe.camera,recipe.opticalIndex,{raHours:recipe.centerRaHours,decDegrees:recipe.centerDecDegrees},true);
 const degrees=180/Math.PI;
 // Gnomonic plane: xi = -planeX = halfX - x*stepX, eta = planeY = halfY + y*stepY (x,y 0-based pixel centres).
 const cards:Card[]=[
  ['SIMPLE',true,'conforms to FITS standard'],['BITPIX',-32,'IEEE single precision'],['NAXIS',2],
  ['NAXIS1',plane.width],['NAXIS2',plane.height],
  ['ORIGIN','OpenVireo','web reconstruction of CLEA VIREO'],
  ['TELESCOP',profile.name.slice(0,60)],['INSTRUME',ir?'IR':'CCD'],
  ['DATE-OBS',jdToIso(context.jd),'UTC, observatory clock at Start'],['MJD-OBS',context.jd-2400000.5],
  ['EXPTIME',recipe.seconds,'s'],['FILTER',context.filterName],['GAIN',recipe.gain,'e-/ADU'],
  ['RA',recipe.centerRaHours*15,'deg, telescope pointing'],['DEC',recipe.centerDecDegrees,'deg'],['EQUINOX',2000],
  ['CTYPE1','RA---TAN'],['CTYPE2','DEC--TAN'],
  ['CRVAL1',recipe.centerRaHours*15],['CRVAL2',recipe.centerDecDegrees],
  ['CRPIX1',1+projection.halfX/projection.stepX],['CRPIX2',1+projection.halfY/-projection.stepY],
  ['CDELT1',-projection.stepX*degrees,'deg/pixel'],['CDELT2',projection.stepY*degrees,'deg/pixel'],
  ['CUNIT1','deg'],['CUNIT2','deg'],
  ['CATALOG',context.catalogName],['CATMODE',context.source.mode==='static'?'bundled extract':'live VizieR'],
  ['CATSHA',context.source.sha256.slice(0,64)],
  ...(fitsCatalogHost(context.source.url)?[['CATHOST',fitsCatalogHost(context.source.url)] as Card]:[]),
  ...(context.source.extractId?[['CATEXTR',context.source.extractId.slice(0,60)] as Card]:[]),
  ['CAMSEED',recipe.seed,'web camera random stream seed'],['CAMDRAWS',exposure.drawsConsumed],
  ['COMMENT','Simulated image: catalog stars from CDS/VizieR (doi:10.26093/cds/vizier).'],
  ['COMMENT','NOMAD: Zacharias et al. 2004. USNO-B1.0: Monet et al. 2003.'],
  ...(ir?[['COMMENT','J/H/K: 2MASS via NOMAD (Skrutskie et al. 2006, AJ 131, 1163).'],['COMMENT','Two Micron All Sky Survey: UMass, IPAC/Caltech; NASA and NSF.']] as Card[]:[]),
  ['COMMENT','Header cards are web-authored; the CLEA keyword writer is not ported.'],
  ['COMMENT','WCS describes the camera projection without the per-star seeing jitter.'],
 ];
 return Object.freeze([...cards.map(card),'END'.padEnd(80)]);
}
export function writeCameraFits(exposure:CameraExposure,context:CameraFitsContext):Uint8Array {
 const {plane}=exposure;
 if(!plane||plane.pixels.length!==plane.width*plane.height)throw new FitsWriterError('plane');
 const header=cameraFitsCards(exposure,context).join(''),headerBytes=Math.ceil(header.length/BLOCK)*BLOCK;
 const dataBytes=plane.pixels.length*4,total=headerBytes+Math.ceil(dataBytes/BLOCK)*BLOCK;
 const out=new Uint8Array(total);out.fill(0x20,0,headerBytes);
 for(let i=0;i<header.length;i++)out[i]=header.charCodeAt(i);
 const view=new DataView(out.buffer);
 // y outside, x inside, as the native plane writer; float32 big-endian; zero pad after the data.
 for(let i=0;i<plane.pixels.length;i++){
  const v=plane.pixels[i];if(!Object.is(v,Math.fround(v)))throw new FitsWriterError('plane');
  view.setFloat32(headerBytes+i*4,v,false);
 }
 return out;
}
/** File name; the camera comes from the exposure recipe, as the INSTRUME card does. */
export function cameraFitsFileName(exposure:CameraExposure,context:CameraFitsContext):string {
 return `OpenVireo-${exposure.recipe.camera==='ir'?'IR':'CCD'}-${jdToIso(context.jd).slice(0,19).replace(/[-:]/g,'').replace('T','-')}-${context.filterName.replace(/[^A-Za-z0-9]/g,'')}.fit`;
}
