import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {OBSERVATORY_DATE_CAPTIONS as DC,observatoryDateEntry,observatoryDatePrefill} from '../core/observatoryDateTime';
import {SITE_INFORMATION_LITERALS,STATION_DIALOG_CAPTIONS as SC,parseStationDraft,siteInformationLines,stationDraft,type ObservatorySite,type StationDraft,type StationField} from '../core/observatorySite';
import type {OpticalIndex} from '../core/opticalTelescope';
import {menuCaptionText} from '../core/radioControl';
import {RADIO_DATE_WEB_LIMITS} from '../core/radioDateDialog';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import './observatory-dialogs.css';
const M=OBSERVATORY_MESSAGES.site;

function Modal({open,label,testId,onCancel,children,wide=false}:{open:boolean;label:string;testId:string;onCancel:()=>void;children:ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;if(open&&!el.open){el.showModal();el.querySelector<HTMLInputElement>('input')?.select();}else if(!open&&el.open)el.close();},[open]);
 return <dialog ref={ref} className={`ob-dialog${wide?' ob-wide':''}`} aria-label={label} data-testid={testId} onCancel={e=>{e.preventDefault();onCancel();}}>{open&&children}</dialog>;
}
function ErrorBox({caption,text,onClose,testId}:{caption:string;text:string;onClose:()=>void;testId:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;if(text&&!el.open)el.showModal();else if(!text&&el.open)el.close();},[text]);
 return <dialog ref={ref} className="ob-dialog ob-box" role="alertdialog" aria-label={caption} data-testid={testId} onCancel={e=>{e.preventDefault();onClose();}}><h2 className="ob-native">{caption}</h2><p className="ob-native">{text}</p><div className="ob-actions"><button type="button" className="primary-button" onClick={onClose}>{OBSERVATORY_MESSAGES.common.ok}</button></div></dialog>;
}

/** Observatory site & time menu (Front B, B6): Set Date/Time (OB-DT-01, applies the site clock UT), Site Parameters
 * (OB-ST-02/03, WEB-ST-01: clocks and horizon only) and Site Information (OB-ST-01, read-only). */
