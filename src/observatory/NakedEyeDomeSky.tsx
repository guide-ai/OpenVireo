import {useEffect,useId,useRef,useState,type KeyboardEvent,type MouseEvent} from 'react';
import {NAKED_EYE_LITERALS as L,NKDEYE_FILE,decodeNakedEyeFile,nakedEyeFormFields,nakedEyeMarker,pickNakedEye,type NakedEyeRecord} from '../core/nakedEye';
import {NAKED_EYE_SKY as S,buildNakedEyeSky,nakedEyeDrawLevel,type NakedEyeSky,type NakedEyeSite} from '../core/nakedEyeSky';
import {fetchBundledVariableFile} from '../io/bundledVariableStars';
import type {Pointing} from '../core/sky';
import {FIELD_INFO_MESSAGES,NAKED_EYE_MESSAGES as M} from './FieldInfoMessages';
import './observatory-dialogs.css';
import './field-info.css';

let file:Promise<readonly NakedEyeRecord[]>|null=null;
/** NkdEye.dat, size and SHA-256 checked before decoding (the Front V same-origin adapter, generic over the identity). */
function loadNakedEye(){
 if(!file){file=fetchBundledVariableFile(fetch,new AbortController().signal,{...NKDEYE_FILE,archiveMember:'program files/CLEA/VIREO/NkdEye.dat'}).then(decodeNakedEyeFile);file.catch(()=>{file=null;});}
 return file;
}
const W=S.width,H=S.domeBottom-S.domeTop;// displayed 240×305 (the 240×302 bitmap stretched, 0x58cbec)
type Build=Readonly<{utcMs:number;site:NakedEyeSite;telescope:Pointing}>;

/** Naked-eye dome sky (TEnvironment1, FO-NE), a student path with no Edit Mode gate. The sky is built when the dome opens
 * (DomeSw1UpClick 0x58c608 rebuilds only from closed) and stays frozen at that instant; the right button picks (0x58d500/0x58d53c,
 * 0x55526c) with the click taken in display coordinates against the bitmap positions, not rescaled (as natively), and shows the
 * lime marker at (Round x, Round 1.01·y). Stars are drawn as discs by sprite level [W]; the dome shutters and ribs are not drawn. */
