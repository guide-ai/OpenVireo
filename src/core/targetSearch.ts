import type {SkyObject} from './sky';
/** Authored navigation policy over existing identities; no coordinates/measurements change. */
export const TARGET_QUERY_MAX_LENGTH = 80;
export const boundedTargetQuery = (value: string) => value.slice(0, TARGET_QUERY_MAX_LENGTH);
const searchKey = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]/gu, '');
export function searchTargets<T extends Pick<SkyObject, 'id'|'label'|'hotList'>>(catalog: readonly T[], query: string): readonly T[] {
  const text = boundedTargetQuery(query);
  if (!text.trim()) return catalog;
  const key = searchKey(text);
  if (!key) return [];
  return catalog.filter(object => [object.id, object.label, object.hotList ?? ''].some(value => searchKey(value).includes(key)));
}
