/** "Recorded Results" list lines (RsltsListForm1) for saved 144-byte observation records (Front K2.1). CLEA_VEO.exe
 * 781bc970…c54c, static reading only; research analysis/front-k2/A-recorded-results-rows.md.
 * [D] Reading saved data (DAT reader 0x549aa8, refresh 0x549c4a..0x549cb6) fills the list: header 0x54708c with dl = the first
 *     record's kind byte, then one row per record of the whole sorted list through 0x5486a8, whose output local is reused
 *     between rows. Row 0x5486a8 (exercise ≠ 4): ID Copy(1,11)+' ' padded to 12; time Copy(FloatToStrF(Double + bias 0x5bad48,
 *     ffFixed, 18, 6), 4, 11); RA 0x486ca0(1 decimal, h m s); Dec 0x486ca0(0 decimals, ° ' ") + ' '; 3 or 5 filters by the
 *     record kind (0: ffFixed 1 + ' ' padded to 10, 1: ffFixed 3 + ' ' padded to 7, zero → blanks, ≥ 2: the Dec text again);
 *     Z ffExponent(4, 2) + ' ' padded to 12 or 12 blanks; 0x55d4f4 Sp padded to 13; comments. An ID 'Sky' with option
 *     +0x2e7f set leaves the output unassigned (the previous row again, '' first).
 * [I] The bias 0x5bad48 is 2415018.5 for any host date before 2173 (initialiser 0x5ac748).
 * [W] The options are VIREO's compiled defaults (magnitudes +0x2e7f = 1, R and I +0x2e82 = 1; 0x5a2ada / 0x5a2aef); the web has
 *     no options dialog for them. RA/Dec use the binary64 split of nativeListFormat (VIREO splits in Extended). A stored value
 *     VIREO's FPU would refuse (NaN, infinity, unsupported Extended) or a spectral code the port cannot format is a typed
 *     reason instead of a partial list. Pure. */
import {dyadicAdd,dyadicFromStored,dyadicNumber,roundExtended,type ClusterNativeDyadic} from './clusterNativeObservationHr';
import {nativeRecordTextHasEscapes,type NativeObservationData,type NativeObservationRecord,type NativeResultFieldId,type StoredNumber} from './nativeObservationResults';
import {floatToStrFFixed,type ExactExtended} from './variableStars';
import {formatNativeSexagesimalDigits,padLeft,padRight} from './nativeListFormat';
import {floatToStrFExponent4,nativeSpectralText} from './catalogObject';

export type RecordedResultsOptions=Readonly<{magnitudes:boolean;fiveFilters:boolean}>;
/** VIREO's compiled option defaults (TEnvironment1 defaults 0x5a2ada, 0x5a2aef) [D]. */
export const RECORDED_RESULTS_DEFAULTS:RecordedResultsOptions=Object.freeze({magnitudes:true,fiveFilters:true});
export type RecordedResultsBlock='value'|'spectral-code'|'text';
export type RecordedResultsLines=Readonly<{kind:'ready';caption:string;lines:readonly string[];saveName:string}>|Readonly<{kind:'blocked';reason:RecordedResultsBlock;row:number}>;
/** The time bias 0x5bad48 = 1721424.5 + 693594 (0x5ac748; [I] host date before 2173). */
export const NATIVE_TIME_BIAS=2415018.5;
export const RECORDED_RESULTS_LITERALS=Object.freeze({
 magnitudesCaption:'Recorded Results - Computed Magnitudes',// 0x546f40
 countsCaption:'Recorded Results - Mean Counts',// 0x546f70
 saveName:'Observations',// FormShow 0x546e1c (+0x3dc), '.TXT' added by 0x59e92c
 headerStart:'Object ID    MJD(Days) ',coordinates:'     RA           Dec    ',headerEnd:'     Z      Spectrum     Comments',
 countLabels:['     U    ','     B    ','     V    ','     R    ','     I    '],// 0x5b41ec
 magnitudeLabels:['  U    ','  B    ','  V    ','  R    ','  I    '],// 0x5b4224
});
const L=RECORDED_RESULTS_LITERALS;
/** A value or text the formatter cannot render (thrown by the helpers below). */
export class RecordedResultsBlocked extends Error{constructor(readonly reason:RecordedResultsBlock){super(reason);this.name='RecordedResultsBlocked';}}
const Blocked=RecordedResultsBlocked;

