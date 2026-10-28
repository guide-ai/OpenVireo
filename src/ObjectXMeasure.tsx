import {useEffect,useLayoutEffect,useMemo,useRef,useState,type KeyboardEvent} from 'react';
import type {FitsImage} from './core/fitsImage';
import {BLINK_INTERVAL,MeasureError,addMeasurement,blinkAlignment,centroid,clampBlinkInterval,defaultDisplayRange,deriveTargets,formatSexagesimal,framePlate,measureImageFromFits,parseSexagesimal,removeMeasurement,stretchRaster,targetMotion,type MeasurementLog,type TanWcs} from './core/astrometryMeasure';
import {OBJECT_X_MEASURE_EN,type ObjectXMeasureMessages} from './objectx/ObjectXMessages';

/** One image offered for measurement: a saved camera FITS, its observation JD and its header WCS when present. */
export type MeasureFrame=Readonly<{label:string;jd:number;image:FitsImage;wcs:TanWcs|null}>;
type Props=Readonly<{frames:readonly MeasureFrame[];log:MeasurementLog;onLogChange:(log:MeasurementLog)=>void;active?:boolean;messages?:ObjectXMeasureMessages}>;

/** Stretched rasters cached per image and cut (closure N2): cursor moves, marks and blink ticks reuse them. */
const rasterCache=new WeakMap<FitsImage,{low:number;high:number;canvas:HTMLCanvasElement}>();
function stretched(im:FitsImage,cut:Readonly<{low:number;high:number}>):HTMLCanvasElement{
 const hit=rasterCache.get(im);if(hit&&hit.low===cut.low&&hit.high===cut.high)return hit.canvas;
 const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;
 rasterBuilds++;canvas.getContext('2d')?.putImageData(new ImageData(Uint8ClampedArray.from(stretchRaster(measureImageFromFits(im),cut)),im.width,im.height),0,0);
 rasterCache.set(im,{low:cut.low,high:cut.high,canvas});return canvas;
}
/** Rasters stretched so far in this page; written to the canvas as data-raster-builds (closure N2, a check that cursor moves
 * and blink ticks reuse the cache). */
let rasterBuilds=0;
const utText=(jd:number)=>new Date(Math.round((jd-2440587.5)*86400)*1000).toISOString().slice(0,19).replace('T',' ');

/** E08 web measuring tool (X3): blink, click/keyboard centroid measurement, plate or header-WCS solution, motion. Marks keep
 * pixels only; every sky position, residual and the motion are derived from the current log at render time. */
