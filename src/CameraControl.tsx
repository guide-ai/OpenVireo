import {useEffect,useRef,useState} from 'react';
import './camera.css';
import {CAMERA_MESSAGES as M} from './camera/CameraMessages';
import {cameraRequestTransition,createCameraRequestGate,CAMERA_OBSERVE_INTERVAL_MS,type CameraGateEffect,type CameraGateEvent,type CameraRequestGate} from './core/cameraRequestGate';
import {compiledCameraQueryReference} from './core/cameraQueryReference';
import {readVizierCatalog,selectVizierCatalog,vizierRouteForCamera,wholeSkySelection,VizierCatalogError,type VizierSelection} from './core/vizierNomad';
import {composeCameraExposure,type CameraExposure,type CameraExtraSource} from './core/cameraExposure';
import {cameraDisplayRgba} from './core/cameraDisplay';
import {INITIAL_CAMERA_PALETTE} from './core/cameraPalette';
import {loadCameraCatalog,type CameraCatalogMode,type CameraCatalogSource} from './io/cameraCatalog';
import type {AccessReason} from './core/instrumentAccess';
import {writeCameraFits,cameraFitsFileName,type CameraFitsContext} from './core/fitsWriter';
import {cameraCatalogReference} from './core/cameraCatalogReference';
import type {OpticalIndex} from './core/opticalTelescope';
import type {Pointing} from './core/sky';

export type CameraImage=Readonly<{exposure:CameraExposure;source:CameraCatalogSource;jd:number;catalogName:string}>;
export type CameraControlProps=Readonly<{
 active:boolean;busy:boolean;telescopeIndex:OpticalIndex;pointing:Pointing;access:AccessReason;
 /** Julian date of the observatory clock at the moment Start is pressed. */
 currentJd:()=>number;
 /** Extra sources (moving objects) evaluated at the exposure's JD; supplied by front X. */
 extraSources?:(jd:number)=>readonly CameraExtraSource[];
 onImage?:(image:CameraImage)=>void;
 /** Test seam: fixed seed instead of crypto.getRandomValues. */
 seedSource?:()=>number;
}>;
type Attempt={ticket:CameraGateEffect['ticket'];controller:AbortController;seconds:number;filter:number;gain:number;mode:CameraCatalogMode;jd:number;seed:number;pointing:Pointing;telescope:OpticalIndex;
 selection:VizierSelection|null;source:CameraCatalogSource|null;failure:string|null;prepared:CameraImage|null;catalogName:string};
const randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];

