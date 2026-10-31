/** Front R4b (analysis/front-r4/C-parameters-camera-list.md §2; analysis/front-plans/front-r4b.md §2): the TInfoListForm1 print
 * page, Print1Click 0x59e4c0, body 0x59e51c, shared by View/Print Parameters (Cluster Age/Distance Parameters) and Camera
 * Information. Static reading of CLEA_VEO.exe 781bc970…c54c; nothing executed. Pure: no React, DOM, Date or locale.
 * - Q5 font Courier 10 (fixed pitch); Q6 x0 = 0 portrait, 50 landscape [W: the web page is the portrait one, x0 = 0];
 * - Q7 (x0, 0): DateTimeToStr(Now) + '     Laboratory Table Number ' + the table or '(Not Recorded)' (Edit Mode off: the web
 *   has no Edit Mode state);
 * - Q8 +2H name1 (always, blank without a login), +H each non-empty name2..4;
 * - Q9 +2H the form caption at x0 + 50, +2H;
 * - Q10 every list line at x0 + 50, with a page break (NewPage; y := H, no header repeat) left to the browser.
 * Printer.Title (Q4) is the spooler job name, never drawn. */
import {hotListPrintHeader} from './hotListPrint';
export const INFO_LIST_PRINT_LITERALS=Object.freeze({font:'Courier',fontSize:10,indent:50,
 spoolTitle:'CLEA Exercise "VIREO - The VIRtual Educational Observatory" - '});
export type InfoListPrintLine=Readonly<{x:0|50;text:string}>;
export function infoListPrintPage(input:Readonly<{dateText:string;caption:string;lines:readonly string[];names?:readonly string[];table?:string}>):readonly InfoListPrintLine[]{
 // hotListPrintHeader is the same Q7–Q8 header (0x591098 and 0x59e51c share it) and ends with the +2H blank before the caption.
 const out:InfoListPrintLine[]=hotListPrintHeader(input.dateText,false,input.names??[],input.table??'').map(text=>({x:0,text}));
 out.push({x:50,text:input.caption},{x:0,text:''});
 for(const text of input.lines)out.push({x:50,text});
 return Object.freeze(out.map(l=>Object.freeze(l)));
}
/** The page as monospaced text [W]: x 50 is drawn as five leading spaces (no printer metrics on the web). */
export const infoListPrintText=(page:readonly InfoListPrintLine[]):readonly string[]=>page.map(l=>(l.x===50&&l.text?'     ':'')+l.text);
