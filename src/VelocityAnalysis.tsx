import {useMemo} from 'react';
import {velocityDraftCheck,type VelocityDraft} from './core/editingWorkspace';
import { hubbleVelocity,hubbleVelocityCsv } from './core/hubbleVelocity';
import type { Measurement } from './core/spectrum';
import { formatFloat32 } from './view/spectrum';
import { t, scientific } from './i18n';

/** Derived analysis of actual saved/imported measurement records only.
 * Draft answers are learner attempts, separate from confirmed observations. */
export default function VelocityAnalysis({rows:allRows,draft,onChange}:{rows:readonly Measurement[];draft:VelocityDraft;onChange:(draft:VelocityDraft)=>void}) {
  const rows=useMemo(()=>allRows.filter(r=>r.origin?.kind!=='catalog-star-acquisition'),[allRows]);
  const derived=useMemo(()=>rows.map(row=>{try{return {row,velocity:hubbleVelocity(row.zFloat32)};}catch{return {row,velocity:null};}}),[rows]);
  const current=derived.find(item=>item.row.id===draft.measurementId);
  const result=velocityDraftCheck(draft,rows),feedback=result.kind==='result'?t(result.accepted?'velocity.accepted':'velocity.rejected',{error:scientific(result.relativeError*100,6)}):'',error=result.kind==='error'?t(result.code==='zero-reference'?'velocity.zero':result.code==='precision-boundary'?'velocity.boundary':'velocity.invalid'):'';
  function exportCsv(){
    const url=URL.createObjectURL(new Blob([hubbleVelocityCsv(rows)],{type:'text/csv;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='openvireo-velocities.csv';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <details className="card velocity-card"><summary>{t('velocity.title')}</summary><div className="velocity-content">
    <p>{t('velocity.help')}</p><p className="velocity-formula">v = c z · c = 299792.458 km/s</p>
    {rows.length ? <><div className="table-scroll"><table><caption>{t('velocity.caption')}</caption><thead><tr><th>{t('spectrum.number')}</th><th>{t('spectrum.object')}</th><th>{t('velocity.recordedZ')}</th><th>{t('velocity.column')}</th></tr></thead><tbody>{derived.map(({row,velocity})=><tr key={row.id}><td>{row.id}</td><td>{row.object}</td><td>{formatFloat32(row.zFloat32)}</td><td>{velocity?formatFloat32(velocity.storedKmS):t('velocity.unsupported')}</td></tr>)}</tbody></table></div>
    <button className="secondary-button" onClick={exportCsv}>{t('velocity.export')}</button>
    <div className="velocity-check"><label className="field-label" htmlFor="velocity-record">{t('velocity.measurement')}</label><select id="velocity-record" value={current?String(current.row.id):''} onChange={e=>onChange({measurementId:Number(e.target.value),answerText:'',checked:false})}>{rows.map(row=><option key={row.id} value={row.id}>{row.id} · {row.object}</option>)}</select>
    <label className="field-label" htmlFor="velocity-answer">{t('velocity.answer')}</label><input id="velocity-answer" type="text" inputMode="decimal" maxLength={80} value={draft.answerText} onChange={e=>onChange({...draft,answerText:e.target.value,checked:false})}/><button className="secondary-button" onClick={()=>onChange({...draft,checked:true})}>{t('velocity.check')}</button>
    <p className="velocity-feedback" role="status">{feedback}</p>{error&&<p role="alert" className="error">{error}</p>}</div></>:<p>{t(allRows.some(r=>r.origin?.kind==='catalog-star-acquisition')?'continuity.velocityExcluded':'velocity.empty')}</p>}
    <p className="velocity-boundary">{t('velocity.scope')}</p>
  </div></details>;
}
