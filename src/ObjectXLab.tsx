import type {ClassificationImport} from './core/classificationImport';
import {memo,useEffect,useMemo,useRef,useState,type MutableRefObject} from 'react';
import './objectx.css';
import {OBJECT_X_LAB_EN as M,OBJECT_X_MEASURE_EN} from './objectx/ObjectXMessages';
import {ObjectXMeasure,type MeasureFrame} from './ObjectXMeasure';
import ObjectXSpectrum from './ObjectXSpectrum';
import {MultiSpecObjectXLazy} from './multispec/MultiSpecLazy';
import {parseHtl,type HtlList} from './core/hotList';
import {parseFitsImage,type FitsImage} from './core/fitsImage';
import {formatSexagesimal,tanWcsFromCards,targetMotion,type MeasurementLog,type TanWcs} from './core/astrometryMeasure';
import {DEFAULT_LIMITING_MAGNITUDE,movingPairs,type ObservableList} from './core/asteroidField';
import {separationDegrees} from './core/ephemeris';
import {OBJECT_X_DEFAULT_UTC,OBJECT_X_ID_MAX,OBJECT_X_KINDS,OBJECT_X_ON_TARGET_DEGREES,objectXCameraListUse,objectXDataLabel,objectXTargets,revealObjectX,type ObjectXKind,type ObjectXLabSummary} from './core/objectXLab';
import {parseClockUTC} from './core/siteClock';
import {cameraCatalogReference} from './core/cameraCatalogReference';
import type {CameraExposureKind,CameraExtraSource} from './core/cameraExposure';
import type {CameraImage} from './CameraControl';
import {DEFAULT_ORBIT_FILE,SELECTABLE_ORBIT_FILES,fetchBundledOrbitFile,fetchObjectXHotList,type BundledOrbitFileId} from './io/bundledOrbitFile';
import {resourceSha256} from './io/boundedResource';
import {OBJECT_X_SESSION_LIMITS,buildObservableListInSlices,type ObjectXExposure,type ObjectXInvestigation} from './io/objectXInvestigation';
import {objectXFitsBytes} from './io/objectXImage';

/** What the observatory camera asks of the Object X lab (ComputeMovers inputs and the finished image). */
/** `pointing` is the observatory pointing of the exposure (RA hours, Dec degrees); `jd` and `seconds` are the start and the
 * total length the camera captured at Start (ComputeMovers T and dt). */
/** The unrevealed target as instruments need it: position, opaque code and the ObjX-<ID> data label. */
export type ObjectXHiddenTarget=Readonly<{ra:number;dec:number;code:string;label:string}>;
export type ObjectXController=Readonly<{extraSources:(jd:number,pointing:Readonly<{ra:number;dec:number}>,seconds:number,camera:CameraExposureKind)=>readonly CameraExtraSource[];acceptImage:(image:CameraImage)=>void}>;
type Props=Readonly<{
 active:boolean;busy:boolean;
 clockUtc:()=>string;onSetClock:(utc:string)=>void;
 onPrefill:(ra:number,dec:number)=>void;onOpenRadio:()=>void;
 /** Front S (S2): send a saved Object X spectrum (its masked .SSP bytes) to Classify, as "save, then load". */onClassifySpectrum?:(source:ClassificationImport)=>void;
 controllerRef:MutableRefObject<ObjectXController|null>;
 restored:ObjectXInvestigation|null;
 onSnapshot:(investigation:ObjectXInvestigation)=>void;
 onSummary:(summary:Omit<ObjectXLabSummary,'saved'>,answer:ObjectXKind|null)=>void;
 /** The observatory clock's applied UT (changes when the clock is set anywhere); the list is rebuilt for a new date. */
 clockApplied:string;
 /** Position of the chosen target while its identity is hidden, else null (instruments hide names near it). */
 onHiddenTarget:(target:ObjectXHiddenTarget|null)=>void;
}>;
const EMPTY:ObjectXInvestigation=Object.freeze({orbitFile:DEFAULT_ORBIT_FILE,id:'',target:null,startUtc:OBJECT_X_DEFAULT_UTC,clockSet:false,listJd:null,limit:DEFAULT_LIMITING_MAGNITUDE,
 exposures:[],images:[],measure:null,log:[],answer:null,description:'',revealed:false});