export default function NakedEyeDomeSky({open,active,site,utcNow,pointing}:{open:boolean;active:boolean;site:NakedEyeSite&Readonly<{name:string}>;utcNow:()=>number;pointing:Pointing}){
 const id=useId(),[records,setRecords]=useState<readonly NakedEyeRecord[]|null>(null),[failed,setFailed]=useState(false);
 const [build,setBuild]=useState<Build|null>(null),[sky,setSky]=useState<NakedEyeSky|null>(null),[picked,setPicked]=useState<Readonly<{record:NakedEyeRecord;x:number;y:number}>|null>(null);
 const [dialog,setDialog]=useState<NakedEyeRecord|null>(null),[cursor,setCursor]=useState({x:W/2,y:H/2});
 const svgRef=useRef<SVGSVGElement>(null),wasOpen=useRef(false),latest=useRef({site,utcNow,pointing});latest.current={site,utcNow,pointing};
 useEffect(()=>{
  if(open&&!wasOpen.current){const l=latest.current;setBuild({utcMs:l.utcNow(),site:{latitudeRadians:l.site.latitudeRadians,longitudeRadians:l.site.longitudeRadians},telescope:{...l.pointing}});setPicked(null);setDialog(null);}
  if(!open){setDialog(null);}
  wasOpen.current=open;
 },[open]);
 useEffect(()=>{if(!open||!active||records||failed)return;loadNakedEye().then(setRecords).catch(()=>setFailed(true));},[open,active,records,failed]);
 useEffect(()=>{if(!records||!build)return;try{setSky(buildNakedEyeSky(records,build.site,build.utcMs,build.telescope));}catch{setFailed(true);}},[records,build]);
 if(!open||!active)return null;
 function pickAt(x:number,y:number){
  if(!sky||x<0||y<0||x>W||y>H)return;// dome rect, inclusive (0x58d598)
  const p=pickNakedEye(sky.points,x,y);if(!p)return;
  const m=nakedEyeMarker(p);setPicked({record:p.record,x:m.x,y:m.y});setDialog(p.record);
 }
 function context(e:MouseEvent<SVGSVGElement>){
  e.preventDefault();const box=e.currentTarget.getBoundingClientRect(),x=(e.clientX-box.left)*W/box.width,y=(e.clientY-box.top)*H/box.height;
  setCursor({x,y});pickAt(x,y);
 }
 /** Tap / left click [W]: only moves the cursor (the original picks with the right button); "Show star at cursor" then picks. */
 function tap(e:MouseEvent<SVGSVGElement>){const box=e.currentTarget.getBoundingClientRect();setCursor({x:(e.clientX-box.left)*W/box.width,y:(e.clientY-box.top)*H/box.height});}
 function key(e:KeyboardEvent<SVGSVGElement>){
  const step=e.shiftKey?20:4,moves:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
  if(moves[e.key]){e.preventDefault();const [dx,dy]=moves[e.key];setCursor(c=>({x:Math.min(W,Math.max(0,c.x+dx)),y:Math.min(H,Math.max(0,c.y+dy))}));}
  else if(e.key==='Enter'||e.key==='ContextMenu'||(e.key==='F10'&&e.shiftKey)){e.preventDefault();pickAt(cursor.x,cursor.y);}
 }
 const sy=H/S.bitmapHeight;
 return <section className="card ne-card" aria-labelledby={`${id}-t`} data-testid="ne-card">
  <div className="card-heading"><div><div className="eyebrow">{M.eyebrow}</div><h2 id={`${id}-t`}>{M.title}</h2></div></div>
  <p className="fi-note">{M.help}</p>
  {failed?<p className="fi-unavailable" role="status" data-testid="ne-status" data-reason="naked-eye-file">{M.fileError}</p>
   :!sky?<p className="fi-note" role="status" data-testid="ne-status">{M.loading}</p>
   :<div className="ne-sky"><svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="application" tabIndex={0} aria-label={M.skyLabel} data-testid="ne-sky" data-count={sky.points.length} onContextMenu={context} onClick={tap} onKeyDown={key}>
    <rect width={W} height={H} fill="#000"/>
    {sky.points.filter(p=>p.x>=-5&&p.x<=W+5&&p.y>=-5&&p.y<=S.bitmapHeight+5).map(p=><circle key={p.record.index} cx={p.x} cy={p.y*sy} r={Math.max(.9,4.5*Math.pow(.85,nakedEyeDrawLevel(p.level)))} fill="#fff" opacity={Math.max(.35,Math.pow(.9,nakedEyeDrawLevel(p.level)))}/>)}
    {picked&&<rect data-testid="ne-marker" x={picked.x-7} y={picked.y-7} width="15" height="15" fill="none" stroke="#00ff00" strokeWidth="1"/>}
    <g stroke="var(--ov-focus)" strokeWidth="1" aria-hidden="true"><path d={`M${cursor.x-6} ${cursor.y}h4m4 0h4M${cursor.x} ${cursor.y-6}v4m0 4v4`}/></g>
   </svg></div>}
  {sky&&<div className="ob-actions"><button type="button" className="secondary-button" data-testid="ne-show-cursor" onClick={()=>pickAt(cursor.x,cursor.y)}>{M.showAtCursor}</button></div>}
  {sky&&<p className="fi-note">{M.tapAdaptation}</p>}
  {sky&&<p className="fi-note" data-testid="ne-caption">{M.caption(site.name,new Date(build!.utcMs).toISOString().slice(0,16).replace('T',' '),sky.points.length)}</p>}
  <p className="fi-note">{M.adaptation}</p>
  {dialog&&<NakedEyeStarDialog record={dialog} onClose={()=>{setDialog(null);requestAnimationFrame(()=>svgRef.current?.focus());}}/>}
 </section>;
}

/** TNkdEyeDataForm "Naked Eye Star" (192×143, ShowModal): RA and Dec read-only; V Mag editable but never written back; OK. */
function NakedEyeStarDialog({record,onClose}:{record:NakedEyeRecord;onClose:()=>void}){
 const id=useId(),ref=useRef<HTMLDialogElement>(null),f=nakedEyeFormFields(record),[mag,setMag]=useState(f.mag);
 useEffect(()=>{const el=ref.current;if(el&&!el.open){el.showModal();el.querySelector<HTMLButtonElement>('button')?.focus();}},[]);
 return <dialog ref={ref} className="ob-dialog ob-box" aria-labelledby={`${id}-t`} data-testid="ne-dialog" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id={`${id}-t`} className="ob-native">{L.caption}</h2>
  <div className="co-grid">
   <div className="co-row ne-row"><label htmlFor={`${id}-ra`} className="ob-native">{L.ra}</label><input id={`${id}-ra`} readOnly value={f.ra} data-testid="ne-ra"/></div>
   <div className="co-row ne-row"><label htmlFor={`${id}-dec`} className="ob-native">{L.dec}</label><input id={`${id}-dec`} readOnly value={f.dec} data-testid="ne-dec"/></div>
   <div className="co-row ne-row"><label htmlFor={`${id}-mag`} className="ob-native">{L.mag}</label><input id={`${id}-mag`} value={mag} onChange={e=>setMag(e.target.value.slice(0,20))} data-testid="ne-mag"/></div>
  </div>
  <p className="fi-note">{M.magNote}</p>
  <div className="ob-actions"><button type="button" className="primary-button" data-testid="ne-ok" onClick={onClose}>{FIELD_INFO_MESSAGES.ok}</button></div>
 </dialog>;
}
