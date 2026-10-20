import {useEffect,useMemo,useState} from 'react';
import {boundedTargetQuery,searchTargets,TARGET_QUERY_MAX_LENGTH} from './core/targetSearch';
import type {SkyObject} from './core/sky';
import {formatNumber,t} from './i18n';
export type TargetGroup = Readonly<{label:string;items:readonly SkyObject[]}>;
export default function TargetPicker({catalog,groups,selected,onSelect,resetToken}:{catalog:readonly SkyObject[];groups:readonly TargetGroup[];selected:SkyObject;onSelect:(target:SkyObject)=>void;resetToken:unknown}) {
  const [query,setQuery]=useState('');
  useEffect(()=>setQuery(''),[resetToken]);
  const matches=useMemo(()=>searchTargets(catalog,query),[catalog,query]);
  const ids=useMemo(()=>new Set(matches.map(target=>target.id)),[matches]);
  const options=(items:readonly SkyObject[])=>items.map(target=><option key={target.id} value={target.id}>{target.label}</option>);
  return <><div className="target-search"><label htmlFor="target-query">{t('sky.searchLabel')}</label><input id="target-query" type="search" value={query} maxLength={TARGET_QUERY_MAX_LENGTH} aria-describedby="target-search-help target-search-status" onChange={event=>setQuery(boundedTargetQuery(event.target.value))} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setQuery('');}}}/><button type="button" className="secondary-button" disabled={!query} onClick={()=>setQuery('')}>{t('sky.searchClear')}</button><p id="target-search-help" className="observatory-note">{t('sky.searchHelp')}</p><p id="target-search-status" data-testid="target-search-status" role="status">{matches.length?t('sky.searchMatches',{count:formatNumber(matches.length,{maximumFractionDigits:0})}):t('sky.searchNone')}</p></div><label htmlFor="target">{t('sky.target')}</label><select id="target" value={selected.id} onChange={event=>{const next=catalog.find(target=>target.id===event.target.value);if(next)onSelect(next);}}>{!ids.has(selected.id)&&<optgroup label={t('sky.searchCurrent')}>{options([selected])}</optgroup>}{groups.map(group=><optgroup key={group.label} label={group.label}>{options(group.items.filter(target=>ids.has(target.id)))}</optgroup>)}</select></>;
}
