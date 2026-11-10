/** Pulsar analysis File › Print Window (PrintScreen1Click 0x56d9d8, body 0x56da60), Front RE5. Static reading of CLEA_VEO.exe
 * (781bc970…c54c), research analysis/front-re5/pulsar-print-window.md. Pure.
 * [D] The window's own header (no shared 0x58e860): the date + '     Laboratory Table Number ' + the login table or
 *     '(Not Recorded)'; +2H student name 1 (always, blank when empty) and names 2–4 when set; +2H at x0+50 'Data Parameters:';
 *     +2H 'Object: ' + name; then, one line apart, Data Start F8 ' (Julian Day Number - 2,400,000)', Telescope Aperture
 *     ' (Meters)', Number of Data Points ' (per Receiver)', Time Interval ×1000 F2 ' (MilliSeconds)'; 'Receiver Frequency
 *     (MHz):' then three receivers at x0+100 (F2, or '(Receiver Not Recorded)'); 'Receiver Gain (Relative):' then three (F3);
 *     'File Name: ' + the written name or '(Data Not Written To File)'. Courier 10. Portrait: 4H, then the whole window image.
 * [D] Landscape (orientation 1, 0x56db1f..0x56db35, 0x56e08e..0x56e10d): x0 = 50 for every text line; after the text +300 units,
 *     '(Screen Image Printed on Next Page)' at x 700; NewPage; name1 + ' - Page 2' (cap 49) at (x0, 0); the image at y 50.
 * [D] The printed panels use the print palette (+0x5c6 = 1): white background, black axes, labels, trace and baseline; the
 *     cursor colours are unchanged (Front RE6, `pulsar-print-palette` CSS on the preview copy).
 * [W] The web has no login, so the table line reads '(Not Recorded)' and name 1 is a blank line, as VIREO prints with nobody
 *     logged in; the orientation is chosen in the preview (VIREO takes the printer's); printer-pixel x offsets become indents
 *     (25 units per space: +50 → 2 spaces, +100 → 4, x 700 → 28) and +300 units three blank lines; the date is the browser's.
 *     The picture is the web panels, not the native 632×439 window image. */
import type {PlrProperties} from './pulsarRecording';

export const PULSAR_PRINT_LITERALS=Object.freeze({
 table:'     Laboratory Table Number ',notRecorded:'(Not Recorded)',parameters:'Data Parameters:',object:'Object: ',
 start:'Data Start: ',startUnit:' (Julian Day Number - 2,400,000)',aperture:'Telescope Aperture: ',apertureUnit:' (Meters)',
 points:'Number of Data Points: ',pointsUnit:' (per Receiver)',interval:'Time Interval Between Data Points: ',intervalUnit:' (MilliSeconds)',
 frequencies:'Receiver Frequency (MHz):',gains:'Receiver Gain (Relative):',receiver:(k:number,tr:Tr=same)=>`${tr('Receiver ')}${k}: `,
 receiverMissing:'(Receiver Not Recorded)',file:'File Name: ',notWritten:'(Data Not Written To File)',title:'CLEA Pulsar Exercise - ',
});
/** A screen translation of one literal (vireo() on screen); the default leaves VIREO's English. */
export type Tr=(literal:string)=>string;
const same:Tr=l=>l;
const L=PULSAR_PRINT_LITERALS,IN1='  ',IN2='    ';
/** The text above the window image; '' is a blank line (the 2H and 4H advances). `written` is the file name a Save wrote, or null. */
export function pulsarPrintLines(dateText:string,p:PlrProperties|null,written:string|null,tr:Tr=same):readonly string[]{
 const out=[dateText+tr(L.table)+tr(L.notRecorded),'',''];
 out.push('',IN1+tr(L.parameters),'');
 const f=p?.fields;
 out.push(IN1+tr(L.object)+(f?.object??'').slice(0,40));
 out.push(IN1+tr(L.start)+(f?.start??'')+tr(L.startUnit),IN1+tr(L.aperture)+(f?.aperture??'')+tr(L.apertureUnit),IN1+tr(L.points)+(f?.points??'')+tr(L.pointsUnit),IN1+tr(L.interval)+(f?.interval??'')+tr(L.intervalUnit));
 const receivers=p?.receivers??[];
 out.push(IN1+tr(L.frequencies));
 for(let k=0;k<3;k++){const r=receivers[k];out.push(IN2+L.receiver(k+1,tr)+(k===0||r?.recorded?(r?.frequency??''):tr(L.receiverMissing)));}
 out.push(IN1+tr(L.gains));
 for(let k=0;k<3;k++){const r=receivers[k];out.push(IN2+L.receiver(k+1,tr)+(k===0||r?.recorded?(r?.gain??''):tr(L.receiverMissing)));}
 out.push(IN1+tr(L.file)+(written??tr(L.notWritten)),'','','','');
 return Object.freeze(out);
}

export type PulsarPrintOrientation='portrait'|'landscape';
export const PULSAR_PRINT_PAGE_LITERALS=Object.freeze({nextPage:'(Screen Image Printed on Next Page)',page2:' - Page 2'});
/** The page for an orientation: the text lines above the image, and for landscape the page-2 line printed before the image. */
export function pulsarPrintPage(dateText:string,p:PlrProperties|null,written:string|null,orientation:PulsarPrintOrientation,tr:Tr=same):Readonly<{lines:readonly string[];page2:readonly string[]|null}>{
 const portrait=pulsarPrintLines(dateText,p,written,tr);
 if(orientation==='portrait')return Object.freeze({lines:portrait,page2:null});
 const x0='  ',name1='';
 const lines=[...portrait.slice(0,-4).map(l=>l===''?'':x0+l),'','',' '.repeat(28)+tr(PULSAR_PRINT_PAGE_LITERALS.nextPage)];
 return Object.freeze({lines:Object.freeze(lines),page2:Object.freeze([x0+(name1+tr(PULSAR_PRINT_PAGE_LITERALS.page2)).slice(0,49)])});
}
