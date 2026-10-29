import {useEffect,useMemo,useRef,useState,type KeyboardEvent,type MouseEvent} from 'react';
import {TELESCOPE_FRAME,catalogScene,pickCatalogObject,type CatalogRecord,type CatalogScene} from '../core/catalogObject';
import {objectXMasked} from '../io/objectXMask';
import type {FieldMode,Pointing} from '../core/sky';
import {findCertifiedPopulation} from '../io/fieldInfoPacks';
import {frozenObservatoryTime} from '../core/fieldEngine';
import CatalogObjectDialog from './CatalogObjectDialog';
import {FIELD_INFO_MESSAGES as M,fieldInfoReasonText,type FieldInfoReason} from './FieldInfoMessages';
import './field-info.css';

type State=Readonly<{status:'loading'}|{status:'ready';packId:string;scene:CatalogScene}|{status:'unavailable';reason:FieldInfoReason;detail?:string}|{status:'error'}>;
const SIZE=700,F=TELESCOPE_FRAME,toWeb=(raster:number)=>(raster-F.cropOrigin)*SIZE/F.crop,toControl=(web:number)=>web*F.crop/SIZE;
const PX_PER_ARCMIN=SIZE/15;

/** Edit Mode Telescope-view click (FO-CO): in Edit Mode only. The view shows the engine's own field (the population Catalog
 * Object reads, io/fieldInfoPacks.ts: a bundled pack at its pointings, otherwise the compact GSC tiles — Front G; drawing style
 * [W]) and a click, or the keyboard cursor + Enter, picks with the recovered 350 px rule and opens Catalog Object with a lime
 * 15×15 marker. Where no field can be built (a polar field, a tile failure, an Object X mask) only a status line with the typed
 * reason is shown and clicks reach the normal sky view (target selection) unchanged. */
