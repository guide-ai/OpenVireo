import {createHash,webcrypto} from 'node:crypto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
// Phase 1 item 1.5. SYNTHETIC .PLR text and catalog bytes only; nothing here is a CLEA observation or the original catalog.
import {admitRadioInvestigation,portableRadioInvestigation} from './radioInvestigation';
import {pulsarDataSnapshot,radioWorkspaceSnapshot,type RadioInvestigation} from '../core/radioInvestigation';
import {INITIAL_RADIO_CONTROL} from '../core/radioControl';
import {INITIAL_RADIO_LAB,RADIO_COMPILED_OPTIONS} from '../core/radioAntenna';
import {INITIAL_RADIO_CLOCK_SCENARIO,radioClockSnapshot} from '../core/radioClock';
import {INITIAL_RADIO_DATE} from '../core/radioDateDialog';
import {INITIAL_RADIO_ACCESS} from '../core/radioAccessOptions';
import {INITIAL_PULSAR_REFERENCE} from '../core/radioPulsarReferenceCatalog';
import {createRadioReceiverSession} from '../core/radioReceiverSession';
import {UNSUPPLIED_RADIO_ENVIRONMENT,startPulsarExercise} from '../core/pulsarExerciseStart';
import {admitPlrRecording} from '../core/pulsarRecording';
import {pulsarMemoryRecording} from '../core/pulsarCurrentData';
import {RECORDED_VIREO_PULSARS_DAT} from '../core/radioPulsarReferenceCatalog';
import {encodeSessionNumber} from '../core/sessionNumber';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());

const PLR_TEXT=["'SYNTH',25,1",'400.00,500.00,0','1.0,2.0,1.0','51544.5,0.01','0,10,0','1,-0.5,0','2,10,0'].join('\r\n')+'\r\n';
function fileInvestigation():RadioInvestigation{
 const a=admitPlrRecording(new TextEncoder().encode(PLR_TEXT),'synthetic.plr');if(a.status!=='admitted')throw new Error(a.reason);
 return Object.freeze({workspace:null,data:pulsarDataSnapshot(a.recording),analysis:Object.freeze({list:Object.freeze([]),nextSequence:1,listSaved:false,view:null})});
}
const asFile=(radio:unknown)=>JSON.parse(JSON.stringify(radio,(_k,v)=>encodeSessionNumber(v),2));
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');

