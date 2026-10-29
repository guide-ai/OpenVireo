import {memo,useEffect,useRef,useState} from 'react';
import './camera.css';
import {CAMERA_MESSAGES as M} from './camera/CameraMessages';
import {cameraRequestTransition,createCameraRequestGate,CAMERA_OBSERVE_INTERVAL_MS,type CameraGateEffect,type CameraGateEvent,type CameraRequestGate} from './core/cameraRequestGate';
import {compiledCameraQueryReference} from './core/cameraQueryReference';
import {vizierRouteForCamera} from './core/vizierNomad';
import {CAMERA_GAINS,CAMERA_MAX_SECONDS,type CameraExposure,type CameraExposureKind,type CameraExtraSource} from './core/cameraExposure';
import {exposureFromWorker,type CameraWorkerReply,type CameraWorkerRequest} from './camera/cameraWorkerCore';
import {cameraDisplayRgba} from './core/cameraDisplay';
import {INITIAL_CAMERA_PALETTE} from './core/cameraPalette';
import {CAMERA_EXTRACTS,findCameraExtract,loadCameraCatalog,type CameraCatalogMode,type CameraCatalogSource} from './io/cameraCatalog';
import type {AccessReason} from './core/instrumentAccess';
import {writeCameraFits,cameraFitsFileName,type CameraFitsContext} from './core/fitsWriter';
import {cameraCatalogReference} from './core/cameraCatalogReference';
import type {OpticalIndex} from './core/opticalTelescope';
import type {Pointing} from './core/sky';
import CleaHelp from './clusters/CleaHelp';
import {HELP_FILES} from './help/helpFiles';
import CameraFieldSize from './polish/CameraFieldSize';// Front P

export type CameraExtraSourceProvider=(jd:number,seconds:number,camera:CameraExposureKind)=>readonly CameraExtraSource[];
/** The one place the camera asks its caller for moving pairs. */
export function cameraExtras(provider:CameraExtraSourceProvider|undefined,jd:number,seconds:number,camera:CameraExposureKind):readonly CameraExtraSource[]{return provider?.(jd,seconds,camera)??[];}
export type CameraImage=Readonly<{exposure:CameraExposure;source:CameraCatalogSource;jd:number;catalogName:string}>;
export type CameraControlProps=Readonly<{
 active:boolean;busy:boolean;telescopeIndex:OpticalIndex;pointing:Pointing;access:AccessReason;
 /** Julian date of the observatory clock at the moment Start is pressed. */
 currentJd:()=>number;
 /** Moving pairs for this exposure, supplied by front X: called with the JD at Start and the exposure length in seconds
  * (the pair's end is the position at JD + seconds, as ComputeMovers 0x59940c uses dt = exposure), and the camera kind
  * (IR images draw moving objects too, but must not change Object X state). */
 extraSources?:CameraExtraSourceProvider;
 /** Receives every finished CCD image; image.exposure.skipped lists moving pairs that were not drawn, with a typed reason.
  * IR images are not passed on: they stay out of the Object X investigation and its replay (coordinator, 2026-10-28). */
 onImage?:(image:CameraImage)=>void;
 /** Test seam: fixed seed instead of crypto.getRandomValues. */
 seedSource?:()=>number;
}>;
type Attempt={ticket:CameraGateEffect['ticket'];controller:AbortController;camera:CameraExposureKind;seconds:number;filter:number;gain:number;mode:CameraCatalogMode;jd:number;seed:number;pointing:Pointing;telescope:OpticalIndex;
 worker:Worker|null;pending:((reply:CameraWorkerReply|null)=>void)|null;source:CameraCatalogSource|null;failure:string|null;prepared:CameraImage|null;catalogName:string};
