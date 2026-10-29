/** Front L2: TLSSRgnDlg "Extract LSS Galaxy Data for Region", CLEA_VEO.exe 781bc970…c54c, static reading only (never
 * executed). Plan analysis/front-plans/front-l2-lss.md §4; research analysis/front-l2-lss/rgndlg-findings.md.
 *  - Menu File ▸ "LSS &Galaxy Data..." (LSSGalaxyData1, DFM Visible = False); its only Visible writer is
 *    LargeScaleStructure1Click 0x58aad3: Visible := Edit Mode (options+0x27ca) [D]. The web shows it while Edit Mode is on.
 *  - FormShow 0x5853f4: RA/Dec edits FloatToStrF(ffFixed, 2), Z edits FloatToStrF(ffExponent, 3, 2), from the six stored
 *    bounds (session global 0x5bcef8, initially 0) [D].
 *  - OKBtnClick 0x585510: StrToFloat of the six edits; failure → "Parameters contain non-numeric data!"; then
 *    0 ≤ RA ≤ 24, RAmin < RAmax, −90 ≤ Dec ≤ 90, DecMin < DecMax, Zmin < Zmax, else "Parameters are inconsistant!" (original
 *    spelling); both in a box "Input Error!"; the dialog stays open [D].
 *  - 0x584d0c: every 59-byte CLEA_GLX.DAT record is tested z, then RA, then Dec, all bounds inclusive; a match becomes a result
 *    row (name, the one Now time, RA, Dec, z; velocity not written); summary box "Search Results" [D].
 * Web [W]: numbers are binary64 (the native bounds are Extended; only a bound between the two roundings of a catalogue value
 * could differ); rows are ordered by RA, catalogue order on ties (the native sorted insert 0x492728 keys time then RA, and all
 * rows share one time). Pure. */
import type {IndexedGlxRecord} from './glxCatalog';
import {delphiFixed} from './variableStars';

export const LSS_REGION_TEXT=Object.freeze({
 menu:'LSS &Galaxy Data...',caption:'Extract LSS Galaxy Data for Region',ra:'Right Ascension (Hrs):',dec:'Declination (Degs):',z:'Redshift (Z):',
 minimum:'Minimum',maximum:'Maximum',ok:'&OK',cancel:'&Cancel',
 inputCaption:'Input Error!',nonNumeric:'Parameters contain non-numeric data!',inconsistent:'Parameters are inconsistant!',
 retainCaption:'Retain Current Data?',retain:'Do you want to add the file data to your current data?\r\n\r\n"Yes" - Add to current data.\r\n"No"  - Clear current data.',
 confirmCaption:'Confirm Deletion!',confirm:'Are you SURE you want to delete your current data?',
 resultsCaption:'Search Results',
});
export type LssRegionBounds=Readonly<{raMin:number;raMax:number;decMin:number;decMax:number;zMin:number;zMax:number}>;
export const LSS_REGION_INITIAL:LssRegionBounds=Object.freeze({raMin:0,raMax:0,decMin:0,decMax:0,zMin:0,zMax:0});
export type LssRegionText=Readonly<Record<keyof LssRegionBounds,string>>;
/** FloatToStrF(ffExponent, 3, 2): d.ddE±XX. */
export function floatToStrFExponent3(x:number):string{
 if(!Number.isFinite(x))throw new RangeError('exponent');
 if(x===0)return '0.00E+00';
 const [m,e]=x.toExponential(2).split('e'),n=Number(e);
 return `${m}E${n<0?'-':'+'}${String(Math.abs(n)).padStart(2,'0')}`;
}
/** FormShow: the edit texts of the stored bounds. */
export function lssRegionTexts(b:LssRegionBounds):LssRegionText{
 return Object.freeze({raMin:delphiFixed(b.raMin,2),raMax:delphiFixed(b.raMax,2),decMin:delphiFixed(b.decMin,2),decMax:delphiFixed(b.decMax,2),zMin:floatToStrFExponent3(b.zMin),zMax:floatToStrFExponent3(b.zMax)});
}
/** StrToFloat [I: Delphi TextToFloat with the '.' separator; surrounding blanks allowed, no thousands separator]. */
function strToFloat(s:string):number|null{
 return /^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*$/.test(s)&&Number.isFinite(Number(s.trim()))?Number(s.trim()):null;
}
export type LssRegionCheck=Readonly<{ok:true;bounds:LssRegionBounds}>|Readonly<{ok:false;message:string}>;
/** OKBtnClick 0x585510. */
export function checkLssRegion(text:LssRegionText):LssRegionCheck{
 const keys=['raMin','raMax','decMin','decMax','zMin','zMax'] as const,v:Record<string,number>={};
 for(const k of keys){const n=strToFloat(text[k]);if(n===null)return {ok:false,message:LSS_REGION_TEXT.nonNumeric};v[k]=n;}
 const b=v as LssRegionBounds;
 const ok=b.raMin>=0&&b.raMin<=24&&b.raMax>=0&&b.raMax<=24&&b.raMin<b.raMax&&b.decMin>=-90&&b.decMin<=90&&b.decMax>=-90&&b.decMax<=90&&b.decMin<b.decMax&&b.zMin<b.zMax;
 return ok?{ok:true,bounds:Object.freeze({...b})}:{ok:false,message:LSS_REGION_TEXT.inconsistent};
}
export type LssRegionRow=Readonly<{object:string;recordIndex:number;ra:number;dec:number;z:number}>;
export type LssRegionResult=Readonly<{searched:number;rows:readonly LssRegionRow[];zLow:number;zHigh:number}>;
/** 0x584d0c over the parsed catalogue (z Single +28, RA Double +0, Dec Double +8; inclusive; z first). */
export function extractLssRegion(catalogue:readonly IndexedGlxRecord[],b:LssRegionBounds):LssRegionResult{
 let zLow=1,zHigh=0;const rows:LssRegionRow[]=[];
 for(const g of catalogue){
  if(!(b.zMin<=g.redshift&&g.redshift<=b.zMax))continue;
  if(!(b.raMin<=g.ra&&g.ra<=b.raMax))continue;
  if(!(b.decMin<=g.dec&&g.dec<=b.decMax))continue;
  rows.push(Object.freeze({object:g.id.slice(0,15),recordIndex:g.recordIndex,ra:g.ra,dec:g.dec,z:g.redshift}));
  if(g.redshift<zLow)zLow=g.redshift;if(g.redshift>zHigh)zHigh=g.redshift;
 }
 rows.sort((a,c)=>a.ra-c.ra||a.recordIndex-c.recordIndex);
 return Object.freeze({searched:catalogue.length,rows:Object.freeze(rows),zLow,zHigh});
}
/** The "Search Results" box text. `zMask` [W, coordinator decision of 2026-10-29]: catalogue redshifts are what E02 asks the
 * student to measure, so the web replaces the Z range by this text (as Catalog Object masks z); undefined = the native text. */
export function lssRegionSummary(r:LssRegionResult,zMask?:string):string{
 const range=zMask??`${floatToStrFExponent3(r.zLow)} to ${floatToStrFExponent3(r.zHigh)}`;
 return `Galaxy Records Searched: ${r.searched}\r\nGalaxies Found in Region: ${r.rows.length}\r\nRange in Z: ${range}`;
}
/** The rows as the web keeps them: no catalogue z (masked, see lssRegionSummary). */
export type LssRegionListRow=Omit<LssRegionRow,'z'>;
export const lssRegionListRows=(r:LssRegionResult):readonly LssRegionListRow[]=>Object.freeze(r.rows.map(({z:_z,...g})=>{void _z;return Object.freeze(g);}));
