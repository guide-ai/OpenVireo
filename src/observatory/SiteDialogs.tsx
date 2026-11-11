import {useEffect,useId,useRef,useState,type Dispatch,type ReactNode,type SetStateAction} from 'react';
import {OBSERVATORY_VIREO_CAPTIONS as OV} from './ObservatoryMessages';
import {vireo,vireoList,vireoMenuItem} from '../i18n/vireo';
import WebPrintPreview from '../polish/WebPrintPreview';
import {POLISH_MESSAGES as PM} from '../polish/PolishMessages';
import {VARIABLE_FIELD_LITERALS as VL} from '../core/variableFieldLiterals';
import {OBSERVATORY_DATE_CAPTIONS as DC,OBSERVATORY_ID_MAX_LENGTH,observatoryDateEntry,observatoryDatePrefill,observatoryIdEditable,observatoryIdEntry} from '../core/observatoryDateTime';
import {SITE_INFORMATION_LITERALS,STATION_DIALOG_CAPTIONS as SC,parseStationDraft,siteInformationLines,stationDraft,type ObservatorySite,type StationDraft,type StationField} from '../core/observatorySite';
import type {OpticalIndex} from '../core/opticalTelescope';
import {menuCaptionText} from '../core/radioControl';
import {RADIO_DATE_WEB_LIMITS} from '../core/radioDateDialog';
import {OBSERVATORY_MESSAGES} from './ObservatoryMessages';
import './observatory-dialogs.css';
import {imeComposing} from '../dialogKeyboard';
const M=OBSERVATORY_MESSAGES.site;

function Modal({open,label,testId,onCancel,children,wide=false}:{open:boolean;label:string;testId:string;onCancel:()=>void;children:ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;if(open&&!el.open){el.showModal();el.querySelector<HTMLInputElement>('input')?.select();}else if(!open&&el.open)el.close();},[open]);
 return <dialog ref={ref} className={`ob-dialog${wide?' ob-wide':''}`} aria-label={label} data-testid={testId} onCancel={e=>{e.preventDefault();onCancel();}}>{open&&children}</dialog>;
}
function ErrorBox({caption,text,onClose,testId}:{caption:string;text:string;onClose:()=>void;testId:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;if(!el)return;if(text&&!el.open)el.showModal();else if(!text&&el.open)el.close();},[text]);
 return <dialog ref={ref} className="ob-dialog ob-box" role="alertdialog" aria-label={caption} data-testid={testId} onCancel={e=>{e.preventDefault();onClose();}}><h2 className="ob-native">{caption}</h2><p className="ob-native">{text}</p><div className="ob-actions"><button type="button" className="primary-button" onClick={onClose}>{vireo(OV.ok)}</button></div></dialog>;
}

/** TStationDlg's fields (OB-ST-02/03): Site Name and Local Time Difference, the Longitude and Latitude groups with their
 * East/West and North/South choices, Altitude and Horizon, with the DFM hints. Shared by the observatory's Site Parameters
 * and the radio options' Site... (Front T11a: SiteBtnClick 0x5a9810 creates the same TStationDlg class 0x592330); each host
 * keeps its own modal frame. Enter in a field is OK. */
