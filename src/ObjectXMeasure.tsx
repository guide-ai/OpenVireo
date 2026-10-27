import {useEffect,useLayoutEffect,useMemo,useRef,useState,type KeyboardEvent} from 'react';
import {fitsRaster,type FitsImage} from './core/fitsImage';
import {BLINK_INTERVAL,MeasureError,addMeasurement,centroid,clampBlinkInterval,formatSexagesimal,measureImageFromFits,parseSexagesimal,removeMeasurement,solveTarget,targetMotion,type MeasurementLog,type TanWcs} from './core/astrometryMeasure';
import {OBJECT_X_MEASURE_EN,type ObjectXMeasureMessages} from './objectx/ObjectXMessages';

/** One image offered for measurement: a saved camera FITS, its observation JD and its header WCS when present. */
export type MeasureFrame=Readonly<{label:string;jd:number;image:FitsImage;wcs:TanWcs|null}>;
type Props=Readonly<{frames:readonly MeasureFrame[];log:MeasurementLog;onLogChange:(log:MeasurementLog)=>void;active?:boolean;messages?:ObjectXMeasureMessages}>;

const utText=(jd:number)=>new Date((jd-2440587.5)*86400000).toISOString().slice(0,19).replace('T',' ');

/** E08 web measuring tool (X3): blink, click/keyboard centroid measurement, plate or header-WCS solution, motion. */
export function ObjectXMeasure({frames,log,onLogChange,active=true,messages=OBJECT_X_MEASURE_EN}:Props){
 const m=messages;
 const [shown,setShown]=useState(0),[blinking,setBlinking]=useState(false),[interval,setIntervalMs]=useState<number>(BLINK_INTERVAL.default);
 const [cursor,setCursor]=useState({x:1,y:1}),[role,setRole]=useState<'target'|'reference'>('target');
 const [refRa,setRefRa]=useState(''),[refDec,setRefDec]=useState(''),[error,setError]=useState('');
 const frame=frames[Math.min(shown,frames.length-1)];
 const [range,setRange]=useState<{low:number;high:number}|null>(null);
 const canvas=useRef<HTMLCanvasElement>(null);
 const defaultRange=useMemo(()=>{const im=frame?.image;if(!im||im.minimum===null||im.maximum===null)return {low:0,high:1};return {low:im.minimum+(im.maximum-im.minimum)*0.05,high:im.minimum+(im.maximum-im.minimum)*0.5};},[frame]);
 const cut=range??defaultRange;
 useEffect(()=>{if(!blinking||frames.length<2||!active)return;const id=window.setInterval(()=>setShown(s=>(s+1)%Math.min(2,frames.length)),interval);return()=>window.clearInterval(id);},[blinking,interval,frames.length,active]);
 useEffect(()=>{if(!active)setBlinking(false);},[active]);
 useLayoutEffect(()=>{
  const c=canvas.current;if(!c||!frame)return;const im=frame.image;c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');if(!ctx)return;
  ctx.putImageData(new ImageData(Uint8ClampedArray.from(fitsRaster(im)),im.width,im.height),0,0);
  for(const mark of log)if(mark.frame===shown){ctx.strokeStyle=mark.role==='target'?'#ff5050':'#40c0ff';ctx.beginPath();ctx.arc(mark.x-0.5,mark.y-0.5,4,0,2*Math.PI);ctx.stroke();}
  ctx.strokeStyle='#00ff88';ctx.strokeRect(cursor.x-2,cursor.y-2,3,3);
 },[frame,log,shown,cursor]);
 const motion=useMemo(()=>{try{return targetMotion(log);}catch{return null;}},[log]);
 if(!frames.length)return <section className="card objectx-measure"><h2>{m.title}</h2><p>{m.noFrames}</p></section>;
 const im=frame.image;
 function measure(x=cursor.x,y=cursor.y){
  if(!active)return;
  try{
   if(!(cut.high>cut.low))throw new MeasureError('range');
   const c=centroid(measureImageFromFits(im),x,y,cut);
   if(role==='reference'){
    const ra=parseSexagesimal(refRa,'ra'),dec=parseSexagesimal(refDec,'dec');
    if(ra===null||dec===null){setError(m.refInvalid);return;}
    onLogChange(addMeasurement(log,{frame:shown,role,x:c.x,y:c.y,jd:frame.jd,sky:null,catalog:{raHours:ra,decDeg:dec}}));
   }else{
    const solved=solveTarget(log,shown,c.x,c.y,frame.wcs);
    onLogChange(addMeasurement(log,{frame:shown,role,x:c.x,y:c.y,jd:frame.jd,sky:solved?.sky??null,method:solved?.method}));
   }
   setError('');
  }catch(e){setError(e instanceof MeasureError?m.errors[e.code]??e.code:String(e));}
 }
 function key(e:KeyboardEvent){
  const step=e.shiftKey?10:1,moves:Record<string,readonly [number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
  if(moves[e.key]){e.preventDefault();const [dx,dy]=moves[e.key];setCursor(p=>({x:Math.max(1,Math.min(im.width,p.x+dx)),y:Math.max(1,Math.min(im.height,p.y+dy))}));}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();measure();}
 }
 const solvedText=(i:number)=>{const mk=log[i];if(mk.role==='reference')return '';return mk.method==='plate'?m.methodPlate:mk.method==='wcs'?m.methodWcs:m.notSolved;};
 return <section className="card objectx-measure" aria-label={m.title}>
  <h2>{m.title}</h2><p>{m.intro}</p><p className="observatory-note">{m.adaptation}</p>
  <div className="button-row" role="group" aria-label={m.showFrame}>{frames.map((f,i)=><button key={i} aria-pressed={i===shown} disabled={blinking} onClick={()=>setShown(i)}>{m.frame(i+1,f.label)}</button>)}</div>
  <div className="button-row">
   <button disabled={frames.length<2||!active} aria-pressed={blinking} onClick={()=>{setBlinking(b=>!b);setShown(0);}}>{blinking?m.blinkStop:m.blinkStart}</button>
   <label>{m.blinkInterval}<input type="number" min={BLINK_INTERVAL.min} max={BLINK_INTERVAL.max} value={interval} onChange={e=>setIntervalMs(clampBlinkInterval(Number(e.target.value)))}/></label>
   <label>{m.rangeLow}<input type="number" value={Number(cut.low.toPrecision(6))} onChange={e=>setRange({...cut,low:Number(e.target.value)})}/></label>
   <label>{m.rangeHigh}<input type="number" value={Number(cut.high.toPrecision(6))} onChange={e=>setRange({...cut,high:Number(e.target.value)})}/></label>
  </div>
  <fieldset className="button-row"><legend>{m.roleLegend}</legend>
   <label><input type="radio" name="objectx-role" checked={role==='target'} onChange={()=>setRole('target')}/>{m.roleTarget}</label>
   <label><input type="radio" name="objectx-role" checked={role==='reference'} onChange={()=>setRole('reference')}/>{m.roleReference}</label>
   {role==='reference'&&<><label>{m.refRa}<input value={refRa} maxLength={16} onChange={e=>setRefRa(e.target.value)}/></label><label>{m.refDec}<input value={refDec} maxLength={16} onChange={e=>setRefDec(e.target.value)}/></label></>}
  </fieldset>
  <p className="observatory-note">{m.keyboardHelp}</p>
  <div className="fits-viewport" tabIndex={0} role="group" aria-label={m.viewport} onKeyDown={key}>
   <canvas ref={canvas} data-testid="objectx-measure-canvas" style={{width:'100%',maxWidth:im.width*4,imageRendering:'pixelated'}} onPointerDown={e=>{if(e.button!==0)return;const r=e.currentTarget.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*im.width/r.width)+1,y=Math.floor((e.clientY-r.top)*im.height/r.height)+1;setCursor({x,y});measure(x,y);}}/>
  </div>
  <div className="button-row"><span role="status">{m.cursor(cursor.x,cursor.y)}</span><button disabled={!active} onClick={()=>measure()}>{m.measure}</button></div>
  {error&&<p role="alert">{error}</p>}
  <table className="objectx-measurements"><caption>{m.table}</caption><thead><tr><th>{m.colFrame}</th><th>{m.colRole}</th><th>{m.colX}</th><th>{m.colY}</th><th>{m.colRa}</th><th>{m.colDec}</th><th>{m.colUt}</th><th>{m.colMethod}</th><th/></tr></thead>
   <tbody>{log.map((mk,i)=>{const pos=mk.role==='reference'?mk.catalog:mk.sky;return <tr key={i}><td>{mk.frame+1}</td><td>{mk.role==='target'?m.roleTarget:m.roleReference}</td><td>{mk.x.toFixed(2)}</td><td>{mk.y.toFixed(2)}</td><td>{pos?formatSexagesimal(pos.raHours,'ra'):'—'}</td><td>{pos?formatSexagesimal(pos.decDeg,'dec'):'—'}</td><td>{utText(mk.jd)}</td><td>{solvedText(i)}</td><td><button onClick={()=>onLogChange(removeMeasurement(log,i))}>{m.remove}</button></td></tr>;})}</tbody></table>
  <p role="status" data-testid="objectx-motion">{motion?m.motion(motion.rateArcsecPerHour.toFixed(2),motion.positionAngleDeg.toFixed(1),motion.arcsec.toFixed(2),motion.hours.toFixed(3)):m.motionNone}</p>
 </section>;
}
