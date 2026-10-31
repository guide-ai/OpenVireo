import {useEffect,useMemo,useRef,useState,type KeyboardEvent,type MouseEvent} from 'react';
import {FINDER_CATALOG_FRAME,TELESCOPE_FRAME,catalogScene,pickCatalogObject,type CatalogRecord,type CatalogScene} from '../core/catalogObject';
import {fieldMaskReach,objectXMasked} from '../io/objectXMask';
import type {FieldMode,Pointing} from '../core/sky';
import {findCertifiedPopulation} from '../io/fieldInfoPacks';
import {frozenObservatoryTime,type FieldPopulation} from '../core/fieldEngine';
import {FIELD_CACHE,FINDER_FIELD_CACHE,nativeFieldCacheHolds} from '../core/fieldCache';
import {setLoadedField} from './loadedField';
import CatalogObjectDialog from './CatalogObjectDialog';
import {FIELD_INFO_MESSAGES as M,fieldInfoReasonText,type FieldInfoReason} from './FieldInfoMessages';
import './field-info.css';

type State=Readonly<{status:'loading'}|{status:'ready';packId:string;population:FieldPopulation}|{status:'unavailable';reason:FieldInfoReason;detail?:string}|{status:'error'}>;
const SIZE=700,F=TELESCOPE_FRAME,toWeb=(raster:number)=>(raster-F.cropOrigin)*SIZE/F.crop,toControl=(web:number)=>web*F.crop/SIZE;
/** The display spans the 15′ instrument view or the 2.5° (150′) finder view. */
const pxPerArcmin=(mode:FieldMode)=>SIZE/(mode==='finder'?150:15);
/** Front G5: Finder Mag Limit, options record +0x2504, compiled 11.5 (the Parameters tab is read-only on this site). */
const FINDER_MAG_LIMIT=11.5;

/** Edit Mode Telescope-view click (FO-CO): in Edit Mode only. The view shows the engine's own field (the population Catalog
 * Object reads, io/fieldInfoPacks.ts: a bundled pack at its pointings, otherwise the compact GSC tiles — Front G; drawing style
 * [W]) and a click, or the keyboard cursor + Enter, picks with the recovered 350 px rule and opens Catalog Object with a lime
 * 15×15 marker. Where no field can be built (a polar field, a tile failure, an Object X mask) only a status line with the typed
 * reason is shown and clicks reach the normal sky view (target selection) unchanged. */