export function StationFields({station,setStation,onOk,testId='ob-station'}:{station:StationDraft|null;setStation:Dispatch<SetStateAction<StationDraft|null>>;onOk:()=>void;testId?:string}){
 const id=useId();
 const sf=(name:StationField,label:string,maxLength?:number)=><label className="ob-field"><span>{label}</span><input type="text" autoComplete="off" spellCheck={false} maxLength={maxLength??32} title={vireo(SC.hints[name])} data-testid={`${testId}-${name}`} value={station?.[name]??''} onChange={e=>setStation(s=>s&&{...s,[name]:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&!imeComposing(e)){e.preventDefault();onOk();}}}/></label>;
 return <>
  <div className="ob-group">{sf('name',vireo(SC.name),SC.maxLength.name)}{sf('utLocal',vireo(SC.utLocal),SC.maxLength.utLocal)}</div>
  <fieldset className="ob-group"><legend className="ob-native">{vireo(SC.longitude)}</legend>{sf('lngDeg',vireo(SC.deg))}{sf('lngMin',vireo(SC.min))}{sf('lngSec',vireo(SC.sec))}
   {vireoList(SC.ew).map((c,i)=><label key={c} className="ob-check"><input type="radio" name={`${id}-ew`} data-testid={`${testId}-ew-${i}`} checked={station?.ew===i} onChange={()=>setStation(s=>s&&{...s,ew:i as 0|1})}/>{c}</label>)}</fieldset>
  <fieldset className="ob-group"><legend className="ob-native">{vireo(SC.latitude)}</legend>{sf('latDeg',vireo(SC.deg))}{sf('latMin',vireo(SC.min))}{sf('latSec',vireo(SC.sec))}
   {vireoList(SC.ns).map((c,i)=><label key={c} className="ob-check"><input type="radio" name={`${id}-ns`} data-testid={`${testId}-ns-${i}`} checked={station?.ns===i} onChange={()=>setStation(s=>s&&{...s,ns:i as 0|1})}/>{c}</label>)}</fieldset>
  <div className="ob-group">{sf('altitude',vireo(SC.altitude))}{sf('horizon',vireo(SC.horizon))}</div>
 </>;
}

/** Observatory site & time menu (Front B, B6): Set Date/Time (OB-DT-01, applies the site clock UT), Site Parameters
 * (OB-ST-02/03, WEB-ST-01: clocks and horizon only) and Site Information (OB-ST-01, read-only). */
