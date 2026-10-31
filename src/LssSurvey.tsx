import SpectralRangeRow from './SpectralRangeRow';
import {DEFAULT_SPECTRAL_RANGE,type SpectralRange} from './core/spectralRange';
import {spectralRangeCoverage} from './core/spectralRangeCoverage';
import {memo,useEffect,useRef,useState} from 'react';
import {currentZ,type ShiftControl} from './core/spectrum';
import {t} from './i18n';
import './sky-exposure.css';
import './lss.css';
import {LSS_FIELD_FILES,lssFieldRows,isLssFieldList,type LssFieldNumber} from './core/lssFields';
import {EMPTY_LSS_SURVEY,selectLssField,markLssListLoaded,openLssRecord,editLssDraft,confirmLssDialog,cancelLssRecord,lssResultsCsv,pendingWedgeRecords,markLssHandedToWedge,lssAtLimit,lssEventTotal,lssReuseTarget,restoredLssSurvey,LSS_LIMITS,LSS_Z_SAVED_BOX,type LssRecord,type LssSurveyState} from './core/lssSurvey';
import {evaluateLssRow,lssPolicy,type LssRowStatus,type LssSpectrumInputs} from './core/lssExposure';
import {fetchLssSpectrumInputs} from './io/lssSpectrumInputs';
import {LSS_RESULTS_TXT,lssResultsTxtBytes} from './core/lssResultsTxt';
import {lssDialogFields,lssPrefilledVelocity} from './core/lssRedshiftDialog';
import type {LssConfirm} from './core/lssSurvey';
import LssRegion from './LssRegion';
import {lssRegionListRows,type LssRegionListRow} from './core/lssRegion';
/** [W] The region list's .TXT name (the native writer's default LSS_Redshifts.TXT is the student's own results). */
const LSS_REGION_TXT_NAME='LSS_Galaxy_Data.TXT';
import {frozenObservatoryTime} from './core/fieldEngine';
import {opticalProfile} from './core/opticalTelescope';
import {parseHtl} from './core/hotList';
import {fetchBundledHotList} from './io/bundledHotList';
import {fetchBundledGlxCatalog} from './io/bundledGlxCatalog';
import {loadLssPack} from './io/lssPack';
import {LSS_FIELDS_LST,GLIMAGES_LST,parseLssFieldsList,parseGlimagesPositions,packWithPhotographs,type LssFieldEntry} from './core/lssLists';
import {resourceSha256} from './io/boundedResource';
import type {JournalState} from './core/exposureJournal';
import type {WedgeOwnRecord} from './core/wedgeWorkspace';
import type {LssInvestigation} from './io/lssInvestigation';
import type {LssLabSummary} from './core/lssLab';
import LssAcquisition from './LssAcquisition';
import LssMeasurement from './LssMeasurement';
type Telescope=0|1|2;
/** fieldJd: the observatory-clock JD frozen when this list was built (Front T: the variable stage's time); undefined when the
 * clock gave no finite JD, so rows whose field needs the time stay unavailable (variable-time-required). */