export default function CameraControl({active,busy,telescopeIndex,pointing,access,currentJd,extraSources,onImage,seedSource=randomSeed}:CameraControlProps){
 const [filter,setFilter]=useState(0),[minutes,setMinutes]=useState('0'),[seconds,setSeconds]=useState('10'),[gain,setGain]=useState(2);
 const [mode,setMode]=useState<CameraCatalogMode>('static'),[usePalette,setUsePalette]=useState(false);
 const [gate,setGate]=useState<CameraRequestGate>(createCameraRequestGate),[message,setMessage]=useState<string>(M.statusIdle),[,setWaitShown]=useState(false);
 const [image,setImage]=useState<CameraImage|null>(null);
 const gateRef=useRef(gate),attempt=useRef<Attempt|null>(null),timers=useRef<{observe?:number;poll?:number}>({}),canvas=useRef<HTMLCanvasElement>(null);
 const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stopTimers();attempt.current?.controller.abort();};},[]);
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
   case 'prepare':setMessage(M.statusPreparing);window.setTimeout(()=>prepare(a),0);break;
   case 'release':a.controller.abort();stopTimers();window.setTimeout(()=>dispatch({type:'released',ticket:effect.ticket,ok:true}),0);break;
   case 'accept-prepared':if(a.prepared){setImage(a.prepared);onImage?.(a.prepared);}break;
  }
 }
 async function request(a:Attempt){
  let reference;
  try{reference=compiledCameraQueryReference('ccd',a.telescope,a.filter,{centerRAHours:a.pointing.ra,centerDecDegrees:a.pointing.dec,selectionMagnitudeLimit:21.5,suppliedDateDouble:a.jd,dateBias:0});}
  catch{a.failure='initialization';dispatch({type:'initialization-failed',ticket:a.ticket});return;}
  const route=vizierRouteForCamera('ccd',a.filter);a.catalogName=route.catalogName;
  const result=await loadCameraCatalog({catalog:route.catalog,raHours:a.pointing.ra,decDegrees:a.pointing.dec,radiusDegrees:reference.searchRadiusDegrees},a.mode,{signal:a.controller.signal});
  if(attempt.current!==a)return;
  if(!result.ok){
   if(result.failure==='cancelled')return;
   a.failure=result.failure;
   dispatch({type:'request-result',ticket:a.ticket,finished:true,transportSucceeded:result.failure==='no-extract'||result.failure==='integrity',catalog:'unsupported'});return;
  }
  a.source=result.source;
  try{
   const catalog=readVizierCatalog(result.bytes,{catalog:route.catalog,band:route.band,epochOffsetYears:reference.epochOffsetYears,queryBrightMagnitude:reference.queryBrightMagnitude,queryFaintMagnitude:reference.queryFaintMagnitude});
   a.selection=selectVizierCatalog(catalog,wholeSkySelection(reference.selectionMagnitudeLimit));
   dispatch({type:'request-result',ticket:a.ticket,finished:true,transportSucceeded:true,catalog:'valid'});
  }catch(error){
   if(!(error instanceof VizierCatalogError))throw error;
   a.failure=error.code==='overflow'||error.code==='query-status'?error.code:'catalog';
   dispatch({type:'request-result',ticket:a.ticket,finished:true,transportSucceeded:true,catalog:'invalid'});
  }
 }
 function prepare(a:Attempt){
  if(attempt.current!==a||gateRef.current.phase!=='preparing')return;
  try{
   const extras=extraSources?.(a.jd)??[];
   const exposure=composeCameraExposure({camera:'ccd',opticalIndex:a.telescope,filterPosition:a.filter,seconds:a.seconds,gain:a.gain,centerRaHours:a.pointing.ra,centerDecDegrees:a.pointing.dec,seed:a.seed},a.selection!,extras);
   a.prepared=Object.freeze({exposure,source:a.source!,jd:a.jd,catalogName:a.catalogName});
   dispatch({type:'prepared',ticket:a.ticket,ok:true});
  }catch{a.failure='preparation';dispatch({type:'prepared',ticket:a.ticket,ok:false});}
 }
 // Terminal messages once the gate is back to idle.
 useEffect(()=>{
  if(gate.phase!=='idle'||gate.terminal==='none')return;
  const a=attempt.current;
  setMessage(gate.terminal==='completed'?M.statusDone:gate.terminal==='cancelled'?M.statusCancelled:`${M.statusFailed} ${M.failure[a?.failure??'catalog']??''}`);
 },[gate]);
 useEffect(()=>{if(gate.phase==='exposing')setMessage(M.statusExposing(gate.remainingSeconds,gate.requestedSeconds));else if(gate.phase==='waiting')setMessage(M.statusWaiting);},[gate.phase,gate.remainingSeconds,gate.requestedSeconds]);
 // Leaving the view, or the telescope losing its field, stops a running exposure.
 const running=gate.phase!=='idle';
 useEffect(()=>{if(running&&(!active||busy||access!=='ready')&&gate.ticket)dispatch({type:'cancel',ticket:gate.ticket});},[active,busy,access,running]);
 useEffect(()=>{
  const c=canvas.current;if(!c||!image)return;const {plane}=image.exposure;c.width=plane.width;c.height=plane.height;
  const ctx=c.getContext('2d');if(!ctx)return;ctx.putImageData(new ImageData(cameraDisplayRgba(plane.pixels,plane.width,plane.height,usePalette?INITIAL_CAMERA_PALETTE:null) as Uint8ClampedArray<ArrayBuffer>,plane.width,plane.height),0,0);
 },[image,usePalette]);

 const m=/^\d{1,2}$/.test(minutes)?Number(minutes):NaN,s=/^\d{1,2}$/.test(seconds)?Number(seconds):NaN;
 const total=m*60+s,validExposure=Number.isInteger(total)&&m<=60&&s<=59&&total>=1;
 const ready=access==='ready'&&active&&!busy;
 function start(){
  if(!ready||!validExposure||running)return;
  const jd=currentJd(),seed=seedSource()>>>0;
  attempt.current=null;
  const transition=cameraRequestTransition(gateRef.current,{type:'start',seconds:total});
  const ticket=transition.state.ticket!;
  attempt.current={ticket,controller:new AbortController(),seconds:total,filter,gain,mode,jd,seed,pointing:{ra:pointing.ra,dec:pointing.dec},telescope:telescopeIndex,selection:null,source:null,failure:null,prepared:null,catalogName:''};
  gateRef.current=transition.state;setGate(transition.state);setWaitShown(false);
  for(const effect of transition.effects)apply(effect);
 }
 function stop(){if(gate.ticket)dispatch({type:'cancel',ticket:gate.ticket});}
 function fitsContext(i:CameraImage):CameraFitsContext{return {jd:i.jd,filterName:cameraCatalogReference('ccd',i.exposure.recipe.filterPosition).filter,catalogName:i.catalogName,source:{mode:i.source.mode,sha256:i.source.sha256,extractId:i.source.extractId,url:i.source.url}};}
 function save(){
  if(!image)return;const context=fitsContext(image),bytes=writeCameraFits(image.exposure,context);
  const url=URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/fits'})),a=document.createElement('a');
  a.href=url;a.download=cameraFitsFileName(context);document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0);
 }
 const shown=image?.exposure,filterName=(i:number)=>M.filterNames[i];
 return <section className="card camera-control" aria-labelledby="camera-control-title" data-testid="camera-control" data-phase={gate.phase} data-terminal={gate.terminal}>
  <div className="eyebrow">{M.eyebrow}</div><h2 id="camera-control-title">{M.title}</h2><p>{M.intro}</p>
  <fieldset className="camera-settings" disabled={running||busy}>
   <label>{M.filter}<select value={filter} onChange={e=>setFilter(Number(e.target.value))}>{M.filterNames.map((n,i)=><option key={n} value={i}>{n}</option>)}</select></label>
   <div className="camera-exposure" role="group" aria-label={M.exposure}>
    <label>{M.minutes}<input inputMode="numeric" value={minutes} maxLength={2} onChange={e=>setMinutes(e.target.value.trim())} aria-invalid={!validExposure}/></label>
    <label>{M.seconds}<input inputMode="numeric" value={seconds} maxLength={2} onChange={e=>setSeconds(e.target.value.trim())} aria-invalid={!validExposure}/></label>
   </div>
   <label>{M.gain}<select value={gain} onChange={e=>setGain(Number(e.target.value))}>{[1,2,5].map(g=><option key={g} value={g}>{g}</option>)}</select></label>
   <fieldset className="camera-source"><legend>{M.catalogSource}</legend>
    <label><input type="radio" name="camera-source" checked={mode==='static'} onChange={()=>setMode('static')}/>{M.sourceStatic}</label>
    <label><input type="radio" name="camera-source" checked={mode==='live'} onChange={()=>setMode('live')}/>{M.sourceLive}</label>
   </fieldset>
  </fieldset>
  {!validExposure&&<p className="camera-invalid" role="alert">{M.invalidExposure}</p>}
  <div className="button-row">
   <button className="primary-button" disabled={!ready||!validExposure||running} onClick={start}>{M.start}</button>
   <button className="secondary-button" disabled={!running||gate.phase==='releasing'} onClick={stop}>{M.stop}</button>
  </div>
  <p role="status" aria-live="polite" data-testid="camera-status">{!ready&&!running?M.statusNotReady(busy||!active?'':M.accessReason[access]??''):message}</p>
  {shown&&image&&<figure className="camera-image">
   <canvas ref={canvas} role="img" aria-label={M.imageAlt(filterName(shown.recipe.filterPosition),shown.recipe.seconds)} data-testid="camera-canvas"/>
   <figcaption>{M.displayNote}</figcaption>
   <div className="button-row"><button className="secondary-button" disabled={running} onClick={save}>{M.save}</button></div><p className="observatory-note">{M.saveNote}</p>
   <label className="camera-palette"><input type="checkbox" checked={usePalette} onChange={e=>setUsePalette(e.target.checked)}/>{M.palette}</label>
   <details><summary>{M.details}</summary><dl className="camera-details">
    <dt>{M.detailCatalog}</dt><dd data-testid="camera-detail-catalog">{image.catalogName}</dd>
    <dt>{M.detailSource}</dt><dd data-testid="camera-detail-source">{M.sourceWithHash(image.source.mode==='static'?M.sourceStaticLabel(image.source.extractId??'',image.source.recordedAt??''):M.sourceLiveLabel,image.source.sha256)}</dd>
    <dt>{M.detailRows}</dt><dd data-testid="camera-detail-rows">{M.rowCounts(shown.catalog.rows,shown.catalog.selected,shown.catalog.onDetector)}</dd>
    <dt>{M.detailJd}</dt><dd>{image.jd.toFixed(5)}</dd>
    <dt>{M.detailSeed}</dt><dd data-testid="camera-detail-seed">{shown.recipe.seed}</dd>
    <dt>{M.detailDraws}</dt><dd>{shown.drawsConsumed}</dd>
   </dl></details>
  </figure>}
  <p className="observatory-note">{M.adaptation}</p>
  <p className="observatory-note">{M.citation}</p>
 </section>;
}