export default function EditModeFieldLayer({editMode,active,mode,pointing,hidden,onOpenVariable,currentJd,telescope=0}:{editMode:boolean;active:boolean;mode:FieldMode;pointing:Pointing;hidden:Pointing|null;onOpenVariable?:(recordIndex:number,riseWordDefaulted:boolean)=>void;
 /** Front G5: the telescope record whose finder field the Finder view picks from (+0x6f4 only affects the drawing). */telescope?:0|1|2;
 /** Front T: the observatory clock; its JD is frozen when the field is built (as the LSS list does). */
 currentJd?:()=>number}){
 const [state,setState]=useState<State>({status:'loading'}),[record,setRecord]=useState<CatalogRecord|null>(null),[marked,setMarked]=useState<CatalogRecord|null>(null),[cursor,setCursor]=useState({x:SIZE/2,y:SIZE/2});
 const svg=useRef<SVGSVGElement>(null);
 // G2 review 1 M2: VIREO keeps the loaded field while the view stays inside its cached area (0x53af28) and reloads only past it,
 // so a drifting pointing (tracking off) re-projects the loaded field instead of rebuilding it every tick.
 const cacheSpec=mode==='finder'?FINDER_FIELD_CACHE:FIELD_CACHE;
 const [anchor,setAnchor]=useState<Pointing>(pointing);
 useEffect(()=>{if(!nativeFieldCacheHolds(anchor,pointing,cacheSpec))setAnchor(pointing);},[pointing.ra,pointing.dec,cacheSpec]);// eslint-disable-line react-hooks/exhaustive-deps
 const at=nativeFieldCacheHolds(anchor,pointing,cacheSpec)?anchor:pointing;
 useEffect(()=>{
  if(!editMode||!active)return;
  let current=true;const controller=new AbortController();setState({status:'loading'});setRecord(null);setMarked(null);
  // Front G5: the Finder view picks from the finder field (FSCFieldObj on the compact GSC, io/skyField.ts; the sky view shares it).
  if(mode==='finder'){
   import('../io/skyField').then(m=>m.loadSkyField({view:'finder',anchor:at,telescope,hidden,currentJd,finderMagnitudeLimit:FINDER_MAG_LIMIT,signal:controller.signal})).then(f=>{
    if(!current)return;
    if(f.status==='ready')setState({status:'ready',packId:f.packId,population:f.population});
    else setState(f.reason==='field-reason'?{status:'unavailable',reason:'population',detail:f.detail??''}:'detail' in f&&f.detail!==undefined?{status:'unavailable',reason:f.reason,detail:f.detail}:{status:'unavailable',reason:f.reason});
   }).catch((e:unknown)=>{if(current&&!(e instanceof DOMException&&e.name==='AbortError'))setState({status:'error'});});
   return()=>{current=false;controller.abort();};
  }
  // The 2° Object X mask with max(0.62°, the field's farthest corner) (the observatory rule since G4b).
  objectXMasked(hidden,at,Math.max(0.62,fieldMaskReach(at))).then(async masked=>{
   if(masked){if(current)setState({status:'unavailable',reason:'object-x-hidden'});return;}
   const r=await findCertifiedPopulation(at,frozenObservatoryTime(currentJd),controller.signal);if(!current)return;
   if(r.status==='ready'){setState({status:'ready',packId:r.packId,population:r.population});setLoadedField({anchor:at,population:r.population});}
   else setState('detail' in r?{status:'unavailable',reason:r.reason,detail:r.detail}:{status:'unavailable',reason:r.reason});
  }).catch(()=>{if(current)setState({status:'error'});});
  // A pointing or mode change stops a tiled build in progress (G1b review 1 L3).
  return()=>{current=false;controller.abort();setLoadedField(null);};
 },[editMode,active,mode,telescope,hidden?.ra,hidden?.dec,at.ra,at.dec]);// eslint-disable-line react-hooks/exhaustive-deps
 // The loaded population drawn at the current pointing (the native crop moves inside the cached field).
 const scene=useMemo<CatalogScene|null>(()=>state.status==='ready'?catalogScene(state.population,pointing,state.packId==='gsc-tiles'?(mode==='finder'?'Compact GSC tiles; finder field (FSC) built for this pointing':'Compact GSC tiles; field built for this pointing'):`Field pack ${state.packId}; certified pointing`,mode==='finder'?FINDER_CATALOG_FRAME:TELESCOPE_FRAME):null,[state,pointing.ra,pointing.dec,mode]);
 const shapes=useMemo(()=>state.status==='ready'&&scene?{
  stars:scene.stars.map((p,i)=>({x:toWeb(p.x),y:toWeb(p.y),r:Math.max(.9,Math.min(4.5,(17-scene.records.stars[i].v)*.38)),qso:scene.records.stars[i].type===3})),
  galaxies:scene.galaxies.map((p,i)=>{const g=scene.records.galaxies[i];return {x:toWeb(p.x),y:toWeb(p.y),rx:Math.max(2,(g.major||.5)*pxPerArcmin(mode)/2),ry:Math.max(1.5,(g.minor||g.major||.5)*pxPerArcmin(mode)/2)};}),
 }:null,[state,scene,mode]);
 if(!editMode||!active)return null;
 const reason:Readonly<{reason:FieldInfoReason;detail?:string}>|null=state.status==='unavailable'?state:state.status==='error'?{reason:'load-error'}:null;
 if(reason||state.status!=='ready'||!shapes||!scene)return <p className="em-caption" role="status" data-testid="em-status" data-reason={reason?.reason??'loading'} style={{pointerEvents:'none'}}>{reason?fieldInfoReasonText(reason.reason,reason.detail):fieldInfoReasonText('loading')}</p>;
 const loaded=scene;
 function pickAt(webX:number,webY:number){const r=pickCatalogObject(loaded,toControl(webX),toControl(webY));if(r){setRecord(r);setMarked(r);}}
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
  <p className="em-caption" id="em-layer-help" data-testid="em-caption">{M.editLayerCaption(state.packId,scene.stars.length,scene.galaxies.length,mode==='finder')}</p>
  {record&&<CatalogObjectDialog record={record} onGcvs={record.kind==='star'&&record.variable&&onOpenVariable?()=>onOpenVariable(record.variable!.recordIndex,record.variable!.riseWordDefaulted):undefined} onClose={()=>{setRecord(null);requestAnimationFrame(()=>svg.current?.focus());}}/>}
 </div>;
}
