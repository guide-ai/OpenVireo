import {useEffect,useMemo,useRef,useState,type Ref} from 'react';
import {ownObservationResults,ownResultsCsv,ownResultsText,type OwnResultsArchiveEntry} from './core/ownObservationResults';
import type {Measurement} from './core/spectrum';
import {formatFloat32} from './view/spectrum';
import {t} from './i18n';
import './own-results.css';
/** Temporary print scope owned by this card; print CSS applies only while it is set. */
export const OWN_RESULTS_PRINT_SCOPE='own-results';
/** Phase 1 item 1.12: read-only Observational Results for the student's confirmed log rows.
 * Downloads and printing are browser handoffs; nothing here writes analysis state. */
export default function OwnObservationResults({detailsRef,rows,archive,busy,active,onDownload}:{detailsRef?:Ref<HTMLDetailsElement>;rows:readonly Measurement[];archive:readonly OwnResultsArchiveEntry[];busy:boolean;active:boolean;onDownload:(text:BlobPart,name:string,type:string)=>void}) {
  const view=useMemo(()=>ownObservationResults(rows,archive),[rows,archive]);
  const [notice,setNotice]=useState(''),[error,setError]=useState('');
  const releasePrint=useRef<(()=>void)|null>(null);
  useEffect(()=>{if(!active)releasePrint.current?.();},[active]);
  useEffect(()=>()=>releasePrint.current?.(),[]);
  const disabled=busy||!view.length;
  function save(kind:'text'|'csv'){
    releasePrint.current?.();setNotice('');setError('');
    const name=kind==='text'?'openvireo-own-results.txt':'openvireo-own-results.csv';
    try{onDownload(kind==='text'?ownResultsText(view):ownResultsCsv(view),name,kind==='text'?'text/plain;charset=utf-8':'text/csv;charset=utf-8');setNotice(t('ownResults.downloaded',{file:name}));}
    catch{setError(t('ownResults.downloadError'));}
  }
  function print(){
    releasePrint.current?.();setNotice('');setError('');
    const root=document.documentElement;
    if(root.hasAttribute('data-print-scope')){setError(t('ownResults.printBusy'));return;}
    root.setAttribute('data-print-scope',OWN_RESULTS_PRINT_SCOPE);
    // Released on afterprint, the next separate pointer/key interaction, an exception, a hidden route or unmount; never another owner's value.
    const end=()=>{window.removeEventListener('afterprint',end);document.removeEventListener('pointerdown',end,true);document.removeEventListener('keydown',end,true);if(root.getAttribute('data-print-scope')===OWN_RESULTS_PRINT_SCOPE)root.removeAttribute('data-print-scope');if(releasePrint.current===end)releasePrint.current=null;};
    releasePrint.current=end;window.addEventListener('afterprint',end);document.addEventListener('pointerdown',end,true);document.addEventListener('keydown',end,true);
    try{window.print();setNotice(t('ownResults.printed'));}catch{end();setError(t('ownResults.printError'));}
  }
  return <details ref={detailsRef} className="card own-results-card"><summary>{t('ownResults.title')}</summary><div className="own-results-content">
    <p className="own-results-scope">{t('ownResults.scope')}</p>
    {view.length?<div className="own-results-scroll" role="region" tabIndex={0} aria-label={t('ownResults.tableRegion')}><table><caption>{t('ownResults.caption',{count:view.length})}</caption>
      <thead><tr><th scope="col">{t('spectrum.number')}</th><th scope="col">{t('spectrum.object')}</th><th scope="col">{t('ownResults.sourceColumn')}</th><th scope="col">{t('spectrum.recordedZ')}</th><th scope="col">{t('ownResults.velocityColumn')}</th><th scope="col">{t('ownResults.statusColumn')}</th></tr></thead>
      <tbody>{view.map(r=><tr key={r.id} data-testid={`own-row-${r.id}`}><td>{r.id}</td><td>{r.object}</td>
        <td>{r.file}<small>{r.source==='catalog-galaxy-acquisition'?t('ownResults.kind.galaxy',{id:r.acquiredTargetId}):r.source==='catalog-star-acquisition'?t('ownResults.kind.star'):t('ownResults.kind.imported')}</small><small><code>{t('ownResults.sha',{sha256:r.sha256})}</code></small><small data-testid={`own-binding-${r.id}`}>{r.binding==='bound'?t('ownResults.binding.bound',{id:r.acquisitionId}):r.binding==='missing'?t('ownResults.binding.missing'):t('ownResults.binding.notApplicable')}</small></td>
        <td><span data-testid={`own-z-${r.id}`}>{formatFloat32(r.zFloat32)}</span><small>{t('ownResults.bits',{hex:r.zFloat32Hex})}</small></td>
        <td><span data-testid={`own-v-${r.id}`}>{r.velocityKmS===undefined?'—':formatFloat32(r.velocityKmS)}</span>{r.velocityHex!==undefined&&<small>{t('ownResults.bits',{hex:r.velocityHex})}</small>}</td>
        <td data-testid={`own-status-${r.id}`}>{t(`ownResults.status.${r.velocityStatus}`)}</td></tr>)}</tbody></table></div>:<p>{t('ownResults.empty')}</p>}
    <div className="own-results-actions"><button className="secondary-button" disabled={disabled} onClick={()=>save('text')}>{t('ownResults.downloadText')}</button><button className="secondary-button" disabled={disabled} onClick={()=>save('csv')}>{t('ownResults.downloadCsv')}</button><button className="secondary-button" disabled={disabled} onClick={print}>{t('ownResults.print')}</button></div>
    {error&&<p role="alert" className="error">{error}</p>}<p className="own-results-notice" role="status">{notice}</p>
    <details className="research-notes"><summary>{t('notes.summary')}</summary><p>{t('ownResults.adaptation')}</p></details>
  </div></details>;
}
