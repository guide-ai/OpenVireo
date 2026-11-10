import {existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {HELP_FILES} from '../help/helpFiles';
import {LANGUAGES,SOURCE_LANGUAGE,failureNotice,isReleased,matchLanguage,optionLabel,selectorLanguages,selectorShown,type LanguageEntry} from './languages';
import {decideLocale,HTML_LANG} from './locale';
import {PLANNED,ZH_HANT,releasing} from '../../tests/fixtures/i18n/registry';
import {PARTIAL} from '../../tests/fixtures/i18n/partial';
// Front SC8 (docs/I18N.md, "Script groundwork: the language registry, detection and selector (SC8)"): the registry
// src/i18n/languages.json and the rules of src/i18n/languages.ts. The registry of every language the user has ordered
// (tests/fixtures/i18n/registry.ts) drives the detection table; only Spanish is in the production registry.
const root=path.resolve(import.meta.dirname,'../..');
const helpModules=import.meta.glob<{language:string;sourceName:string}>('./*/help/*.ts',{eager:true});
const ranges=(l:LanguageEntry)=>[...l.match,...(l.except??[])];
function problems(registry:readonly LanguageEntry[]):string[]{
 const out:string[]=[],seen=new Map<string,string>();
 const unique=(what:string,values:string[])=>{const dup=values.filter((v,i)=>values.indexOf(v)!==i);if(dup.length)out.push(`${what} twice: ${dup.join(', ')}`);};
 unique('tag',registry.map(l=>l.tag));unique('dir',registry.map(l=>l.dir));unique('pagePath',registry.map(l=>l.pagePath));
 for(const l of registry){
  if(l.tag==='en'||l.tag.startsWith('qps'))out.push(`${l.tag}: reserved tag`);
  if(Intl.getCanonicalLocales(l.htmlLang)[0]!==l.htmlLang)out.push(`${l.tag}: htmlLang ${l.htmlLang} is not a canonical BCP 47 tag`);
  if(!/^[a-z0-9-]+$/.test(l.dir))out.push(`${l.tag}: dir ${l.dir} is not lower case`);
  if(!/^[a-z0-9-]+$/.test(l.pagePath??'')||['assets','labs','original','data'].includes(l.pagePath))out.push(`${l.tag}: pagePath ${l.pagePath} is not one lower-case segment of its own`);
  for(const [k,v] of [['autonym',l.autonym],['englishName',l.englishName],['notices.language',l.notices?.language],['notices.area',l.notices?.area]] as const)if(typeof v!=='string'||!v.trim())out.push(`${l.tag}: no ${k}`);
  if(!(l.budgetFactor>0))out.push(`${l.tag}: budgetFactor`);
  if(typeof l.released!=='boolean')out.push(`${l.tag}: released is not a boolean`);
  if(!l.match.length)out.push(`${l.tag}: no match range`);
  // A range belongs to one language: the most specific range decides, and two languages may not claim the same one.
  for(const r of l.match){const key=r.toLowerCase(),other=seen.get(key);if(other)out.push(`${l.tag}: range ${r} is also ${other}'s`);seen.set(key,l.tag);}
  for(const r of ranges(l))if(Intl.getCanonicalLocales(r).length!==1)out.push(`${l.tag}: range ${r}`);
  if(l.help&&!l.help.related?.trim())out.push(`${l.tag}: help without its related-topics marker`);
 }
 return out;
}
describe('Front SC8: the language registry (src/i18n/languages.json)',()=>{
 it('is valid: unique tags and directories, canonical <html lang>, names, notices, ranges that no two languages share',()=>{
  expect(problems(LANGUAGES)).toEqual([]);
  // SC8 review: `path` is for test fixtures only; a production language lives in src/i18n/<dir>.
  expect(LANGUAGES.filter(l=>Object.hasOwn(l,'path')).map(l=>l.tag)).toEqual([]);
  expect(problems(PLANNED)).toEqual([]);expect(problems([...PLANNED,ZH_HANT])).toEqual([]);expect(problems([...LANGUAGES,PARTIAL])).toEqual([]);
  expect(problems([...LANGUAGES,{...PARTIAL,match:['es-MX']}])).toEqual([]);// more specific than Spanish's es: allowed
  expect(problems([...LANGUAGES,{...PARTIAL,match:['ES']}])).toEqual(['qaa-XA: range ES is also es-419\'s']);
  expect(problems([...LANGUAGES,{...PARTIAL,tag:'es-419',dir:'es',pagePath:'es'}])).toEqual(['tag twice: es-419','dir twice: es','pagePath twice: es']);
  expect(problems([...LANGUAGES,{...PARTIAL,pagePath:'labs'}])).toEqual(['qaa-XA: pagePath labs is not one lower-case segment of its own']);
 });
 it('every language has its directory, catalog, originals and manifest; one with help has a module per help file naming it',()=>{
  for(const l of LANGUAGES){
   const dir=path.join(root,'src/i18n',l.dir);
   for(const f of [l.catalog,'originals.json','index.ts'])expect(existsSync(path.join(dir,f)),`${l.tag} ${f}`).toBe(true);
   const help=Object.entries(helpModules).filter(([f])=>f.startsWith(`./${l.dir}/help/`));
   expect(help.length,l.tag).toBe(l.help?Object.keys(HELP_FILES).length:0);
   for(const [f,m] of help)expect(m.language,f).toBe(l.tag);
   if(!l.help)expect(existsSync(path.join(dir,'help'))&&readdirSync(path.join(dir,'help')).length,l.tag).toBeFalsy();
  }
 });
 it('Spanish is released and keeps its ES-REL behaviour: es and es-* (any case), <html lang> es-419, Español in the selector',()=>{
  // Front PT0: Brazilian Portuguese is registered before its release (a ?lang=pt-BR preview only).
  expect(LANGUAGES.map(l=>[l.tag,l.released])).toEqual([['es-419',true],['pt-BR',false]]);
  for(const tag of ['es','es-MX','es-ES','ES-ar','es-419','es-Latn-MX'])expect(matchLanguage(tag)?.tag,tag).toBe('es-419');
  for(const tag of ['','en','en-US','esp','eus','et','fr-ES'])expect(matchLanguage(tag),tag).toBeUndefined();
  expect(HTML_LANG['es-419']).toBe('es-419');expect(isReleased('es-419')).toBe(true);expect(isReleased('en')).toBe(false);
  expect(selectorLanguages('en').map(optionLabel)).toEqual(['English','Español']);expect(SOURCE_LANGUAGE.tag).toBe('en');
  expect(failureNotice('language','es-419')).toEqual({en:'Spanish could not be loaded; English is shown. Reload to try again.',own:'No se pudo cargar el español; se muestra en inglés. Recarga para intentarlo de nuevo.',lang:'es-419'});
  expect(failureNotice('area','es-419')).toEqual({en:'Part of the Spanish text could not be loaded; that part is shown in English. Reload to try again.',own:'No se pudo cargar parte del texto en español; esa parte se muestra en inglés. Recarga para intentarlo de nuevo.',lang:'es-419'});
  expect(failureNotice('language','fr')).toBeUndefined();
 });
});
describe('Front SC8: detection for the languages to come (scripts plan §7, pt-BR plan §4)',()=>{
 // [browser tag, registered language it asks for]; undefined: none (English).
 const TABLE:readonly (readonly [string,string|undefined])[]=[
  ['es','es-419'],['es-MX','es-419'],['pt','pt-BR'],['pt-BR','pt-BR'],['pt-br','pt-BR'],['pt-PT','pt-BR'],['pt-AO','pt-BR'],['gl',undefined],
  ['fr','fr'],['fr-CA','fr'],['id','id'],['id-ID','id'],['ms',undefined],['hi','hi'],['hi-IN','hi'],['en-IN',undefined],['ja','ja'],['ja-JP','ja'],
  ['ru','ru'],['ru-RU','ru'],['uk',undefined],['be',undefined],['kk',undefined],
  ['zh-Hans','zh-Hans'],['zh-Hans-CN','zh-Hans'],['zh-Hans-TW','zh-Hans'],['zh-CN','zh-Hans'],['zh-SG','zh-Hans'],['zh-MY','zh-Hans'],['zh','zh-Hans'],['ZH-cn','zh-Hans'],
  // Traditional Chinese while zh-Hant does not exist: English (decision Q5), never Simplified automatically.
  ['zh-TW',undefined],['zh-HK',undefined],['zh-MO',undefined],['zh-Hant',undefined],['zh-Hant-CN',undefined],['ZH-tw',undefined],['zh-hant-tw',undefined],
  ['en-US',undefined],['',undefined],
 ];
 it('maps each browser tag to the language it asks for, released or not; the most specific range wins',()=>{
  for(const [tag,expected] of TABLE)expect(matchLanguage(tag,PLANNED)?.tag,tag).toBe(expected);
  // Once zh-Hant exists, its ranges take Traditional Chinese, and the script subtag beats the region.
  const withHant=[...PLANNED,ZH_HANT];
  for(const tag of ['zh-TW','zh-HK','zh-MO','zh-Hant','zh-Hant-CN','ZH-tw'])expect(matchLanguage(tag,withHant)?.tag,tag).toBe('zh-Hant');
  for(const tag of ['zh','zh-CN','zh-Hans-TW'])expect(matchLanguage(tag,withHant)?.tag,tag).toBe('zh-Hans');
 });
 it('opens a language from the browser only once it is released; before that only its ?lang= preview, never storage',()=>{
  const decide=(registry:readonly LanguageEntry[],over:Partial<Parameters<typeof decideLocale>[0]>)=>decideLocale({param:null,stored:null,languages:['en-US'],dev:false,registry,...over});
  for(const [tag,expected] of TABLE){
   expect(decide(PLANNED,{languages:[tag]}),tag).toBe(expected==='es-419'?'es-419':'en');
   const all=releasing(PLANNED,...PLANNED.map(l=>l.tag));
   expect(decide(all,{languages:[tag]}),tag).toBe(expected??'en');
  }
  expect(decide(PLANNED,{param:'pt-BR'})).toBe('pt-BR');expect(decide(PLANNED,{param:'pt-br'})).toBe('en');expect(decide(PLANNED,{param:'pt'})).toBe('en');
  expect(decide(PLANNED,{stored:'pt-BR',languages:['pt-BR']})).toBe('en');
  expect(decide(releasing(PLANNED,'pt-BR'),{stored:'pt-BR'})).toBe('pt-BR');
  // Only the first preference decides, and an unreleased first preference gives English, not the next language.
  expect(decide(PLANNED,{languages:['pt-BR','es-MX']})).toBe('en');expect(decide(releasing(PLANNED,'pt-BR'),{languages:['pt-BR','es']})).toBe('pt-BR');
  // A Traditional-Chinese browser opens English, and the selector offers Simplified once that is released.
  const zh=releasing(PLANNED,'zh-Hans');
  expect(decide(zh,{languages:['zh-TW']})).toBe('en');expect(selectorLanguages('en',zh).map(l=>l.tag)).toContain('zh-Hans');
 });
 it('lists English, the released languages and a preview\'s own language, by autonym (with the English name outside Latin script)',()=>{
  expect(selectorLanguages('en',PLANNED).map(l=>l.tag)).toEqual(['en','es-419']);
  expect(selectorLanguages('ja',PLANNED).map(l=>l.tag)).toEqual(['en','es-419','ja']);
  const all=releasing(PLANNED,...PLANNED.map(l=>l.tag));
  expect(selectorLanguages('en',[...all,ZH_HANT]).map(optionLabel)).toEqual(['English','Español','Português (Brasil)','Français','Bahasa Indonesia','हिन्दी (Hindi)','日本語 (Japanese)','简体中文 (Chinese, Simplified)','Русский (Russian)']);
  expect(selectorShown('en',PLANNED.slice(1))).toBe(false);expect(selectorShown('fr',PLANNED.slice(1))).toBe(true);expect(selectorShown('qps-cjk',all)).toBe(false);
 });
});
