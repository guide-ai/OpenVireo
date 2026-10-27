import{describe,it,expect}from'vitest';
import{readFileSync}from'node:fs';
import{applyThemePreference,readThemePreference,writeThemePreference,THEME_STORAGE_KEY}from'./theme';

function memory(){const map=new Map<string,string>();return{map,storage:{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}}};}
const throwing={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');},removeItem:()=>{throw new Error('blocked');}};

describe('theme preference (presentation only)',()=>{
 it('reads only light/dark and falls back to system for missing, unknown or blocked storage',()=>{
  const m=memory();expect(readThemePreference(()=>m.storage)).toBe('system');
  m.map.set(THEME_STORAGE_KEY,'dark');expect(readThemePreference(()=>m.storage)).toBe('dark');
  m.map.set(THEME_STORAGE_KEY,'sepia');expect(readThemePreference(()=>m.storage)).toBe('system');
  expect(readThemePreference(()=>throwing)).toBe('system');
  expect(readThemePreference(()=>{throw new Error('no storage');})).toBe('system');
  expect(readThemePreference(()=>null)).toBe('system');
 });
 it('stores light/dark, clears the key for system, and reports blocked storage without throwing',()=>{
  const m=memory();
  expect(writeThemePreference(()=>m.storage,'light')).toBe(true);expect(m.map.get(THEME_STORAGE_KEY)).toBe('light');
  expect(writeThemePreference(()=>m.storage,'system')).toBe(true);expect(m.map.has(THEME_STORAGE_KEY)).toBe(false);
  expect(writeThemePreference(()=>throwing,'dark')).toBe(false);
  expect(writeThemePreference(()=>null,'dark')).toBe(false);
 });
 it('sets data-theme only for a forced theme',()=>{
  const root={dataset:{} as DOMStringMap};
  applyThemePreference(root,'dark');expect(root.dataset.theme).toBe('dark');
  applyThemePreference(root,'system');expect('theme' in root.dataset).toBe(false);
 });
 it('index.html applies the same key before first paint, guarded by try/catch',()=>{
  const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
  expect(html).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`);expect(html).toMatch(/try\{[^<]*dataset\.theme[^<]*\}catch/);
 });
});
