/** Observatory Set Date/Time (OB-DT-01, docs/OPTICAL-OBSERVATORY-PROVENANCE.json). There is no optical date dialog: the
 * only one is the main window's "Set Observation Date/Time, ID..." (TUTTimeDlg, SetDateTime1Click 0x58b2ec), already ported
 * as radioDateDialog.ts (RC-12..RC-17), which writes the shared UT record the optical clocks read. WEB-DT-01: the observatory
 * offers the same dialog fields (date YYYY/MM/DD, UT HH:MM:SS) and applies the result to the site clock UT scenario; the
 * Object X ID field is not offered here. Pure. */
import {UT_DIALOG_CAPTIONS,dialogEntryInstant,dialogPrefill,type DialogEntryFailure} from './radioDateDialog';
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
