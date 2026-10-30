/** Hot List ▸ Print report (RA-HL-10, WEB-HL-12; port of the parked radio candidate R-RX23, generic over the list owner).
 * CLEA_VEO.exe 781bc970…c54c, static listings only (task-3/radio-hotlist-print-20261026; Front K2.3 dossier
 * analysis/front-k2/C-print-headers.md §2, no execution): THotListForm1 Print1Click 0x59103c..0x591094 runs
 * Env.PrintDialog1.Execute (Env+0x3a8) and, when it returns True, the body 0x591098..0x5913de, then stores self+0x585 := 1
 * (a Checked mark, not a success result). The body (Courier 10, its own header, not 0x58e860):
 * - Printer.Title := 'CLEA "Object X" Exercise - ' + name1, or + 'Database Modification' in Edit Mode (never drawn);
 * - line 1: DateTimeToStr(Now), and with Edit Mode off '     Laboratory Table Number ' + the options table, or
 *   '(Not Recorded)' (0x591474) when it is empty;
 * - Edit Mode off: two lines down name1 (always, blank when nobody logged in), names 2–4 one line apart when set;
 * - two lines down the form caption, two lines down ListBox1.Items in list order with a page-height break (no header repeat).
 * The list window [0x5b5998] is shared by the optical and radio owners.
 * Web policy (WEB-HL-12, Front K2.3): the snapshot is the form caption plus the already formatted row texts in the order given
 * (the shown list); `hotListPrintHeader` gives the lines above the caption. The web has no login or table number, so it
 * prints VIREO's "(Not Recorded)" and the blank name1 line. The heading and row limits are web input admission, not native
 * capacity claims. Pure: no React, DOM, Date or locale. */
import {HTL_MAX_RECORDS,type HtlFields} from './hotList';
import {formatRadioHotListRow} from './radioHotListFormat';

export type HotListPrintLine=Readonly<{sourceIndex:number;text:string}>;
export type HotListPrintSnapshot=Readonly<{heading:string;lines:readonly HotListPrintLine[]}>;
/** Recovered literals of the body (PRINT-LITERALS.json; Front K2.3 corrected `spoolTitle`: 'Text' is the TextHeight sample). */
export const HOT_LIST_PRINT_LITERALS=Object.freeze({spoolTitle:'CLEA "Object X" Exercise - ',databaseModification:'Database Modification',font:'Courier',textHeightSample:'Text',tableNumber:'     Laboratory Table Number ',notRecorded:'(Not Recorded)'});
/** The lines above the caption (0x591098): '' is a blank line (a 2H advance). Names and table as VIREO stores them. */
export function hotListPrintHeader(dateText:string,editMode:boolean,names:readonly string[]=[],table=''):readonly string[]{
 const L=HOT_LIST_PRINT_LITERALS;
 if(editMode)return Object.freeze([dateText,'']);
 const out=[dateText+L.tableNumber+(table||L.notRecorded),'',names[0]??''];
 for(const n of names.slice(1,4))if(n)out.push(n);
 out.push('');return Object.freeze(out);
}
/** WEB admission limit for the heading (the caller passes the recovered form caption). */
export const HOT_LIST_PRINT_HEADING_MAX=255;
const HEADING=/^[\x20-\x7e\xa0-\xff]+$/;
const LINE=/^[\x20-\x7e\xa0-\xff]*$/;

/** A new deeply frozen snapshot in input order; no input reference is kept. Source indices must be unique integers in
 * [0, HTL_MAX_RECORDS): they key the rendered lines, so duplicate records stay separate lines. Each record is formatted by
 * `format` (default: the RA-HL-08 row 0x590110), which admits the codec domain; a formatted line must be Latin-1 text.
 * Throws RangeError otherwise. */
export function hotListPrintSnapshot(heading:string,rows:readonly Readonly<{sourceIndex:number;record:HtlFields}>[],format:(record:HtlFields,position:number)=>string=formatRadioHotListRow):HotListPrintSnapshot{
 if(typeof heading!=='string'||heading.length>HOT_LIST_PRINT_HEADING_MAX||!HEADING.test(heading))throw new RangeError('Unsupported hot list print heading');
 if(!Array.isArray(rows)||rows.length>HTL_MAX_RECORDS)throw new RangeError('Unsupported hot list print rows');
 const seen=new Set<number>(),lines:HotListPrintLine[]=[];
 for(let i=0;i<rows.length;i++){
  const row:unknown=rows[i];
  if(typeof row!=='object'||row===null)throw new RangeError('Unsupported hot list print row');
  const {sourceIndex,record}=row as {sourceIndex:unknown;record:unknown};
  if(typeof sourceIndex!=='number'||!Number.isInteger(sourceIndex)||sourceIndex<0||sourceIndex>=HTL_MAX_RECORDS||seen.has(sourceIndex))throw new RangeError('Unsupported hot list print source index');
  if(typeof record!=='object'||record===null)throw new RangeError('Unsupported hot list print row');
  seen.add(sourceIndex);
  const text=format(record as HtlFields,i);
  if(typeof text!=='string'||!LINE.test(text))throw new RangeError('Unsupported hot list print line');
  lines.push(Object.freeze({sourceIndex,text}));
 }
 return Object.freeze({heading,lines:Object.freeze(lines)});
}