/** One Worker per attempt; parse and compose run there so Stop stays responsive (review fix H2). */
function call(a:Attempt,request:CameraWorkerRequest,transfer:Transferable[]=[]):Promise<CameraWorkerReply|null>{
 if(!a.worker){a.worker=new Worker(new URL('./camera/cameraWorker.ts',import.meta.url),{type:'module'});
  a.worker.onmessage=e=>{const p=a.pending;a.pending=null;p?.(e.data as CameraWorkerReply);};
  a.worker.onerror=()=>{const p=a.pending;a.pending=null;p?.(null);};}
 return new Promise(resolve=>{a.pending=resolve;a.worker!.postMessage(request,transfer);});
}
function stopWorker(a:Attempt|null){if(!a)return;a.worker?.terminate();a.worker=null;const p=a.pending;a.pending=null;p?.(null);}
function cameraQuery(camera:CameraExposureKind,telescope:OpticalIndex,filter:number,pointing:Pointing,jd:number){
 const reference=compiledCameraQueryReference(camera,telescope,filter,{centerRAHours:pointing.ra,centerDecDegrees:pointing.dec,selectionMagnitudeLimit:21.5,suppliedDateDouble:jd,dateBias:0});
 return {reference,route:vizierRouteForCamera(camera,filter)};
}
const randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];