const jdOfUtc=(utc:string)=>2440587.5+parseClockUTC(utc)/86400000;
const utOfJd=(jd:number)=>new Date(Math.round((jd-2440587.5)*86400)*1000).toISOString().slice(0,19).replace('T',' ');
const LIST_ROWS=3000;
/** [W] A list is current for exposures within this many days of its date (1994 CC moves 2.4°/day, more than the 2° field box). */
export const OBJECT_X_LIST_CURRENT_DAYS=0.5;
/** [W] An observatory clock change elsewhere rebuilds the list when it moves the date by more than this (2.4 h). */
export const OBJECT_X_REBUILD_DAYS=0.1;
type Loaded=Readonly<{frame:MeasureFrame;bytes:Uint8Array}>;
type ListState=Readonly<{list:ObservableList;orbitFile:BundledOrbitFileId;limit:number}>;

/** E08 #object-x route: hidden-identity object, the three instrument branches, images, blink/measure, answer and reveal. */
function ObjectXLab({onClassifySpectrum,active,busy,clockUtc,clockApplied,onSetClock,onPrefill,onOpenRadio,controllerRef,restored,onSnapshot,onSummary,onHiddenTarget}:Props){
 const [inv,setInv]=useState<ObjectXInvestigation>(restored??EMPTY);
 const [htl,setHtl]=useState<HtlList|null>(null),[htlError,setHtlError]=useState(false);
 const [dateText,setDateText]=useState(inv.startUtc),[notice,setNotice]=useState('');
 const [list,setList]=useState<ObservableList|null>(null),[progress,setProgress]=useState<[number,number]|null>(null),[listError,setListError]=useState(false);
 const [loaded,setLoaded]=useState<ReadonlyMap<string,Loaded>>(new Map()),[fitsError,setFitsError]=useState('');
 const [listOpen,setListOpen]=useState(false),[confirmReveal,setConfirmReveal]=useState(false);
 const orbit=useRef<{id:BundledOrbitFileId;bytes:Uint8Array}|null>(null),listRef=useRef<ListState|null>(null),build=useRef(0);
 const lastPairs=useRef<{jd:number;list:ListState|null;pairs:number}|null>(null);
 const invRef=useRef(inv);invRef.current=inv;
 const update=(f:(i:ObjectXInvestigation)=>ObjectXInvestigation)=>setInv(i=>{const n=Object.freeze(f(i));invRef.current=n;return n;});

 useEffect(()=>{const c=new AbortController();fetchObjectXHotList(fetch,c.signal).then(r=>setHtl(parseHtl(r.bytes))).catch(()=>{if(!c.signal.aborted)setHtlError(true);});return()=>c.abort();},[]);
 useEffect(()=>{onSnapshot(inv);},[inv]);
 const targets=useMemo(()=>htl?objectXTargets(htl):[],[htl]);
 const target=targets.find(t=>t.code===inv.target)??null;
 const reveal=inv.revealed&&htl&&inv.target?revealObjectX(htl,inv.target):null;
 useEffect(()=>{onHiddenTarget(target&&!inv.revealed?{ra:target.ra,dec:target.dec,code:target.code,label:objectXDataLabel(inv.id)}:null);},[target?.code,inv.revealed,inv.id]);

 async function loadOrbit(id:BundledOrbitFileId){
  if(orbit.current?.id===id)return orbit.current.bytes;
  const r=await fetchBundledOrbitFile(fetch,new AbortController().signal,id);orbit.current={id,bytes:r.bytes};return r.bytes;
 }
 /** Builds the observable list in slices so the page stays responsive (0x519e94 over every record); a newer build cancels it. */
 async function buildList(jd:number,id=invRef.current.orbitFile,limit=invRef.current.limit){
  const ticket=++build.current;setListError(false);setList(null);listRef.current=null;
  try{
   const bytes=await loadOrbit(id);if(build.current!==ticket)return;
   const l=await buildObservableListInSlices(bytes,id,jd,limit,(done,total)=>{if(build.current===ticket)setProgress([done,total]);},()=>build.current!==ticket);
   if(build.current!==ticket||!l)return;
   listRef.current={list:l,orbitFile:id,limit};setList(l);setProgress(null);update(i=>({...i,listJd:jd}));
  }catch{if(build.current===ticket){setListError(true);setProgress(null);}}
 }
 const rebuildNow=(id?:BundledOrbitFileId,limit?:number)=>{let jd:number;try{jd=jdOfUtc(clockUtc());}catch{return;}void buildList(jd,id,limit);};
 // A restored investigation rebuilds its list (same file, date and limit).
 useEffect(()=>{if(restored?.listJd!=null)void buildList(restored.listJd,restored.orbitFile,restored.limit);},[]);
 // As the original after Set Date/Time (0x58b2ec–0x58b41a): the list is built for the clock's date whenever the observatory clock
 // is set, here or in the observatory, once the exercise has started (review 2 M1).
 const firstClock=useRef(true);
 useEffect(()=>{
  if(firstClock.current){firstClock.current=false;return;}
  if(!invRef.current.clockSet&&!listRef.current)return;
  // Pausing the clock also re-applies its time: rebuild only when the date really moved (the lab's own Set always rebuilds).
  let jd:number;try{jd=jdOfUtc(clockApplied);}catch{return;}
  if(!listRef.current||Math.abs(jd-listRef.current.list.jd)>OBJECT_X_REBUILD_DAYS)void buildList(jd);
 },[clockApplied]);

 async function acceptImage(image:CameraImage){
  const e=image.exposure,r=e.recipe;
  const bytes=objectXFitsBytes(e,image.jd,image.catalogName,image.source);
  const sha256=await resourceSha256(bytes.slice().buffer);
  const used=lastPairs.current&&lastPairs.current.jd===image.jd?lastPairs.current:{jd:image.jd,list:null,pairs:0};
  const exposure:ObjectXExposure={jd:image.jd,seconds:r.seconds,filter:r.filterPosition,gain:r.gain,telescope:r.opticalIndex as 0|1|2,ra:r.centerRaHours,dec:r.centerDecDegrees,seed:r.seed,
   catalogMode:image.source.mode,catalogSha256:image.source.sha256,extractId:image.source.extractId,listJd:used.list?.list.jd??null,orbitFile:used.list?.orbitFile??null,limit:used.list?.limit??null,pairs:used.pairs,skipped:e.skipped.map(k=>k.reason),fitsSha256:sha256};
  const fits=parseFitsImage(bytes);
  const cur=invRef.current;
  if(cur.exposures.length>=OBJECT_X_SESSION_LIMITS.exposures||cur.images.length>=OBJECT_X_SESSION_LIMITS.images){setNotice(M.imagesFull(OBJECT_X_SESSION_LIMITS.images,OBJECT_X_SESSION_LIMITS.exposures));return;}
  update(i=>{
   if(i.exposures.length>=OBJECT_X_SESSION_LIMITS.exposures||i.images.length>=OBJECT_X_SESSION_LIMITS.images)return i;
   const label=`${objectXDataLabel(i.id)}-${String(i.images.length+1).padStart(2,'0')}`;
   setLoaded(m=>new Map(m).set(sha256,{frame:{label,jd:image.jd,image:fits,wcs:wcsOf(fits)},bytes}));
   return {...i,exposures:[...i.exposures,exposure],images:[...i.images,{sha256,label,jd:image.jd,exposure:i.exposures.length}]};
  });
 }
 controllerRef.current={
  extraSources:(jd,pointing,seconds,camera)=>{
   const l=listRef.current,o=orbit.current;
   const current=!!l&&!!o&&o.id===l.orbitFile&&Math.abs(jd-l.list.jd)<=OBJECT_X_LIST_CURRENT_DAYS;
   const use=objectXCameraListUse({camera,listCurrent:current,clockSet:invRef.current.clockSet,hasList:!!l});
   // No list, or one for another date: no asteroids in this image ("asteroids not computed"); a list for this date is built
   // for the next CCD image if the exercise has started. IR images only read a current list: they never build one and do
   // not touch lastPairs, so they leave Object X state unchanged.
   if(use!=='use'){
    if(camera==='ccd')lastPairs.current={jd,list:null,pairs:0};
    if(use==='build')window.setTimeout(()=>void buildList(jd),0);
    return [];
   }
   const r=movingPairs(o!.bytes,l!.list,pointing,jd,seconds);
   if(camera==='ccd')lastPairs.current={jd,list:l,pairs:r.pairs.length};
   return r.pairs.map(p=>p.source);
  },
  acceptImage:image=>{void acceptImage(image);},
 };

 function wcsOf(image:FitsImage):TanWcs|null{try{return tanWcsFromCards(image.cards);}catch{return null;}}
 async function openFits(files:FileList|null){
  setFitsError('');
  for(const file of Array.from(files??[])){
   try{
    const bytes=new Uint8Array(await file.arrayBuffer()),fits=parseFitsImage(bytes),sha256=await resourceSha256(bytes.slice().buffer);
    const mjd=fits.cards.find(c=>c.startsWith('MJD-OBS ='));const jd=mjd?Number(mjd.slice(10).split('/')[0])+2400000.5:NaN;
    if(!Number.isFinite(jd))throw Error('time');
    update(i=>{
     const known=i.images.find(m=>m.sha256===sha256);
     if(!known&&i.images.length>=OBJECT_X_SESSION_LIMITS.images){setFitsError(M.imagesFull(OBJECT_X_SESSION_LIMITS.images,OBJECT_X_SESSION_LIMITS.exposures));return i;}
     const label=known?.label??file.name.replace(/\.fits?$/i,'').slice(0,120);
     setLoaded(m=>new Map(m).set(sha256,{frame:{label,jd,image:fits,wcs:wcsOf(fits)},bytes}));
     return known?i:{...i,images:[...i.images,{sha256,label,jd,exposure:null}]};
    });
   }catch{setFitsError(M.loadFitsError(file.name));}
  }
 }
 const frames=useMemo(()=>{
  if(!inv.measure)return null;const a=inv.images[inv.measure.first],b=inv.images[inv.measure.second];
  const fa=a&&loaded.get(a.sha256)?.frame,fb=b&&loaded.get(b.sha256)?.frame;return fa&&fb?[fa,fb]:null;
 },[inv.measure,inv.images,loaded]);
 const motion=useMemo(()=>{if(!frames)return null;try{return targetMotion(inv.log,f=>frames[f]?.wcs??null);}catch{return null;}},[frames,inv.log]);
 const onTarget=(e:ObjectXExposure)=>!!target&&separationDegrees(e.ra,e.dec,target.ra,target.dec)<=OBJECT_X_ON_TARGET_DEGREES;
 useEffect(()=>{onSummary({target:inv.target!==null,clockSet:inv.clockSet,listBuilt:list!==null,images:inv.images.length,imagesOfTarget:inv.exposures.filter(onTarget).length,
  motionMeasured:!!motion,answered:inv.answer!==null,described:inv.description.trim().length>0,revealed:inv.revealed},inv.answer);},[inv,list,motion,target]);

 function setClock(){
  try{parseClockUTC(dateText);}catch{setNotice(M.dateInvalid);return;}
  onSetClock(dateText);update(i=>({...i,startUtc:dateText,clockSet:true}));setNotice(M.clockSet(dateText.replace('T',' ')));
  void buildList(jdOfUtc(dateText));
 }
 function save(m:{label:string},bytes:Uint8Array){
  // The original names saved images "ObjX-<ID>-NN.FIT" (0x522c28).
  const url=URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'application/fits'})),a=document.createElement('a');
  a.href=url;a.download=`${m.label}.FIT`;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),0);
 }
 function chooseMeasure(part:'first'|'second',value:number){
  if(invRef.current.log.length&&!window.confirm(M.confirmClearMarks))return;
  update(i=>{const cur=i.measure??{first:0,second:Math.min(1,i.images.length-1)};const next={...cur,[part]:value};return {...i,measure:next.first===next.second?null:next,log:[]};});
 }
 const disabled=busy||!active;
 const kindName=(k:string)=>M.kinds[k]??k;
 return <main className="observatory-main objectx-lab" data-testid="objectx-lab">
  <div className="observatory-heading"><h1 tabIndex={-1}>{M.title}</h1><p>{M.scope}</p></div>
  <fieldset className="card" disabled={disabled}><legend><h2>{M.startTitle}</h2></legend>
   <label>{M.idLabel}<input value={inv.id} maxLength={OBJECT_X_ID_MAX} onChange={e=>{const id=e.target.value;update(i=>({...i,id}));}}/></label>
   <p className="observatory-note">{M.idHelp}</p>
   {htlError?<p role="alert">{M.targetsError}</p>:!htl?<p>{M.loadingTargets}</p>:<>
    <label>{M.targetLabel}<select data-testid="objectx-target" value={inv.target??''} onChange={e=>{const code=e.target.value||null;update(i=>i.revealed?i:{...i,target:code});}}>
     <option value="">{M.targetChoose}</option>{targets.map(t=><option key={t.code} value={t.code}>{t.code}</option>)}
    </select></label>
    <button className="secondary-button" disabled={inv.revealed} onClick={()=>{const t=targets[Math.floor(Math.random()*targets.length)];update(i=>({...i,target:t.code}));}}>{M.targetRandom}</button>
    <p className="observatory-note">{M.targetHelp}</p>
    {target&&<p data-testid="objectx-coordinates"><strong>{target.code}</strong> — {M.targetCoords(formatSexagesimal(target.ra,'ra'),formatSexagesimal(target.dec,'dec'))}</p>}
   </>}
   <label>{M.dateLabel}<input value={dateText} maxLength={19} onChange={e=>setDateText(e.target.value.trim())} placeholder={M.datePlaceholder}/></label>
   <p className="observatory-note">{M.dateHelp}</p>
   <button className="secondary-button" onClick={setClock}>{M.setClock}</button>
   {notice&&<p role="status">{notice}</p>}
  </fieldset>

  <section className="card" aria-labelledby="objectx-branches"><h2 id="objectx-branches">{M.branchesTitle}</h2>
   <div className="objectx-branches">
    <section data-testid="objectx-branch-camera"><h3>{M.cameraTitle}</h3><p>{M.cameraHelp}</p>
     <label>{M.orbitLabel}<select value={inv.orbitFile} disabled={disabled||progress!==null} onChange={e=>{const id=e.target.value as BundledOrbitFileId;update(i=>({...i,orbitFile:id}));if(invRef.current.clockSet||listRef.current)rebuildNow(id);else{setList(null);listRef.current=null;}}}>
      {SELECTABLE_ORBIT_FILES.map(id=><option key={id} value={id}>{M.orbitNames[id]}</option>)}</select></label>
     <p className="observatory-note">{M.orbitNote}</p>
     <label>{M.limitLabel}<input type="number" step="0.5" min={-5} max={30} value={inv.limit} disabled={disabled} onChange={e=>{const v=Number(e.target.value);if(Number.isFinite(v)&&v>=-5&&v<=30)update(i=>({...i,limit:v}));}} onBlur={()=>{if(listRef.current&&listRef.current.limit!==invRef.current.limit)rebuildNow(undefined,invRef.current.limit);}}/></label>
     <div className="button-row"><button className="secondary-button" disabled={disabled||progress!==null} onClick={()=>{let jd:number;try{jd=jdOfUtc(clockUtc());}catch{return;}void buildList(jd);}}>{M.buildList}</button></div>
     <p role="status" data-testid="objectx-list-status">{progress?M.building(progress[0],progress[1]):listError?M.listError:list?M.listBuilt(list.entries.length,list.neaCount,list.oppositionCount,utOfJd(list.jd)):M.noList}</p>
     {list&&list.errors.length>0&&<p className="observatory-note">{M.listErrors(list.errors.length)}</p>}
     <div className="button-row"><button className="primary-button" disabled={disabled||!target} onClick={()=>target&&onPrefill(target.ra,target.dec)}>{M.pointObservatory}</button></div>
     <p className="observatory-note">{M.pointHelp}</p>
    </section>
    <section data-testid="objectx-branch-radio"><h3>{M.radioTitle}</h3><p>{M.radioHelp}</p>
     <div className="button-row"><button className="secondary-button" disabled={disabled} onClick={onOpenRadio}>{M.openRadio}</button></div></section>
    <ObjectXSpectrum active={active} revealed={inv.revealed} onClassify={onClassifySpectrum} target={target} label={objectXDataLabel(inv.id)} disabled={disabled} spectra={inv.spectra??[]} pointingOf={code=>targets.find(t=>t.code===code)??null} onKeep={r=>update(i=>({...i,spectra:[...(i.spectra??[]),r]}))}/>
    <MultiSpecObjectXLazy htl={htl} target={target} revealed={inv.revealed} label={objectXDataLabel(inv.id)} disabled={disabled} currentJd={()=>jdOfUtc(clockUtc())}/>
   </div>
  </section>

  <section className="card" aria-labelledby="objectx-images"><h2 id="objectx-images">{M.imagesTitle}</h2>
   {!inv.images.length?<p>{M.noImages}</p>:<ol data-testid="objectx-images">{inv.images.map((m,k)=>{const e=m.exposure!==null?inv.exposures[m.exposure]:null;return <li key={m.sha256}>
    {e?M.imageRow(m.label,utOfJd(m.jd),cameraCatalogReference('ccd',e.filter).filter,e.seconds):M.imageRowPlain(m.label,utOfJd(m.jd))}
    {e&&!onTarget(e)&&<> {M.imageOffTarget}</>}
    {e&&<> — <span data-testid={`objectx-image-movers-${k}`}>{e.listJd!==null?M.imageMovers(e.pairs):M.imageNoAsteroids}</span></>}
    {e&&e.catalogMode==='live'&&<> <span className="observatory-note">{M.imageLive}</span></>}
    {e&&e.skipped.length>0&&<> <span data-testid={`objectx-image-skipped-${k}`}>{M.imageSkipped(e.skipped)}</span></>}
    {!loaded.has(m.sha256)?<> — <em>{M.imageNotLoaded}</em></>:<> <button className="secondary-button" disabled={disabled} onClick={()=>save(m,loaded.get(m.sha256)!.bytes)}>{M.saveFits(m.label)}</button></>}
   </li>;})}</ol>}
   <label className="secondary-button">{M.loadFits}<input type="file" accept=".fit,.fits,application/fits" multiple hidden disabled={disabled} onChange={e=>{void openFits(e.target.files);e.target.value='';}} data-testid="objectx-open-fits"/></label>
   {fitsError&&<p role="alert">{fitsError}</p>}
  </section>

  <section className="card" aria-labelledby="objectx-measure"><h2 id="objectx-measure">{M.measureTitle}</h2>
   {inv.images.length<2?<p>{M.measureNeedTwo}</p>:<>
    <div className="button-row">
     {(['first','second'] as const).map((part,p)=><label key={part}>{p?M.measureSecond:M.measureFirst}<select data-testid={`objectx-measure-${part}`} disabled={disabled} value={inv.measure?inv.measure[part]:p} onChange={e=>chooseMeasure(part,Number(e.target.value))}>
      {inv.images.map((m,i)=><option key={m.sha256} value={i}>{m.label}</option>)}</select></label>)}
     {!inv.measure&&<button className="secondary-button" disabled={disabled} onClick={()=>update(i=>({...i,measure:{first:0,second:1},log:[]}))}>{OBJECT_X_MEASURE_EN.title}</button>}
    </div>
    {inv.measure&&(frames?<ObjectXMeasure frames={frames} log={inv.log} active={active&&!busy} onLogChange={(log:MeasurementLog)=>update(i=>({...i,log}))}/>:<p>{M.measureNotLoaded}</p>)}
   </>}
   {list&&<details data-testid="objectx-asteroid-list" onToggle={e=>setListOpen(e.currentTarget.open)}><summary>{M.listTitle} ({list.entries.length})</summary>
    <p className="observatory-note">{list.fileType===0?M.listNotesAst:M.listNotesMpc}</p><p className="observatory-note">{M.listSorted}</p>
    {listOpen&&<div className="objectx-table"><table><thead><tr>{M.listColumns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>
     {list.entries.slice(0,LIST_ROWS).map(e=><tr key={e.index}><td>{e.label}</td><td>{formatSexagesimal(e.raHours,'ra')}</td><td>{formatSexagesimal(e.decDeg,'dec')}</td><td>{e.magnitude?e.magnitude.toFixed(1):''}</td><td>{e.deltaAu.toPrecision(5)}</td>{e.notes.map((n,i)=><td key={i}>{n||''}</td>)}</tr>)}
    </tbody></table>{list.entries.length>LIST_ROWS&&<p className="observatory-note">{M.listTruncated(LIST_ROWS)}</p>}</div>}</details>}
  </section>

  <fieldset className="card" disabled={disabled}><legend><h2>{M.answerTitle}</h2></legend>
   <fieldset className="button-row" data-testid="objectx-answer"><legend>{M.answerLegend}</legend>
    {OBJECT_X_KINDS.map(k=><label key={k}><input type="radio" name="objectx-answer" checked={inv.answer===k} disabled={inv.revealed} onChange={()=>update(i=>i.revealed?i:{...i,answer:k})}/>{kindName(k)}</label>)}
    {inv.revealed&&<p className="observatory-note">{M.answerFrozen}</p>}
   </fieldset>
   <label>{M.describeLabel}<textarea rows={4} maxLength={4000} value={inv.description} onChange={e=>{const d=e.target.value;update(i=>({...i,description:d}));}}/></label>
   {!inv.revealed&&<div className="button-row">
    {!confirmReveal?<button className="secondary-button" disabled={!inv.target||!htl} onClick={()=>inv.answer?setConfirmReveal(true):setNotice(M.revealNeedAnswer)}>{M.reveal}</button>
     :<><span>{M.revealConfirm}</span><button className="primary-button" onClick={()=>{update(i=>({...i,revealed:true}));setConfirmReveal(false);}}>{M.reveal}</button></>}
   </div>}
   {reveal&&<div data-testid="objectx-reveal" role="status"><p>{M.revealed(reveal.id,reveal.remarks)}</p>{reveal.kind&&<p>{M.verdict(reveal.kind===inv.answer,kindName(reveal.kind))}</p>}</div>}
  </fieldset>
 </main>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(ObjectXLab);
