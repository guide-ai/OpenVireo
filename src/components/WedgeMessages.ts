import type{WedgeParseFailure}from'../core/wedgeLssText';
import{WEDGE_NATIVE_TEXT as N}from'../core/wedgeNativeText';
import type{WedgePlotStatus}from'../core/wedgePlot';
import type{WedgeWorkspace}from'../core/wedgeWorkspace';
/** Presentation catalog for the LSS wedge panel, keyed and pure so a later
 * coordinator merge can move it into the shared i18n catalog. Every value is typed
 * as a plain string/function/tuple (not the English literal), so translations
 * type-check. English is the default. */

/** Rendered window captions, buttons and messages that the original shows. The
 * defaults are the verbatim literals of core/wedgeNativeText.ts (the source
 * evidence, which itself is never translated or modified). Text drawn inside the
 * wedge figure ("RA (Hours)", ring labels, "Points Plotted: ") is part of the
 * recovered drawing geometry and stays native. */
export type WedgeNativeCaptions=Readonly<{
 windowCaption:string;menuPlotData:string;menuOptions:string;noDataToPlot:string;
 optionsCaption:string;gridType:string;gridItems:readonly[string,string,string];plottedPoints:string;size:string;style:string;styleItems:readonly[string,string];
 autoPlotGroup:string;autoPlotOn:string;ok:string;cancel:string;yes:string;no:string;
 extensionText:string;extensionCaption:string;notLoadedText:string;notLoadedCaption:string;loadedCaption:string;loadedText:(name:string)=>string;
 headerText:(name:string)=>string;headerCaption:string;accessText:(name:string)=>string;accessCaption:string;
 retainText:string;retainCaption:string;deleteText:string;deleteCaption:string;
}>;
type UnsupportedCode=Extract<WedgeParseFailure,{kind:'unsupported'}>['code'];
type ColumnKey='index'|'object'|'mjd'|'ra'|'dec'|'velocity'|'z'|'comment'|'status';
/** `degrees` is an attached unit suffix; include a leading space for a word unit (e.g. ' grad').
 * `hours` is joined with an explicit space by the table/details renderer. */
type DetailKey='redshift'|'kmPerS'|'raw'|'line'|'source'|'ra'|'dec'|'velocity'|'z'|'derived'|'theta'|'radius'|'pixel'|'hours'|'degrees'|'px';
export type WedgeMessageCatalog=Readonly<{
 native:WedgeNativeCaptions;
 intro:string;persistenceNote:string;
 loadLabel:string;loadHelp:string;separatorLabel:string;separatorPoint:string;separatorComma:string;
 reading:(name:string)=>string;cancelRead:string;exportCsv:string;exportNote:string;dismiss:string;
 statusEmpty:string;statusLoaded:(records:number,files:number)=>string;
 /** Appended to the live status while inline import consent waits; `caption` is the translated prompt caption. */
 awaitingAnswer:(caption:string)=>string;
 figureLabel:string;notDrawn:(n:number)=>string;outside:(n:number)=>string;presentationNote:string;
 schemeLabel:string;schemes:readonly[string,string];schemeHelp:string;tableCaption:string;
 columns:Readonly<Record<ColumnKey,string>>;selectRow:(id:string,i:number)=>string;
 plotStatus:Readonly<Record<WedgePlotStatus,string>>;boundary:string;
 fieldStatus:Readonly<Record<'native-zero-fill'|'unadmitted',string>>;signLost:string;
 detailsHeading:string;detailsNone:string;sha256:string;rowCount:(rows:number)=>string;
 sourceColumn:Readonly<Record<'z'|'velocity',string>>;detail:Readonly<Record<DetailKey,string>>;
 derivedFrom:Readonly<Record<'velocity'|'z',string>>;sourcesHeading:string;
 sourceAction:Readonly<Record<'first'|'add'|'replace',string>>;aboutHeading:string;about:readonly string[];
 unsupported:Readonly<Record<UnsupportedCode,string>>;atLine:(line:number)=>string;capacity:string;readFailed:string;
 suspended:(name:string)=>string;autoPlotUnavailable:string;optionsButtonHelp:string;
}>;
type Fn=(...args:never[])=>unknown;
/** Host overrides: any subset; nested groups may be partial; strings, functions and
 * tuples are replaced whole. Missing keys keep the English default. */
export type WedgeMessageOverrides=Readonly<{[K in keyof WedgeMessageCatalog]?:WedgeMessageCatalog[K] extends string|Fn|readonly unknown[]?WedgeMessageCatalog[K]:Readonly<Partial<WedgeMessageCatalog[K]>>}>;