function CameraControl({active,busy,telescopeIndex,pointing,access,currentJd,extraSources,onImage,seedSource=randomSeed}:CameraControlProps){
 const [camera,setCamera]=useState<CameraExposureKind>('ccd'),[filter,setFilter]=useState(0),[minutes,setMinutes]=useState('0'),[seconds,setSeconds]=useState('10'),[gain,setGain]=useState(2);
 const [mode,setMode]=useState<CameraCatalogMode>('static'),[usePalette,setUsePalette]=useState(false);
 const [gate,setGate]=useState<CameraRequestGate>(createCameraRequestGate),[message,setMessage]=useState<string>(M.statusIdle),[,setWaitShown]=useState(false);
 const [image,setImage]=useState<CameraImage|null>(null);
 const gateRef=useRef(gate),attempt=useRef<Attempt|null>(null),timers=useRef<{observe?:number;poll?:number}>({}),canvas=useRef<HTMLCanvasElement>(null);
 const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stopTimers();attempt.current?.controller.abort();stopWorker(attempt.current);};},[]);
 function stopTimers(){if(timers.current.observe)clearInterval(timers.current.observe);if(timers.current.poll)clearInterval(timers.current.poll);timers.current={};}
 function dispatch(event:CameraGateEvent){
  const transition=cameraRequestTransition(gateRef.current,event);gateRef.current=transition.state;
  if(mounted.current)setGate(transition.state);
  for(const effect of transition.effects)apply(effect);
 }
 function apply(effect:CameraGateEffect){
  const a=attempt.current;if(!a||a.ticket!==effect.ticket)return;
  switch(effect.type){
   case 'observe-on':timers.current.observe=window.setInterval(()=>dispatch({type:'exposure-tick',ticket:effect.ticket,instant:false}),CAMERA_OBSERVE_INTERVAL_MS);break;
   case 'observe-off':if(timers.current.observe)clearInterval(timers.current.observe);timers.current.observe=undefined;break;
   case 'poll-on':timers.current.poll=window.setInterval(()=>dispatch({type:'request-tick',ticket:effect.ticket}),CAMERA_OBSERVE_INTERVAL_MS);dispatch({type:'request-tick',ticket:effect.ticket});break;
   case 'poll-off':if(timers.current.poll)clearInterval(timers.current.poll);timers.current.poll=undefined;break;
   case 'show-wait':setWaitShown(true);break;
   case 'hide-wait':setWaitShown(false);break;
   case 'initialize-request':void request(a);break;
   case 'prepare':setMessage(M.statusPreparing);void prepare(a);break;
   case 'release':a.controller.abort();stopWorker(a);stopTimers();window.setTimeout(()=>dispatch({type:'released',ticket:effect.ticket,ok:true}),0);break;
   case 'accept-prepared':if(a.prepared){setImage(a.prepared);if(a.camera==='ccd')onImage?.(a.prepared);}break;
  }
 }
 /** Every outcome ends in a gate event; nothing is rethrown (review fix H1). */
 async function request(a:Attempt){
  const fail=(failure:string,transportSucceeded:boolean,catalog:'invalid'|'unsupported')=>{if(attempt.current!==a)return;a.failure=failure;dispatch({type:'request-result',ticket:a.ticket,finished:true,transportSucceeded,catalog});};
  let query;
  try{query=cameraQuery(a.camera,a.telescope,a.filter,a.pointing,a.jd);}
  catch{a.failure='initialization';dispatch({type:'initialization-failed',ticket:a.ticket});return;}
  try{
   const {reference,route}=query;a.catalogName=route.catalogName;
   const result=await loadCameraCatalog({catalog:route.catalog,raHours:a.pointing.ra,decDegrees:a.pointing.dec,radiusDegrees:reference.searchRadiusDegrees},a.mode,{signal:a.controller.signal});
   if(attempt.current!==a)return;
   if(!result.ok){if(result.failure!=='cancelled')fail(result.failure,result.failure==='no-extract'||result.failure==='integrity','unsupported');return;}
   a.source=result.source;
   const reply=await call(a,{type:'parse',bytes:result.bytes,context:{catalog:route.catalog,band:route.band,epochOffsetYears:reference.epochOffsetYears,queryBrightMagnitude:reference.queryBrightMagnitude,queryFaintMagnitude:reference.queryFaintMagnitude},magnitudeLimit:reference.selectionMagnitudeLimit},[result.bytes.buffer]);
   if(attempt.current!==a||reply===null&&a.controller.signal.aborted)return;
   if(reply?.type==='parsed'&&reply.ok){dispatch({type:'request-result',ticket:a.ticket,finished:true,transportSucceeded:true,catalog:'valid'});return;}
   fail(reply?.type==='parsed'&&!reply.ok?reply.code:'catalog',true,'invalid');
  }catch{fail('catalog',true,'invalid');}
 }
 async function prepare(a:Attempt){
  if(attempt.current!==a||gateRef.current.phase!=='preparing')return;
  try{
   const extras=cameraExtras(extraSources,a.jd,a.seconds,a.camera);
   const reply=await call(a,{type:'compose',recipe:{camera:a.camera,opticalIndex:a.telescope,filterPosition:a.filter,seconds:a.seconds,gain:a.gain,centerRaHours:a.pointing.ra,centerDecDegrees:a.pointing.dec,seed:a.seed},extras});
   if(attempt.current!==a||gateRef.current.phase!=='preparing')return;
   if(reply?.type!=='composed'||!reply.ok){a.failure='preparation';dispatch({type:'prepared',ticket:a.ticket,ok:false});return;}
   a.prepared=Object.freeze({exposure:exposureFromWorker(reply.exposure),source:a.source!,jd:a.jd,catalogName:a.catalogName});
   dispatch({type:'prepared',ticket:a.ticket,ok:true});
  }catch{a.failure='preparation';if(attempt.current===a&&gateRef.current.phase==='preparing')dispatch({type:'prepared',ticket:a.ticket,ok:false});}
 }
 // Terminal messages once the gate is back to idle.
 useEffect(()=>{
  if(gate.phase!=='idle'||gate.terminal==='none')return;
  const a=attempt.current;
  setMessage(gate.terminal==='completed'?M.statusDone:gate.terminal==='cancelled'?M.statusCancelled:`${M.statusFailed} ${M.failure[a?.failure??'catalog']??''}`);
 },[gate]);
 // The live region announces phase changes only; the countdown is a separate, non-live line (review L10).
 useEffect(()=>{if(gate.phase==='exposing')setMessage(M.statusExposing);else if(gate.phase==='waiting')setMessage(M.statusWaiting);},[gate.phase]);
 // Leaving the view, or the telescope losing its field, stops a running exposure.
 const running=gate.phase!=='idle';
 useEffect(()=>{if(running&&(!active||busy||access!=='ready')&&gate.ticket)dispatch({type:'cancel',ticket:gate.ticket});},[active,busy,access,running]);
 useEffect(()=>{
  const c=canvas.current;if(!c||!image)return;const {plane}=image.exposure;c.width=plane.width;c.height=plane.height;
  const ctx=c.getContext('2d');if(!ctx)return;ctx.putImageData(new ImageData(cameraDisplayRgba(plane.pixels,plane.width,plane.height,usePalette?INITIAL_CAMERA_PALETTE:null) as Uint8ClampedArray<ArrayBuffer>,plane.width,plane.height),0,0);
 },[image,usePalette]);

 const m=/^\d{1,2}$/.test(minutes)?Number(minutes):NaN,s=/^\d{1,2}$/.test(seconds)?Number(seconds):NaN;
 const total=m*60+s,validExposure=Number.isInteger(total)&&s<=59&&total>=1&&total<=CAMERA_MAX_SECONDS;
 const ready=access==='ready'&&active&&!busy;
 // Static mode: whether a bundled extract covers this pointing is known before Start (review L6).
 let staticCovered=true;
 if(mode==='static'){try{const {reference,route}=cameraQuery(camera,telescopeIndex,filter,pointing,2451545);staticCovered=!!findCameraExtract({catalog:route.catalog,raHours:pointing.ra,decDegrees:pointing.dec,radiusDegrees:reference.searchRadiusDegrees});}catch{staticCovered=false;}}
 function start(){
  if(!ready||!validExposure||running)return;
  if(mode==='static'&&!staticCovered){setMessage(`${M.statusFailed} ${M.failure['no-extract']}`);return;}
  const jd=currentJd(),seed=seedSource()>>>0;
  attempt.current=null;
  const transition=cameraRequestTransition(gateRef.current,{type:'start',seconds:total});
  const ticket=transition.state.ticket!;
  attempt.current={ticket,controller:new AbortController(),camera,seconds:total,filter,gain,mode,jd,seed,pointing:{ra:pointing.ra,dec:pointing.dec},telescope:telescopeIndex,worker:null,pending:null,source:null,failure:null,prepared:null,catalogName:''};
  gateRef.current=transition.state;setGate(transition.state);setWaitShown(false);
  for(const effect of transition.effects)apply(effect);
 }
 function stop(){if(gate.ticket)dispatch({type:'cancel',ticket:gate.ticket});}
 function fitsContext(i:CameraImage):CameraFitsContext{return {jd:i.jd,filterName:cameraCatalogReference(i.exposure.recipe.camera,i.exposure.recipe.filterPosition).filter,catalogName:i.catalogName,source:{mode:i.source.mode,sha256:i.source.sha256,extractId:i.source.extractId,url:i.source.url}};}
 function save(){
  if(!image)return;const context=fitsContext(image),bytes=writeCameraFits(image.exposure,context);
  const url=URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/fits'})),a=document.createElement('a');
  a.href=url;a.download=cameraFitsFileName(image.exposure,context);document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0);
 }
 const filterNames:readonly string[]=camera==='ir'?M.filterNamesIr:M.filterNames,gains=CAMERA_GAINS[camera];
 const shown=image?.exposure,showIrNotes=camera==='ir'||shown?.recipe.camera==='ir',filterName=(k:CameraExposureKind,i:number)=>(k==='ir'?M.filterNamesIr:M.filterNames)[i];
 /** Switching camera resets the filter and keeps the gain when the other camera offers it (gain 2 exists on both). */
 function chooseCamera(next:CameraExposureKind){if(next===camera)return;setCamera(next);setFilter(0);if(!CAMERA_GAINS[next].includes(gain))setGain(2);}
 return <section className="card camera-control" aria-labelledby="camera-control-title" data-testid="camera-control" data-phase={gate.phase} data-terminal={gate.terminal}>
  <div className="eyebrow">{M.eyebrow}</div><h2 id="camera-control-title">{camera==='ir'?M.titleIr:M.title}</h2>{/* TCCDCam 0x5130fc / TIRCam 0x51512c Help1Click; options +0x9a4 and +0x9ec both default CamHlp.LST (docs/CLEA-HELP.md) */}<CleaHelp list={HELP_FILES['CAMHLP.LST']} testId="camera-help"/><p>{camera==='ir'?M.introIr:M.intro}</p>
  <fieldset className="camera-settings" disabled={running||busy}>
   <fieldset className="camera-kind"><legend>{M.camera}</legend>
    {(['ccd','ir'] as const).map(k=><label key={k}><input type="radio" name="camera-kind" checked={camera===k} onChange={()=>chooseCamera(k)}/>{M.cameraNames[k]}</label>)}
   </fieldset>
   <CameraFieldSize camera={camera} telescopeIndex={telescopeIndex}/>
   <label>{M.filter}<select value={filter} onChange={e=>setFilter(Number(e.target.value))}>{filterNames.map((n,i)=><option key={n} value={i}>{n}</option>)}</select></label>
   <div className="camera-exposure" role="group" aria-label={M.exposure}>
    <label>{M.minutes}<input inputMode="numeric" value={minutes} maxLength={2} onChange={e=>setMinutes(e.target.value.trim())} aria-invalid={!validExposure}/></label>
    <label>{M.seconds}<input inputMode="numeric" value={seconds} maxLength={2} onChange={e=>setSeconds(e.target.value.trim())} aria-invalid={!validExposure}/></label>
   </div>
   <label>{M.gain}<select value={gain} onChange={e=>setGain(Number(e.target.value))}>{gains.map(g=><option key={g} value={g}>{g}</option>)}</select></label>
   <fieldset className="camera-source"><legend>{M.catalogSource}</legend>
    <label><input type="radio" name="camera-source" checked={mode==='static'} onChange={()=>setMode('static')}/>{CAMERA_EXTRACTS.length?M.sourceStatic:M.sourceStaticNone}</label>
    <label><input type="radio" name="camera-source" checked={mode==='live'} onChange={()=>setMode('live')}/>{M.sourceLive}</label>
    {mode==='static'&&!staticCovered&&<p className="camera-hint" data-testid="camera-static-hint">{M.noExtractHere}</p>}
   </fieldset>
  </fieldset>
  {!validExposure&&<p className="camera-invalid" role="alert">{M.invalidExposure}</p>}
  <div className="button-row">
   <button className="primary-button" disabled={!ready||!validExposure||running} onClick={start}>{M.start}</button>
   <button className="secondary-button" disabled={!running||gate.phase==='releasing'} onClick={stop}>{M.stop}</button>
  </div>
  <p role="status" aria-live="polite" data-testid="camera-status">{!ready&&!running?(busy||!active?M.statusUnavailable:M.statusNotReady(M.accessReason[access]??'')):message}</p>
  {gate.phase==='exposing'&&<p className="camera-countdown" data-testid="camera-countdown">{M.countdown(gate.remainingSeconds,gate.requestedSeconds)}</p>}
  {shown&&image&&<figure className="camera-image">
   <canvas ref={canvas} role="img" aria-label={M.imageAlt(filterName(shown.recipe.camera,shown.recipe.filterPosition),shown.recipe.seconds,shown.recipe.camera)} data-testid="camera-canvas"/>
   <figcaption>{M.displayNote}</figcaption>
   <div className="button-row"><button className="secondary-button" disabled={running} onClick={save}>{M.save}</button></div><p className="observatory-note">{M.saveNote}</p>
   <label className="camera-palette"><input type="checkbox" checked={usePalette} onChange={e=>setUsePalette(e.target.checked)}/>{M.palette}</label>
   <details><summary>{M.details}</summary><dl className="camera-details">
    <dt>{M.detailCatalog}</dt><dd data-testid="camera-detail-catalog">{image.catalogName}</dd>
    <dt>{M.detailSource}</dt><dd data-testid="camera-detail-source">{M.sourceWithHash(image.source.mode==='static'?M.sourceStaticLabel(image.source.extractId??'',image.source.recordedAt??'',image.source.host):M.sourceLiveLabel(image.source.host),image.source.sha256)}</dd>
    <dt>{M.detailRows}</dt><dd data-testid="camera-detail-rows">{M.rowCounts(shown.catalog.rows,shown.catalog.selected,shown.catalog.onDetector)}</dd>
    <dt>{M.detailJd}</dt><dd>{image.jd.toFixed(5)}</dd>
    <dt>{M.detailSeed}</dt><dd data-testid="camera-detail-seed">{shown.recipe.seed}</dd>
    <dt>{M.detailDraws}</dt><dd>{shown.drawsConsumed}</dd>
    {shown.skipped.length>0&&<><dt>{M.detailSkipped}</dt><dd data-testid="camera-detail-skipped">{shown.skipped.map(k=>M.skippedReason[k.reason]).join(' ')}</dd></>}
   </dl></details>
  </figure>}
  <p className="observatory-note">{M.adaptation}</p>
  {showIrNotes&&<p className="observatory-note" data-testid="camera-ir-adaptation">{M.adaptationIr}</p>}
  <p className="observatory-note">{M.citation}</p>
  {showIrNotes&&<p className="observatory-note" data-testid="camera-ir-citation">{M.citationIr}</p>}
 </section>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(CameraControl);
