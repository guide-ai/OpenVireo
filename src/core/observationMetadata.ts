/** Observational Data metadata for spectra loaded from files or acquired here (Front S, S4; docs/OBSERVATION-RESULTS.md
 * "Loaded and acquired spectra"). Static reading of CLEA_VEO.exe (SHA-256 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c),
 * research analysis/front-s-spectroscopy/RE-observational-data-metadata.md; nothing executed or emulated; no equivalence
 * with the original program is claimed. */

/** Object ID of a loaded .SSP (classifier loader, RE §2): ExtractFileName, cut at the first '.', drop everything through the
 * first '_', trim trailing spaces, at most 15 characters (ShortString[15]). The header's object name is not used. */
export function observationStem(fileName:string):string{
 if(typeof fileName!=='string')throw new TypeError('file name');
 let name=fileName.slice(Math.max(fileName.lastIndexOf('/'),fileName.lastIndexOf('\\'))+1);
 const dot=name.indexOf('.');if(dot>=0)name=name.slice(0,dot);
 const underscore=name.indexOf('_');if(underscore>=0)name=name.slice(underscore+1);
 return name.replace(/ +$/,'').slice(0,15);
}

/** Julian Date from a browser time in milliseconds since 1970-01-01 UTC. VIREO converts the file's last-write time, a local
 * Delphi date, with its own offset; the web uses UTC [W]. */
export function julianDateFromMs(ms:number):number{
 if(!Number.isFinite(ms))throw new RangeError('time');
 return ms/86_400_000+2_440_587.5;
}

/** A zero value shows as an empty box (TObsRsltsDlg1 activation 0x54a91c compares with Single 0.0). */
const blank=(v:number|null)=>v===null||v===0||!Number.isFinite(v);

/** JD: FloatToStrF fixed, 6 decimals. */
export const formatObservationJd=(jd:number|null)=>blank(jd)?'':jd!.toFixed(6);

const pad2=(n:number)=>String(n).padStart(2,'0');
/** Right ascension in hours: `HHh MMm SS.SSs` (0x487170, al=2: seconds with 2 decimals, 5 characters). The seconds are rounded
 * first and carried into minutes and hours [I: carry handling not traced]. */
export function formatObservationRa(hours:number|null):string{
 if(blank(hours))return'';
 let centiseconds=Math.round(((hours!%24)+24)%24*360_000);
 if(centiseconds>=8_640_000)centiseconds-=8_640_000;
 const h=Math.floor(centiseconds/360_000),m=Math.floor(centiseconds%360_000/6_000),s=centiseconds%6_000/100;
 return `${pad2(h)}h ${pad2(m)}m ${s.toFixed(2).padStart(5,'0')}s`;
}
/** Declination in degrees: sign, `DD° MM' SS.S"` (0x487338, al=1: seconds with 1 decimal). Rounded then carried [I]. */
export function formatObservationDec(degrees:number|null):string{
 if(blank(degrees))return'';
 const sign=degrees!<0?'-':'+';
 const tenths=Math.round(Math.abs(degrees!)*36_000);
 const d=Math.floor(tenths/36_000),m=Math.floor(tenths%36_000/600),s=tenths%600/10;
 return `${sign}${pad2(d)}° ${pad2(m)}' ${s.toFixed(1).padStart(4,'0')}"`;
}
