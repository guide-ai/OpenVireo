/** Bounded decimal-coordinate candidate reader,not a catalog/source certificate.
 * Complete source0x59c9d8/0x59d030 and tables: CAMERA-NOMAD-ROWS-PROVENANCE. */
export class NativeNomadError extends Error {
 constructor(readonly code:'line'|'header'|'format'|'unsupported-units'|'layout'|'row'|'number'|'context'|'identity',readonly field?:string){super(`NOMAD row contract: ${code}${field?` (${field})`:''}`);this.name='NativeNomadError';}
}
export type NomadBand='B'|'V'|'R'|'J'|'H'|'K';
export type NomadField='id'|'RA'|'DEC'|'MuRA'|'MuDEC'|'B'|'V'|'R'|'I'|'J'|'H'|'K';
const labels=[' id|',' RA|',' DEC|',' MuRA|',' MuDEC|',' B|',' V|',' R|','',' J|',' H|',' K|'] as const;
const fields:readonly NomadField[]=['id','RA','DEC','MuRA','MuDEC','B','V','R','I','J','H','K'];
const bandSlots:Readonly<Record<NomadBand,number>>=Object.freeze({B:5,V:6,R:7,J:9,H:10,K:11});
const bandCodes:Readonly<Record<NomadBand,number>>=Object.freeze({B:1,V:2,R:3,J:5,H:6,K:7});
const layoutBrand:unique symbol=Symbol('nomad-decimal-layout');
export type NomadLayout=Readonly<{
 [layoutBrand]:true;header:string;units:string;requiredLength:number;
 columns:readonly Readonly<{field:NomadField;start:number;length:number}>[];
}>;
export type NomadRowContext=Readonly<{band:NomadBand;epochOffsetYears:number}>;
export type NomadRowCandidate=Readonly<{
 originalLine:string;nativeIdentifier:string;rawFields:readonly(string|null)[];
 raHours:number;decDegrees:number;sourceRaHours:number;sourceDecDegrees:number;
 motionRaAfterDivision:number;motionDecAfterDivision:number;
 magnitudes:Readonly<Record<NomadBand,number>>;
 selectedMagnitude:number;band:NomadBand;nativeBandCode:number;epochOffsetYears:number;
}>;
export type NomadRowResult=Readonly<{kind:'candidate';row:NomadRowCandidate}>|Readonly<{kind:'rejected';reason:'selected-magnitude'}>;
export type NomadSelection=Readonly<{minRAHours:number;maxRAHours:number;minDecDegrees:number;maxDecDegrees:number;magnitudeLimit:number}>;
const asciiLine=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=4096&&/^[\x20-\x7e]+$/.test(v);

/** Native fixed-column positions,not CSV tokenization. Only the recovered
 * decimal-hours/degrees descriptor is admitted in this bounded reader. */
export function nativeNomadLayout(header:string,units:string):NomadLayout {
 if(!asciiLine(header))throw new NativeNomadError('line');
 if(!header.includes('RA'))throw new NativeNomadError('header');
 const columns=labels.map((raw,i)=>{
  // Actual table slots hold up to7bytes;the caller copies into ShortString[6].
  const needle=raw.slice(0,6);if(!needle)return Object.freeze({field:fields[i],start:0,length:0});
  const at=header.indexOf(needle);
  if(at<0||header.indexOf(needle,at+1)>=0)throw new NativeNomadError('header',fields[i]);
  const end=at+1+needle.length;let start=at+1;
  while(start>0&&header[start-1]===' ')start--;
  start++;
  const length=end-start;
  if(length<1)throw new NativeNomadError('header',fields[i]);
  return Object.freeze({field:fields[i],start,length});
 });
 // Original GetData validates header before coordinate descriptor. Preserve
 // that priority even when both inputs are unusable. Sexagesimal is admitted
 // by the original but not implemented by this decimal row reader.
 if(!asciiLine(units))throw new NativeNomadError('format');
 if(!units.includes('hh.hhh')||!units.includes('dd.ddd')){
  if(units.includes('hh mm ss')&&units.includes('dd mm ss'))throw new NativeNomadError('unsupported-units');
  throw new NativeNomadError('format');
 }
 return Object.freeze({[layoutBrand]:true as const,header,units,columns:Object.freeze(columns),requiredLength:Math.max(...columns.map(c=>c.start+c.length-1))});
}
function decimal(text:string,field:NomadField):number {
 const s=text.replace(/^ +| +$/g,'');
 // Declared canonical ASCII-dot grammar,not native host-locale parity.
 if(s.length>64||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(s))throw new NativeNomadError('number',field);
 const n=Number(s);if(!Number.isFinite(n))throw new NativeNomadError('number',field);return n;
}
/** Explicit source epoch offset and band;never supplied from browser time or
 * an assumed live camera/filter. Every present magnitude is parsed,not filled. */
