/** Main-window (TEnvironment1) and radio-lab (TRadioLab) Help menu data as pure values (Front H, docs/CLEA-HELP.md). Static
 * reading of CLEA_VEO.exe (SHA-256 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c), research
 * analysis/front-h-help/RECOVERY.md; nothing executed or emulated. Captions are the DFM's, raw with '&' accelerators. */

export const MAIN_HELP_MENU=Object.freeze({help:'&Help',topics:'&Topics...',websites:'&Websites',twoMass:'&2MASS Catalog',clea:'Project &CLEA',nvo:'&NVO',
 about:'&About...',file:'&File',exit:'E&xit Observatory'});
export const RADIO_HELP_MENU=Object.freeze({help:'&Help',topics:'&Topics...',about:'&About This Exercise...'});

/** TAboutBox (DFM at file offset 0x1e3174); the Version label is set by the caller: 0x58982c (main) / 0x56543c (radio). */
export const ABOUT_BOX=Object.freeze({caption:'About This Exercise',lines:Object.freeze(['Contemporary Laboratory Experiences in Astronomy',
 'VIREO - The VIRtual Educational Observatory','Copyright © 1999-2011 CLEA','All Rights Reserved']),mainVersion:'Version 1.504',radioVersion:'Version 1.001-32',ok:'OK'});

/** Help › Websites (0x58ec84, 0x58ed24, 0x58ecd4 → 0x58ebe0 TWebBrowser.Navigate in a new window). The URLs are options
 * fields (URLs tab); these are their defaults (0x5a2e44..0x5a2ee8). Each original address was checked once from a shell
 * with a GET on 2026-10-29 (14:50 UTC; the NVO successor and https CLEA pages at 16:51–16:52 UTC after review 1 L5/I5): `web`
 * is the address OpenVireo opens (null: shown as text only; no current entry is null). */
export type HelpWebsite=Readonly<{key:'twoMass'|'clea'|'nvo';original:string;web:string|null;check:string}>;
export const HELP_WEBSITES:readonly HelpWebsite[]=Object.freeze([
 Object.freeze({key:'twoMass',original:'http://xena.harvard.edu/software/catalogs/tmpsc.html',web:'https://irsa.ipac.caltech.edu/Missions/2mass.html',
  check:'host does not resolve; current equivalent: the 2MASS page of IRSA (NASA/IPAC Infrared Science Archive), 200 on 2026-10-29'}),
 Object.freeze({key:'clea',original:'http://public.gettysburg.edu/~marschal/clea/CLEAhome.html',web:'https://public.gettysburg.edu/~marschal/clea/CLEAhome.html',
  check:'200, "PROJECT CLEA HOME PAGE" (a 313-byte page), on 2026-10-29; the same page over https was 200 at 16:51 UTC and is the one opened'}),
 Object.freeze({key:'nvo',original:'http://www.us-vo.org',web:'https://heasarc.gsfc.nasa.gov/navo/summary/about_navo.html',
  check:'host does not resolve; the US NVO was succeeded by the VAO (ended 2014) and then by NASA\'s NAVO (NASA Astronomical Virtual Observatories, from October 2014): current equivalent "About NAVO" at HEASARC, 200 at 16:52 UTC on 2026-10-29'}),
]);

/** Reminder box text (0x5a0418, called only from TEnvironment1.FormCloseQuery 0x588b9c): each line read with Readln into
 * char[256] (at most 255 characters) is appended with CR LF, then CR LF and the Select line; StrLCat caps the whole text at
 * 1023 characters. Latin-1 text. */
export const REMINDER_CAPTION='** Exercise Finished? **';
export const REMINDER_SELECT='Select "OK" to Quit Exercise, "Cancel" to Continue.';
export const REMINDER_LIMIT=1023;
/** FormCloseQuery 0x588b9c step 3: shown when env+0x54c ≠ 3, or after 0x5a0418's "File Error!" box when the reminder file
 * cannot be read (it then returns 3). Yes/No, same caption. */
export const QUIT_QUESTION='Are You Sure You Want to Quit This Exercise?';
export function reminderBoxText(bytes:Uint8Array):string{
 if(!(bytes instanceof Uint8Array)||bytes.length>65536)throw new RangeError('Reminder file size');
 let text='';for(const b of bytes)text+=String.fromCharCode(b);
 const lines=text.split(/\r?\n/);if(lines.length>0&&lines[lines.length-1]==='')lines.pop();
 let out='';const cat=(s:string)=>{out=(out+s).slice(0,REMINDER_LIMIT);};
 for(const line of lines){cat(line.slice(0,255));cat('\r\n');}
 cat('\r\n');cat(REMINDER_SELECT);
 return out;
}