export default function SiteDialogs({utc,site,overridden,index,limitSlewing,onApplyUTC,onSite,sessionId='',onApplyId}:{utc:string;site:ObservatorySite;overridden:boolean;index:OpticalIndex;limitSlewing:boolean;onApplyUTC:(utc:string)=>void;onSite:(site:ObservatorySite|null)=>void;
 /** Front RE6: the page's one Set Date/Time ID (ShortString 0x5bc1e4); OK writes it first (0x4fdf0c), empty → UNKNOWN. */
 sessionId?:string;onApplyId?:(id:string)=>void}){
 const [date,setDate]=useState<{date:string;time:string;id:string}|null>(null),[dateError,setDateError]=useState(''),[station,setStation]=useState<StationDraft|null>(null),[stationError,setStationError]=useState(''),[info,setInfo]=useState(false),[infoPrint,setInfoPrint]=useState(false);
 const dateOk=()=>{if(!date)return;onApplyId?.(observatoryIdEntry(date.id));const r=observatoryDateEntry(date.date,date.time);if(r.status!=='ok'){setDateError(r.failure.field==='date'?M.dateError:r.failure.field==='time'?M.timeError:M.rangeError);return;}setDate(null);onApplyUTC(r.utc);};
 const stationOk=()=>{if(!station)return;const r=parseStationDraft(station);if(r.status==='error'){setStationError(r.message);return;}if(r.status==='unsupported'){setStationError(r.field==='name'?M.nameUnsupported:M.horizonUnsupported);return;}setStation(null);onSite(r.site);};
 return <div className="ob-site-dialogs">
  <div className="ob-menu">
   <button type="button" className="secondary-button" data-testid="ob-set-date" onClick={()=>{setDateError('');setDate({...observatoryDatePrefill(utc),id:sessionId});}}>{vireoMenuItem(OV.setDateTime)}</button>
   <button type="button" className="secondary-button" data-testid="ob-site-parameters" onClick={()=>{setStationError('');setStation(stationDraft(site));}}>{vireoMenuItem(SC.form)}</button>
   <button type="button" className="secondary-button" data-testid="ob-site-information" onClick={()=>setInfo(true)}>{vireoMenuItem(OV.siteInformation)}</button>
   {overridden&&<button type="button" className="secondary-button" data-testid="ob-site-reset" onClick={()=>onSite(null)}>{M.reset}</button>}
  </div>
  <p className="observatory-note" data-testid="ob-site-status">{overridden?M.overridden(site.name):M.compiled} {M.adaptation}</p>
  <Modal open={date!==null} label={vireo(DC.form)} testId="ob-date-dialog" onCancel={()=>setDate(null)}>
   <h2 className="ob-native">{vireo(DC.form)}</h2>
   {onApplyId&&<div className="ob-group"><label className="ob-field"><span>{vireo(DC.id)} {vireo(DC.idSource)}</span><input type="text" autoComplete="off" spellCheck={false} maxLength={OBSERVATORY_ID_MAX_LENGTH} title={vireo(DC.idHint)} data-testid="ob-date-id" value={date?.id??''} onChange={e=>{const v=e.target.value;if(observatoryIdEditable(v))setDate(d=>d&&{...d,id:v});}} onKeyDown={e=>{if(e.key==='Enter'&&!imeComposing(e)){e.preventDefault();dateOk();}}}/></label></div>}
   <div className="ob-group"><label className="ob-field"><span>{vireo(DC.date)} ({vireo(DC.dateFormat)})</span><input type="text" maxLength={RADIO_DATE_WEB_LIMITS.fieldMaxLength} title={vireo(DC.dateHint)} data-testid="ob-date-date" value={date?.date??''} onChange={e=>setDate(d=>d&&{...d,date:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&!imeComposing(e)){e.preventDefault();dateOk();}}}/></label>
    <label className="ob-field"><span>{vireo(DC.time)} ({vireo(DC.timeFormat)})</span><input type="text" maxLength={RADIO_DATE_WEB_LIMITS.fieldMaxLength} title={vireo(DC.timeHint)} data-testid="ob-date-time" value={date?.time??''} onChange={e=>setDate(d=>d&&{...d,time:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&!imeComposing(e)){e.preventDefault();dateOk();}}}/></label></div>
   <p className="ob-note">{M.dateHelp}</p>
   <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-date-ok" onClick={dateOk}>{vireo(OV.ok)}</button><button type="button" className="secondary-button" onClick={()=>setDate(null)}>{vireo(OV.cancel)}</button></div>
   <ErrorBox caption={M.errorTitle} text={dateError} onClose={()=>setDateError('')} testId="ob-date-error"/>
  </Modal>
  <Modal open={station!==null} label={vireo(SC.form)} testId="ob-station-dialog" onCancel={()=>setStation(null)}>
   <h2 className="ob-native">{vireo(SC.form)}</h2>
   <StationFields station={station} setStation={setStation} onOk={stationOk}/>
   <p className="ob-note">{M.siteHelp}</p>
   <div className="ob-actions"><button type="button" className="primary-button" data-testid="ob-station-ok" onClick={stationOk}>{vireo(menuCaptionText(SC.ok))}</button><button type="button" className="secondary-button" onClick={()=>setStation(null)}>{vireo(menuCaptionText(SC.cancel))}</button></div>
   <ErrorBox caption={vireo(SC.errorCaption)} text={stationError} onClose={()=>setStationError('')} testId="ob-station-error"/>
  </Modal>
  <Modal open={info} label={vireo(SITE_INFORMATION_LITERALS.caption)} testId="ob-site-info" onCancel={()=>setInfo(false)}>
   <h2 className="ob-native">{vireo(SITE_INFORMATION_LITERALS.caption)}</h2>
   <pre className="ob-native ob-site-lines" data-testid="ob-site-info-lines">{siteInformationLines(site,index,limitSlewing,vireo).join('\n')}</pre>
   {/* TInfoListForm1 from Site1Click 0x53ea42 (ShowModal): Edit1, Search1 and SaveasText1 are hidden [D], so List keeps Print... and Close. */}
   <div className="ob-actions"><button type="button" className="secondary-button" data-testid="ob-site-info-print" onClick={()=>setInfoPrint(true)}>{vireo(menuCaptionText(VL.listMenu.print))}</button>
    <button type="button" className="primary-button" data-testid="ob-site-info-close" onClick={()=>setInfo(false)}>{vireo(menuCaptionText(VL.listMenu.close))}</button></div>
   <p className="observatory-note">{PM.siteInfo.note}</p>
   {infoPrint&&<WebPrintPreview testId="ob-site-info-print-preview" caption={vireo(SITE_INFORMATION_LITERALS.caption)} note={PM.siteInfo.printNote} onClose={()=>setInfoPrint(false)}><pre className="ob-site-lines">{siteInformationLines(site,index,limitSlewing,vireo).join('\n')}</pre></WebPrintPreview>}
  </Modal>
 </div>;
}
