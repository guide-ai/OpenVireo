/** Observation-mode right-click on the cluster HR plot (Front K2.2). CLEA_VEO.exe 781bc970…c54c, static reading only;
 * research analysis/front-k2/B-obs-mode-click.md.
 * [D] Display1MouseUp 0x543bfc acts on a right-button press and release in observation mode (+0x40d) and runs the hit test
 *     0x544428 over the results list, head to tail: V = 0 then B = 0 skip a record; its pixel is the drawn one (0x5445a8, the
 *     same transform as the plot 0x542990); d = Sqrt(int32 (px−X)² + int32 (py−Y)²) with 32-bit wrapping; the record with
 *     d < best (best starts at 1000, strict) wins, so ties go to the first. The hit record opens TObsRsltsDlg1 "Observational
 *     Data" (ShowModal), filled by FormActivate 0x54a91c; the plot marks it with a magenta ellipse ±3 (0x542b03).
 * [W] A miss shows nothing (VIREO reads an uninitialised index there); a negative wrapped sum, where VIREO's Sqrt raises, is
 *     typed. Pure. */
import type {ClusterNativeHrPlot} from './clusterNativeObservationHr';
import type {NativeObservationData,NativeResultFieldId} from './nativeObservationResults';
import {nativeRecordTextHasEscapes} from './nativeObservationResults';
import {exactOfStored,nativeJulianDateText,numberOfStored,RecordedResultsBlocked,type RecordedResultsBlock} from './recordedResults';
import {splitNativeSexagesimal,padLeft} from './nativeListFormat';
import {delphiFixed,floatToStrFFixed} from './variableStars';
import {floatToStrFExponent4,nativeSpectralText} from './catalogObject';

export type ClusterNativeHrHit=Readonly<{kind:'hit';index:number;pixel:Readonly<{x:number;y:number}>}>|Readonly<{kind:'miss'}>|Readonly<{kind:'fpu'}>;
/** Hit test 0x544428 at image pixel (x, y) over the plotted rows in list order. */
export function clusterNativeHrHitTest(plot:ClusterNativeHrPlot,x:number,y:number):ClusterNativeHrHit{
 if(plot.status!=='plotted'||!Number.isInteger(x)||!Number.isInteger(y))return Object.freeze({kind:'miss'});
 let best=1_000_000,hit:ClusterNativeHrHit=Object.freeze({kind:'miss'});
 for(const row of plot.rows){
  if(row.status!=='plotted'||!row.pixel)continue;
  const dx=(row.pixel.x-x)|0,dy=(row.pixel.y-y)|0,sum=(Math.imul(dx,dx)+Math.imul(dy,dy))|0;
  if(sum<0)return Object.freeze({kind:'fpu'});
  // Sqrt is monotonic and exact enough on these integers, so d < best ⇔ d² < best² (best² starts at 1000²).
  if(sum<best){best=sum;hit=Object.freeze({kind:'hit',index:row.index,pixel:row.pixel});}
 }
 return hit;
}

export const OBSERVATIONAL_DATA_LITERALS=Object.freeze({
 caption:'Observational Data',object:'Object:',jd:'Observation Time (JD)',ra:'Right Ascension:',dec:'Declination:',sp:'Sp.Type:',
 z:'Redshift (Z):',vel:'Velocity (V):',velHint:'(km/sec)',v:'V:',b:'B:',u:'U:',r:'R:',i:'I:',remarks:'Remarks:',ok:'&OK',cancel:'&Cancel',
 counts:'Mean Counts per Second',// 0x54afe0
 magnitudes:'Observed Magnitudes',// 0x54b00c
});
export type ObservationalDataFields=Readonly<{id:string;jd:string;ra:string;dec:string;sp:string;z:string;vel:string;remarks:string;
 /** null for a record kind ≥ 2: VIREO leaves the label and the five boxes as the previous activation left them. */
 results:string|null;u:string;b:string;v:string;r:string;i:string}>;
export type ObservationalDataView=Readonly<{kind:'ready';fields:ObservationalDataFields}>|Readonly<{kind:'blocked';reason:RecordedResultsBlock}>;
const pad0=(s:string,n:number)=>padLeft(s,n,'0');
/** RAEd 0x487170 (al = 2, dl = 1): HHh MMm SS.SSs, no sign, no 24 h wrap. */
export function observationalRaText(hours:number):string{
 const s=splitNativeSexagesimal(hours,2);
 return pad0(String(s.whole),2)+'h '+pad0(String(s.minutes),2)+'m '+pad0(delphiFixed(s.seconds,2),5)+'s';
}
/** DecEd 0x487338 (al = 1, dl = 1): ±DD° MM' SS.S". */
export function observationalDecText(degrees:number):string{
 const s=splitNativeSexagesimal(degrees,1);
 return (s.sign<0?'-':'+')+pad0(String(s.whole),2)+'° '+pad0(String(s.minutes),2)+"' "+pad0(delphiFixed(s.seconds,1),4)+'"';
}
/** FormActivate 0x54a91c for one list record: zero values give empty boxes. */
export function observationalDataFields(data:NativeObservationData,index:number):ObservationalDataView{
 const r=data.records[index];
 if(!r)throw new RangeError('Observational Data record');
 const f=(id:NativeResultFieldId)=>r.fields.find(x=>x.id===id)!.value;
 try{
  if(nativeRecordTextHasEscapes(data,index,'object')||nativeRecordTextHasEscapes(data,index,'remarks'))throw new RecordedResultsBlocked('text');
  const time=f('time'),ra=f('ra'),dec=f('dec'),z=f('redshift'),vel=f('velocity');
  const sp=nativeSpectralText(r.spectralCode);if(sp===null)throw new RecordedResultsBlocked('spectral-code');
  const digits=r.kind===0?1:r.kind===1?3:null;
  const photo=(id:NativeResultFieldId)=>{if(digits===null)return '';const v=f(id);return v.kind==='zero'?'':padLeft(floatToStrFFixed(exactOfStored(v),digits),10,' ');};
  const fields:ObservationalDataFields=Object.freeze({
   id:r.object,
   jd:time.kind==='zero'?'':nativeJulianDateText(time),
   ra:ra.kind==='zero'?'':observationalRaText(numberOfStored(ra)),
   dec:dec.kind==='zero'?'':observationalDecText(numberOfStored(dec)),
   sp,
   z:z.kind==='zero'?'':floatToStrFExponent4(numberOfStored(z)),
   vel:vel.kind==='zero'?'':floatToStrFExponent4(numberOfStored(vel)),
   remarks:r.remarks,
   results:r.kind===0?OBSERVATIONAL_DATA_LITERALS.counts:r.kind===1?OBSERVATIONAL_DATA_LITERALS.magnitudes:null,
   u:photo('u'),b:photo('b'),v:photo('v'),r:photo('r'),i:photo('i'),
  });
  return Object.freeze({kind:'ready',fields});
 }catch(e){if(e instanceof RecordedResultsBlocked)return Object.freeze({kind:'blocked',reason:e.reason});throw e;}
}
