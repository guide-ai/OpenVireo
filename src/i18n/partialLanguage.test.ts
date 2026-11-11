import {afterEach,describe,expect,it} from 'vitest';
import en from './en.json';
import {activateLocale,t,uiLanguage} from './index';
import {languageFailure} from './active';
import {settleLanguage,type SettlePage,type Settled} from './settle';
import {resolveMessages} from './registry';
import {vireo} from './vireo';
import {loadArea} from './areas';
import {LANGUAGES,failureNotice,selectorLanguages,selectorShown} from './languages';
import {decideLocale} from './locale';
import {SOUND_MESSAGES_EN} from '../sound/SoundMessages';
import {FIXTURE} from '../../tests/fixtures/i18n/qaa-xa/index';
import {PARTIAL} from '../../tests/fixtures/i18n/partial';
import messages from '../../tests/fixtures/i18n/qaa-xa/qaa-xa.json';
// Front SC8 (docs/I18N.md, "Script groundwork: the language registry, detection and selector (SC8)"): a second language before its
// release, partial, reached only by its `?lang=` preview, runs through the same boot, catalog, maps and areas as Spanish. The
// language is the test-only fixture tests/fixtures/i18n/qaa-xa/ with its registry entry injected; nothing is added to the app.
const REGISTRY=[...LANGUAGES,PARTIAL];
afterEach(()=>{activateLocale(null);});
function page(over:Partial<SettlePage>={}){
 const lang:string[]=[],titles:string[]=[],errors:string[]=[];
 const p:SettlePage={search:'',stored:()=>null,languages:['en-US'],dev:true,bundleFor:l=>l===PARTIAL.tag?FIXTURE:null,registry:REGISTRY,
  setLang:x=>{lang.push(x);},setTitle:x=>{titles.push(x);},error:m=>{errors.push(m);},...over};
 return {p,lang,titles,errors};
}
describe('Front SC8: a partial language before its release (test fixture qaa-XA)',()=>{
 it('is reached only by its ?lang= preview: never by the browser language or a stored choice, never offered otherwise',()=>{
  const decide=(over:Partial<Parameters<typeof decideLocale>[0]>)=>decideLocale({param:null,stored:null,languages:['en-US'],dev:false,registry:REGISTRY,...over});
  expect(decide({param:'qaa-XA'})).toBe('qaa-XA');
  expect(decide({languages:['qaa'],stored:null})).toBe('en');expect(decide({languages:['qaa-XA']})).toBe('en');
  expect(decide({stored:'qaa-XA'})).toBe('en');expect(decide({stored:'qaa-XA',languages:['es-MX']})).toBe('es-419');
  // Without its registry entry the tag is no language at all.
  expect(decideLocale({param:'qaa-XA',stored:null,languages:['en-US'],dev:false})).toBe('en');
  // The released languages (Spanish, and Brazilian Portuguese since PT-REL) are offered; the fixture only on its own preview.
  expect(selectorLanguages('en',REGISTRY).map(l=>l.tag)).toEqual(['en','es-419','pt-BR']);
  expect(selectorLanguages('es-419',REGISTRY).map(l=>l.tag)).toEqual(['en','es-419','pt-BR']);
  expect(selectorLanguages('qaa-XA',REGISTRY).map(l=>l.tag)).toEqual(['en','es-419','pt-BR','qaa-XA']);
  expect(selectorShown('qaa-XA',REGISTRY)).toBe(true);
 });
 it('settles a ?lang=qaa-XA load: <html lang> and the title from its registry entry and catalog, its partial catalog completed with English',()=>{
  const {p,lang,titles,errors}=page({search:'?lang=qaa-XA'});
  expect(settleLanguage(p) as Settled).toEqual({language:'qaa-XA',failed:null});
  expect([lang,titles,errors]).toEqual([['qaa-XA'],[messages['app.documentTitle']],[]]);
  expect(uiLanguage()).toBe('qaa-XA');
  expect(t('project.save')).toBe(messages['project.save']);expect(t('sky.title')).toBe(en['sky.title']);
  expect(vireo('Close')).toBe('Fermi ĉion');expect(vireo('Open')).toBe('Open');
 });
 it('completes a partial map with English in the dev server and tests, instead of throwing (the gate of src/i18n/registry.ts)',()=>{
  settleLanguage(page({search:'?lang=qaa-XA'}).p);
  const sound=resolveMessages('sound',SOUND_MESSAGES_EN);
  expect(sound.title).toBe('Sonefektoj ĉe la observatorio');expect(sound.toggle).toBe(SOUND_MESSAGES_EN.toggle);expect(sound.channel).toEqual(SOUND_MESSAGES_EN.channel);
  // A map of a wrong shape still throws in the dev server and tests, released or not.
  activateLocale({...FIXTURE,maps:{sound:{title:'x',extra:'y'} as never}});
  expect(()=>resolveMessages('sound',SOUND_MESSAGES_EN)).toThrow('does not match the English map');
  // Released, the same partial map is refused: a released language must be complete (and so must its catalog).
  expect(()=>activateLocale({...FIXTURE,language:'es-419'})).toThrow('Invalid message catalog keys');
  activateLocale({...FIXTURE,language:'es-419',messages:{...en,...FIXTURE.messages}});
  expect(()=>resolveMessages('sound',SOUND_MESSAGES_EN)).toThrow('does not match the English map');
 });
 it('a split bundle whose areas are empty resolves them at once, with no chunk and no pending text',async()=>{
  const empty=(area:string)=>()=>Promise.resolve({default:Object.freeze({language:'qaa-XA',area,messages:{},maps:{}})});
  activateLocale({language:'qaa-XA',messages:{'project.save':messages['project.save']},originals:{},areas:{fits:empty('fits'),radio:empty('radio')},mapModules:{},complete:false});
  await loadArea('fits');
  expect(t('fits.title')).toBe(en['fits.title']);expect(t('project.save')).toBe(messages['project.save']);
  // A key of an area that has not arrived is English without the tripwire: an incomplete catalog cannot tell it from an untranslated one.
  expect(t('radio.title')).toBe(en['radio.title']);
 });
 it('a failed chunk shows its failure notice in English and in its own words',()=>{
  const {p,errors}=page({search:'?lang=qaa-XA',bundleFor:()=>{throw new Error('chunk failed');}});
  expect(settleLanguage(p)).toEqual({language:'en',failed:'qaa-XA'});expect(languageFailure()).toBe('qaa-XA');expect(errors).toHaveLength(1);
  expect(failureNotice('language','qaa-XA',REGISTRY)).toEqual({en:'Test language could not be loaded; English is shown. Reload to try again.',own:PARTIAL.notices.language,lang:'qaa-XA'});
  expect(failureNotice('area','qaa-XA',REGISTRY)?.en).toBe('Part of the Test language text could not be loaded; that part is shown in English. Reload to try again.');
 });
});
