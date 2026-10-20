import {t,fixed,scientific} from './i18n';
import {recipeLabel,rowIssues,summaryMessage,velocitySource} from './i18n/hubble';
import { useMemo,useState,type Ref } from 'react';
import { analyzeHubble,EMPTY_HUBBLE,HUBBLE_RECIPES,HUBBLE_SOURCES,HUBBLE_TARGETS,MAX_HUBBLE_ROWS,hubbleAnalysisCsv,measurementHubbleRow,newManualRow,workbookExampleRows,type HubbleAnalysisResult,type HubbleInput,type HubbleWorkspace } from './core/hubbleAnalysis';
import type { Measurement } from './core/spectrum';
import './hubble.css';
const number=(value:number|undefined)=>value===undefined?'—':value===0?'0':scientific(value,7,true);
function Diagram({analysis,origin}:{analysis:HubbleAnalysisResult;origin:boolean}) {
  if(analysis.value===undefined)return null;
  const points=analysis.rows.map(r=>({x:r.distanceMpc!,y:r.velocityKmS!,label:r.object}));
  const xmax=Math.max(...points.map(p=>p.x)),endpoint=origin?analysis.value*xmax:0;
  const line=origin&&Number.isFinite(endpoint);
  const scale=Math.max(1,...points.map(p=>Math.abs(p.y)),line?Math.abs(endpoint):0);
  const ymin=Math.min(0,...points.map(p=>p.y/scale),line?endpoint/scale:0),ymax=Math.max(0,...points.map(p=>p.y/scale),line?endpoint/scale:0);
  const range=ymax-ymin||1,px=(v:number)=>90+v/xmax*620,py=(v:number)=>280-((v/scale-ymin)/range)*240;
  return <div className="hubble-plot-scroll" tabIndex={0} role="region" aria-label={t('hubble.diagramRegion')}><svg className="hubble-plot" viewBox="0 0 760 360" role="img" aria-labelledby="hubble-plot-title" aria-describedby="hubble-plot-desc">
    <title id="hubble-plot-title">{t('hubble.plotTitle')}</title><desc id="hubble-plot-desc">{t('hubble.plotDescription',{count:points.length,method:t(origin?'hubble.originDescription':'hubble.scatterDescription')})}</desc>
    {[0,.25,.5,.75,1].map(t=><g key={t}><line className="grid" x1={90+t*620} x2={90+t*620} y1="40" y2="280"/><text x={90+t*620} y="306" textAnchor="middle">{number(t*xmax)}</text><line className="grid" x1="90" x2="710" y1={280-t*240} y2={280-t*240}/><text x="79" y={285-t*240} textAnchor="end">{number((ymin+t*range)*scale)}</text></g>)}
    <line x1="90" x2="710" y1={py(0)} y2={py(0)} stroke="#58766f"/>
    {line&&<line data-testid="hubble-fit" x1="90" y1={py(0)} x2="710" y2={py(endpoint)} className="hubble-fit"/>}
    {points.map((p,i)=><circle key={i} cx={px(p.x)} cy={py(p.y)} r="5" className="hubble-point"><title>{p.label}: {number(p.x)} Mpc, {number(p.y)} km/s</title></circle>)}
    <text x="405" y="344" textAnchor="middle">{t('hubble.distanceAxis')}</text><text x="19" y="164" textAnchor="middle" transform="rotate(-90 19 164)">{t('hubble.velocityAxis')}</text>
  </svg>{origin&&!line&&<p>{t('hubble.outsidePlot')}</p>}</div>;
}
export default function HubbleAnalysis({detailsRef,workspace,onChange,measurements,onSaveSession,onRestoreSession,busy}:{detailsRef?:Ref<HTMLDetailsElement>;workspace:HubbleWorkspace;onChange:(workspace:HubbleWorkspace)=>void;measurements:readonly Measurement[];onSaveSession:()=>void;onRestoreSession:()=>void;busy:boolean}) {
  const [notice,setNotice]=useState('');
  const analysis=useMemo(()=>analyzeHubble(workspace,measurements),[workspace,measurements]);
  const recipe=workspace.recipeId?HUBBLE_RECIPES[workspace.recipeId]:null;
  const example=workspace.rows.some(r=>r.input.kind==='workbook-example');
  const nextId=(workspace.rows.at(-1)?.id??0)+1;
  const missing=measurements.filter(m=>m.origin?.kind!=='catalog-star-acquisition'&&!workspace.rows.some(r=>r.input.kind==='measurement'&&r.input.measurementId===m.id));
  const canAdd=!busy&&!example&&workspace.rows.length<MAX_HUBBLE_ROWS&&nextId<Number.MAX_SAFE_INTEGER;
  function update(id:number,input:HubbleInput) {onChange({...workspace,rows:workspace.rows.map(r=>r.id===id?{...r,input}:r)});setNotice('');}
  function addMeasurements(){
    if(!canAdd||!missing.length)return;
    if(workspace.rows.length+missing.length>MAX_HUBBLE_ROWS||nextId+missing.length>=Number.MAX_SAFE_INTEGER){setNotice(t('hubble.rowLimit',{limit:MAX_HUBBLE_ROWS}));return;}
    onChange({...workspace,rows:[...workspace.rows,...missing.map((m,i)=>measurementHubbleRow(nextId+i,m.id))]});setNotice(t('hubble.measurementsAdded'));
  }
  function exportCsv(){const url=URL.createObjectURL(new Blob([hubbleAnalysisCsv(workspace,measurements)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='openvireo-hubble-analysis.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <details ref={detailsRef} className="card hubble-card"><summary>{t('hubble.title')}</summary><div className="hubble-content">
    {measurements.some(m=>m.origin?.kind==='catalog-star-acquisition')&&<p role="note" className="hubble-limit">{t('hubble.stellarExcluded')}</p>}<p>{t('hubble.intro')}</p>
    <label className="field-label" htmlFor="hubble-recipe">{t('hubble.recipe')}</label><select id="hubble-recipe" value={workspace.recipeId} disabled={busy} onChange={e=>{onChange({...workspace,recipeId:e.target.value as HubbleWorkspace['recipeId']});setNotice(t('hubble.recipeChanged'));}}><option value="">{t('hubble.chooseRecipe')}</option>{Object.keys(HUBBLE_RECIPES).map(id=><option key={id} value={id}>{recipeLabel(id as keyof typeof HUBBLE_RECIPES)}</option>)}</select>
    {recipe&&<div className="hubble-recipe-note"><p><strong>{t('hubble.absoluteMagnitude',{value:fixed(recipe.absoluteV,1)})}</strong></p><p>{t(workspace.recipeId==='workbook'?'hubble.workbookHelp':'hubble.vireoHelp')}</p><p>D = 10^((V − M + 5) / 5) / 1,000,000 Mpc</p></div>}
    <details className="hubble-sources"><summary>{t('hubble.sources')}</summary><ul>{Object.entries(HUBBLE_SOURCES).map(([id,s])=><li key={id}><strong>{s.name}</strong><br/>SHA-256 <code>{s.sha256}</code></li>)}</ul><p>{t('hubble.sourceLimits')}</p></details>
    <div className="hubble-actions"><button className="secondary-button" disabled={!canAdd||!missing.length} onClick={addMeasurements}>{t('hubble.addMeasurements')}</button><button className="secondary-button" disabled={!canAdd} onClick={()=>{onChange({...workspace,rows:[...workspace.rows,newManualRow(nextId)]});setNotice(t('hubble.inputAdded'));}}>{t('hubble.addInput')}</button><button className="secondary-button" disabled={busy||!!workspace.rows.length} onClick={()=>{onChange({...workspace,rows:workbookExampleRows()});setNotice(t('hubble.examplesLoaded'));}}>{t('hubble.loadExample')}</button><button className="secondary-button" disabled={busy||!workspace.rows.length} onClick={()=>{onChange({...EMPTY_HUBBLE,recipeId:workspace.recipeId});setNotice(t('hubble.rowsCleared'));}}>{t('hubble.clear')}</button></div>
    <p className="hubble-limit">{t('hubble.claims')}</p>
    {example&&<p className="hubble-example" role="note">{t('hubble.exampleHelp')}</p>}
    {workspace.rows.map((row,index)=>{const input=row.input,r=analysis.rows[index];if(input.kind==='workbook-example')return null;
      const prefix=`hubble-row-${row.id}`,issueId=`${prefix}-issues`;
      return <details key={row.id} className="hubble-editor" open><summary>{t('hubble.rowSummary',{id:row.id,object:r.object||t('hubble.unnamed'),status:t(r.issues.length?'hubble.incomplete':'hubble.complete')})}</summary><fieldset disabled={busy} aria-describedby={issueId}><legend>{input.kind==='measurement'?t('hubble.savedMeasurement',{id:input.measurementId}):t('hubble.documentedInput')}</legend>
        {input.kind==='measurement'?<p>{r.object} · {r.file}{r.acquisitionId&&<small>{r.acquiredTargetId} · {r.acquisitionKind} · {r.acquisitionId}</small>}<br/>{t('hubble.measuredVelocity',{z:r.z,velocity:number(r.velocityKmS)})}<br/>SHA-256 <code>{r.sha256}</code></p>:<><label htmlFor={`${prefix}-object`}>{t('hubble.objectLabel',{id:row.id})}</label><input id={`${prefix}-object`} maxLength={80} value={input.object} onChange={e=>update(row.id,{...input,object:e.target.value,targetId:''})}/><label htmlFor={`${prefix}-velocity`}>{t('hubble.velocityLabel',{id:row.id})}</label><input id={`${prefix}-velocity`} inputMode="decimal" maxLength={80} value={input.velocityText} aria-invalid={input.velocityText!==''&&r.velocityKmS===undefined} onChange={e=>update(row.id,{...input,velocityText:e.target.value,velocitySource:''})}/><label htmlFor={`${prefix}-vsource`}>{t('hubble.velocitySource',{id:row.id})}</label><input id={`${prefix}-vsource`} maxLength={240} value={input.velocitySource} onChange={e=>update(row.id,{...input,velocitySource:e.target.value})}/></>}
        <label htmlFor={`${prefix}-magnitude`}>{t('hubble.apparentMagnitude',{id:row.id})}</label><input id={`${prefix}-magnitude`} inputMode="decimal" maxLength={80} value={input.apparentVText} aria-invalid={input.apparentVText!==''&&r.apparentV===undefined} onChange={e=>update(row.id,{...input,apparentVText:e.target.value,magnitudeSource:''})}/>
        <label htmlFor={`${prefix}-msource`}>{t('hubble.magnitudeSource',{id:row.id})}</label><input id={`${prefix}-msource`} maxLength={240} placeholder={t('hubble.sourcePlaceholder')} value={input.magnitudeSource} onChange={e=>update(row.id,{...input,magnitudeSource:e.target.value})}/><small>{t('hubble.changedMagnitude')}</small>
        {workspace.recipeId==='vireo'&&<><label htmlFor={`${prefix}-target`}>{t('hubble.targetIdentity',{id:row.id})}</label><select id={`${prefix}-target`} value={input.targetId} onChange={e=>update(row.id,{...input,targetId:e.target.value})}><option value="">{t('hubble.identify')}</option>{HUBBLE_TARGETS.map(t=><option key={t.id} value={t.id} disabled={r.acquisitionKind==='catalog-galaxy-acquisition'&&t.id!==r.acquiredTargetId}>{t.label} · {t.id}</option>)}</select><small>{t('hubble.identificationHelp')}</small></>}
        <p id={issueId} className="hubble-row-status">{r.issues.length?rowIssues(r):t('hubble.completeHelp')}</p><button className="secondary-button" onClick={()=>{onChange({...workspace,rows:workspace.rows.filter(r=>r.id!==row.id)});setNotice(t('hubble.removed'));}}>{t('hubble.removeRow',{id:row.id})}</button>
      </fieldset></details>;
    })}
    <div className="hubble-result" role="status" aria-live="polite"><h3>{t(workspace.recipeId==='vireo'?'hubble.originFit':workspace.recipeId==='workbook'?'hubble.mean':'hubble.result')}</h3>{analysis.value!==undefined&&<p className="hubble-value" data-testid="hubble-value">{number(analysis.value)} <span>km/s/Mpc</span></p>}<p>{summaryMessage(analysis)}</p></div>
    {analysis.value!==undefined&&<p className="hubble-scroll-help">{t('hubble.scrollHelp')}</p>}
    <Diagram analysis={analysis} origin={workspace.recipeId==='vireo'}/>
    {!!analysis.rows.length&&<div className="table-scroll hubble-table" role="region" tabIndex={0} aria-label={t('hubble.tableRegion')}><table><caption>{t('hubble.tableCaption',{title:t(example?'hubble.exampleCaption':'hubble.workingCaption'),count:analysis.rows.length})}</caption><thead><tr><th scope="col">{t('hubble.objectColumn')}</th><th scope="col">{t('hubble.velocityAxis')}</th><th scope="col">{t('hubble.magnitudeColumn')}</th><th scope="col">{t('hubble.distanceAxis')}</th><th scope="col">{t('hubble.ratioColumn')}</th><th scope="col">{t('hubble.statusColumn')}</th></tr></thead><tbody>{analysis.rows.map(r=><tr key={r.id}><th scope="row">{r.object||t('hubble.rowName',{id:r.id})}<small>{t(r.kind==='workbook-example'?'hubble.originalExample':r.kind==='measurement'?'hubble.measurementKind':'hubble.manualKind')}<br/>{velocitySource(r)}<br/>{r.magnitudeSource}</small></th><td>{number(r.velocityKmS)}</td><td>{r.apparentVText||'—'}</td><td>{number(r.distanceMpc)}</td><td>{number(r.individualH)}</td><td>{rowIssues(r)||t('hubble.complete')}</td></tr>)}</tbody></table></div>}
    <div className="hubble-actions"><button className="secondary-button" disabled={busy||!workspace.rows.length} onClick={exportCsv}>{t('hubble.exportCsv')}</button><button className="secondary-button" disabled={busy} onClick={onSaveSession}>{t('hubble.saveSession')}</button><button className="secondary-button" disabled={busy} onClick={onRestoreSession}>{t('hubble.restore')}</button></div><p className="hubble-limit">{t('hubble.exportHelp')}</p><p className="hubble-notice" role="status">{notice}</p>
  </div></details>;
}
