/** THRDisplayForm1 Print (Print1Click 0x542f44, body 0x542fc8) as data (Front V2 M4, docs/CLUSTER-HR-TOOLS.md). Static
 * reading of CLEA_VEO.exe (781bc970…c54c), research analysis/front-v2-cluster-hr/RECOVERY.md §2:
 * - BeginDoc comes first; `CLEA Cluster Exercise - ` + student name 1 is assigned to Printer.Title afterwards, so it is not
 *   page text (and does not name this job);
 * - font MS Sans Serif 10 bold; H = TextHeight('Text'); x0 = 0 in portrait, 50 in landscape;
 * - (x0, 0) date + laboratory line; +2H student name 1 (names 2–4 only when set); if the ZAMS is shown and V−Mv ≠ 0:
 *   +2H `Fit of Zero-Age Main Sequence:`, +H at x0+150 `V - Mv = ` F2, +H at x0+150 `E(B-V) = ` F2; +3H the caption;
 * - portrait: +H, then the window image; landscape: +300 px `(Screen Image Printed on Next Page)` at x 700, NewPage,
 *   `<name 1> - Page 2` at (x0, 0), the image at y 70;
 * - the image is GetFormImage (the whole window) stretched to the page; points print black unless "Print in Color".
 * Student names and the laboratory table number come from elsewhere in VIREO and are not recovered (null text). */
import {delphiFixed} from './variableStars';

export type ClusterHrPrintOrientation='portrait'|'landscape';
export type ClusterHrPrintLine=Readonly<{kind:'date'|'students'|'zams'|'modulus'|'ebv'|'caption'|'next-page'|'page-2';
 /** null: the unrecovered student text (shown as a placeholder); for page-2 the placeholder is followed by `suffix`. */
 text:string|null;suffix?:string;
 /** Native x in printer pixels (x0 = 0 or 50; +150; 700). */
 x:number;
 /** Gap above the line: text heights (`h`) or printer pixels (`px`); a page break comes before page-2. */
 gap:Readonly<{h:number}|{px:number}>}>;
export type ClusterHrPrintPage=Readonly<{lines:readonly ClusterHrPrintLine[];page2:boolean;
 /** Gap between the last line and the window image. */
 imageGap:Readonly<{h:number}|{px:number}>}>;
export const CLUSTER_HR_PRINT_LITERALS=Object.freeze({
 lab:'     Laboratory Table Number (Not Recorded)',zams:'Fit of Zero-Age Main Sequence:',modulus:'V - Mv = ',ebv:'E(B-V) = ',
 caption:'Color-Magnitude Diagram',nextPage:'(Screen Image Printed on Next Page)',page2:' - Page 2',title:'CLEA Cluster Exercise - '});
export function clusterHrPrintPage(input:Readonly<{dateText:string;zamsShown:boolean;modulusTicks:number;ebvTicks:number;orientation:ClusterHrPrintOrientation}>):ClusterHrPrintPage{
 const L=CLUSTER_HR_PRINT_LITERALS,x0=input.orientation==='landscape'?50:0,lines:ClusterHrPrintLine[]=[];
 const add=(kind:ClusterHrPrintLine['kind'],text:string|null,x:number,gap:ClusterHrPrintLine['gap'],suffix?:string)=>lines.push(Object.freeze({kind,text,x,gap,...(suffix===undefined?{}:{suffix})}));
 add('date',input.dateText+L.lab,x0,{h:0});
 add('students',null,x0,{h:2});
 if(input.zamsShown&&input.modulusTicks!==0){
  add('zams',L.zams,x0,{h:2});
  add('modulus',L.modulus+delphiFixed(input.modulusTicks/100,2),x0+150,{h:1});
  add('ebv',L.ebv+delphiFixed(input.ebvTicks/100,2),x0+150,{h:1});
 }
 add('caption',L.caption,x0,{h:3});
 if(input.orientation==='portrait')return Object.freeze({lines:Object.freeze(lines),page2:false,imageGap:{h:1}});
 add('next-page',L.nextPage,700,{px:300});
 add('page-2',null,x0,{px:0},L.page2);
 return Object.freeze({lines:Object.freeze(lines),page2:true,imageGap:{px:70}});
}
