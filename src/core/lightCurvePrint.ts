/** Front R4b (analysis/front-r4/B-mono-color-portrait.md §4a; analysis/front-plans/front-r4b.md §1): the light-curve print page,
 * TLtCrvDsplyForm1 Print1Click 0x52c1cc, body 0x52c250. Static reading of CLEA_VEO.exe 781bc970…c54c; nothing executed. Pure:
 * the page as ordered items with their x and page position (printer units and text heights H), so the preview and the
 * tests read the same layout.
 *  1. (0, 0) the date line: DateTimeToStr(Now) + '     Laboratory Table Number ' + '(Not Recorded)' (no table on this site);
 *  2. +2H name1 (always; blank without a login); +H name2..4 only when set;
 *  3. +4H, then every list line at x 50 (a page break before a line that would pass the page height; no header repeat);
 *  4. +H; portrait (orientation 0): +3H, then the title and the image on the same page;
 *     landscape (1): +300 units, '(Screen Image Printed on Next Page)' at x 700, new page, name1 + ' - Page 2' at (0, 0),
 *     y := H, then the title and the image;
 *  5. the title literal at x 0, and the window image at x 0 at the same y [D]. [W] The web draws the image below the title
 *     (VIREO paints it over the title: an overlap artefact). x0 is 0 in both orientations (0x52c33d, dead branch) [D].
 * With 11 list lines and no extra names the portrait title is at y = 21H (dossier B §4a). */
export const LIGHT_CURVE_PRINT_LITERALS=Object.freeze({
 tableNumber:'     Laboratory Table Number ',notRecorded:'(Not Recorded)',nextPage:'(Screen Image Printed on Next Page)',
 page2:' - Page 2',title:'CLEA Exercise "VIREO - The VIRtual Educational Observatory"',font:'MS Sans Serif',fontSize:10,
});
export type PrintOrientation='portrait'|'landscape';
/** Each item's position: `page` (1 or 2), `yH` in text heights H and `yUnits` in printer units (y = yH·H + yUnits), as the
 * printer pen walks the page: y advances before a name, +4H before the list, +H after each line, +H, then the orientation step. */
export type LightCurvePrintItem=Readonly<
 |{kind:'text';x:number;text:string;page:1|2;yH:number;yUnits:number;role:'date'|'name'|'line'|'next-page'|'page2'|'title'}
 |{kind:'image';x:number;page:1|2;yH:number;yUnits:number}>;
export function lightCurvePrintPage(input:Readonly<{orientation:PrintOrientation;dateText:string;listLines:readonly string[];names?:readonly string[];table?:string}>):readonly LightCurvePrintItem[]{
 const L=LIGHT_CURVE_PRINT_LITERALS,names=input.names??[],items:LightCurvePrintItem[]=[];
 let yH=0,yUnits=0,page:1|2=1;
 const text=(x:number,t:string,role:Extract<LightCurvePrintItem,{kind:'text'}>['role'])=>items.push({kind:'text',x,text:t,page,yH,yUnits,role});
 text(0,input.dateText+L.tableNumber+(input.table||L.notRecorded),'date');
 yH+=2;text(0,names[0]??'','name');
 for(const n of names.slice(1,4))if(n){yH+=1;text(0,n,'name');}
 yH+=4;
 // The page-height break before a line (NewPage; y := H) is the browser's own pagination here.
 for(const line of input.listLines){text(50,line,'line');yH+=1;}
 yH+=1;
 if(input.orientation==='landscape'){
  yUnits+=300;text(700,L.nextPage,'next-page');
  page=2;yH=0;yUnits=0;text(0,((names[0]??'')+L.page2).slice(0,49),'page2');yH=1;
 }else yH+=3;
 text(0,L.title,'title');
 // [W] VIREO draws the image at the title's y (it covers the title); the web places it one line below.
 items.push({kind:'image',x:0,page,yH:yH+1,yUnits:0});
 return Object.freeze(items.map(i=>Object.freeze(i)));
}
/** [W] The browser page orientation for the chosen layout (VIREO takes it from the printer settings). */
export const printPageSizeCss=(orientation:PrintOrientation)=>`@page{size:${orientation}}`;
