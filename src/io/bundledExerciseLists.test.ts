import {describe,expect,it} from 'vitest';
import en from '../i18n/en.json';
import {BUNDLED_EXERCISE_HOT_LISTS,BUNDLED_HUBBLE_HOT_LIST,BUNDLED_PLEIADES_HOT_LIST} from './bundledHotList';

describe('data-driven exercise-list buttons',()=>{
 it('keeps the existing two lists, in order, with catalog captions that exist',()=>{
  expect(BUNDLED_EXERCISE_HOT_LISTS.map(e=>e.identity)).toEqual([BUNDLED_PLEIADES_HOT_LIST,BUNDLED_HUBBLE_HOT_LIST]);
  for(const e of BUNDLED_EXERCISE_HOT_LISTS)for(const text of [e.label,e.error])if('key' in text)expect(Object.hasOwn(en,text.key)).toBe(true);
  expect(new Set(BUNDLED_EXERCISE_HOT_LISTS.map(e=>e.identity.path)).size).toBe(BUNDLED_EXERCISE_HOT_LISTS.length);
 });
});