export default function EditModeFieldLayer({editMode,active,mode,pointing,hidden,onOpenVariable,currentJd}:{editMode:boolean;active:boolean;mode:FieldMode;pointing:Pointing;hidden:Pointing|null;onOpenVariable?:(recordIndex:number,riseWordDefaulted:boolean)=>void;
 /** Front T: the observatory clock; its JD is frozen when the field is built (as the LSS list does). */
 currentJd?:()=>number}){
 const [state,setState]=useState<State>({status:'loading'}),[record,setRecord]=useState<CatalogRecord|null>(null),[marked,setMarked]=useState<CatalogRecord|null>(null),[cursor,setCursor]=useState({x:SIZE/2,y:SIZE/2});
 const svg=useRef<SVGSVGElement>(null);
 useEffect(()=>{
  if(!editMode||!active||mode!=='telescope')return;
  let current=true;setState({status:'loading'});setRecord(null);setMarked(null);
  objectXMasked(hidden,pointing).then(async masked=>{
   if(masked){if(current)setState({status:'unavailable',reason:'object-x-hidden'});return;}
   const r=await findCertifiedPopulation(pointing,frozenObservatoryTime(currentJd));if(!current)return;
   if(r.status==='ready')setState({status:'ready',packId:r.packId,scene:catalogScene(r.population,pointing,r.packId==='gsc-tiles'?'Compact GSC tiles; field built for this pointing':`Field pack ${r.packId}; certified pointing`)});
   else setState('detail' in r?{status:'unavailable',reason:r.reason,detail:r.detail}:{status:'unavailable',reason:r.reason});
  }).catch(()=>{if(current)setState({status:'error'});});
  return()=>{current=false;};
 },[editMode,active,mode,hidden?.ra,hidden?.dec,pointing.ra,pointing.dec]);// eslint-disable-line react-hooks/exhaustive-deps
 const shapes=useMemo(()=>state.status==='ready'?{
  stars:state.scene.stars.map((p,i)=>({x:toWeb(p.x),y:toWeb(p.y),r:Math.max(.9,Math.min(4.5,(17-state.scene.records.stars[i].v)*.38)),qso:state.scene.records.stars[i].type===3})),
  galaxies:state.scene.galaxies.map((p,i)=>{const g=state.scene.records.galaxies[i];return {x:toWeb(p.x),y:toWeb(p.y),rx:Math.max(2,(g.major||.5)*PX_PER_ARCMIN/2),ry:Math.max(1.5,(g.minor||g.major||.5)*PX_PER_ARCMIN/2)};}),
 }:null,[state]);
 if(!editMode||!active)return null;
 const reason:Readonly<{reason:FieldInfoReason;detail?:string}>|null=mode!=='telescope'?{reason:'finder-catalog-unavailable'}:state.status==='unavailable'?state:state.status==='error'?{reason:'load-error'}:null;
 if(reason||state.status!=='ready'||!shapes)return <p className="em-caption" data-testid="em-status" data-reason={reason?.reason??'loading'} style={{pointerEvents:'none'}}>{reason?fieldInfoReasonText(reason.reason,reason.detail):fieldInfoReasonText('loading')}</p>;
 const scene=state.scene;
 function pickAt(webX:number,webY:number){const r=pickCatalogObject(scene,toControl(webX),toControl(webY));if(r){setRecord(r);setMarked(r);}}
 function click(e:MouseEvent<SVGSVGElement>){
  const box=e.currentTarget.getBoundingClientRect(),x=(e.clientX-box.left)*SIZE/box.width,y=(e.clientY-box.top)*SIZE/box.height;
  setCursor({x,y});pickAt(x,y);
 }
 function key(e:KeyboardEvent<SVGSVGElement>){
  const step=e.shiftKey?50:10,moves:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
  if(moves[e.key]){e.preventDefault();const [dx,dy]=moves[e.key];setCursor(c=>({x:Math.min(SIZE,Math.max(0,c.x+dx)),y:Math.min(SIZE,Math.max(0,c.y+dy))}));}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();pickAt(cursor.x,cursor.y);}
 }
 const picked=marked?(()=>{const i=marked.kind==='star'?scene.records.stars.indexOf(marked):scene.records.galaxies.indexOf(marked);const p=marked.kind==='star'?scene.stars[i]:scene.galaxies[i];return p?{x:toWeb(Math.round(p.x)),y:toWeb(Math.round(p.y))}:null;})():null;
 const half=7.5*SIZE/F.crop;
 return <div className="em-layer" data-testid="em-layer" data-pack={state.packId}>
  <svg ref={svg} viewBox={`0 0 ${SIZE} ${SIZE}`} role="application" tabIndex={0} aria-label={M.editLayerLabel} aria-describedby="em-layer-help" data-testid="em-sky" onClick={click} onKeyDown={key}>
   <rect width={SIZE} height={SIZE} fill="var(--ov-sky-bg)"/>
   {shapes.galaxies.map((g,i)=><ellipse key={`g${i}`} cx={g.x} cy={g.y} rx={g.rx} ry={g.ry} fill="#cfd8e6" opacity=".45"/>)}
   {shapes.stars.map((s,i)=><circle key={`s${i}`} cx={s.x} cy={s.y} r={s.r} fill={s.qso?'#bfe3ff':'#eef4fb'}/>)}
   {picked&&<rect data-testid="em-marker" x={picked.x-half} y={picked.y-half} width={2*half} height={2*half} fill="none" stroke="#00ff00" strokeWidth="2"/>}
   <g stroke="var(--ov-focus)" strokeWidth="1.5" opacity=".9" aria-hidden="true"><path d={`M${cursor.x-12} ${cursor.y}h9m6 0h9M${cursor.x} ${cursor.y-12}v9m0 6v9`}/></g>
  </svg>
  <p className="em-caption" id="em-layer-help" data-testid="em-caption">{M.editLayerCaption(state.packId,scene.stars.length,scene.galaxies.length)}</p>
  {record&&<CatalogObjectDialog record={record} onGcvs={record.kind==='star'&&record.variable&&onOpenVariable?()=>onOpenVariable(record.variable!.recordIndex,record.variable!.riseWordDefaulted):undefined} onClose={()=>{setRecord(null);requestAnimationFrame(()=>svg.current?.focus());}}/>}
 </div>;
}