export function readNativeNomadRow(layout:NomadLayout,line:string,context:NomadRowContext):NomadRowResult {
 if(!layout||layout[layoutBrand]!==true)throw new NativeNomadError('layout');
 if(!context||typeof context!=='object'||!Object.hasOwn(bandSlots,context.band)||!Number.isFinite(context.epochOffsetYears)||Math.abs(context.epochOffsetYears)>1000)throw new NativeNomadError('context');
 if(!asciiLine(line)||line.length<layout.requiredLength)throw new NativeNomadError('row');
 const rawFields=layout.columns.map(c=>c.start===0?null:line.slice(c.start-1,c.start-1+c.length));
 const nativeIdentifier=rawFields[0]!.replace(/^ +/,'').slice(0,18);
 if(!nativeIdentifier.trim())throw new NativeNomadError('identity');
 const numbers=rawFields.map((s,i)=>i===0||s===null?0:decimal(s,fields[i]));
 const sourceRaHours=numbers[1],sourceDecDegrees=numbers[2];
 // Bounded input admission;no normalization of the motion-adjusted result.
 if(sourceRaHours<0||sourceRaHours>24||sourceDecDegrees< -90||sourceDecDegrees>90)throw new NativeNomadError('number','coordinates');
 const motionRaAfterDivision=Math.fround(numbers[3]/1000),motionDecAfterDivision=Math.fround(numbers[4]/1000);
 if(!Number.isFinite(motionRaAfterDivision)||!Number.isFinite(motionDecAfterDivision))throw new NativeNomadError('number','motion');
 const selectedMagnitude=Math.fround(numbers[bandSlots[context.band]]);
 if(!Number.isFinite(selectedMagnitude))throw new NativeNomadError('number','magnitude');
 if(selectedMagnitude===0||selectedMagnitude>=30)return Object.freeze({kind:'rejected' as const,reason:'selected-magnitude' as const});
 const raHours=sourceRaHours+(context.epochOffsetYears*motionRaAfterDivision)/54000;
 const decDegrees=sourceDecDegrees+(context.epochOffsetYears*motionDecAfterDivision)/3600;
 const magnitudes=Object.freeze({B:numbers[5],V:numbers[6],R:numbers[7],J:numbers[9],H:numbers[10],K:numbers[11]});
 const row:NomadRowCandidate=Object.freeze({originalLine:line,nativeIdentifier,rawFields:Object.freeze(rawFields),sourceRaHours,sourceDecDegrees,motionRaAfterDivision,motionDecAfterDivision,raHours,decDegrees,magnitudes,selectedMagnitude,band:context.band,nativeBandCode:bandCodes[context.band],epochOffsetYears:context.epochOffsetYears});
 return Object.freeze({kind:'candidate' as const,row});
}

/** 0x59cf58..0x59d030. Explicit bounds only,not a field/cache certificate.
 * Equality of RA endpoints follows the original wrapping branch. */
export function nativeNomadCandidateInSelection(row:NomadRowCandidate,bounds:NomadSelection):boolean {
 if(!row||![row.raHours,row.decDegrees,row.selectedMagnitude].every(Number.isFinite)||!Object.is(row.selectedMagnitude,Math.fround(row.selectedMagnitude)))throw new NativeNomadError('row');
 if(!bounds||![bounds.minRAHours,bounds.maxRAHours,bounds.minDecDegrees,bounds.maxDecDegrees,bounds.magnitudeLimit].every(Number.isFinite)||!Object.is(bounds.magnitudeLimit,Math.fround(bounds.magnitudeLimit)))throw new NativeNomadError('context');
 const ra=bounds.minRAHours<bounds.maxRAHours
  ?row.raHours>=bounds.minRAHours&&row.raHours<=bounds.maxRAHours
  :row.raHours>=bounds.minRAHours||row.raHours<=bounds.maxRAHours;
 return ra&&row.decDegrees>=bounds.minDecDegrees&&row.decDegrees<=bounds.maxDecDegrees&&row.selectedMagnitude<=bounds.magnitudeLimit;
}
