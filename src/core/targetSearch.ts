import type {SkyObject} from './sky';
/** Authored navigation policy over existing identities; no coordinates/measurements change. */
export const TARGET_QUERY_MAX_LENGTH = 80;
export function boundedTargetQuery(value:string){
 const text=value.slice(0,TARGET_QUERY_MAX_LENGTH);
 return /[\uD800-\uDBFF]$/.test(text)?text.slice(0,-1):text;
}
const searchKey = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]/gu, '');
type Searchable=Pick<SkyObject,'id'|'label'|'sourceLabel'|'hotList'>;
/** Prepared once per catalog; source filenames match only as full names/basenames. */
export function prepareTargetSearch<T extends Searchable>(catalog:readonly T[]){
 const entries=catalog.map(object=>({object,keys:[object.id,object.sourceLabel??object.label].map(searchKey),lists:object.hotList?[object.hotList,object.hotList.replace(/\.[^.]+$/,'')].map(searchKey):[]}));
 return (query:string):readonly T[]=>{
  const text=boundedTargetQuery(query);if(!text.trim())return catalog;
  const key=searchKey(text);if(!key)return [];
  return entries.filter(entry=>entry.keys.some(value=>value.includes(key))||entry.lists.includes(key)).map(entry=>entry.object);
 };
}
export function searchTargets<T extends Searchable>(catalog:readonly T[],query:string):readonly T[]{return prepareTargetSearch(catalog)(query);}