export default function SiteDialogs({utc,site,overridden,index,limitSlewing,onApplyUTC,onSite}:{utc:string;site:ObservatorySite;overridden:boolean;index:OpticalIndex;limitSlewing:boolean;onApplyUTC:(utc:string)=>void;onSite:(site:ObservatorySite|null)=>void}){
 const id=useId(),[date,setDate]=useState<{date:string;time:string}|null>(null),[dateError,setDateError]=useState(''),[station,setStation]=useState<StationDraft|null>(null),[stationError,setStationError]=useState(''),[info,setInfo]=useState(false);
 const dateOk=()=>{if(!date)return;const r=observatoryDateEntry(date.date,date.time);if(r.status!=='ok'){setDateError(r.failure.field==='date'?M.dateError:r.failure.field==='time'?M.timeError:M.rangeError);return;}setDate(null);onApplyUTC(r.utc);};
 const stationOk=()=>{if(!station)return;const r=parseStationDraft(station);if(r.status==='error'){setStationError(r.message);return;}if(r.status==='unsupported'){setStationError(r.field==='name'?M.nameUnsupported:M.horizonUnsupported);return;}setStation(null);onSite(r.site);};
 const sf=(name:StationField,label:string,maxLength?:number)=><label className="ob-field"><span>{label}</span><input type="text" autoComplete="off" spellCheck={false} maxLength={maxLength??32} title={SC.hints[name]} data-testid={`ob-station-${name}`} value={station?.[name]??''} onChange={e=>setStation(s=>s&&{...s,[name]:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();stationOk();}}}/></label>;
 return <div className="ob-site-dialogs">
  <div className="ob-menu">
   <button type="button" className="secondary-button" data-testid="ob-set-date" onClick={()=>{setDateError('');setDate(observatoryDatePrefill(utc));}}>{M.dateOpen}</button>
   <button type="button" className="secondary-button" data-testid="ob-site-parameters" onClick={()=>{setStationError('');setStation(stationDraft(site));}}>{M.siteOpen}</button>
   <button type="button" className="secondary-button" data-testid="ob-site-information" onClick={()=>setInfo(true)}>{M.infoOpen}</button>
   {overridden&&<button type="button" className="secondary-button" data-testid="ob-site-reset" onClick={()=>onSite(null)}>{M.reset}</button>}
  </div>
  <p className="observatory-note" data-testid="ob-site-status">{overridden?M.overridden(site.name):M.compiled} {M.adaptation}</p>
  <Modal open={date!==null} label={DC.form} testId="ob-date-dialog" onCancel={()=>setDate(null)}>
   <h2 className="ob-native">{DC.form}</h2>
   <div className="ob-group"><label className="ob-field"><span>{DC.date} ({DC.dateFormat})</span><input type="text" maxLength={RADIO_DATE_WEB_LIMITS.fieldMaxLength} title={DC.dateHint} data-testid="ob-date-date" value={date?.date??''} onChange={e=>setDate(d=>d&&{...d,date:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();dateOk();}}}/></label>
    <label className="ob-field"><span>{DC.time} ({DC.timeFormat})</span><input type="text" maxLength={RADIO_DATE_WEB_LIMITS.fieldMaxLength} title={DC.timeHint} data-testid="ob-date-time" value={date?.time??''} onChange={e=>setDate(d=>d&&{...d,time:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();dateOk();}}}/></label></div>
   <p className="ob-note">{M.dateHelp}</p>
   <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-date-ok" onClick={dateOk}>{OBSERVATORY_MESSAGES.common.ok}</button><button type="button" className="secondary-button" onClick={()=>setDate(null)}>{OBSERVATORY_MESSAGES.common.cancel}</button></div>
   <ErrorBox caption={M.errorTitle} text={dateError} onClose={()=>setDateError('')} testId="ob-date-error"/>
  </Modal>
  <Modal open={station!==null} label={SC.form} testId="ob-station-dialog" onCancel={()=>setStation(null)}>
   <h2 className="ob-native">{SC.form}</h2>
   <div className="ob-group">{sf('name',SC.name,SC.maxLength.name)}{sf('utLocal',SC.utLocal,SC.maxLength.utLocal)}</div>
   <fieldset className="ob-group"><legend className="ob-native">{SC.longitude}</legend>{sf('lngDeg',SC.deg)}{sf('lngMin',SC.min)}{sf('lngSec',SC.sec)}
    {SC.ew.map((c,i)=><label key={c} className="ob-check"><input type="radio" name={`${id}-ew`} data-testid={`ob-station-ew-${i}`} checked={station?.ew===i} onChange={()=>setStation(s=>s&&{...s,ew:i as 0|1})}/>{c}</label>)}</fieldset>
   <fieldset className="ob-group"><legend className="ob-native">{SC.latitude}</legend>{sf('latDeg',SC.deg)}{sf('latMin',SC.min)}{sf('latSec',SC.sec)}
    {SC.ns.map((c,i)=><label key={c} className="ob-check"><input type="radio" name={`${id}-ns`} data-testid={`ob-station-ns-${i}`} checked={station?.ns===i} onChange={()=>setStation(s=>s&&{...s,ns:i as 0|1})}/>{c}</label>)}</fieldset>
   <div className="ob-group">{sf('altitude',SC.altitude)}{sf('horizon',SC.horizon)}</div>
   <p className="ob-note">{M.siteHelp}</p>
   <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-station-ok" onClick={stationOk}>{menuCaptionText(SC.ok)}</button><button type="button" className="secondary-button" onClick={()=>setStation(null)}>{menuCaptionText(SC.cancel)}</button></div>
   <ErrorBox caption={SC.errorCaption} text={stationError} onClose={()=>setStationError('')} testId="ob-station-error"/>
  </Modal>
  <Modal open={info} label={SITE_INFORMATION_LITERALS.caption} testId="ob-site-info" onCancel={()=>setInfo(false)}>
   <h2 className="ob-native">{SITE_INFORMATION_LITERALS.caption}</h2>
   <pre className="ob-native ob-site-lines" data-testid="ob-site-info-lines">{siteInformationLines(site,index,limitSlewing).join('\n')}</pre>
   <div className="ob-actions"><button type="button" className="primary-button" onClick={()=>setInfo(false)}>{OBSERVATORY_MESSAGES.common.ok}</button></div>
  </Modal>
 </div>;
}
