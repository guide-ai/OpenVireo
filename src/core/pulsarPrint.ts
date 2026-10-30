/** Pulsar analysis File › Print Window (PrintScreen1Click 0x56d9d8, body 0x56da60), Front RE5. Static reading of CLEA_VEO.exe
 * (781bc970…c54c), research analysis/front-re5/pulsar-print-window.md. Pure.
 * [D] The window's own header (no shared 0x58e860): the date + '     Laboratory Table Number ' + the login table or
 *     '(Not Recorded)'; +2H student name 1 (always, blank when empty) and names 2–4 when set; +2H at x0+50 'Data Parameters:';
 *     +2H 'Object: ' + name; then, one line apart, Data Start F8 ' (Julian Day Number - 2,400,000)', Telescope Aperture
 *     ' (Meters)', Number of Data Points ' (per Receiver)', Time Interval ×1000 F2 ' (MilliSeconds)'; 'Receiver Frequency
 *     (MHz):' then three receivers at x0+100 (F2, or '(Receiver Not Recorded)'); 'Receiver Gain (Relative):' then three (F3);
 *     'File Name: ' + the written name or '(Data Not Written To File)'. Courier 10. Portrait: 4H, then the whole window image.
 * [W] The web has no login, so the table line reads '(Not Recorded)' and name 1 is a blank line, as VIREO prints with nobody
 *     logged in; the page is portrait; printer-pixel x offsets become indents (+50 → 2 spaces, +100 → 4); the date is the
 *     browser's. The picture is the web panels, not the native 632×439 window image. */
import type {PlrProperties} from './pulsarRecording';

export const PULSAR_PRINT_LITERALS=Object.freeze({
 table:'     Laboratory Table Number ',notRecorded:'(Not Recorded)',parameters:'Data Parameters:',object:'Object: ',
 start:'Data Start: ',startUnit:' (Julian Day Number - 2,400,000)',aperture:'Telescope Aperture: ',apertureUnit:' (Meters)',
 points:'Number of Data Points: ',pointsUnit:' (per Receiver)',interval:'Time Interval Between Data Points: ',intervalUnit:' (MilliSeconds)',
 frequencies:'Receiver Frequency (MHz):',gains:'Receiver Gain (Relative):',receiver:(k:number)=>`Receiver ${k}: `,
 receiverMissing:'(Receiver Not Recorded)',file:'File Name: ',notWritten:'(Data Not Written To File)',title:'CLEA Pulsar Exercise - ',
});
const L=PULSAR_PRINT_LITERALS,IN1='  ',IN2='    ';
/** The text above the window image; '' is a blank line (the 2H and 4H advances). `written` is the file name a Save wrote, or null. */
export function pulsarPrintLines(dateText:string,p:PlrProperties|null,written:string|null):readonly string[]{
 const out=[dateText+L.table+L.notRecorded,'',''];
 out.push('',IN1+L.parameters,'');
 const f=p?.fields;
 out.push(IN1+L.object+(f?.object??'').slice(0,40));
 out.push(IN1+L.start+(f?.start??'')+L.startUnit,IN1+L.aperture+(f?.aperture??'')+L.apertureUnit,IN1+L.points+(f?.points??'')+L.pointsUnit,IN1+L.interval+(f?.interval??'')+L.intervalUnit);
 const receivers=p?.receivers??[];
 out.push(IN1+L.frequencies);
 for(let k=0;k<3;k++){const r=receivers[k];out.push(IN2+L.receiver(k+1)+(k===0||r?.recorded?(r?.frequency??''):L.receiverMissing));}
 out.push(IN1+L.gains);
 for(let k=0;k<3;k++){const r=receivers[k];out.push(IN2+L.receiver(k+1)+(k===0||r?.recorded?(r?.gain??''):L.receiverMissing));}
 out.push(IN1+L.file+(written??L.notWritten),'','','','');
 return Object.freeze(out);
}
