import {useEffect,useRef,useState} from 'react';
import {cameraPaletteBytes,cameraPaletteDraft,INITIAL_CAMERA_PALETTE,type CameraPalette} from './core/cameraPalette';
import type {InspectedFits} from './io/fitsImage';
import {t} from './i18n';

/** Drafts belong to one loaded object, even when a later import has the same hash. */
export default function CameraPalettePreview({owner,applied,active,busy,onApply}:{owner:InspectedFits;applied:CameraPalette|null;active:boolean;busy:boolean;onApply:(owner:InspectedFits,value:CameraPalette|null)=>boolean}){
 const dialog=useRef<HTMLDialogElement>(null),opener=useRef<HTMLButtonElement>(null),lowInput=useRef<HTMLInputElement>(null),base=useRef<InspectedFits|null>(null),latest=useRef({owner,active,busy,onApply});latest.current={owner,active,busy,onApply};
 const [draft,setDraft]=useState({low:String(INITIAL_CAMERA_PALETTE.low),high:String(INITIAL_CAMERA_PALETTE.high)}),[attempted,setAttempted]=useState(false);
 let preview:CameraPalette|null=null;try{preview=cameraPaletteDraft(draft.low,draft.high);}catch{/* Invalid drafts never reach the display. */}
 const bytes=preview?cameraPaletteBytes(preview):null;
 function close(focus=true){base.current=null;dialog.current?.close();setAttempted(false);if(focus&&latest.current.active&&!latest.current.busy)opener.current?.focus({preventScroll:true});}
 useEffect(()=>{if(!active||busy||base.current&&base.current!==owner)close(false);},[owner,active,busy]);
 useEffect(()=>{const hidden=()=>{if(document.visibilityState==='hidden')close(false);};document.addEventListener('visibilitychange',hidden);return()=>{base.current=null;document.removeEventListener('visibilitychange',hidden);};},[]);
 function commit(value:CameraPalette|null){const now=latest.current;if(!dialog.current?.open||base.current!==now.owner||!now.active||now.busy)return;if(now.onApply(now.owner,value))close();}
 return <><button ref={opener} disabled={!active||busy} onClick={()=>{if(!latest.current.active||latest.current.busy||document.querySelector('dialog[open]'))return;base.current=owner;setDraft({low:String(applied?.low??INITIAL_CAMERA_PALETTE.low),high:String(applied?.high??INITIAL_CAMERA_PALETTE.high)});setAttempted(false);dialog.current?.showModal();lowInput.current?.focus();}}>{t('palette.open')}</button>
 <dialog ref={dialog} className="camera-palette-dialog" aria-labelledby="camera-palette-title" aria-describedby="camera-palette-policy" onKeyDown={e=>{if(e.key==='Enter'&&e.repeat)e.preventDefault();}} onCancel={e=>{e.preventDefault();close();}} onClose={()=>{if(!dialog.current?.open)base.current=null;}}>
 <h2 id="camera-palette-title">{t('palette.title')}</h2><p id="camera-palette-policy">{t('palette.policy')}</p><p>{t('palette.initial')}</p><p>{t('palette.owner',{name:owner.name})}</p>
 <form onSubmit={e=>{e.preventDefault();setAttempted(true);if(preview)commit(preview);}}>
 <div className="button-row"><label>{t('palette.low')}<input ref={lowInput} type="text" inputMode="numeric" maxLength={3} value={draft.low} onChange={e=>setDraft(d=>({...d,low:e.target.value}))}/></label><label>{t('palette.high')}<input type="text" inputMode="numeric" maxLength={3} value={draft.high} onChange={e=>setDraft(d=>({...d,high:e.target.value}))}/></label></div>
 {bytes?<svg shapeRendering="crispEdges" viewBox="0 0 256 32" role="img" aria-label={t('palette.preview')}>{Array.from({length:256},(_,i)=><rect key={i} x={i} y={0} width={1} height={32} fill={`rgb(${bytes[i*4]},${bytes[i*4]},${bytes[i*4]})`}/>)}</svg>:<p role={attempted?'alert':'status'}>{t('palette.invalid')}</p>}
 <p>{t('palette.pending')}</p><div className="button-row"><button type="submit">{t('palette.apply')}</button><button type="button" onClick={()=>{setDraft({low:'0',high:'255'});setAttempted(false);lowInput.current?.focus();}}>{t('palette.full')}</button><button type="button" onClick={()=>commit(null)}>{t('palette.linear')}</button><button type="button" onClick={()=>close()}>{t('palette.cancel')}</button></div></form></dialog></>;
}
