/** Observatory Set Date/Time (OB-DT-01, docs/OPTICAL-OBSERVATORY-PROVENANCE.json). There is no optical date dialog: the
 * only one is the main window's "Set Observation Date/Time, ID..." (TUTTimeDlg, SetDateTime1Click 0x58b2ec), already ported
 * as radioDateDialog.ts (RC-12..RC-17), which writes the shared UT record the optical clocks read. WEB-DT-01: the observatory
 * offers the same dialog fields (date YYYY/MM/DD, UT HH:MM:SS) and applies the result to the site clock UT scenario. Front RE6:
 * it also offers the dialog's ID field (IDEd +0x388, prefilled at FormActivate 0x4fdcf5), which writes the page's one session
 * ID, as OKBtnClick 0x4fdf0c writes ShortString 0x5bc1e4 [D]. Pure. */
import {ID_MAX_LENGTH,UNKNOWN_ID,UT_DIALOG_CAPTIONS,dialogEntryInstant,dialogPrefill,type DialogEntryFailure} from './radioDateDialog';
import {parseClockUTC} from './siteClock';
export {UT_DIALOG_CAPTIONS as OBSERVATORY_DATE_CAPTIONS};
export type ObservatoryDateResult=Readonly<{status:'ok';utc:string}|{status:'failed';failure:DialogEntryFailure}>;
/** Date then time (OKBtnClick order), then the clock domain; the result is the site clock's UT text (whole seconds). */
export function observatoryDateEntry(date:string,time:string):ObservatoryDateResult{
 const r=dialogEntryInstant(date,time);
 if(r.status!=='ok')return Object.freeze({status:'failed',failure:r.failure});
 const utc=new Date(r.utMs).toISOString().slice(0,19);parseClockUTC(utc);
 return Object.freeze({status:'ok',utc});
}
/** FormActivate prefill from the applied UT. */
export function observatoryDatePrefill(utc:string):Readonly<{date:string;time:string}>{return dialogPrefill(parseClockUTC(utc));}
/** OKBtnClick 0x4fdf0c: the ID is written first, before the date and time are checked (so it is kept when they fail); an empty
 * box gives `UNKNOWN` (ShortString 0x4fe078), anything else is kept as typed, spaces included (copy cl=0x12, 18 characters) [D]. */
export function observatoryIdEntry(text:string):string{return text===''?UNKNOWN_ID:text.slice(0,ID_MAX_LENGTH);}
/** WEB-DATE-02, as the radio dialog: an ID edit outside printable ASCII or 18 characters is refused. */
export const observatoryIdEditable=(text:string)=>text.length<=ID_MAX_LENGTH&&/^[\x20-\x7e]*$/.test(text);
export {ID_MAX_LENGTH as OBSERVATORY_ID_MAX_LENGTH};