export function ObjectXMeasure({frames,log,onLogChange,active=true,messages=OBJECT_X_MEASURE_EN}:Props){
 const m=messages;
 const [shown,setShown]=useState(0),[blinking,setBlinking]=useState(false),[interval,setIntervalMs]=useState<number>(BLINK_INTERVAL.default);
 const [cursor,setCursor]=useState({x:1,y:1}),[role,setRole]=useState<'target'|'reference'>('target');
 const [refRa,setRefRa]=useState(''),[refDec,setRefDec]=useState(''),[error,setError]=useState('');
 const [ranges,setRanges]=useState<Record<number,{low:number;high:number}>>({});
 const canvas=useRef<HTMLCanvasElement>(null);
 const index=Math.min(shown,frames.length-1),frame=frames[index];
 const cut=ranges[index]??(frame?defaultDisplayRange(frame.image.minimum,frame.image.maximum):{low:0,high:1});
 const wcsOf=(f:number)=>frames[f]?.wcs??null;
 const alignment=useMemo(()=>frames.length>1?blinkAlignment(log,0,1):null,[log,frames.length]);
 useEffect(()=>{if(!blinking||frames.length<2||!active)return;const id=window.setInterval(()=>setShown(s=>s===0?1:0),interval);return()=>window.clearInterval(id);},[blinking,interval,frames.length,active]);
 useEffect(()=>{if(!active)setBlinking(false);},[active]);
 useLayoutEffect(()=>{
  const c=canvas.current;if(!c||!frame)return;const im=frame.image,base=frames[0].image;
  // While blinking with an alignment, image 2 is drawn in image-1 pixels (x1 = re·x − im·y + dx; pixel centres at p − 0.5).
  const aligned=blinking&&index===1?alignment:null,size=aligned?base:im;
  c.width=size.width;c.height=size.height;const ctx=c.getContext('2d');if(!ctx)return;
  const off=stretched(im,cut);c.dataset.rasterBuilds=String(rasterBuilds);
  ctx.fillStyle='#000';ctx.fillRect(0,0,c.width,c.height);
  if(aligned){const r=aligned.scale*Math.cos(aligned.rotationDeg*Math.PI/180),i=aligned.scale*Math.sin(aligned.rotationDeg*Math.PI/180),k=0.5;ctx.setTransform(r,i,-i,r,r*k-i*k+aligned.dx-k,i*k+r*k+aligned.dy-k);}
  ctx.drawImage(off,0,0);
  for(const mark of log)if(mark.frame===index){ctx.strokeStyle=mark.role==='target'?'#ff5050':'#40c0ff';ctx.beginPath();ctx.arc(mark.x-0.5,mark.y-0.5,4,0,2*Math.PI);ctx.stroke();}
  ctx.setTransform(1,0,0,1,0,0);
  if(!blinking){ctx.strokeStyle='#00ff88';ctx.strokeRect(cursor.x-2,cursor.y-2,3,3);}
 },[frame,frames,index,log,cursor,cut,blinking,alignment]);
 const targets=useMemo(()=>deriveTargets(log,wcsOf),[log,frames]);
 const motion=useMemo(()=>{try{return targetMotion(log,wcsOf);}catch{return null;}},[log,frames]);
 const plates=useMemo(()=>frames.map((_,f)=>framePlate(log,f)),[log,frames]);
 if(!frames.length)return <section className="card objectx-measure"><h2>{m.title}</h2><p>{m.noFrames}</p></section>;
 const im=frame.image;
 function measure(x=cursor.x,y=cursor.y){
  if(!active||blinking)return;
  try{
   if(!(cut.high>cut.low))throw new MeasureError('range');
   const c=centroid(measureImageFromFits(im),x,y,cut);
   if(role==='reference'){
    const ra=parseSexagesimal(refRa,'ra'),dec=parseSexagesimal(refDec,'dec');
    if(ra===null||dec===null){setError(m.refInvalid);return;}
    onLogChange(addMeasurement(log,{frame:index,role,x:c.x,y:c.y,jd:frame.jd,catalog:{raHours:ra,decDeg:dec}}));
   }else onLogChange(addMeasurement(log,{frame:index,role,x:c.x,y:c.y,jd:frame.jd}));
   setError('');
  }catch(e){setError(e instanceof MeasureError?m.errors[e.code]??e.code:String(e));}
 }
 function key(e:KeyboardEvent){
  if(blinking)return;
  const step=e.shiftKey?10:1,moves:Record<string,readonly [number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
  if(moves[e.key]){e.preventDefault();const [dx,dy]=moves[e.key];setCursor(p=>({x:Math.max(1,Math.min(im.width,p.x+dx)),y:Math.max(1,Math.min(im.height,p.y+dy))}));}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();measure();}
 }
 const derived=new Map(targets.map(t=>[t.index,t]));
 const setCut=(part:'low'|'high',value:number)=>setRanges(r=>({...r,[index]:{...cut,[part]:value}}));
 return <section className="card objectx-measure" aria-label={m.title}>
  <h2>{m.title}</h2><p>{m.intro}</p><p className="observatory-note">{m.adaptation}</p>
  <div className="button-row" role="group" aria-label={m.showFrame}>{frames.map((f,i)=><button key={i} aria-pressed={i===index} disabled={blinking} onClick={()=>setShown(i)}>{m.frame(i+1,f.label)}</button>)}</div>
  <div className="button-row">
   <button disabled={frames.length<2||!active} aria-pressed={blinking} onClick={()=>{setBlinking(b=>!b);setShown(0);}}>{blinking?m.blinkStop:m.blinkStart}</button>
   <label>{m.blinkInterval}<input type="number" min={BLINK_INTERVAL.min} max={BLINK_INTERVAL.max} value={interval} onChange={e=>setIntervalMs(clampBlinkInterval(Number(e.target.value)))}/></label>
  </div>
  {frames.length>1&&<p className="observatory-note" data-testid="objectx-blink-mode">{alignment?m.blinkAligned:m.blinkRaw}</p>}
  <div className="button-row">
   <label>{m.rangeLow}<input type="number" value={Number(cut.low.toPrecision(6))} onChange={e=>setCut('low',Number(e.target.value))}/></label>
   <label>{m.rangeHigh}<input type="number" value={Number(cut.high.toPrecision(6))} onChange={e=>setCut('high',Number(e.target.value))}/></label>
  </div>
  <p className="observatory-note">{m.rangeNote}</p>
  <fieldset className="button-row"><legend>{m.roleLegend}</legend>
   <label><input type="radio" name="objectx-role" checked={role==='target'} onChange={()=>setRole('target')}/>{m.roleTarget}</label>
   <label><input type="radio" name="objectx-role" checked={role==='reference'} onChange={()=>setRole('reference')}/>{m.roleReference}</label>
   {role==='reference'&&<><label>{m.refRa}<input value={refRa} maxLength={16} onChange={e=>setRefRa(e.target.value)}/></label><label>{m.refDec}<input value={refDec} maxLength={16} onChange={e=>setRefDec(e.target.value)}/></label></>}
  </fieldset>
  <p className="observatory-note">{m.keyboardHelp}</p>
  <div className="fits-viewport" tabIndex={0} role="group" aria-label={m.viewport} onKeyDown={key} data-testid="objectx-measure-viewport">
   <canvas ref={canvas} data-testid="objectx-measure-canvas" data-shown={index} style={{width:'100%',maxWidth:im.width*4,imageRendering:'pixelated'}} onPointerDown={e=>{if(e.button!==0||blinking)return;const r=e.currentTarget.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*e.currentTarget.width/r.width)+1,y=Math.floor((e.clientY-r.top)*e.currentTarget.height/r.height)+1;setCursor({x,y});measure(x,y);}}/>
  </div>
  <div className="button-row"><span role="status" data-testid="objectx-cursor">{m.cursor(cursor.x,cursor.y)}</span><button disabled={!active||blinking} onClick={()=>measure()}>{m.measure}</button></div>
  {error&&<p role="alert">{error}</p>}
  <div className="objectx-measurements-wrap"><table className="objectx-measurements" data-testid="objectx-measurements"><caption>{m.table}</caption><thead><tr><th>{m.colFrame}</th><th>{m.colRole}</th><th>{m.colX}</th><th>{m.colY}</th><th>{m.colRa}</th><th>{m.colDec}</th><th>{m.colUt}</th><th>{m.colMethod}</th><th>{m.colResidual}</th><th/></tr></thead>
   <tbody>{log.map((mk,i)=>{
    const d=derived.get(i),pos=mk.role==='reference'?mk.catalog:d?.sky;
    const plate=plates[mk.frame]?.plate,refIndex=mk.role==='reference'?log.slice(0,i+1).filter(r=>r.frame===mk.frame&&r.role==='reference').length-1:-1;
    const residual=plate&&refIndex>=0?plate.residualsArcsec[refIndex]?.toFixed(2):'';
    return <tr key={i}><td>{mk.frame+1}</td><td>{mk.role==='target'?m.roleTarget:m.roleReference}</td><td>{mk.x.toFixed(2)}</td><td>{mk.y.toFixed(2)}</td><td>{pos?formatSexagesimal(pos.raHours,'ra'):'—'}</td><td>{pos?formatSexagesimal(pos.decDeg,'dec'):'—'}</td><td>{utText(mk.jd)}</td><td>{mk.role==='target'?(d?.method==='plate'?m.methodPlate:d?.method==='wcs'?m.methodWcs:m.notSolved):''}</td><td>{residual}</td><td><button onClick={()=>onLogChange(removeMeasurement(log,i))}>{m.remove}</button></td></tr>;})}</tbody></table></div>
  {plates.some(p=>p.references)&&<h3>{m.plateTitle}</h3>}
  <ul data-testid="objectx-plates">{plates.map((p,f)=>p.references?<li key={f}>{p.plate?<>{m.plateFrame(f+1,p.references)} — {m.plateRms(p.plate.rmsArcsec.toFixed(2),p.plate.scaleArcsecPerPixel.toFixed(3))}</>:p.reason==='degenerate'?m.plateDegenerate(f+1):m.plateNone(f+1,p.references)}</li>:null)}</ul>
  <p role="status" data-testid="objectx-motion">{motion?m.motion(motion.rateArcsecPerHour.toFixed(2),motion.positionAngleDeg.toFixed(1),motion.arcsec.toFixed(2),motion.hours.toFixed(3)):m.motionNone}</p>
 </section>;
}
