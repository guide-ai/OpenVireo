import {existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {HELP_FILES} from '../help/helpFiles';
import {LANGUAGES,SOURCE_LANGUAGE,failureNotice,isReleased,matchLanguage,optionLabel,selectorLanguages,selectorShown,type LanguageEntry} from './languages';
import {decideLocale,HTML_LANG} from './locale';
import {PLANNED,ZH_HANT_PREVIEW,releasing} from '../../tests/fixtures/i18n/registry';
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
  expect(problems(PLANNED)).toEqual([]);expect(problems([...LANGUAGES,PARTIAL])).toEqual([]);
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
  // Front PT0 registered Brazilian Portuguese before its release (a ?lang=pt-BR preview only); Front PT-REL released it. Front FR0
  // registered French before its release; Front FR-REL released it. Front ID0 registered Indonesian before its release; Front ID-REL released it. Front HI0 registered Hindi;
  // Front HI-REL released it. Front JA0 registered Japanese (released by Front JA-REL), Front ZH0 Simplified Chinese (released by
  // Front ZH-REL), Front ZT0 Traditional Chinese (released by Front ZT-REL) and Front RU0 Russian (released by Front RU-REL).
  expect(LANGUAGES.map(l=>[l.tag,l.released])).toEqual([['es-419',true],['pt-BR',true],['fr',true],['id',true],['hi',true],['ja',true],['zh-Hans',true],['zh-Hant',true],['ru',true]]);
  for(const tag of ['es','es-MX','es-ES','ES-ar','es-419','es-Latn-MX'])expect(matchLanguage(tag)?.tag,tag).toBe('es-419');
  for(const tag of ['','en','en-US','esp','eus','et','ca-ES'])expect(matchLanguage(tag),tag).toBeUndefined();
  // Front FR0: fr-ES is French spoken in Spain, so it asks for French (released since FR-REL).
  expect(matchLanguage('fr-ES')?.tag).toBe('fr');expect(isReleased('fr')).toBe(true);
  expect(HTML_LANG['es-419']).toBe('es-419');expect(isReleased('es-419')).toBe(true);expect(isReleased('en')).toBe(false);
  expect(selectorLanguages('en').map(optionLabel)).toEqual(['English','Español','Português (Brasil)','Français','Bahasa Indonesia','हिन्दी (Hindi)','日本語 (Japanese)','简体中文 (Simplified Chinese)','繁體中文 (Traditional Chinese)','Русский (Russian)']);expect(SOURCE_LANGUAGE.tag).toBe('en');
  expect(failureNotice('language','es-419')).toEqual({en:'Spanish could not be loaded; English is shown. Reload to try again.',own:'No se pudo cargar el español; se muestra en inglés. Recarga para intentarlo de nuevo.',lang:'es-419'});
  expect(failureNotice('area','es-419')).toEqual({en:'Part of the Spanish text could not be loaded; that part is shown in English. Reload to try again.',own:'No se pudo cargar parte del texto en español; esa parte se muestra en inglés. Recarga para intentarlo de nuevo.',lang:'es-419'});
  // Front ID0: Indonesian's notices (plan §2), and `in` (the withdrawn ISO 639 code) asks for it; Malay does not.
  expect(failureNotice('language','id')).toEqual({en:'Indonesian could not be loaded; English is shown. Reload to try again.',own:'Bahasa Indonesia tidak dapat dimuat; situs ditampilkan dalam bahasa Inggris. Muat ulang untuk mencoba lagi.',lang:'id'});
  expect(failureNotice('area','id')?.own).toBe('Sebagian teks bahasa Indonesia tidak dapat dimuat; bagian itu ditampilkan dalam bahasa Inggris. Muat ulang untuk mencoba lagi.');
  for(const tag of ['id','id-ID','ID-id','in','in-ID'])expect(matchLanguage(tag)?.tag,tag).toBe('id');
  for(const tag of ['ms','ms-MY','ms-ID','zsm','jv','su','en-ID','ind'])expect(matchLanguage(tag),tag).toBeUndefined();
  expect(isReleased('id')).toBe(true); // Front ID-REL
  // Front HI0: Hindi is registered with its own notices and the selector label «हिन्दी (Hindi)»; Front HI-REL released it.
  expect(failureNotice('language','hi')).toEqual({en:'Hindi could not be loaded; English is shown. Reload to try again.',own:'हिन्दी लोड नहीं हो सकी; साइट अंग्रेज़ी में दिखाई जा रही है। फिर से कोशिश करने के लिए पेज को दोबारा लोड करें।',lang:'hi'});
  expect(isReleased('hi')).toBe(true);expect(optionLabel(LANGUAGES.find(l=>l.tag==='hi')!)).toBe('हिन्दी (Hindi)');
  expect(selectorLanguages('hi').map(optionLabel)).toEqual(['English','Español','Português (Brasil)','Français','Bahasa Indonesia','हिन्दी (Hindi)','日本語 (Japanese)','简体中文 (Simplified Chinese)','繁體中文 (Traditional Chinese)','Русский (Russian)']);// registry order; Japanese released since JA-REL, Simplified Chinese since ZH-REL, Traditional Chinese since ZT-REL, Russian since RU-REL
  // Front JA0: Japanese's notices (plan front-i18n-ja.md §2).
  expect(failureNotice('language','ja')).toEqual({en:'Japanese could not be loaded; English is shown. Reload to try again.',own:'日本語を読み込めなかったため、英語で表示しています。再読み込みしてもう一度お試しください。',lang:'ja'});
  expect(matchLanguage('ja-JP')?.tag).toBe('ja');expect(isReleased('ja')).toBe(true);// released since Front JA-REL
  // Front FR0: French's notices, with U+202F before «;» (plan §2).
  // Front RU0: Russian's notices (plan §2); Front RU-REL released it.
  expect(isReleased('ru')).toBe(true);expect(matchLanguage('ru-UA')?.tag).toBe('ru');expect(matchLanguage('uk')).toBeUndefined();
  expect(failureNotice('area','ru')).toEqual({en:'Part of the Russian text could not be loaded; that part is shown in English. Reload to try again.',own:'Не удалось загрузить часть текста на русском языке; эта часть показана на английском. Перезагрузите страницу, чтобы попробовать ещё раз.',lang:'ru'});
  expect(failureNotice('language','fr')).toEqual({en:'French could not be loaded; English is shown. Reload to try again.',own:'Impossible de charger le français\u202f; le site s’affiche en anglais. Rechargez la page pour réessayer.',lang:'fr'});
  // Front ZH0: Simplified Chinese's notices (plan front-i18n-zh.md §2); Front ZH-REL released it, with the selector label
  // «简体中文 (Simplified Chinese)»: Simplified browsers open it, Traditional ones do not.
  expect(failureNotice('language','zh-Hans')).toEqual({en:'Simplified Chinese could not be loaded; English is shown. Reload to try again.',own:'无法载入简体中文；已改为显示英文。请刷新页面重试。',lang:'zh-Hans'});
  expect(isReleased('zh-Hans')).toBe(true);expect(optionLabel(LANGUAGES.find(l=>l.tag==='zh-Hans')!)).toBe('简体中文 (Simplified Chinese)');
  expect(matchLanguage('zh-CN')?.tag).toBe('zh-Hans');
  // Front ZT0: Traditional Chinese is registered (Taiwan standard, user decision of 2026-11-19), with its own notices and the selector
  // label «繁體中文 (Traditional Chinese)»; zh-TW, zh-HK, zh-MO and zh-Hant ask for it, a script subtag beating the region (zh-Hans-TW
  // is Simplified, zh-Hant-CN Traditional). Front ZT-REL released it.
  expect(failureNotice('language','zh-Hant')).toEqual({en:'Traditional Chinese could not be loaded; English is shown. Reload to try again.',own:'無法載入繁體中文；已改為顯示英文。請重新整理頁面再試一次。',lang:'zh-Hant'});
  expect(failureNotice('area','zh-Hant')?.own).toBe('部分繁體中文文字無法載入；該部分以英文顯示。請重新整理頁面再試一次。');
  expect(isReleased('zh-Hant')).toBe(true);expect(optionLabel(LANGUAGES.find(l=>l.tag==='zh-Hant')!)).toBe('繁體中文 (Traditional Chinese)');
  for(const tag of ['zh-TW','zh-HK','zh-MO','zh-Hant','zh-Hant-CN','ZH-tw'])expect(matchLanguage(tag)?.tag,tag).toBe('zh-Hant');
  for(const tag of ['zh','zh-CN','zh-Hans-TW'])expect(matchLanguage(tag)?.tag,tag).toBe('zh-Hans');
 });
});
describe('Front SC8: detection for the languages to come (scripts plan §7, pt-BR plan §4)',()=>{
 // [browser tag, registered language it asks for]; undefined: none (English).
 const TABLE:readonly (readonly [string,string|undefined])[]=[
  ['es','es-419'],['es-MX','es-419'],['pt','pt-BR'],['pt-BR','pt-BR'],['pt-br','pt-BR'],['pt-PT','pt-BR'],['pt-AO','pt-BR'],['gl',undefined],
  ['fr','fr'],['fr-CA','fr'],['id','id'],['id-ID','id'],['ms',undefined],
  // Front ID0 (plan front-i18n-id.md §2): the legacy code `in` opens Indonesian; Malay, Javanese, Sundanese and en-ID stay English.
  ['in','id'],['in-ID','id'],['ID-id','id'],['ms-MY',undefined],['ms-ID',undefined],['zsm',undefined],['jv',undefined],['su',undefined],['en-ID',undefined],['hi','hi'],['hi-IN','hi'],['HI-in','hi'],['hi-Latn','hi'],['en-IN',undefined],['ur',undefined],['ur-IN',undefined],['mr',undefined],['ne',undefined],['bho',undefined],['ja','ja'],['ja-JP','ja'],['JA-jp','ja'],['ja-JP-u-ca-japanese','ja'],['ryu',undefined],['en-JP',undefined],
  ['ru','ru'],['ru-RU','ru'],['uk',undefined],['be',undefined],['kk',undefined],
  // Front RU0 (plan §2): every ru-* region asks for Russian; Ukrainian, Belarusian and the other region languages do not.
  ['RU-ru','ru'],['ru-UA','ru'],['ru-KZ','ru'],['ru-BY','ru'],['ru-MD','ru'],['uk-UA',undefined],['be-BY',undefined],['kk-KZ',undefined],['ky',undefined],['uz',undefined],['tg',undefined],['tt',undefined],['ba',undefined],['cv',undefined],['sah',undefined],['os',undefined],['hy',undefined],['ka',undefined],['az',undefined],['ro-MD',undefined],['rue',undefined],
  ['zh-Hans','zh-Hans'],['zh-Hans-CN','zh-Hans'],['zh-Hans-TW','zh-Hans'],['zh-CN','zh-Hans'],['zh-SG','zh-Hans'],['zh-MY','zh-Hans'],['zh','zh-Hans'],['ZH-cn','zh-Hans'],
  // Traditional Chinese: zh-Hant (Front ZT0's line, released by ZT-REL; before, these browsers got English, decision Q5, never Simplified).
  ['zh-TW','zh-Hant'],['zh-HK','zh-Hant'],['zh-MO','zh-Hant'],['zh-Hant','zh-Hant'],['zh-Hant-CN','zh-Hant'],['ZH-tw','zh-Hant'],['zh-hant-tw','zh-Hant'],['yue',undefined],['yue-HK',undefined],
  ['en-US',undefined],['',undefined],
 ];
 it('maps each browser tag to the language it asks for, released or not; the most specific range wins',()=>{
  for(const [tag,expected] of TABLE)expect(matchLanguage(tag,PLANNED)?.tag,tag).toBe(expected);
  // zh-Hant's ranges take Traditional Chinese, and the script subtag beats the region.
  for(const tag of ['zh-TW','zh-HK','zh-MO','zh-Hant','zh-Hant-CN','ZH-tw'])expect(matchLanguage(tag,PLANNED)?.tag,tag).toBe('zh-Hant');
  for(const tag of ['zh','zh-CN','zh-Hans-TW'])expect(matchLanguage(tag,PLANNED)?.tag,tag).toBe('zh-Hans');
 });
 it('opens a language from the browser only once it is released; before that only its ?lang= preview, never storage',()=>{
  const decide=(registry:readonly LanguageEntry[],over:Partial<Parameters<typeof decideLocale>[0]>)=>decideLocale({param:null,stored:null,languages:['en-US'],dev:false,registry,...over});
  for(const [tag,expected] of TABLE){
   // Front ZT-REL: every planned language is released, so the browser opens the language it asks for.
   expect(decide(PLANNED,{languages:[tag]}),tag).toBe(expected??'en');
   const all=releasing(PLANNED,...PLANNED.map(l=>l.tag));
   expect(decide(all,{languages:[tag]}),tag).toBe(expected??'en');
  }
  // Front FR-REL: French is released, so the unreleased planned language of these rows was Indonesian (id), as PT-REL moved them to
  // fr; Front ID-REL released Indonesian, Front HI-REL Hindi, Front JA-REL Japanese, Front RU-REL Russian and Front ZH-REL
  // Simplified Chinese, so these rows used Traditional Chinese (Front ZT0's line), the last language unreleased; since Front ZT-REL
  // released it too, they use its line as it was before (the fixture's ZH_HANT_PREVIEW, released:false).
  const hant=PLANNED.map(l=>l.tag==='zh-Hant'?ZH_HANT_PREVIEW:l);
  expect(decide(hant,{param:'zh-Hant'})).toBe('zh-Hant');expect(decide(hant,{param:'ZH-HANT'})).toBe('en');expect(decide(PLANNED,{param:'pt-br'})).toBe('en');
  expect(decide(hant,{stored:'zh-Hant',languages:['zh-TW']})).toBe('en');
  expect(decide(releasing(hant,'zh-Hant'),{stored:'zh-Hant'})).toBe('zh-Hant');expect(decide(PLANNED,{stored:'pt-BR'})).toBe('pt-BR');expect(decide(PLANNED,{stored:'fr'})).toBe('fr');
  expect(decide(PLANNED,{stored:'zh-Hans',languages:['en-US']})).toBe('zh-Hans');expect(decide(PLANNED,{languages:['zh-CN']})).toBe('zh-Hans');
  expect(decide(PLANNED,{stored:'id'})).toBe('id');expect(decide(PLANNED,{languages:['id-ID']})).toBe('id');expect(decide(PLANNED,{languages:['in-ID']})).toBe('id');
  expect(decide(PLANNED,{stored:'hi',languages:['en-US']})).toBe('hi');expect(decide(PLANNED,{languages:['hi-IN']})).toBe('hi');
  expect(decide(PLANNED,{stored:'ja',languages:['en-US']})).toBe('ja');expect(decide(PLANNED,{languages:['ja-JP']})).toBe('ja');
  // Front RU-REL: Russian is released; a Ukrainian browser that also lists Russian stays English (only the first preference decides).
  expect(decide(PLANNED,{stored:'ru'})).toBe('ru');expect(decide(PLANNED,{languages:['ru-RU']})).toBe('ru');expect(decide(PLANNED,{languages:['uk','ru']})).toBe('en');
  // Only the first preference decides, and an unreleased first preference gives English, not the next language.
  expect(decide(hant,{languages:['zh-TW','pt-BR']})).toBe('en');expect(decide(releasing(hant,'zh-Hant'),{languages:['zh-TW','pt-BR']})).toBe('zh-Hant');
  expect(decide(PLANNED,{languages:['zh-CN','pt-BR']})).toBe('zh-Hans');
  expect(decide(PLANNED,{languages:['pt-BR','es']})).toBe('pt-BR');expect(decide(PLANNED,{languages:['fr-CA','pt-BR']})).toBe('fr');
  expect(decide(PLANNED,{languages:['hi-IN','pt-BR']})).toBe('hi');expect(decide(PLANNED,{languages:['en-IN','hi-IN']})).toBe('en');
  // Before ZT-REL a Traditional-Chinese browser opened English, and the selector offered Simplified (decided 2026-11-09); since
  // ZT-REL it opens Traditional Chinese, and a script subtag still beats the region.
  expect(decide(hant,{languages:['zh-TW']})).toBe('en');expect(selectorLanguages('en',hant).map(l=>l.tag)).toContain('zh-Hans');
  for(const tag of ['zh-TW','zh-HK','zh-MO','zh-Hant','zh-Hant-CN'])expect(decide(PLANNED,{languages:[tag]}),tag).toBe('zh-Hant');
  expect(decide(PLANNED,{languages:['zh-Hans-TW']})).toBe('zh-Hans');
 });
 it('lists English, the released languages and a preview\'s own language, by autonym (with the English name outside Latin script)',()=>{
  expect(selectorLanguages('en',PLANNED).map(l=>l.tag)).toEqual(['en','es-419','pt-BR','fr','id','hi','ja','zh-Hans','zh-Hant','ru']);
  // Front ZT-REL: every planned language is released, so the preview's own language here is Traditional Chinese as it was before
  // its release (ZH_HANT_PREVIEW), placed in registry order between 简体中文 and Русский; English alone lists it no more.
  const hant=PLANNED.map(l=>l.tag==='zh-Hant'?ZH_HANT_PREVIEW:l);
  expect(selectorLanguages('en',hant).map(l=>l.tag)).toEqual(['en','es-419','pt-BR','fr','id','hi','ja','zh-Hans','ru']);
  expect(selectorLanguages('zh-Hant',hant).map(l=>l.tag)).toEqual(['en','es-419','pt-BR','fr','id','hi','ja','zh-Hans','zh-Hant','ru']);
  const all=releasing(PLANNED,...PLANNED.map(l=>l.tag));
  expect(selectorLanguages('en',all).map(optionLabel)).toEqual(['English','Español','Português (Brasil)','Français','Bahasa Indonesia','हिन्दी (Hindi)','日本語 (Japanese)','简体中文 (Simplified Chinese)','繁體中文 (Traditional Chinese)','Русский (Russian)']);
  // Only unreleased languages (none since ZT-REL, so Traditional Chinese as it was before): English alone shows no selector; a
  // preview shows it.
  expect(PLANNED.filter(l=>!l.released)).toEqual([]);const unreleased=[ZH_HANT_PREVIEW];
  expect(selectorShown('en',unreleased)).toBe(false);expect(selectorShown('zh-Hant',unreleased)).toBe(true);expect(selectorShown('qps-cjk',all)).toBe(false);
 });
});
