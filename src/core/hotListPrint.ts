/** Hot List ▸ Print report (RA-HL-10, WEB-HL-12; port of the parked radio candidate R-RX23, generic over the list owner).
 * CLEA_VEO.exe 781bc970…c54c, static listings only (task-3/radio-hotlist-print-20261026, no execution): THotListForm1
 * Print1Click 0x59103c..0x591094 calls the owner's [[0x5b59a4]]+0x3a8 predicate (unidentified) and, when it returns True,
 * the body 0x591098..0x5913de, then stores self+0x585 := 1 (a Checked mark, not a success result). The body sets a spooler
 * title and a header from owner state (date, optional table number, names), prints the form caption, then ListBox1.Items
 * 0..Count-1 in list order with a page-height break. The list window [0x5b5998] is shared by the optical and radio owners.
 * Web policy (WEB-HL-12): the report is the form caption plus the already formatted row texts in the order given (the shown
 * list), nothing else: no title, date, names, table number, ordinal, trimming, sorting or deduplication. The heading and row
 * limits are web input admission, not native capacity claims. Pure: no React, DOM, Date or locale. */
import {HTL_MAX_RECORDS,type HtlFields} from './hotList';
import {formatRadioHotListRow} from './radioHotListFormat';

export type HotListPrintLine=Readonly<{sourceIndex:number;text:string}>;
export type HotListPrintSnapshot=Readonly<{heading:string;lines:readonly HotListPrintLine[]}>;
/** Recovered literals of the body (PRINT-LITERALS.json); recorded, not printed: the owner fields they frame are not recovered. */
export const HOT_LIST_PRINT_LITERALS=Object.freeze({objectXPrefix:'CLEA "Object X" Exercise - ',databaseModification:'Database Modification',font:'Courier',spoolTitle:'Text',tableNumber:'     Laboratory Table Number ',notRecorded:'(Not Recorded)'});
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