export const WEDGE_NATIVE_CAPTIONS:WedgeNativeCaptions=Object.freeze({
 windowCaption:N.windowCaption,menuPlotData:N.menuPlotData,menuOptions:N.menuOptions,noDataToPlot:N.noDataToPlot,
 optionsCaption:N.optionsCaption,gridType:N.gridType,gridItems:Object.freeze([N.gridItems[0],N.gridItems[1],N.gridItems[2]]as const),plottedPoints:N.plottedPoints,size:N.size,style:N.style,styleItems:Object.freeze([N.styleItems[0],N.styleItems[1]]as const),
 autoPlotGroup:N.autoPlotGroup,autoPlotOn:N.autoPlotOn,ok:N.ok,cancel:N.cancel,yes:N.yes,no:N.no,
 extensionText:N.extensionText,extensionCaption:N.extensionCaption,notLoadedText:N.notLoadedText,notLoadedCaption:N.notLoadedCaption,loadedCaption:N.loadedCaption,loadedText:N.loadedText,
 headerText:N.headerText,headerCaption:N.headerCaption,accessText:N.accessText,accessCaption:N.accessCaption,
 retainText:N.retainText,retainCaption:N.retainCaption,deleteText:N.deleteText,deleteCaption:N.deleteCaption,
});
export const WEDGE_MESSAGES:WedgeMessageCatalog=Object.freeze({
 native:WEDGE_NATIVE_CAPTIONS,
 intro:'Load redshift data that the VIREO Large-Scale Structure exercise saved as a text file, then plot it on the original wedge diagram. The data stay exactly as saved: nothing is measured, estimated or filled in here.',
 persistenceNote:'This workspace exists only in this open window. Loaded files, the plot, options and selection are not included in Save investigation, and they are discarded when the page is reloaded or closed. Your saved .TXT files are not changed and can be loaded again.',
 loadLabel:'Load saved LSS data (.TXT)…',
 loadHelp:'Choose a .TXT file saved from the VIREO LSS exercise (header begins “Object ID”). Files from other exercises are not compatible.',
 separatorLabel:'Decimal separator used in the file',
 separatorPoint:'Point (6000.5)',separatorComma:'Comma (6000,5)',
 reading:(name:string)=>`Reading ${name}…`,cancelRead:'Cancel reading',
 exportCsv:'Download plotted data (CSV)',
 exportNote:'The CSV is a new OpenVireo format with source hashes and exact binary32 values; it is not the original VIREO save format.',
 dismiss:'Dismiss',
 statusEmpty:'No LSS data loaded.',
 statusLoaded:(records:number,files:number)=>`${records} record${records===1?'':'s'} from ${files} file${files===1?'':'s'}.`,
 awaitingAnswer:(caption:string)=>`Import question waiting for your answer: ${caption} Loading, plotting and options are unavailable until it is answered.`,
 figureLabel:'LSS wedge diagram: right ascension 12h to 16h, radius proportional to redshift',
 notDrawn:(n:number)=>`${n} record${n===1?' is':'s are'} not plotted because a field could not be read as the original would (see table).`,
 outside:(n:number)=>`${n} admitted point${n===1?' lies':'s lie'} outside the 550 × 550 drawing area.`,
 presentationNote:'Grid geometry, scales, labels, point sizes and both colour schemes follow the recovered program; fonts are approximate and the dashed selection ring is this page’s own.',
 schemeLabel:'Plot colours',
 schemes:Object.freeze(['Original display colours','Original black-and-white (print) colours']as const),
 schemeHelp:'In the original, printing uses the scheme opposite to a program setting (black and white when that setting is 0), and the display starts from that setting; its default was not recovered.',
 tableCaption:'Loaded records (original order)',
 columns:Object.freeze({index:'#',object:'Object ID',mjd:'MJD(Days) as saved',ra:'RA',dec:'Dec',velocity:'V (km/s)',z:'Z',comment:'Comments',status:'Plot'}),
 selectRow:(id:string,i:number)=>`Select record ${i}${id?` (${id})`:''}`,
 plotStatus:Object.freeze({plotted:'Plotted','outside-client':'Outside drawing area','excluded-ra':'Not plotted: RA','excluded-redshift':'Not plotted: V/Z'}),
 boundary:'Rounding tie: pixel not certain',
 fieldStatus:Object.freeze({'native-zero-fill':'Empty field (the original stores 0)',unadmitted:'Spelling not admitted here'}),
 signLost:'The original drops the minus sign of “−0°”.',
 detailsHeading:'Selected record',
 detailsNone:'Select a row or a plotted point to inspect it.',
 sha256:'SHA-256',
 rowCount:(rows:number)=>`${rows} data row${rows===1?'':'s'}`,
 sourceColumn:Object.freeze({z:'Z column',velocity:'V(km/sec) column'}),
 detail:Object.freeze({redshift:'V / Z',kmPerS:'km/s',raw:'Saved line',line:'Line',source:'File',ra:'RA (hours)',dec:'Dec (degrees, original rule)',velocity:'V binary32',z:'Z binary32',derived:'Derived from',theta:'Angle from 12h spoke',radius:'Radius',pixel:'Pixel (x, y)',hours:'h',degrees:'°',px:'px'}),
 derivedFrom:Object.freeze({velocity:'V column (Z = V / c)',z:'Z column (V = c · Z)'}),
 sourcesHeading:'Loaded files',
 sourceAction:Object.freeze({first:'loaded',add:'added',replace:'replaced current data'}),
 aboutHeading:'What this reconstruction covers',
 about:Object.freeze([
  'Recovered statically from CLEA_VEO.exe (SHA-256 781bc970…c52c54c); the original program was never run.',
  'Covered: the LSS “Load Saved Data” text reader, the wedge grid (Velocity, Red Shift (Z), No Grid), point size 1–5, open/filled points, “Plot Data” and the add/clear prompts.',
  'Not available: group Auto Plot (needs a shared instructor file), live plotting while measuring spectra, and the original save format. Print Wedge Plot is a web print that always uses the black-and-white scheme; VIREO’s print scheme is the opposite of a program setting whose default is not recovered.',
  'The MJD column is kept exactly as saved. The original completes it with a prefix from the date of the session that loaded it, which cannot be known here, so no MJD value is computed.',
  'V and Z are stored as single-precision numbers and derived with the program’s c = 299792.458 km/s; angle and pixel rounding use this browser’s arithmetic, and rare ties are flagged rather than claimed.',
 ]),
 unsupported:Object.freeze({
  size:'The file is larger than this page accepts (512 KiB).',
  bytes:'The file contains characters outside plain ASCII and the degree sign (byte B0). Re-save it as ANSI text.',
  cr:'The file uses a line ending this page does not accept (only LF or CR LF).',
  'line-length':'A line is longer than 1024 characters.',
  'blank-line':'The file contains an empty line after the header. The original reader fails on empty lines, so nothing was loaded.',
  rows:'The file has more than 2000 data lines.',
  overflow:'A Z value is so large that V = c · Z overflows; the original reader stops with an error, so nothing was loaded.',
 }),
 atLine:(line:number)=>` (line ${line})`,
 capacity:'Adding this file would exceed 10 000 records, so nothing was loaded.',
 readFailed:'The browser could not read the file.',
 suspended:(name:string)=>`Loading ${name} stopped because this panel became inactive; nothing from it was added and the current data are unchanged. Choose the file again to load it.`,
 autoPlotUnavailable:'Group Auto Plot needs a shared group file prepared by an instructor. It is not available in this version.',
 optionsButtonHelp:'Grid type, point size and point style',
});

