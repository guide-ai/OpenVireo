import {memo,useEffect,useMemo,useRef,useState} from 'react';
import {boundedTargetQuery,prepareTargetSearch} from './core/targetSearch';
import type {SkyObject} from './core/sky';
import {formatNumber,t} from './i18n';
export type TargetGroup = Readonly<{label:string;items:readonly SkyObject[]}>;
/** `hidden` (E08 Object X): entries near an unrevealed target are left out of the list, and a current selection among them is
 * shown as `hiddenLabel`, so the picker cannot name the hidden object. */
function TargetPicker({catalog,groups,selected,onSelect,resetToken,hidden,hiddenLabel=''}:{catalog:readonly SkyObject[];groups:readonly TargetGroup[];selected:SkyObject;onSelect:(target:SkyObject)=>void;resetToken:unknown;hidden?:(target:SkyObject)=>boolean;hiddenLabel?:string}) {
  const [query,setQuery]=useState(''),input=useRef<HTMLInputElement>(null);
  const preparedSearch=useMemo(()=>prepareTargetSearch(catalog),[catalog]);
  useEffect(()=>setQuery(''),[resetToken]);
  const matches=useMemo(()=>{const found=preparedSearch(query);return hidden?found.filter(target=>!hidden(target)):found;},[preparedSearch,query,hidden]);
  const ids=useMemo(()=>new Set(matches.map(target=>target.id)),[matches]);
  const options=(items:readonly SkyObject[])=>items.map(target=><option key={target.id} value={target.id}>{hidden?.(target)?hiddenLabel:target.label}</option>);
  return <><div className="target-search"><label htmlFor="target-query">{t('sky.searchLabel')}</label><input ref={input} id="target-query" type="search" value={query} aria-describedby="target-search-help target-search-status" onChange={event=>setQuery((event.nativeEvent as InputEvent).isComposing?event.target.value:boundedTargetQuery(event.target.value))} onCompositionEnd={event=>setQuery(boundedTargetQuery(event.currentTarget.value))} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setQuery('');}}}/><button type="button" className="secondary-button" disabled={!query} onClick={()=>{setQuery('');input.current?.focus();}}>{t('sky.searchClear')}</button><p id="target-search-help" className="observatory-note">{t('sky.searchHelp')}</p><p id="target-search-status" data-testid="target-search-status" role="status">{matches.length===1?t('sky.searchOne'):matches.length?t('sky.searchMatches',{count:formatNumber(matches.length,{maximumFractionDigits:0})}):t('sky.searchNone')}</p></div><label htmlFor="target">{t('sky.target')}</label><select id="target" value={selected.id} onChange={event=>{const next=catalog.find(target=>target.id===event.target.value);if(next)onSelect(next);}}>{!ids.has(selected.id)&&<optgroup label={t('sky.searchCurrent')}>{options([selected])}</optgroup>}{groups.map(group=>({...group,items:group.items.filter(target=>ids.has(target.id))})).filter(group=>group.items.length>0).map(group=><optgroup key={group.label} label={group.label}>{options(group.items)}</optgroup>)}</select></>;
}
// Front Perf: re-render only when a prop changes (handlers come stable from the shell; docs/RENDER-BUDGET.md).
export default memo(TargetPicker);