describe('Phase 1 item 1.5 radio investigation io: digest, .PLR re-admission and sources',()=>{
 it('writes the .PLR SHA-256 and a canonical digest, and restores the same bytes re-admitted by the existing reader',async()=>{
  const {radio,digest}=await portableRadioInvestigation(fileInvestigation());
  const r=radio as {data:{sha256:string;text:string}};
  expect(r.data.sha256).toBe(sha(PLR_TEXT));expect(r.data.text).toBe(PLR_TEXT);
  const loader=vi.fn();
  const back=await admitRadioInvestigation(asFile(radio),digest,{verifySources:true,loadBundled:loader});
  expect(loader).not.toHaveBeenCalled();// no recorded catalog in this file
  const data=back.prepared!.data as {bytes:Uint8Array;fileName:string};
  expect(new TextDecoder().decode(data.bytes)).toBe(PLR_TEXT);expect(data.fileName).toBe('synthetic.plr');expect(back.prepared!.fileSha256).toBe(sha(PLR_TEXT));
 });
 it('refuses an edit without a matching digest, and invalid content even with a recomputed digest',async()=>{
  const {radio,digest}=await portableRadioInvestigation(fileInvestigation());
  const edited=asFile(radio);edited.data.text=PLR_TEXT.replace('2,10,0','2,11,0');
  await expect(admitRadioInvestigation(edited,digest,{verifySources:false})).rejects.toThrow();
  // The text is edited and the digest recomputed, but its stored SHA-256 no longer matches the re-admitted bytes.
  const {digest:again}=await portableRadioInvestigation({...fileInvestigation(),data:{...fileInvestigation().data,text:edited.data.text,sha256:edited.data.sha256} as never});
  await expect(admitRadioInvestigation(edited,again,{verifySources:false})).rejects.toThrow();
  await expect(admitRadioInvestigation(asFile(radio),'A'.repeat(64),{verifySources:false})).rejects.toThrow();
  await expect(admitRadioInvestigation(asFile(radio),digest.slice(1),{verifySources:false})).rejects.toThrow();
 });
 it('keeps −0 samples of a memory capture through the file text and its digest',async()=>{
  const m=pulsarMemoryRecording({captureId:2,name:'SYN',aperture:100,highestIndex:0,frequencies:[400,null,null],gains:[1,null,null],start:51544.5,interval:0.01,rows:[-0,0,5e-324],full:false});
  const s:RadioInvestigation={workspace:null,data:pulsarDataSnapshot(m),analysis:null};
  const {radio,digest}=await portableRadioInvestigation(s);
  const back=await admitRadioInvestigation(asFile(radio),digest,{verifySources:true});
  const samples=(back.prepared!.data as {samples:Float64Array}).samples;
  expect(Object.is(samples[0],-0)).toBe(true);expect(Object.is(samples[1],0)).toBe(true);expect(samples[2]).toBe(5e-324);
  const flipped=asFile(radio);flipped.data.samples[0]=0;
  await expect(admitRadioInvestigation(flipped,digest,{verifySources:false})).rejects.toThrow();
 });
 it('re-fetches a recorded catalog: a failed or wrong-size/hash load refuses everything; verifySources:false never loads',async()=>{
  const ws=radioWorkspaceSnapshot(recordedWorkspace());if(!ws.ok)throw new Error(ws.reason);
  const {radio,digest}=await portableRadioInvestigation({...fileInvestigation(),workspace:ws.snapshot});
  const failing=vi.fn(async()=>{throw new Error('404');});
  await expect(admitRadioInvestigation(asFile(radio),digest,{verifySources:true,loadBundled:failing})).rejects.toThrow();
  expect(failing).toHaveBeenCalledTimes(1);
  // A loader that claims the recorded SHA-256 for other bytes is re-hashed here and refused.
  const lying=vi.fn(async()=>({buffer:new ArrayBuffer(RECORDED_VIREO_PULSARS_DAT.bytes),sha256:RECORDED_VIREO_PULSARS_DAT.sha256}));
  await expect(admitRadioInvestigation(asFile(radio),digest,{verifySources:true,loadBundled:lying})).rejects.toThrow();
  const skipped=vi.fn();
  const checked=await admitRadioInvestigation(asFile(radio),digest,{verifySources:false,loadBundled:skipped});
  expect(skipped).not.toHaveBeenCalled();expect(checked.prepared).toBeNull();expect(checked.snapshot.workspace?.catalog?.kind).toBe('recorded');
 });
});

function recordedWorkspace(){
 const started=startPulsarExercise({control:INITIAL_RADIO_CONTROL,environment:UNSUPPLIED_RADIO_ENVIRONMENT,antenna:INITIAL_RADIO_LAB,options:RADIO_COMPILED_OPTIONS,
  clock:INITIAL_RADIO_CLOCK_SCENARIO,managedDiameter:false});
 if(!started.ok)throw new Error(started.outcome);
 const reference={...INITIAL_PULSAR_REFERENCE,catalog:Object.freeze([]),source:Object.freeze({name:'Pulsars.dat',bytes:RECORDED_VIREO_PULSARS_DAT.bytes,
  sha256:RECORDED_VIREO_PULSARS_DAT.sha256,rows:RECORDED_VIREO_PULSARS_DAT.rows,recorded:true})};
 return {control:started.control,environment:started.environment,antenna:started.antennaSteps.at(-1)!.state,options:RADIO_COMPILED_OPTIONS,
  clock:radioClockSnapshot(started.clock,0),date:{...INITIAL_RADIO_DATE,activationReached:true},access:INITIAL_RADIO_ACCESS,receivers:createRadioReceiverSession(),
  pendingWindows:[null,null,null] as const,reference};
}