const isGroup=(v:unknown):v is Readonly<Record<string,unknown>>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const sameShape=(base:unknown,v:unknown)=>typeof v===typeof base&&Array.isArray(v)===Array.isArray(base)&&(!Array.isArray(base)||base===WEDGE_MESSAGES.about||(v as unknown[]).length===base.length);
/** Defaults merged with host overrides. Undefined entries and values whose kind
 * (string, function, tuple length, group) differs from the default are ignored, so
 * an untyped catalog cannot blank or break a control. */
export function wedgeMessages(overrides?:WedgeMessageOverrides):WedgeMessageCatalog{
 if(!overrides)return WEDGE_MESSAGES;
 const out:Record<string,unknown>={...WEDGE_MESSAGES};
 for(const[key,value]of Object.entries(overrides)){
  const base=(WEDGE_MESSAGES as Readonly<Record<string,unknown>>)[key];
  if(value===undefined||base===undefined)continue;
  if(isGroup(base)&&typeof base!=='function'){
   if(!isGroup(value))continue;
   const group:Record<string,unknown>={...base};
   for(const[k,v]of Object.entries(value))if(v!==undefined&&k in base&&sameShape(base[k],v))group[k]=v;
   out[key]=Object.freeze(group);
  }else if(sameShape(base,value))out[key]=value;
 }
 return Object.freeze(out)as WedgeMessageCatalog;
}

/** Text of the panel's polite live status. A visible inline import question is named here
 * too: role=alertdialog is not a live region, and the question must not take focus a user
 * deliberately placed elsewhere. `askPending` is false while the host disables the panel
 * (the prompt is not shown then). Web accessibility wording, not an original string. */
export function wedgeStatusText(w:Pick<WedgeWorkspace,'reading'|'pending'|'records'|'receipts'>,m:WedgeMessageCatalog,askPending=true):string{
 if(w.reading)return m.reading(w.reading.name);
 const base=w.records.length||w.receipts.length?m.statusLoaded(w.records.length,w.receipts.length):m.statusEmpty;
 if(!w.pending||!askPending)return base;
 return base+' '+m.awaitingAnswer(w.pending.stage==='retain'?m.native.retainCaption:m.native.deleteCaption);
}