/** A decoded stored number as an exact Extended for floatToStrFFixed; non-finite or unsupported values are blocked. */
export function exactOfStored(s:StoredNumber):ExactExtended{
 if(s.kind==='zero')return Object.freeze({negative:s.negative,mantissa:0n,exponent:0,value:s.negative?-0:0});
 if((s.kind!=='normal'&&s.kind!=='subnormal')||s.coefficient===null||s.power===null)throw new Blocked('value');
 return exactOfDyadic({n:(s.negative?-1n:1n)*BigInt(s.coefficient),e:s.power});
}
function exactOfDyadic(d:ClusterNativeDyadic):ExactExtended{
 if(d.n===0n)return Object.freeze({negative:false,mantissa:0n,exponent:0,value:0});
 const negative=d.n<0n,m=negative?-d.n:d.n,shift=64-m.toString(2).length;
 if(shift<0)throw new Blocked('value');
 return Object.freeze({negative,mantissa:m<<BigInt(shift),exponent:d.e-shift,value:dyadicNumber(d)});
}
/** The stored value as a Number (finite only). */
export function numberOfStored(s:StoredNumber):number{exactOfStored(s);return s.kind==='zero'?(s.negative?-0:0):dyadicNumber(dyadicFromStored(s));}
const field=(r:NativeObservationRecord,id:NativeResultFieldId)=>r.fields.find(f=>f.id===id)!.value;
/** FloatToStrF(time + bias, ffFixed, 18, 6): the Double plus the Extended bias in one x87 add (64-bit significand). */
export function nativeJulianDateText(time:StoredNumber):string{
 exactOfStored(time);
 const sum=roundExtended(dyadicAdd(dyadicFromStored(time),{n:4830037n,e:-1}));
 return floatToStrFFixed(exactOfDyadic(sum),6);
}
const fixed=(s:StoredNumber,d:number)=>floatToStrFFixed(exactOfStored(s),d);
function spectral(code:number){const s=nativeSpectralText(code);if(s===null)throw new Blocked('spectral-code');return s;}
/** One row of 0x5486a8 (exercise ≠ 4), or null for the unassigned 'Sky' output. */
function row(data:NativeObservationData,index:number,options:RecordedResultsOptions,filters:number):string|null{
 const r=data.records[index];
 if(nativeRecordTextHasEscapes(data,index,'object')||nativeRecordTextHasEscapes(data,index,'remarks'))throw new Blocked('text');
 if(r.object==='Sky'&&options.magnitudes)return null;
 let s=padRight(r.object.slice(0,11)+' ',12);
 s+=nativeJulianDateText(field(r,'time')).slice(3,14);
 const dec=formatNativeSexagesimalDigits(numberOfStored(field(r,'dec')),0,['°',"'",'"']);
 s+=formatNativeSexagesimalDigits(numberOfStored(field(r,'ra')),1,['h','m','s'])+dec+' ';
 const photometry:readonly NativeResultFieldId[]=['u','b','v','r','i'];
 for(const id of photometry.slice(0,filters)){
  const v=field(r,id);
  if(r.kind===0)s+=v.kind==='zero'?' '.repeat(10):padLeft(fixed(v,1)+' ',10,' ');
  else if(r.kind===1)s+=v.kind==='zero'?' '.repeat(7):padLeft(fixed(v,3)+' ',7,' ');
  else s+=dec;
 }
 const z=field(r,'redshift');
 s+=z.kind==='zero'?' '.repeat(12):padLeft(floatToStrFExponent4(numberOfStored(z))+' ',12,' ');
 return s+padRight(spectral(r.spectralCode),13)+r.remarks;
}
/** Header 0x54708c for exercise ≠ 4 with dl = the first record's kind byte. */
export function recordedResultsHeader(kind:number,filters:3|5):string{
 const labels=kind===0?L.countLabels:kind===1?L.magnitudeLabels:[];
 return L.headerStart+L.coordinates+labels.slice(0,filters).join('')+L.headerEnd;
}
/** The list after reading saved data: header (none for an empty list) and one line per record in list order. */
export function recordedResultsLines(data:NativeObservationData,options:RecordedResultsOptions=RECORDED_RESULTS_DEFAULTS):RecordedResultsLines{
 const caption=options.magnitudes?L.magnitudesCaption:L.countsCaption,filters=options.fiveFilters?5:3;
 const lines:string[]=[];let previous='',i=0;
 try{
  if(data.records.length)lines.push(recordedResultsHeader(data.records[0].kind,filters));
  for(;i<data.records.length;i++){const s=row(data,i,options,filters);if(s!==null)previous=s;lines.push(previous);}
 }catch(e){if(e instanceof RecordedResultsBlocked)return Object.freeze({kind:'blocked',reason:e.reason,row:i+1});throw e;}
 return Object.freeze({kind:'ready',caption,lines:Object.freeze(lines),saveName:L.saveName+'.TXT'});
}
