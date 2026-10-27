import {useEffect,useMemo,useRef} from 'react';
import {t,scientific} from './i18n';
import {useBoundedExposure,type ExposureEngine} from './useBoundedExposure';
import {lssCountsCsv,lssExposureEngine,parseLssPolicy} from './core/lssExposure';
import {JournalError,MAX_JOURNAL_EVENTS,type JournalEvent,type JournalState} from './core/exposureJournal';
import type {FieldResult} from './core/fieldEngine';
import type {LssRow} from './core/lssFields';
import type {RgbImage} from './core/photons';
const FORMAT='OpenVireo LSS field exposure';
/** Exposure session file: policy, seed and event journal only; counts are always replayed, never imported. */
function engineFor(result:FieldResult,row:LssRow,policy:string):ExposureEngine{
 const e=lssExposureEngine(result,policy);
 return {...e,csv:(s:JournalState)=>lssCountsCsv(s,result,row),
  serialize:(s:JournalState)=>{if(s.exposure.phase==='running')throw new JournalError('phase');return JSON.stringify({format:FORMAT,version:1,policy,seedAtReset:s.seedAtReset,events:s.events},null,1)+'\n';},
  read:async(file:File)=>{
   if(file.size>2*1024*1024)throw new JournalError('session');
   let v:unknown;try{v=JSON.parse(await file.text());}catch{throw new JournalError('session');}
   const r=v as Record<string,unknown>;
   if(!r||typeof r!=='object'||Object.keys(r).length!==5||r.format!==FORMAT||r.version!==1||r.policy!==policy||typeof r.seedAtReset!=='number'||!Array.isArray(r.events)||r.events.length>MAX_JOURNAL_EVENTS)throw new JournalError('session');
   parseLssPolicy(r.policy);return e.replay(r.seedAtReset,r.events as JournalEvent[]);
  },
  basename:`openvireo-lss-${policy.split(':').slice(1).join('-')}`,activated:t('lss.exposure.activated'),started:t('lss.exposure.started'),restored:t('lss.exposure.restored')};
}
function Frame({image}:{image:RgbImage}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const context=canvas.current?.getContext('2d');if(!context)return;const data=context.createImageData(image.width,image.height);for(let i=0;i<image.width*image.height;i++){data.data[i*4]=image.rgb[i*3];data.data[i*4+1]=image.rgb[i*3+1];data.data[i*4+2]=image.rgb[i*3+2];data.data[i*4+3]=255;}context.putImageData(data,0,0);},[image]);
 return <figure className="native-star-frame"><div><canvas ref={canvas} width={312} height={312} role="img" aria-label={t('lss.exposure.frame')}/><span className="native-slit" aria-hidden="true"/></div></figure>;
}
/** One pointed row: telescope view, exposure controls and raw counts. Keyed by policy in the host. */
export default function LssAcquisition({active,result,row,policy,onCounts}:{active:boolean;result:FieldResult;row:LssRow;policy:string;onCounts:(s:JournalState|null)=>void}){
 const heading=useRef<HTMLHeadingElement>(null),engine=useMemo(()=>engineFor(result,row,policy),[result,row,policy]);
 const {state,seed,setSeed,notice,setNotice,error,busy,running,armed,activate,start,stop,save,restore,reset,cancel,newSeed}=useBoundedExposure({engine,active,fieldMatches:true,onActivate:()=>{},heading});
 useEffect(()=>{onCounts(state);},[state]);
 const e=state?.exposure,c=result.calibration!,total=(e?.sourceTotal??0)+(e?.skyTotal??0),max=Math.max(1,...(e?.counts??[]));
 const points=e?.counts.map((n,i)=>`${55+i*890/599},${235-n*180/max}`).join(' ')??'';
 return <section className="card lss-acquisition" aria-labelledby="lss-acquire-heading">
  <h3 id="lss-acquire-heading" ref={heading} tabIndex={-1}>{t('lss.exposure.title',{id:row.id,selected:result.target!.id})}</h3>
  <p data-testid="lss-slit">{t('lss.exposure.slit',{level:c.pixelLevel,fraction:scientific(c.fraction,6,true)})}</p>
  <div className="lss-acquire-layout"><Frame image={result.viewport!}/>
   <div><div className="sky-actions"><button className="primary-button" disabled={running||busy||armed} onClick={activate}>{t('lss.exposure.activate')}</button><button className="primary-button" disabled={!armed||running||busy} onClick={start}>{t('lss.exposure.start')}</button><button className="secondary-button" disabled={!running||busy} onClick={()=>{stop();setNotice(t('skyExposure.pausedCountsAndTheRandomState'));}}>{t('lss.exposure.pause')}</button><button className="secondary-button" disabled={!state||busy} onClick={reset}>{t('skyExposure.resetCounts')}</button><button className="secondary-button" disabled={!state||busy} onClick={cancel}>{t('skyExposure.cancelAndDiscard')}</button></div>
    <p role="status" data-testid="lss-phase">{running?t('skyExposure.exposing'):armed?t('skyExposure.readyPaused'):t('skyExposure.deactivated')}</p>
    <dl className="lss-totals"><dt>{t('skyExposure.committedExposure')}</dt><dd data-testid="lss-elapsed">{t('lss.exposure.elapsed',{ms:e?.elapsedMs??0})}</dd><dt>{t('galaxyExposure.totalCounts')}</dt><dd data-testid="lss-total">{total}</dd></dl>
    <label htmlFor="lss-seed">{t('skyExposure.browserRandomSeedUint32')}</label><input id="lss-seed" inputMode="numeric" maxLength={80} value={seed} disabled={running||busy} onChange={event=>setSeed(event.target.value)}/><button className="secondary-button" disabled={running||busy} onClick={newSeed}>{t('skyExposure.newSeededExposure')}</button>
    <div className="sky-actions"><button className="secondary-button" disabled={!e?.draws||busy} onClick={()=>save('csv')}>{t('lss.exposure.saveCsv')}</button><button className="secondary-button" disabled={!state||busy} onClick={()=>save('json')}>{t('lss.exposure.saveJson')}</button></div>
    <label htmlFor="lss-session">{t('lss.exposure.restore')}</label><input id="lss-session" type="file" accept=".json,application/json" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void restore(file);}}/>
   </div></div>
  <svg className="source-spectrum" viewBox="0 0 1000 290" role="img" aria-label={t('lss.exposure.chart')}><line x1="55" x2="945" y1="235" y2="235"/><line x1="55" x2="55" y1="45" y2="235"/>{e&&<polyline points={points} fill="none"/>}</svg>
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
