import {describe,it,expect} from 'vitest';
import {decideLocale,HTML_LANG,type LocaleInputs} from './locale';
import {LANGUAGES,isReleased,selectorShown} from './languages';
import {nextAddress} from '../components/LanguageChoice';
import {releasing} from '../../tests/fixtures/i18n/registry';
const decide=(over:Partial<LocaleInputs>)=>decideLocale({param:null,stored:null,languages:['en-US'],dev:false,...over});
/** Spanish before its release: the registry as it was until ES-REL, with no language released (Front SC8: a per-language gate;
 * since PT-REL Portuguese, since FR-REL French, since ID-REL Indonesian, since HI-REL Hindi and since RU-REL Russian are released
 * too, so they are closed here as well). */
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
  expect(HTML_LANG).toEqual({en:'en','es-419':'es-419','pt-BR':'pt-BR',fr:'fr',id:'id',hi:'hi',ja:'ja','zh-Hans':'zh-Hans',ru:'ru',qps:'en','qps-cjk':'ja','qps-deva':'hi','qps-cyrl':'ru','qps-rtl':'ar'});
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
 it('Front ID-REL: Indonesian is released: every id and id-* browser and the legacy in, in-* (any case) open id; Malay, Javanese, Sundanese and en-ID do not; storage is honoured',()=>{
  expect(isReleased('id')).toBe(true);
  for(const languages of [['id'],['id-ID'],['ID-id'],['in'],['in-ID'],['id-ID','es-MX']])expect(decide({languages}),languages.join(',')).toBe('id');
  for(const languages of [['ms'],['ms-MY'],['ms-ID'],['zsm'],['jv'],['jv-ID'],['su'],['en-ID'],['en-US','id-ID']])expect(decide({languages}),languages.join(',')).toBe('en');
  expect(decide({languages:['id-ID','pt-BR']})).toBe('id');expect(decide({languages:['es-MX','id-ID']})).toBe('es-419');expect(decide({languages:['fr-FR','id-ID']})).toBe('fr');
  expect(decide({stored:'id',languages:['en-US']})).toBe('id');expect(decide({stored:'id',languages:['fr-FR']})).toBe('id');
  expect(decide({stored:'en',languages:['id-ID']})).toBe('en');expect(decide({stored:'pt-BR',languages:['in-ID']})).toBe('pt-BR');
  expect(decide({param:'id',stored:'fr',languages:['pt-BR']})).toBe('id');expect(decide({param:'en',languages:['id-ID']})).toBe('en');
  // ?lang= takes the exact tag only: `in` (the withdrawn code), ID and id-ID are no tag.
  for(const junk of ['ID','id-ID','in','in-ID','Id'])expect(decide({param:junk,languages:['en-US']}),junk).toBe('en');
  expect(HTML_LANG.id).toBe('id');expect(selectorShown('id')).toBe(true);
  // Before its release (ID0–ID-HELP) only ?lang=id reached it.
  const before=LANGUAGES.map(l=>l.tag==='id'?{...l,released:false}:l);
  for(const languages of [['id'],['id-ID'],['in-ID']])expect(decide({languages,registry:before}),languages.join(',')).toBe('en');
  expect(decide({stored:'id',languages:['id-ID'],registry:before})).toBe('en');expect(decide({param:'id',registry:before})).toBe('id');
 });
 it('Front HI-REL: Hindi is released: every hi and hi-* browser (any case) opens hi; en-IN, Urdu, Marathi and Nepali do not; storage is honoured',()=>{
  expect(isReleased('hi')).toBe(true);expect(HTML_LANG.hi).toBe('hi');expect(selectorShown('hi')).toBe(true);
  for(const languages of [['hi'],['hi-IN'],['HI-in'],['hi-Latn'],['hi-IN','es-MX']])expect(decide({languages}),languages.join(',')).toBe('hi');
  // en-IN, Urdu, Marathi, Nepali, Bhojpuri, Maithili, Awadhi, Rajasthani, Punjabi and Bengali are other languages (plan
  // front-i18n-hi.md §2), and only the first preference decides.
  for(const languages of [['en-IN'],['ur'],['ur-IN'],['mr'],['ne'],['bho'],['mai'],['awa'],['raj'],['pa'],['bn'],['en-IN','hi-IN']])expect(decide({languages}),languages.join(',')).toBe('en');
  expect(decide({languages:['hi-IN','pt-BR']})).toBe('hi');expect(decide({languages:['fr-FR','hi-IN']})).toBe('fr');
  expect(decide({stored:'hi',languages:['en-US']})).toBe('hi');expect(decide({stored:'hi',languages:['es-MX']})).toBe('hi');
  expect(decide({stored:'en',languages:['hi-IN']})).toBe('en');expect(decide({stored:'fr',languages:['hi-IN']})).toBe('fr');
  expect(decide({param:'hi',stored:'es-419',languages:['pt-BR']})).toBe('hi');expect(decide({param:'en',languages:['hi-IN']})).toBe('en');
  // ?lang= takes the exact tag only; other spellings are no tag (English), while the browser language matches in any case.
  for(const junk of ['HI','hi-IN','hi-in'])expect(decide({param:junk}),junk).toBe('en');
  // Before its release (HI0–HI-HELP) only ?lang=hi reached it.
  const before=LANGUAGES.map(l=>l.tag==='hi'?{...l,released:false}:l);
  for(const languages of [['hi'],['hi-IN'],['HI-in']])expect(decide({languages,registry:before}),languages.join(',')).toBe('en');
  expect(decide({stored:'hi',languages:['hi-IN'],registry:before})).toBe('en');expect(decide({param:'hi',registry:before})).toBe('hi');
 });
 it('Front JA-REL: Japanese is released: every ja and ja-* browser (any case) opens ja; jv, ryu and en-JP do not; storage is honoured',()=>{
  expect(isReleased('ja')).toBe(true);
  for(const languages of [['ja'],['ja-JP'],['JA-jp'],['ja-JP-u-ca-japanese'],['ja-JP','es-MX']])expect(decide({languages}),languages.join(',')).toBe('ja');
  // jv (Javanese), ryu (Okinawan) and en-JP (English in Japan) are not Japanese (plan front-i18n-ja.md §2).
  for(const languages of [['jv'],['ryu'],['en-JP'],['en-US','ja-JP']])expect(decide({languages}),languages.join(',')).toBe('en');
  expect(decide({languages:['es-MX','ja-JP']})).toBe('es-419');expect(decide({stored:'ja',languages:['en-US']})).toBe('ja');
  expect(decide({stored:'en',languages:['ja-JP']})).toBe('en');
  expect(decide({param:'ja',languages:['en-US']})).toBe('ja');expect(decide({param:'ja',stored:'fr',languages:['pt-BR']})).toBe('ja');
  // ?lang= takes the exact tag only; other spellings are no tag, so the browser decides.
  for(const junk of ['JA','ja-JP','jp','ja-jp'])expect(decide({param:junk,languages:['en-US']}),junk).toBe('en');
  expect(HTML_LANG.ja).toBe('ja');expect(selectorShown('ja')).toBe(true);
  // Before its release (JA0–JA-HELP) only ?lang=ja reached it.
  const before=LANGUAGES.map(l=>l.tag==='ja'?{...l,released:false}:l);
  for(const languages of [['ja'],['ja-JP'],['JA-jp']])expect(decide({languages,registry:before}),languages.join(',')).toBe('en');
  expect(decide({stored:'ja',languages:['ja-JP'],registry:before})).toBe('en');expect(decide({param:'ja',registry:before})).toBe('ja');
 });
 it('Front ZH0: Simplified Chinese is registered before its release: only ?lang=zh-Hans opens it; zh, zh-CN, zh-Hans-TW browsers and a stored zh-Hans get English',()=>{
  expect(isReleased('zh-Hans')).toBe(false);
  for(const languages of [['zh'],['zh-CN'],['zh-SG'],['zh-Hans-TW'],['ZH-cn','fr-FR']])expect(decide({languages}),languages.join(',')).toBe('en');
  expect(decide({stored:'zh-Hans',languages:['zh-CN']})).toBe('en');
  expect(decide({param:'zh-Hans',languages:['en-US']})).toBe('zh-Hans');expect(decide({param:'zh-Hans',stored:'fr',languages:['zh-TW']})).toBe('zh-Hans');
  for(const junk of ['zh','zh-CN','zh-hans','ZH-HANS','zh-Hant'])expect(decide({param:junk,languages:['en-US']}),junk).toBe('en');
  expect(HTML_LANG['zh-Hans']).toBe('zh-Hans');expect(selectorShown('zh-Hans')).toBe(true);
  // Once released (ZH-REL), Simplified browsers open it; Traditional browsers keep English until zh-Hant exists (decided 2026-11-09).
  const after=releasing(LANGUAGES,'zh-Hans');
  for(const languages of [['zh'],['zh-CN'],['zh-SG'],['zh-MY'],['zh-Hans-TW'],['ZH-cn']])expect(decide({languages,registry:after}),languages.join(',')).toBe('zh-Hans');
  for(const languages of [['zh-TW'],['zh-HK'],['zh-MO'],['zh-Hant'],['zh-Hant-CN'],['yue-HK'],['ko-KR'],['en-US','zh-CN']])expect(decide({languages,registry:after}),languages.join(',')).toBe('en');
  expect(decide({stored:'zh-Hans',languages:['zh-TW'],registry:after})).toBe('zh-Hans');
 });
 it('Front RU-REL: Russian is released: every ru and ru-* browser (any case) opens ru; Ukrainian, Belarusian, Kazakh and the other region languages do not; storage is honoured',()=>{
  expect(isReleased('ru')).toBe(true);
  for(const languages of [['ru'],['ru-RU'],['ru-UA'],['RU-ru'],['ru-KZ'],['ru-BY'],['ru-MD'],['ru-KZ','en-US'],['ru-RU','uk-UA']])expect(decide({languages}),languages.join(',')).toBe('ru');
  // Only the first preference decides: a Ukrainian browser that also lists Russian stays English.
  for(const languages of [['uk'],['uk-UA'],['be'],['be-BY'],['kk'],['kk-KZ'],['ky'],['uz'],['tg'],['tt'],['ba'],['cv'],['sah'],['os'],['hy'],['ka'],['az'],['ro-MD'],['rue'],['uk','ru'],['en-US','ru']])expect(decide({languages}),languages.join(',')).toBe('en');
  expect(decide({languages:['es-MX','ru-RU']})).toBe('es-419');expect(decide({languages:['id-ID','ru-RU']})).toBe('id');
  expect(decide({stored:'ru',languages:['en-US']})).toBe('ru');expect(decide({stored:'ru',languages:['uk-UA']})).toBe('ru');
  expect(decide({stored:'en',languages:['ru-RU']})).toBe('en');expect(decide({stored:'fr',languages:['ru-RU']})).toBe('fr');
  expect(decide({param:'ru',stored:'fr',languages:['pt-BR']})).toBe('ru');expect(decide({param:'en',languages:['ru-RU']})).toBe('en');
  // ?lang= takes the exact tag only.
  for(const junk of ['RU','ru-RU','ru-ru'])expect(decide({param:junk,languages:['en-US']}),junk).toBe('en');
  expect(HTML_LANG.ru).toBe('ru');expect(selectorShown('ru')).toBe(true);
  // Before its release (RU0–RU-HELP) only ?lang=ru reached it.
  const before=LANGUAGES.map(l=>l.tag==='ru'?{...l,released:false}:l);
  for(const languages of [['ru'],['ru-RU'],['ru-UA'],['RU-ru']])expect(decide({languages,registry:before}),languages.join(',')).toBe('en');
  expect(decide({stored:'ru',languages:['ru-RU'],registry:before})).toBe('en');expect(decide({param:'ru',registry:before})).toBe('ru');
 });
});
