/** Star Data List (TFieldRptForm1 < TClstrRptForm1 < TObjctListForm1), Front O FO-SL; docs/OBJECT-INFO-FORMS.md.
 * CLEA_VEO.exe 781bc970…c54c, static only (analysis/front-o-info-forms/RECOVERY-B-star-list.md §3–5, RECOVERY-E §2).
 * StarList1Click 0x5404e0 → builder 0x534e18: caption `CLEA Star Field Data`, file stem `CLEA_Field1`, 19 header lines, then
 * one row (0x5354e8) per object of the NewGSC telescope field collection in collection order (no filter, no sort).
 * Comma Delimit (enabled by TClstrRptForm1.FormActivate 0x552878; 0x552ad8..0x552f61): header items before `Name/ID`, two CSV
 * header literals, then each row with the characters at 0-based 11, 20, 23, 28, 34, 37, 40, 49, 56, 63 replaced by ',' and all
 * spaces removed. The Selection hot-list commands read the cluster bank (FormatforHotList 0x552a7c), not the field row: typed
 * `starlist-hotlist-cluster-bank` (probable original defect). Get Selection Data is hidden and double-click does nothing.
 * Numbers: Number arithmetic, half-even (not x87). Pure. */
import {delphiFixed} from './variableStars';
import {formatNativeSexagesimalDigits,padLeft,padRight,splitNativeSexagesimal} from './nativeListFormat';
import {nativeSpectralText,type CatalogStarRecord} from './catalogObject';
import type {NativeCatalogRegion} from './catalogPopulation';

export const FIELD_STAR_LITERALS=Object.freeze({
 caption:'CLEA Star Field Data',stem:'CLEA_Field1',
 csvHead:'Name/ID,Right Ascn.,,,Declination,,,V,B-V,U-B,Sp',csvUnits:',Hr,Mn,Sec,°,\',"',
 csvTitle:'Save Data in Comma-Separated Text File',
 menu:Object.freeze({data:'&Get Selection Data',add:'&Add Selection to Current Hot List',start:'Start &New Hot List with Selection',entire:'&Create New Hot List of Entire List'}),
});
const CSV_COLUMNS=[11,20,23,28,34,37,40,49,56,63];
export type FieldStarReportReason='spectral-code-unformattable';
export type FieldStarReport=Readonly<{caption:string;lines:readonly string[];first:number;last:number;records:readonly CatalogStarRecord[];reason:FieldStarReportReason|null}>;

/** Builder header (0x534e18). F = 0x486ca0 with separators h/m/s (1 decimal) and °/'/" (0 decimals), no spaces. */
export function fieldStarHeader(area:Pick<NativeCatalogRegion,'minimumRa'|'maximumRa'|'minimumDec'|'maximumDec'>,center:Readonly<{ra:number;dec:number}>):readonly string[]{
 const R=(v:number)=>formatNativeSexagesimalDigits(v,1,['h','m','s']),D=(v:number)=>formatNativeSexagesimalDigits(v,0,['°',"'",'"']);
 return Object.freeze([' ','Right Ascension of Field','  Center: '+R(center.ra),'  Minimum:'+R(area.minimumRa),'  Maximum:'+R(area.maximumRa),
  'Declination of Field','  Center: '+D(center.dec),'  Minimum:'+D(area.minimumDec),'  Maximum:'+D(area.maximumDec),' ',
  'Positions are J2000.0','List sorted by Right Ascension.','','Photometric values marked with "*" are assigned.',
  'Spectral types marked with "*" have assigned temperature classes.','Spectral types marked with "#" have assigned luminosity classes','',
  'Name/ID           Right Ascn. Declination '+'   V     B-V    U-B    Sp     ','                  Hr Mn Sec     °  \'  "']);
}
/** FloatToStrF(ffFixed, 18, 2) with a '+' inserted unless it starts with '-' (a negative rounding to zero prints '+0.00'). */
const signed2=(x:number)=>{const t=delphiFixed(x,2);return t.startsWith('-')?t:'+'+t;};
/** Row 0x5354e8 for one star-like record; null when the spectral code has no recovered text. */
export function fieldStarRow(r:CatalogStarRecord):string|null{
 const sp=nativeSpectralText(r.code);if(sp===null)return null;
 const ra=splitNativeSexagesimal(r.ra,1),dec=splitNativeSexagesimal(r.dec,0);
 const z2=(n:number)=>padLeft(String(n),2,'0');
 return padRight(r.id,18)+z2(ra.whole)+' '+z2(ra.minutes)+' '+padLeft(delphiFixed(ra.seconds,1),4,'0')+'   '
  +(dec.sign<0?'-':'+')+z2(dec.whole)+' '+z2(dec.minutes)+' '+padLeft(delphiFixed(dec.seconds,0),2,'0')+'   '
  +padLeft(delphiFixed(r.v,2),5,' ')+'  '+signed2(r.bv)+(r.flags.bv?'* ':'  ')+signed2(r.ub)+(r.flags.ub?'* ':'  ')
  +sp+(r.flags.spectral?'*':'')+(r.flags.luminosity?'#':'');
}
export function fieldStarReport(area:Pick<NativeCatalogRegion,'minimumRa'|'maximumRa'|'minimumDec'|'maximumDec'>,center:Readonly<{ra:number;dec:number}>,records:readonly CatalogStarRecord[]):FieldStarReport{
 const header=fieldStarHeader(area,center),rows=records.map(fieldStarRow);
 if(rows.some(r=>r===null))return Object.freeze({caption:FIELD_STAR_LITERALS.caption,lines:header,first:header.length,last:header.length-1,records:Object.freeze([]),reason:'spectral-code-unformattable'});
 const lines=Object.freeze([...header,...rows as string[]]);
 return Object.freeze({caption:FIELD_STAR_LITERALS.caption,lines,first:header.length,last:lines.length-1,records,reason:null});
}
/** Comma Delimit 0x552ad8..0x552f61; null when a row is shorter than the last column (the original writes past it). */
export function fieldStarCsvLines(lines:readonly string[]):readonly string[]|null{
 const at=lines.findIndex(l=>l.startsWith('Name/ID'));if(at<0)return null;
 const out=[...lines.slice(1,at),FIELD_STAR_LITERALS.csvHead,FIELD_STAR_LITERALS.csvUnits];
 for(const line of lines.slice(at+2)){
  if(line.length<=CSV_COLUMNS[CSV_COLUMNS.length-1])return null;
  const c=[...line];for(const i of CSV_COLUMNS)c[i]=',';out.push(c.join('').replace(/ /g,''));
 }
 return Object.freeze(out);
}
/** Save names: `CLEA_Field1.TXT` (+0x3e2 + .TXT) and `CLEA_Field1.CSV` (global 0x5bcb08 is empty on this site). */
export const FIELD_STAR_SAVE_NAMES=Object.freeze({text:'CLEA_Field1.TXT',csv:'CLEA_Field1.CSV'});