type Loaded=Readonly<{field:LssFieldNumber;telescope:Telescope;statuses:readonly LssRowStatus[];fieldJd:number|undefined;range:SpectralRange}>;
export type LssSnapshot=Omit<LssInvestigation,'wedgeOptions'>;
/** `replace` (Front L3): a row already plotted was reused, so the wedge replaces its own LSS points with these (the whole list). */
export type LssWedgeHandoff=Readonly<{records:readonly WedgeOwnRecord[];sha256:string;bytes:number;replace?:true}>;
function download(text:string|Uint8Array,name:string,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([typeof text==='string'?text:text.slice().buffer],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function statusText(s:LssRowStatus):string{
 if(s.kind==='unavailable')return t('lss.status.unavailable',{reasons:s.reasons.map(r=>t(`lss.reason.${r}`)).join('; ')});
 return s.kind==='available'?t('lss.status.available'):t('lss.status.neighbour',{id:s.selectedId});
}
/** E02 student route (#lss-survey). Web adaptations are listed in the scope note and docs/LSS-SURVEY.md. */
function LssSurvey({wedgeShown=false,spectralRange=DEFAULT_SPECTRAL_RANGE,onSpectralRange,timeDependentData=false,computeRedshiftVelocity=false,active,editMode=false,currentJd,initialTelescope,onPlotWedge,wedgeAck=null,onRecordsChange,onSnapshot,onSummary,restored=null}:{/** Front R4 (R4.3): the wedge has been shown in this page session (web stand-in for VIREO's "wedge visible" test 0x583921). */wedgeShown?:boolean;/** Front S2: the page's spectrometer range and its setter. */spectralRange?:SpectralRange;onSpectralRange?:(r:SpectralRange)=>void;/** Front R3: Compute Rdshft Vel. (compiled off) fills the dialog's velocity with c·z when it opens. */computeRedshiftVelocity?:boolean;/** Front L3: Time-Dependent Data (env+0x2e8c, compiled off). Off: Record Z on an already recorded object reuses its row
 * (0x57c918); on: every Record Z adds a row. */timeDependentData?:boolean;editMode?:boolean;onSummary?:(s:Omit<LssLabSummary,'saved'>)=>void;restored?:Readonly<{token:number;investigation:LssInvestigation|null}>|null;onSnapshot?:(s:LssSnapshot)=>void;active:boolean;currentJd:()=>number;initialTelescope:Telescope;onPlotWedge:(h:LssWedgeHandoff,silent?:boolean)=>number;wedgeAck?:Readonly<{token:number;accepted:boolean}>|null;onRecordsChange?:(records:readonly LssRecord[])=>void}){
 const [survey,setSurveyState]=useState<LssSurveyState>(EMPTY_LSS_SURVEY),current=useRef(survey),[dialogError,setDialogError]=useState('');
 /** Every survey transition runs here, outside React's updater: a rejected transition keeps the current state and returns false. */
 function update(fn:(s:LssSurveyState)=>LssSurveyState):boolean{try{const next=fn(current.current);current.current=next;setSurveyState(next);return true;}catch{return false;}}
 const handoff=useRef<{token:number;upTo:number}|null>(null);
 useEffect(()=>{const h=handoff.current;if(!wedgeAck||!h||wedgeAck.token!==h.token)return;handoff.current=null;if(wedgeAck.accepted)update(s=>markLssHandedToWedge(s,h.upTo));else setNotice(t('lss.wedge.refused'));},[wedgeAck]);
 const [telescope,setTelescope]=useState<Telescope>(initialTelescope);
 const [region,setRegion]=useState<readonly (LssRegionListRow&{jd:number})[]>(Object.freeze([]));// Front L2: catalogue rows of LSS Galaxy Data (not saved)
 const [loaded,setLoaded]=useState<Loaded|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [pointed,setPointed]=useState<number|null>(null),[exposure,setExposure]=useState<JournalState|null>(null),[description,setDescription]=useState(''),[descriptionError,setDescriptionError]=useState('');
 const [fields,setFields]=useState<readonly LssFieldEntry[]|null>(null),lists=useRef<{photographs:ReturnType<typeof parseGlimagesPositions>;spectra:LssSpectrumInputs}|null>(null);
 const glx=useRef<Uint8Array|null>(null),abort=useRef<AbortController|null>(null),dialog=useRef<HTMLDialogElement>(null);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  if(active){heading.current?.focus();return;}
  // Route inactivity or a project operation: drop the open dialog (adds nothing) and any in-flight load.
  if(abort.current){abort.current.abort();abort.current=null;setLoading(false);setNotice(t('lss.loadCancelled'));}
  update(cancelLssRecord);setDialogError('');dialog.current?.close();
 },[active]);
 useEffect(()=>{onRecordsChange?.(survey.records);},[survey.records]);
 const [observed,setObserved]=useState(false);
 useEffect(()=>{if(exposure?.exposure.counts.some(n=>n>0))setObserved(true);},[exposure]);
 useEffect(()=>{onSummary?.(Object.freeze({listLoaded:loaded!==null,observed,records:survey.records.length,galaxies:new Set(survey.records.map(r=>r.object)).size,fields:new Set(survey.records.map(r=>r.field)).size,plotted:survey.handedToWedge,described:description.trim()!==''}));},[loaded,observed,survey.records,survey.handedToWedge,description]);
 // Save reads this snapshot; the open dialog and the current (unrecorded) exposure are not part of it.
 useEffect(()=>{onSnapshot?.(Object.freeze({field:survey.field,telescope,records:survey.records,description}));},[survey.field,survey.records,telescope,description]);
 // Restore (v27): records were validated and replayed by the session reader; the list must be loaded again to point.
 const appliedRestore=useRef(0);
 useEffect(()=>{
  if(!restored||restored.token===appliedRestore.current)return;appliedRestore.current=restored.token;
  abort.current?.abort();abort.current=null;setLoading(false);dialog.current?.close();setDialogError('');setLoaded(null);setPointed(null);setExposure(null);setError('');
  const i=restored.investigation;
  update(()=>i?restoredLssSurvey(i.field,i.records):EMPTY_LSS_SURVEY);setTelescope(i?.telescope??initialTelescope);setDescription(i?.description??'');
  setNotice(i?t('lss.restored',{count:i.records.length}):'');
 },[restored?.token]);
 // LSSFields.LST (byte-exact, size and SHA-256 checked) supplies the original field names and centres.
 useEffect(()=>{if(!active||fields)return;const c=new AbortController();fetchBundledHotList(fetch,c.signal,LSS_FIELDS_LST).then(b=>setFields(parseLssFieldsList(b.bytes))).catch(e=>{if(!(e instanceof DOMException&&e.name==='AbortError'))setError(t('lss.fieldsError'));});return()=>c.abort();},[active,fields]);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(survey.draft&&!d.open)d.showModal();else if(!survey.draft&&d.open)d.close();},[survey.draft]);
 async function load(field:LssFieldNumber,scope:Telescope,at:SpectralRange=spectralRange){
  abort.current?.abort();
  // Front S2 round 2: the field is evaluated on the page's spectrometer range (VIREO's 3700–4700 Å by default, with its
  // start-time continuation; 4000–5000 Å is also witnessed); any other range is refused [W].
  const range=at;if(spectralRangeCoverage('lss',range)!=='covered'){setError(t('galaxyExposure.rangeNotWitnessed'));return;}
  const controller=new AbortController();abort.current=controller;
  setLoading(true);setError('');setNotice(t('lss.loading'));setPointed(null);setExposure(null);
  try{
   const identity=LSS_FIELD_FILES.find(f=>f.field===field)!;
   const bytes=await fetchBundledHotList(fetch,controller.signal,identity);
   const list=parseHtl(bytes.bytes);if(!isLssFieldList(field,list))throw new Error('list');
   glx.current??=await fetchBundledGlxCatalog(fetch,controller.signal);
   if(!lists.current){const [photographs,spectra]=await Promise.all([fetchBundledHotList(fetch,controller.signal,GLIMAGES_LST),fetchLssSpectrumInputs(fetch,controller.signal)]);lists.current={photographs:parseGlimagesPositions(photographs.bytes),spectra};}
   const pack=packWithPhotographs(await loadLssPack(field),lists.current.photographs),rows=lssFieldRows(field),statuses:LssRowStatus[]=[];
   const variableTime=frozenObservatoryTime(currentJd),fieldJd=variableTime?.jd;
   for(const row of rows){if(controller.signal.aborted)return;statuses.push(evaluateLssRow(pack,glx.current,row,scope,lists.current.spectra,variableTime,range));await new Promise(r=>setTimeout(r,0));}
   if(controller.signal.aborted)return;
   update(s=>markLssListLoaded(selectLssField(s,field),field));setLoaded(Object.freeze({field,telescope:scope,statuses:Object.freeze(statuses),fieldJd,range}));
   setNotice(t('lss.loaded',{name:identity.name,rows:rows.length,available:statuses.filter(s=>s.kind!=='unavailable').length,telescope:opticalProfile(scope).name}));
  }catch(e){if(controller.signal.aborted||(e instanceof DOMException&&e.name==='AbortError'))return;setError(t('lss.loadError'));setNotice('');}
  finally{if(abort.current===controller){abort.current=null;setLoading(false);}}
 }
 function cancelLoad(){abort.current?.abort();abort.current=null;setLoading(false);setNotice(t('lss.loadCancelled'));}
 const field=survey.field,rows=loaded?lssFieldRows(loaded.field):[],row=pointed!==null&&loaded?rows[pointed]:null,status=pointed!==null&&loaded?loaded.statuses[pointed]:null;
 const live=status&&status.kind!=='unavailable'?status:null;
 function record(control:ShiftControl){if(!row||!live||!loaded||!exposure)return;const z=currentZ(control),journal={seedAtReset:exposure.seedAtReset,events:exposure.events};setError('');setDialogError('');// Review 1 L2: a re-measurement that reuses a row adds none, and its old journal is replaced.
  const reuse=lssReuseTarget(current.current.records,live.selectedId,timeDependentData),kept=reuse===null?current.current.records:current.current.records.filter((_r,i)=>i!==reuse);
  if(reuse===null&&lssAtLimit(current.current)){setError(t('lss.limitReached',{limit:LSS_LIMITS.records}));return;}if(lssEventTotal(kept,{acquisitionPolicy:lssPolicy(loaded.field,row.index,loaded.telescope,loaded.range),journal})>LSS_LIMITS.events){setError(t('lss.eventLimit',{limit:LSS_LIMITS.events}));return;}if(!update(s=>openLssRecord(s,{field:loaded.field,row:row.index,telescope:loaded.telescope,object:live.selectedId,jd:currentJd(),...(loaded.fieldJd!==undefined?{fieldJd:loaded.fieldJd}:{}),ra:row.ra,dec:row.dec,z,control,journal,acquisitionPolicy:lssPolicy(loaded.field,row.index,loaded.telescope,loaded.range)},{timeDependent:timeDependentData})))setError(t('lss.recordError'));else if(computeRedshiftVelocity&&current.current.draft?.velocity==='')update(s=>editLssDraft(s,{velocity:lssPrefilledVelocity(z)}));}// FormActivate 0x57cab8: a row's own velocity first, then Compute Rdshft Vel.
 function confirm(){
  let r:LssConfirm;try{r=confirmLssDialog(current.current);}catch{setDialogError(t('lss.limitReached',{limit:LSS_LIMITS.records}));return;}
  // A native refusal keeps the dialog open (ModalResult 0); the message is the original box text (with its caption when it has one).
  if(!r.ok){setDialogError(r.caption?`${r.caption} ${r.message.replace(/\r\n/g,' ')}`:r.message);return;}
  current.current=r.state;setSurveyState(r.state);setDialogError('');
  // Front R4 (R4.3), RecordZ1Click 0x58383c after OK [D]: with the wedge visible, PlotData1Click 0x58100c redraws the whole
  // current list without showing the wedge (no Show/BringToFront); otherwise the 0x583b20 box. Web [W]: "visible" is "shown in
  // this page session", the whole own list replaces the wedge's own points without navigating, and the box text is a status line
  // (the web's results list is part of this page, so VIREO's "results window visible" exception is not modelled).
  if(wedgeShown){setNotice(t('lss.recordedWedge'));void handOver(r.state,true,true);}
  else setNotice(`${LSS_Z_SAVED_BOX.caption}: ${LSS_Z_SAVED_BOX.text.replace(/\s*\r\n\s*/g,' ')} ${t('lss.zSavedWeb')}`);
 }
 function velocity(text:string){if(!update(s=>editLssDraft(s,{velocity:text})))setDialogError(t('lss.dialog.velocityChars'));else setDialogError('');}
 function remarks(text:string){if(!update(s=>editLssDraft(s,{remarks:text})))setDialogError(t('lss.dialog.controlChars'));else setDialogError('');}
 async function handOver(s:LssSurveyState,all:boolean,silent:boolean){
  const pending=all?s.records:pendingWedgeRecords(s);if(!pending.length){if(!silent)setNotice(t('lss.wedge.nothing'));return;}
  const records=pending.map(r=>Object.freeze({object:r.object,jd:r.jd,ra:r.ra,dec:r.dec,zSingle:r.zSingle,remarks:r.remarks,...(r.nativeDialog?{velocitySingle:r.velocitySingle}:{})})),text=JSON.stringify(records),bytes=new TextEncoder().encode(text);
  const replace=all||s.wedgeStale,upTo=replace?s.records.length:s.handedToWedge+pending.length,sha256=await resourceSha256(bytes.slice().buffer);
  // Marked as handed only when the wedge reports that it added them (wedgeAck); otherwise they can be plotted again.
  handoff.current={token:onPlotWedge(Object.freeze({records:Object.freeze(records),sha256,bytes:bytes.byteLength,...(replace?{replace:true as const}:{})}),silent),upTo};
 }
 function plot(){void handOver(current.current,false,false);}
 const draft=survey.draft;
 return <main className="observatory-main lss-main"><section className="observatory-heading"><div className="eyebrow">{t('lss.eyebrow')}</div><h1 ref={heading} tabIndex={-1}>{t('lss.title')}</h1><p>{t('lss.intro')}</p></section>
  <section className="card" aria-labelledby="lss-field-heading"><h2 id="lss-field-heading">{t('lss.fieldTitle')}</h2>
   <div className="lss-controls"><label htmlFor="lss-field">{t('lss.field')}</label><select id="lss-field" value={field??''} disabled={loading||!fields} onChange={e=>{update(s=>selectLssField(s,Number(e.target.value)));}}><option value="" disabled>{t('lss.chooseField')}</option>{(fields??[]).map(f=><option key={f.field} value={f.field}>{t('lss.fieldOption',{label:f.label,ra:f.ra,dec:f.dec,rows:LSS_FIELD_FILES[f.field-1].records})}</option>)}</select>
    <label htmlFor="lss-telescope">{t('lss.telescope')}</label><select id="lss-telescope" value={telescope} disabled={loading} onChange={e=>setTelescope(Number(e.target.value) as Telescope)}>{([0,1,2] as const).map(i=><option key={i} value={i}>{opticalProfile(i).name}</option>)}</select>
    <button className="primary-button" disabled={!field||loading} onClick={()=>field&&void load(field,telescope)}>{t('lss.load')}</button>{loading&&<button className="secondary-button" onClick={cancelLoad}>{t('lss.cancelLoad')}</button>}</div>
   {onSpectralRange&&<SpectralRangeRow range={loaded?.range??spectralRange} disabled={loading} unsaved={!!exposure&&exposure.exposure.draws>0} testId="lss-spectral-range" note={t('lss.rangeNote')}
    onApply={r=>{if(spectralRangeCoverage('lss',r)!=='covered'){setError(t('galaxyExposure.rangeNotWitnessed'));return;}onSpectralRange(r);
     // Review 2 L3: OK starts the spectrometer again (0x5110b0); a loaded list is evaluated again on the new range.
     if(loaded)void load(loaded.field,loaded.telescope,r);}}/>}
   <p className="observatory-note">{t('lss.fieldHelp')}</p>
   {loaded&&<table className="lss-rows" data-testid="lss-rows" aria-busy={loading||undefined} data-stale={loading||undefined}><caption>{t('lss.rowsCaption',{label:fields?.[loaded.field-1]?.label??'',name:`LSS_Field0${loaded.field}.HTL`,telescope:opticalProfile(loaded.telescope).name})}{loaded.fieldJd!==undefined&&!loading&&<small data-testid="lss-field-jd"> {t('lss.fieldJd',{jd:loaded.fieldJd.toFixed(5)})}</small>}</caption><thead><tr><th scope="col">#</th><th scope="col">{t('lss.col.object')}</th><th scope="col">{t('lss.col.status')}</th><th scope="col">{t('lss.col.action')}</th></tr></thead>
    <tbody>{rows.map((r,i)=>{const s=loaded.statuses[i];return <tr key={i} data-testid={`lss-row-${i+1}`} aria-current={pointed===i?'true':undefined}><td>{i+1}</td><td>{r.id}</td><td>{statusText(s)}</td><td><button className="secondary-button" disabled={s.kind==='unavailable'||survey.draft!==null} onClick={()=>{setPointed(i);setExposure(null);setNotice(t('lss.pointed',{id:r.id}));}}>{t('lss.point')}</button></td></tr>;})}</tbody></table>}
  </section>
  {row&&live&&loaded&&<LssAcquisition key={`${lssPolicy(loaded.field,row.index,loaded.telescope,loaded.range)}@${loaded.fieldJd??'none'}`} active={active} result={live.result} row={row} policy={lssPolicy(loaded.field,row.index,loaded.telescope,loaded.range)} onCounts={setExposure}/>}
  {row&&live&&exposure&&exposure.exposure.phase!=='running'&&exposure.exposure.counts.some(n=>n>0)&&<LssMeasurement key={`measure:${exposure.policy}`} counts={exposure.exposure.counts} wavelengths={live.result.calibration!.wavelengths} onRecord={record} disabled={survey.draft!==null||lssAtLimit(survey)}/>}
  <dialog ref={dialog} className="lss-dialog" aria-labelledby="lss-dialog-title" onCancel={e=>{e.preventDefault();update(cancelLssRecord);setDialogError('');}}>{draft&&<form method="dialog" onSubmit={e=>{e.preventDefault();confirm();}}>
   <h2 id="lss-dialog-title">{t('lss.dialog.title')}</h2>
   <label htmlFor="lss-object">{t('lss.dialog.object')}</label><input id="lss-object" value={draft.object} readOnly aria-describedby="lss-dialog-note"/>
   {(()=>{const f=lssDialogFields(draft);return <>
    <label htmlFor="lss-jd">{t('lss.dialog.jdTime')}</label><input id="lss-jd" value={f.jd} readOnly/>
    <fieldset className="lss-dialog-angles"><legend>{t('lss.dialog.raGroup')}</legend>
     <input aria-label={t('lss.dialog.raH')} value={f.raH} readOnly data-testid="lss-dialog-ra-h"/><input aria-label={t('lss.dialog.raM')} value={f.raM} readOnly/><input aria-label={t('lss.dialog.raS')} value={f.raS} readOnly/></fieldset>
    <fieldset className="lss-dialog-angles"><legend>{t('lss.dialog.decGroup')}</legend>
     <input aria-label={t('lss.dialog.decD')} value={f.decD} readOnly data-testid="lss-dialog-dec-d"/><input aria-label={t('lss.dialog.decM')} value={f.decM} readOnly/><input aria-label={t('lss.dialog.decS')} value={f.decS} readOnly/></fieldset>
    <label htmlFor="lss-z">{t('lss.dialog.zLabel')}</label><input id="lss-z" value={f.z} readOnly data-testid="lss-dialog-z"/>
   </>;})()}
   <p id="lss-dialog-note" className="observatory-note">{t('lss.dialog.note')}</p>{draft.target!==null&&<p className="observatory-note" role="status" data-testid="lss-dialog-reused">{t('lss.dialog.reused')}</p>}
   <label htmlFor="lss-velocity">{t('lss.dialog.velocity')}</label><input id="lss-velocity" value={draft.velocity} maxLength={LSS_LIMITS.velocity} inputMode="decimal" autoFocus aria-invalid={dialogError?true:undefined} aria-describedby={dialogError?'lss-dialog-error':'lss-velocity-help'} onChange={e=>velocity(e.target.value)} data-testid="lss-dialog-velocity"/>
   <p id="lss-velocity-help" className="observatory-note">{t('lss.dialog.velocityHelp')}</p>
   <label htmlFor="lss-remarks">{t('lss.dialog.remarks')}</label><input id="lss-remarks" value={draft.remarks} maxLength={LSS_LIMITS.remarks} aria-describedby={dialogError?'lss-dialog-error':undefined} onChange={e=>remarks(e.target.value)}/>{dialogError&&<p id="lss-dialog-error" role="alert" className="lss-dialog-error">{dialogError}</p>}
   <div className="sky-actions"><button type="submit" className="primary-button" disabled={lssAtLimit(survey)}>{t('lss.dialog.ok')}</button><button type="button" className="secondary-button" onClick={()=>{update(cancelLssRecord);setDialogError('');}}>{t('lss.dialog.cancel')}</button></div>
  </form>}</dialog>
  <section className="card" aria-labelledby="lss-results-heading"><h2 id="lss-results-heading">{t('lss.results.title')}</h2><p data-testid="lss-record-count" role="status">{t('lss.results.count',{count:survey.records.length})}</p>
   {survey.records.length>0&&<table className="lss-rows" data-testid="lss-results"><thead><tr><th scope="col">{t('lss.col.object')}</th><th scope="col">{t('lss.dialog.jd')}</th><th scope="col">{t('lss.dialog.ra')}</th><th scope="col">{t('lss.dialog.dec')}</th><th scope="col">{t('lss.dialog.z')}</th><th scope="col">{t('lss.col.velocity')}</th><th scope="col">{t('lss.dialog.remarks')}</th></tr></thead><tbody>{survey.records.map(r=><tr key={r.id}><td>{r.object}</td><td>{r.jd.toFixed(5)}</td><td>{r.ra}</td><td>{r.dec}</td><td>{r.zSingle}</td><td>{r.velocitySingle}</td><td>{r.remarks}</td></tr>)}</tbody></table>}
   <div className="sky-actions"><button className="secondary-button" disabled={!survey.records.length} onClick={()=>download(lssResultsCsv(survey.records),'openvireo-lss-results.csv')}>{t('lss.results.csv')}</button><button className="secondary-button" disabled={!survey.records.length} data-testid="lss-results-txt" title={LSS_RESULTS_TXT.title} onClick={()=>{download(lssResultsTxtBytes(survey.records),LSS_RESULTS_TXT.defaultName,'text/plain;charset=windows-1252');setNotice(t('lss.results.txtSaved',{name:LSS_RESULTS_TXT.defaultName}));}}>{t('lss.results.txt')}</button><button className="primary-button" disabled={!pendingWedgeRecords(survey).length} onClick={plot}>{t('lss.results.plot')}</button></div>
   <label htmlFor="lss-description">{t('lss.results.description')}</label><textarea id="lss-description" maxLength={LSS_LIMITS.description} rows={4} value={description} aria-invalid={descriptionError?true:undefined} aria-describedby={descriptionError?'lss-description-error':undefined} onChange={e=>{const v=e.target.value;if(/[\u0000-\u0008\u000b-\u001f\u007f]/.test(v)){setDescriptionError(t('lss.descriptionInvalid'));return;}setDescriptionError('');setDescription(v);}}/>{descriptionError&&<p id="lss-description-error" role="alert">{descriptionError}</p>}<p className="observatory-note">{t('lss.results.descriptionHelp')}</p>
  </section>
  {editMode&&<section className="card" aria-labelledby="lss-region-heading" data-testid="lss-region-card"><h2 id="lss-region-heading">{t('lss.region.title')}</h2>
   <LssRegion active={active} disabled={loading} hasData={region.length>0} onResult={(r,append)=>{const jd=currentJd();setRegion(rows=>Object.freeze([...(append?rows:[]),...lssRegionListRows(r).map(g=>Object.freeze({...g,jd}))]));}}/>
   <p role="status" data-testid="lss-region-count">{t('lss.region.count',{count:region.length})}</p>
   {region.length>0&&<><table className="lss-rows" data-testid="lss-region-rows"><thead><tr><th scope="col">{t('lss.col.object')}</th><th scope="col">{t('lss.dialog.ra')}</th><th scope="col">{t('lss.dialog.dec')}</th><th scope="col">{t('lss.dialog.z')}</th><th scope="col">{t('lss.col.velocity')}</th></tr></thead>
    <tbody>{region.map((g,i)=><tr key={i}><td>{g.object}</td><td>{g.ra}</td><td>{g.dec}</td><td>{t('lss.region.zMasked')}</td><td>{t('lss.region.velocity')}</td></tr>)}</tbody></table>
    <div className="sky-actions"><button type="button" className="secondary-button" data-testid="lss-region-txt" onClick={()=>{download(lssResultsTxtBytes(region.map(g=>({object:g.object,jd:g.jd,ra:g.ra,dec:g.dec,velocitySingle:0,remarks:''}))),LSS_REGION_TXT_NAME,'text/plain;charset=windows-1252');setNotice(t('lss.results.txtSaved',{name:LSS_REGION_TXT_NAME}));}}>{t('lss.results.txt')}</button><button type="button" className="secondary-button" onClick={()=>setRegion(Object.freeze([]))}>{t('lss.region.clear')}</button></div>
    <p className="observatory-note">{t('lss.region.noWedge')}</p></>}
  </section>}
  <div className="observatory-feedback">{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</div>
  <section className="scope-note"><h2>{t('lss.limitsTitle')}</h2><ul>{(['observatory','telescope','fresh','raster','range','measure','dialog','jd','wedge','csv','packs'] as const).map(k=><li key={k}>{t(`lss.adaptation.${k}`)}</li>)}</ul></section>
 </main>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(LssSurvey);
