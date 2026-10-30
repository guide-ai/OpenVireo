import {useState} from 'react';
import type {NativeObservationData} from '../core/nativeObservationResults';
import {recordedResultsLines} from '../core/recordedResults';
import {nativeTextBytes,parseNativeTextResults} from '../core/nativeTextResults';
import {exportNativeCsvFromText,nativeCsvBytes} from '../core/nativeCsvResults';
import FieldInfoListWindow,{type FieldInfoBox} from '../observatory/FieldInfoListWindow';
import {CLUSTER_HR_EN as HR} from './ClusterHrMessages';

const latin1=(s:string)=>Uint8Array.from(s,c=>c.charCodeAt(0));
/** Comma Delimit (0x5472e0) of the shown lines through the ported TXT → CSV writer; a refusal is a typed box [W]. */
function csvOf(lines:readonly string[]):Readonly<{bytes:Uint8Array;name:string}>|FieldInfoBox{
 try{
  const text=parseNativeTextResults(latin1(lines.join('\r\n')+'\r\n'),'.');nativeTextBytes(text);
  return {bytes:nativeCsvBytes(exportNativeCsvFromText(text)),name:'Observations.csv'};
 }catch{return {caption:HR.recordedResultsCsvCaption,text:HR.recordedResultsCsvRefused};}
}

/** Observation-mode File › Display/Print Data (0x542f1c → RsltsListForm1 "Recorded Results - …", Front K2.1): the lines the
 * DAT reader writes for the current list (core/recordedResults.ts) in the shared list window: Search, Print (preview [W]),
 * Save Text (Observations.TXT), Comma Delimit, Close. */
export default function RecordedResultsWindow({data,testId,onClose}:{data:NativeObservationData;testId:string;onClose:()=>void}){
 const [box,setBox]=useState<FieldInfoBox|null>(null);
 const r=recordedResultsLines(data);
 if(r.kind==='blocked')return <section className="card fi-window" data-testid={testId}><p role="alert" data-testid={`${testId}-blocked`}>{HR.recordedResultsBlocked(r.row,HR.recordedResultsBlock[r.reason])}</p>
  <button type="button" className="secondary-button" onClick={onClose}>{HR.close}</button></section>;
 return <FieldInfoListWindow testId={testId} caption={r.caption} lines={r.lines} first={1} last={r.lines.length-1} hideSelection printStudent
  notice={<p className="fi-note" data-testid={`${testId}-note`}>{HR.recordedResultsNote}</p>} selectionItems={[]} saveName={r.saveName}
  csv={{disabled:r.lines.length<2,bytes:()=>csvOf(r.lines)}} onClose={onClose} box={box} onBox={setBox}/>;
}
