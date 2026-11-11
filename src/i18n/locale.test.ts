import {describe,it,expect} from 'vitest';
import {decideLocale,HTML_LANG,type LocaleInputs} from './locale';
import {LANGUAGES,isReleased,selectorShown} from './languages';
import {nextAddress} from '../components/LanguageChoice';
import {releasing} from '../../tests/fixtures/i18n/registry';
const decide=(over:Partial<LocaleInputs>)=>decideLocale({param:null,stored:null,languages:['en-US'],dev:false,...over});
/** Spanish before its release: the registry as it was until ES-REL, with no language released (Front SC8: a per-language gate;
 * since PT-REL Portuguese and since FR-REL French are released too, so they are closed here as well). */
const UNRELEASED=LANGUAGES.map(l=>({...l,released:false}));
describe('Front ES0: the language of one load (user decisions 1 and 5, 2026-11-09)',()=>{
 it('Front ES-REL: Spanish is released, so the stored choice and the browser language decide and the selector is shown',()=>{
  expect(isReleased('es-419')).toBe(true);
  expect(selectorShown('en')).toBe(true);expect(selectorShown('es-419')).toBe(true);
 });
 it('a gate that is still closed (a later language before its release) keeps it hidden: only the ?lang= preview reaches it',()=>{
  for(const languages of [['es-MX'],['es'],['es-ES'],['es-419','en']])expect(decide({languages,registry:UNRELEASED})).toBe('en');
  expect(decide({stored:'es-419',languages:['es-MX'],registry:UNRELEASED})).toBe('en');
  expect(decide({param:'es-419',registry:UNRELEASED})).toBe('es-419');
  expect(decide({param:'en',languages:['es-MX'],registry:UNRELEASED})).toBe('en');
  // The same rules hold with Spanish released again (Front SC8's releasing helper).
  expect(decide({languages:['es-MX'],registry:releasing(UNRELEASED,'es-419')})).toBe('es-419');
 });
 it('after ES-REL: the link parameter, then the stored choice, then the first browser language',()=>{
  for(const languages of [['es-MX'],['es'],['es-ES'],['ES-ar'],['es-419','en']])expect(decide({languages})).toBe('es-419');
  for(const languages of [['en-US','es-MX'],['de-DE'],['et'],['eus'],['esp'],[]])expect(decide({languages})).toBe('en');
  expect(decide({stored:'en',languages:['es-MX']})).toBe('en');
  expect(decide({stored:'es-419',languages:['en-US']})).toBe('es-419');
  expect(decide({param:'en',stored:'es-419',languages:['es-MX']})).toBe('en');
  expect(decide({param:'es-419',stored:'en'})).toBe('es-419');
  for(const junk of ['es','ES-419','qps','de','','constructor','__proto__'])expect(decide({param:junk,stored:junk,languages:['en-US']})).toBe('en');
 });
 it('accepts the pseudo-locale only in the dev server and tests, never from storage',()=>{
  expect(decide({param:'qps'})).toBe('en');expect(decide({param:'qps',dev:true,registry:UNRELEASED})).toBe('qps');
  expect(decide({stored:'qps',dev:true})).toBe('en');
  expect(HTML_LANG).toEqual({en:'en','es-419':'es-419','pt-BR':'pt-BR',fr:'fr',qps:'en','qps-cjk':'ja','qps-deva':'hi','qps-cyrl':'ru','qps-rtl':'ar'});
 });
 it('shows the selector when it offers a choice: before a release only on that language\'s own preview (ES1 review 1, C3; SC8)',()=>{
  expect(selectorShown('en',UNRELEASED)).toBe(false);expect(selectorShown('es-419',UNRELEASED)).toBe(true);
  for(const pseudo of ['qps','qps-cjk','qps-deva','qps-cyrl','qps-rtl'])expect(selectorShown(pseudo),pseudo).toBe(false);
 });
 it('a language change keeps the route and carries ?lang when the choice was not stored or the address already has it',()=>{
  expect(nextAddress('https://openvireo.space/?lang=en#spectrum','es-419',false)).toBe('https://openvireo.space/?lang=es-419#spectrum');
  expect(nextAddress('https://openvireo.space/#spectrum','es-419',true)).toBe('https://openvireo.space/#spectrum');
  expect(nextAddress('https://openvireo.space/#spectrum','en',false)).toBe('https://openvireo.space/?lang=en#spectrum');
  expect(nextAddress('https://openvireo.space/?lang=en#x','es-419',true)).toBe('https://openvireo.space/?lang=es-419#x');
 });
 it('Front PT-REL: Brazilian Portuguese is released: every pt and pt-* browser (any case) opens pt-BR, Galician does not, storage is honoured',()=>{
  expect(isReleased('pt-BR')).toBe(true);
  for(const languages of [['pt-BR'],['pt'],['pt-br'],['pt-PT'],['pt-AO'],['pt-MZ'],['PT-br','es-MX']])expect(decide({languages}),languages.join(',')).toBe('pt-BR');
  expect(decide({languages:['gl']})).toBe('en');expect(decide({languages:['es-MX','pt-BR']})).toBe('es-419');expect(decide({languages:['en-US','pt-BR']})).toBe('en');
  expect(decide({stored:'pt-BR',languages:['en-US']})).toBe('pt-BR');expect(decide({stored:'pt-BR',languages:['es-MX']})).toBe('pt-BR');
  expect(decide({stored:'en',languages:['pt-BR']})).toBe('en');expect(decide({stored:'es-419',languages:['pt-BR']})).toBe('es-419');
  expect(decide({param:'pt-BR',stored:'es-419',languages:['es-MX']})).toBe('pt-BR');expect(decide({param:'en',languages:['pt-BR']})).toBe('en');
  // ?lang= takes the exact tag only; other spellings are no tag (English), while the browser language matches in any case.
  for(const junk of ['pt','pt-br','PT-BR','pt-PT'])expect(decide({param:junk,languages:['en-US']}),junk).toBe('en');
  expect(HTML_LANG['pt-BR']).toBe('pt-BR');expect(selectorShown('pt-BR')).toBe(true);
  // Before its release (PT0–PT-HELP) only ?lang=pt-BR reached it.
  const before=LANGUAGES.map(l=>l.tag==='pt-BR'?{...l,released:false}:l);
  for(const languages of [['pt-BR'],['pt'],['pt-PT']])expect(decide({languages,registry:before}),languages.join(',')).toBe('en');
  expect(decide({stored:'pt-BR',languages:['pt-BR'],registry:before})).toBe('en');expect(decide({param:'pt-BR',registry:before})).toBe('pt-BR');
 });
 it('Front FR-REL: French is released: every fr and fr-* browser (any case) opens fr; frr, fur, br and oc do not; storage is honoured',()=>{
  expect(isReleased('fr')).toBe(true);
  for(const languages of [['fr'],['fr-FR'],['fr-CA'],['fr-BE'],['FR-ch'],['fr-LU'],['fr-SN'],['fr-BE','es-MX']])expect(decide({languages}),languages.join(',')).toBe('fr');
  // frr (North Frisian), fur (Friulian), br (Breton), oc (Occitan) and wa (Walloon) are other languages (plan front-i18n-fr.md §2).
  for(const languages of [['frr'],['fur'],['br'],['oc'],['wa'],['en-US','fr-FR']])expect(decide({languages}),languages.join(',')).toBe('en');
  expect(decide({languages:['fr-CA','pt-BR']})).toBe('fr');expect(decide({languages:['es-MX','fr-FR']})).toBe('es-419');expect(decide({languages:['pt-BR','fr-FR']})).toBe('pt-BR');
  expect(decide({stored:'fr',languages:['en-US']})).toBe('fr');expect(decide({stored:'fr',languages:['pt-BR']})).toBe('fr');
  expect(decide({stored:'en',languages:['fr-FR']})).toBe('en');expect(decide({stored:'es-419',languages:['fr-CA']})).toBe('es-419');
  expect(decide({param:'fr',stored:'es-419',languages:['pt-BR']})).toBe('fr');expect(decide({param:'en',languages:['fr-FR']})).toBe('en');
  // ?lang= takes the exact tag only; other spellings are no tag (English), while the browser language matches in any case.
  for(const junk of ['FR','fr-FR','fr-CA','fr-fr'])expect(decide({param:junk,languages:['en-US']}),junk).toBe('en');
  expect(HTML_LANG.fr).toBe('fr');expect(selectorShown('fr')).toBe(true);
  // Before its release (FR0–FR-HELP) only ?lang=fr reached it.
  const before=LANGUAGES.map(l=>l.tag==='fr'?{...l,released:false}:l);
  for(const languages of [['fr'],['fr-FR'],['fr-CA']])expect(decide({languages,registry:before}),languages.join(',')).toBe('en');
  expect(decide({stored:'fr',languages:['fr-FR'],registry:before})).toBe('en');expect(decide({param:'fr',registry:before})).toBe('fr');
 });
});
