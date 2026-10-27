import {useEffect,useRef,useState} from 'react';
import {hubbleVelocity} from './core/hubbleVelocity';
import {t} from './i18n';
import './sky-exposure.css';
import './lss.css';
import {LSS_FIELD_FILES,lssFieldRows,isLssFieldList,type LssFieldNumber} from './core/lssFields';
import {EMPTY_LSS_SURVEY,selectLssField,markLssListLoaded,openLssRecord,editLssDraft,confirmLssRecord,cancelLssRecord,lssResultsCsv,pendingWedgeRecords,markLssHandedToWedge,lssAtLimit,LSS_LIMITS,type LssRecord,type LssSurveyState} from './core/lssSurvey';
import {evaluateLssRow,lssPolicy,type LssRowStatus} from './core/lssExposure';
import {opticalProfile} from './core/opticalTelescope';
import {parseHtl} from './core/hotList';
import {fetchBundledHotList} from './io/bundledHotList';
import {fetchBundledGlxCatalog} from './io/bundledGlxCatalog';
import {loadLssPack} from './io/lssPack';
import {LSS_FIELDS_LST,GLIMAGES_LST,GLXYSP_LST,parseLssFieldsList,parseGlimagesPositions,parseGlxyspNames,packWithPhotographs,type LssFieldEntry} from './core/lssLists';
import {resourceSha256} from './io/boundedResource';
import type {JournalState} from './core/exposureJournal';
import type {WedgeOwnRecord} from './core/wedgeWorkspace';
import LssAcquisition from './LssAcquisition';
import LssMeasurement from './LssMeasurement';
type Telescope=0|1|2;
type Loaded=Readonly<{field:LssFieldNumber;telescope:Telescope;statuses:readonly LssRowStatus[]}>;
export type LssWedgeHandoff=Readonly<{records:readonly WedgeOwnRecord[];sha256:string;bytes:number}>;
function download(text:string,name:string){const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function statusText(s:LssRowStatus):string{
 if(s.kind==='unavailable')return t('lss.status.unavailable',{reasons:s.reasons.map(r=>t(`lss.reason.${r}`)).join('; ')});
 return s.kind==='available'?t('lss.status.available'):t('lss.status.neighbour',{id:s.selectedId});
}
/** E02 student route (#lss-survey). Web adaptations are listed in the scope note and docs/LSS-SURVEY.md. */
export default function LssSurvey({active,currentJd,initialTelescope,onPlotWedge,wedgeAck=null,onRecordsChange}:{active:boolean;currentJd:()=>number;initialTelescope:Telescope;onPlotWedge:(h:LssWedgeHandoff)=>number;wedgeAck?:Readonly<{token:number;accepted:boolean}>|null;onRecordsChange?:(records:readonly LssRecord[])=>void}){
 const [survey,setSurveyState]=useState<LssSurveyState>(EMPTY_LSS_SURVEY),current=useRef(survey),[dialogError,setDialogError]=useState('');
 /** Every survey transition runs here, outside React's updater: a rejected transition keeps the current state and returns false. */
 function update(fn:(s:LssSurveyState)=>LssSurveyState):boolean{try{const next=fn(current.current);current.current=next;setSurveyState(next);return true;}catch{return false;}}
 const handoff=useRef<{token:number;upTo:number}|null>(null);
 useEffect(()=>{const h=handoff.current;if(!wedgeAck||!h||wedgeAck.token!==h.token)return;handoff.current=null;if(wedgeAck.accepted)update(s=>markLssHandedToWedge(s,h.upTo));else setNotice(t('lss.wedge.refused'));},[wedgeAck]);
 const [telescope,setTelescope]=useState<Telescope>(initialTelescope);
 const [loaded,setLoaded]=useState<Loaded|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [pointed,setPointed]=useState<number|null>(null),[exposure,setExposure]=useState<JournalState|null>(null),[description,setDescription]=useState('');
 const [fields,setFields]=useState<readonly LssFieldEntry[]|null>(null),lists=useRef<{photographs:ReturnType<typeof parseGlimagesPositions>;spectra:ReadonlySet<string>}|null>(null);
 const glx=useRef<Uint8Array|null>(null),abort=useRef<AbortController|null>(null),dialog=useRef<HTMLDialogElement>(null);
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  if(active){heading.current?.focus();return;}
  // Route inactivity or a project operation: drop the open dialog (adds nothing) and any in-flight load.
  if(abort.current){abort.current.abort();abort.current=null;setLoading(false);setNotice(t('lss.loadCancelled'));}
  update(cancelLssRecord);setDialogError('');dialog.current?.close();
 },[active]);
 useEffect(()=>{onRecordsChange?.(survey.records);},[survey.records]);
 // LSSFields.LST (byte-exact, size and SHA-256 checked) supplies the original field names and centres.
 useEffect(()=>{if(!active||fields)return;const c=new AbortController();fetchBundledHotList(fetch,c.signal,LSS_FIELDS_LST).then(b=>setFields(parseLssFieldsList(b.bytes))).catch(e=>{if(!(e instanceof DOMException&&e.name==='AbortError'))setError(t('lss.fieldsError'));});return()=>c.abort();},[active,fields]);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(survey.draft&&!d.open)d.showModal();else if(!survey.draft&&d.open)d.close();},[survey.draft]);
 async function load(field:LssFieldNumber,scope:Telescope){
  abort.current?.abort();const controller=new AbortController();abort.current=controller;
  setLoading(true);setError('');setNotice(t('lss.loading'));setPointed(null);setExposure(null);
  try{
   const identity=LSS_FIELD_FILES.find(f=>f.field===field)!;
   const bytes=await fetchBundledHotList(fetch,controller.signal,identity);
   const list=parseHtl(bytes.bytes);if(!isLssFieldList(field,list))throw new Error('list');
   glx.current??=await fetchBundledGlxCatalog(fetch,controller.signal);
   if(!lists.current){const [photographs,spectra]=await Promise.all([fetchBundledHotList(fetch,controller.signal,GLIMAGES_LST),fetchBundledHotList(fetch,controller.signal,GLXYSP_LST)]);lists.current={photographs:parseGlimagesPositions(photographs.bytes),spectra:parseGlxyspNames(spectra.bytes)};}
   const pack=packWithPhotographs(await loadLssPack(field),lists.current.photographs),rows=lssFieldRows(field),statuses:LssRowStatus[]=[];
   for(const row of rows){if(controller.signal.aborted)return;statuses.push(evaluateLssRow(pack,glx.current,row,scope,lists.current.spectra));await new Promise(r=>setTimeout(r,0));}
   if(controller.signal.aborted)return;
   update(s=>markLssListLoaded(selectLssField(s,field),field));setLoaded(Object.freeze({field,telescope:scope,statuses:Object.freeze(statuses)}));
   setNotice(t('lss.loaded',{name:identity.name,rows:rows.length,available:statuses.filter(s=>s.kind!=='unavailable').length,telescope:opticalProfile(scope).name}));
  }catch(e){if(controller.signal.aborted||(e instanceof DOMException&&e.name==='AbortError'))return;setError(t('lss.loadError'));setNotice('');}
  finally{if(abort.current===controller){abort.current=null;setLoading(false);}}
 }
 function cancelLoad(){abort.current?.abort();abort.current=null;setLoading(false);setNotice(t('lss.loadCancelled'));}
 const field=survey.field,rows=loaded?lssFieldRows(loaded.field):[],row=pointed!==null&&loaded?rows[pointed]:null,status=pointed!==null&&loaded?loaded.statuses[pointed]:null;
 const live=status&&status.kind!=='unavailable'?status:null;
 function record(z:number){if(!row||!live||!loaded)return;setError('');setDialogError('');if(lssAtLimit(current.current)){setError(t('lss.limitReached',{limit:LSS_LIMITS.records}));return;}if(!update(s=>openLssRecord(s,{field:loaded.field,row:row.index,telescope:loaded.telescope,object:live.selectedId,jd:currentJd(),ra:row.ra,dec:row.dec,z,acquisitionPolicy:lssPolicy(loaded.field,row.index,loaded.telescope)})))setError(t('lss.recordError'));}
 function confirm(){if(update(confirmLssRecord)){setDialogError('');setNotice(t('lss.recorded'));}else setDialogError(t('lss.limitReached',{limit:LSS_LIMITS.records}));}
 function remarks(text:string){if(!update(s=>editLssDraft(s,{remarks:text})))setDialogError(t('lss.dialog.controlChars'));else setDialogError('');}
 async function plot(){
  const pending=pendingWedgeRecords(survey);if(!pending.length){setNotice(t('lss.wedge.nothing'));return;}
  const records=pending.map(r=>Object.freeze({object:r.object,jd:r.jd,ra:r.ra,dec:r.dec,zSingle:r.zSingle,remarks:r.remarks})),text=JSON.stringify(records),bytes=new TextEncoder().encode(text);
  const upTo=current.current.handedToWedge+pending.length,sha256=await resourceSha256(bytes.slice().buffer);
  // Marked as handed only when the wedge reports that it added them (wedgeAck); otherwise they can be plotted again.
  handoff.current={token:onPlotWedge(Object.freeze({records:Object.freeze(records),sha256,bytes:bytes.byteLength})),upTo};
 }
 const draft=survey.draft;
 return <main className="observatory-main lss-main"><section className="observatory-heading"><div className="eyebrow">{t('lss.eyebrow')}</div><h1 ref={heading} tabIndex={-1}>{t('lss.title')}</h1><p>{t('lss.intro')}</p></section>
  <section className="card" aria-labelledby="lss-field-heading"><h2 id="lss-field-heading">{t('lss.fieldTitle')}</h2>
   <div className="lss-controls"><label htmlFor="lss-field">{t('lss.field')}</label><select id="lss-field" value={field??''} disabled={loading||!fields} onChange={e=>{update(s=>selectLssField(s,Number(e.target.value)));}}><option value="" disabled>{t('lss.chooseField')}</option>{(fields??[]).map(f=><option key={f.field} value={f.field}>{t('lss.fieldOption',{label:f.label,ra:f.ra,dec:f.dec,rows:LSS_FIELD_FILES[f.field-1].records})}</option>)}</select>
    <label htmlFor="lss-telescope">{t('lss.telescope')}</label><select id="lss-telescope" value={telescope} disabled={loading} onChange={e=>setTelescope(Number(e.target.value) as Telescope)}>{([0,1,2] as const).map(i=><option key={i} value={i}>{opticalProfile(i).name}</option>)}</select>
    <button className="primary-button" disabled={!field||loading} onClick={()=>field&&void load(field,telescope)}>{t('lss.load')}</button>{loading&&<button className="secondary-button" onClick={cancelLoad}>{t('lss.cancelLoad')}</button>}</div>
   <p className="observatory-note">{t('lss.fieldHelp')}</p>
   {loaded&&<table className="lss-rows" data-testid="lss-rows"><caption>{t('lss.rowsCaption',{label:fields?.[loaded.field-1]?.label??'',name:`LSS_Field0${loaded.field}.HTL`,telescope:opticalProfile(loaded.telescope).name})}</caption><thead><tr><th scope="col">#</th><th scope="col">{t('lss.col.object')}</th><th scope="col">{t('lss.col.status')}</th><th scope="col">{t('lss.col.action')}</th></tr></thead>
    <tbody>{rows.map((r,i)=>{const s=loaded.statuses[i];return <tr key={i} data-testid={`lss-row-${i+1}`} aria-current={pointed===i?'true':undefined}><td>{i+1}</td><td>{r.id}</td><td>{statusText(s)}</td><td><button className="secondary-button" disabled={s.kind==='unavailable'||survey.draft!==null} onClick={()=>{setPointed(i);setExposure(null);setNotice(t('lss.pointed',{id:r.id}));}}>{t('lss.point')}</button></td></tr>;})}</tbody></table>}
  </section>
  {row&&live&&loaded&&<LssAcquisition key={lssPolicy(loaded.field,row.index,loaded.telescope)} active={active} result={live.result} row={row} policy={lssPolicy(loaded.field,row.index,loaded.telescope)} onCounts={setExposure}/>}
  {row&&live&&exposure&&exposure.exposure.phase!=='running'&&exposure.exposure.counts.some(n=>n>0)&&<LssMeasurement key={`measure:${exposure.policy}`} counts={exposure.exposure.counts} wavelengths={live.result.calibration!.wavelengths} onRecord={record} disabled={survey.draft!==null||lssAtLimit(survey)}/>}
  <dialog ref={dialog} className="lss-dialog" aria-labelledby="lss-dialog-title" onCancel={e=>{e.preventDefault();update(cancelLssRecord);setDialogError('');}}>{draft&&<form method="dialog" onSubmit={e=>{e.preventDefault();confirm();}}>
   <h2 id="lss-dialog-title">{t('lss.dialog.title')}</h2>
   <label htmlFor="lss-object">{t('lss.dialog.object')}</label><input id="lss-object" value={draft.object} readOnly aria-describedby="lss-dialog-note"/>
   <dl><dt>{t('lss.dialog.jd')}</dt><dd>{draft.jd.toFixed(5)}</dd><dt>{t('lss.dialog.ra')}</dt><dd>{draft.ra}</dd><dt>{t('lss.dialog.dec')}</dt><dd>{draft.dec}</dd><dt>{t('lss.dialog.z')}</dt><dd data-testid="lss-dialog-z">{Math.fround(draft.z)}</dd><dt>{t('lss.col.velocity')}</dt><dd>{hubbleVelocity(draft.z).storedKmS}</dd></dl><p id="lss-dialog-note" className="observatory-note">{t('lss.dialog.note')}</p>
   <label htmlFor="lss-remarks">{t('lss.dialog.remarks')}</label><input id="lss-remarks" value={draft.remarks} maxLength={LSS_LIMITS.remarks} autoFocus aria-invalid={dialogError?true:undefined} aria-describedby={dialogError?'lss-dialog-error':undefined} onChange={e=>remarks(e.target.value)}/>{dialogError&&<p id="lss-dialog-error" role="alert">{dialogError}</p>}
   <div className="sky-actions"><button type="submit" className="primary-button" disabled={lssAtLimit(survey)}>{t('lss.dialog.ok')}</button><button type="button" className="secondary-button" onClick={()=>{update(cancelLssRecord);setDialogError('');}}>{t('lss.dialog.cancel')}</button></div>
  </form>}</dialog>
  <section className="card" aria-labelledby="lss-results-heading"><h2 id="lss-results-heading">{t('lss.results.title')}</h2><p data-testid="lss-record-count" role="status">{t('lss.results.count',{count:survey.records.length})}</p><p className="observatory-note" data-testid="lss-not-saved">{t('lss.results.notSaved')}</p>
   {survey.records.length>0&&<table className="lss-rows" data-testid="lss-results"><thead><tr><th scope="col">{t('lss.col.object')}</th><th scope="col">{t('lss.dialog.jd')}</th><th scope="col">{t('lss.dialog.ra')}</th><th scope="col">{t('lss.dialog.dec')}</th><th scope="col">{t('lss.dialog.z')}</th><th scope="col">{t('lss.col.velocity')}</th><th scope="col">{t('lss.dialog.remarks')}</th></tr></thead><tbody>{survey.records.map(r=><tr key={r.id}><td>{r.object}</td><td>{r.jd.toFixed(5)}</td><td>{r.ra}</td><td>{r.dec}</td><td>{r.zSingle}</td><td>{r.velocitySingle}</td><td>{r.remarks}</td></tr>)}</tbody></table>}
   <div className="sky-actions"><button className="secondary-button" disabled={!survey.records.length} onClick={()=>download(lssResultsCsv(survey.records),'openvireo-lss-results.csv')}>{t('lss.results.csv')}</button><button className="primary-button" disabled={!pendingWedgeRecords(survey).length} onClick={()=>void plot()}>{t('lss.results.plot')}</button></div>
   <label htmlFor="lss-description">{t('lss.results.description')}</label><textarea id="lss-description" maxLength={4000} rows={4} value={description} onChange={e=>setDescription(e.target.value)}/><p className="observatory-note">{t('lss.results.descriptionHelp')}</p>
  </section>
  <div className="observatory-feedback">{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</div>
  <section className="scope-note"><h2>{t('lss.limitsTitle')}</h2><ul>{(['observatory','telescope','fresh','raster','range','measure','dialog','jd','wedge','csv','notSaved','packs'] as const).map(k=><li key={k}>{t(`lss.adaptation.${k}`)}</li>)}</ul></section>
 </main>;
}
