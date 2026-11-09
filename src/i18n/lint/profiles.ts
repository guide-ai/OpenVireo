/** Front SC4 (plan analysis/front-plans/front-i18n-scripts.md §6): one LocaleProfile per planned language. The values are
 * the plan's first proposal [R]/[I]; each language's XX0 sub-front calibrates them on its first batch (length bands above
 * all) and adds its glossary. */
import {SIMPLIFIED_ONLY,TRADITIONAL_ONLY} from './hanVariants';
import {wordSource,type Boundary,type GlyphClass,type LocaleProfile,type MarkPair,type Pattern} from './rules';
/** How each language addresses the student. OPEN QUESTIONS (plan §13, Q1–Q3): these are the plan's recommendations until the
 * user decides; flipping one value here flips that language's register lint (profileFor builds the patterns from it).
 * - ja: polite です/ます (Q3, named in the brief) or plain だ/である;
 * - hi: आप (Q3, named in the brief) or तुम;
 * - ru: lower-case «вы» (Q1, recommended) or «ты» (closer to the Spanish «tú» decision);
 * - zh (zh-Hans and zh-Hant): 你 (Q2, recommended) or 您. */
export type Registers=Readonly<{ja:'desu-masu'|'plain';hi:'aap'|'tum';ru:'vy'|'ty';zh:'ni'|'nin'}>;
export const REGISTER:Registers={ja:'desu-masu',hi:'aap',ru:'vy',zh:'ni'};
export type ProfileId='ja'|'hi'|'zh-Hans'|'zh-Hant'|'ru';
export const PROFILE_IDS:readonly ProfileId[]=['ja','hi','zh-Hans','zh-Hant','ru'];

const words=(list:readonly string[],boundary:Boundary,flags='iu')=>new RegExp(list.map(w=>wordSource(w.normalize('NFC'),boundary)).join('|'),flags);
const BASE_GLYPHS:readonly GlyphClass[]=['›','…','↗','▸','·','—','–','×','✳'].map(m=>({marks:[m]}));
const glyphsWith=(changes:Readonly<Record<string,GlyphClass>>,extra:readonly GlyphClass[]=[])=>[...BASE_GLYPHS.map(c=>changes[c.marks[0]]??c),...extra];
const pair=(open:string,close:string,english=false):MarkPair=>english?{open,close,english}:{open,close};
const PARENS=pair('(',')',true),CURLY=pair('“','”',true);

// Japanese and Chinese typography: full-width punctuation in running text, no half-width or full-width look-alikes, and no
// manual space between CJK and Latin text, digits or a placeholder (the browser spaces them).
function cjkTypography(cjk:string,fullWidth:string):Pattern[]{
 return [
  {label:'ASCII punctuation after a CJK character',pattern:new RegExp(`(?<=${cjk})[,.:;?!]`,'u'),use:`use the full-width form (${fullWidth})`},
  {label:'ASCII parenthesis next to CJK text',pattern:new RegExp(`(?<=${cjk})[()]|[()](?=${cjk})`,'u'),use:'use （ ）'},
  {label:'full-width Latin letter or digit',pattern:/[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/u,use:'use ASCII letters and digits'},
  {label:'half-width katakana or punctuation',pattern:/[\uff61-\uff9f]/u,use:'use the full-width form'},
  {label:'space between CJK and Latin text or a digit',pattern:new RegExp(`(?<=${cjk})[ \\u00a0]+(?=[\\p{sc=Latn}\\p{N}{«])|(?<=[\\p{sc=Latn}\\p{N}}»])[ \\u00a0]+(?=${cjk})`,'u'),use:'write them together'},
 ];
}
const JA_LETTER='[\\p{sc=Han}\\p{sc=Hira}\\p{sc=Kana}\\u30fc]',HAN='\\p{sc=Han}';

function japaneseRegister(setting:Registers['ja']):Pattern[]{
 const pronoun:Pattern={label:'second-person pronoun',pattern:/あなた|貴方|君|お前|おまえ/u,use:'leave the reader implicit'};
 // Only sentences that end in 。 are read: labels, headings and buttons carry no 。 and may use the dictionary form.
 return setting==='desu-masu'
  ?[{label:'plain-form sentence end',pattern:/(?:だ|(?<![まで]し)た|る|ない|(?<!ょ)う)(?=。)/u,use:'end sentences in the polite です/ます form'},pronoun]
  :[{label:'polite sentence end',pattern:/(?:です|ます|ました|ません|でした|でしょう|ください)(?=。)/u,use:'end sentences in the plain form'},pronoun];
}
function hindiRegister(setting:Registers['hi']):Pattern[]{
 const tum=['तू','तुम','तुम्हारा','तुम्हारी','तुम्हारे','तुम्हें','तुमको','तुमसे','तेरा','तेरी','तेरे','तुझे','तुझको'];
 const tumImperatives=['करो','देखो','चुनो','खोलो','दबाओ','लिखो','रखो','बताओ','सहेजो','चलाओ','हटाओ','भरो','पढ़ो','जाँचो','बदलो','डालो','मापो','रोको','जोड़ो'];
 const aap=['आप','आपका','आपकी','आपके','आपको','आपने','आपसे'];
 const aapImperatives=['कीजिए','करिए','देखिए','चुनिए','खोलिए','दबाइए','लिखिए','रखिए','बताइए','सहेजिए','चलाइए','हटाइए','भरिए','पढ़िए','जाँचिए','बदलिए'];
 return setting==='aap'
  ?[{label:'तुम/तू pronoun',pattern:words(tum,'letters-marks'),use:'address the student as आप'},{label:'तुम imperative',pattern:words(tumImperatives,'letters-marks'),use:'use the आप form (-इए, -एँ)'}]
  :[{label:'आप pronoun',pattern:words(aap,'letters-marks'),use:'address the student as तुम'},{label:'आप imperative',pattern:words(aapImperatives,'letters-marks'),use:'use the तुम form (-ओ)'}];
}
function russianRegister(setting:Registers['ru']):Pattern[]{
 const ty=['ты','тебя','тебе','тобой','тобою','твой','твоя','твоё','твое','твои','твоего','твоей','твоему','твоим','твоих','твою'];
 const tyImperatives=['нажми','выбери','открой','закрой','введи','сохрани','загрузи','посмотри','проверь','используй','укажи','запусти','останови','отмени','измени','удали','добавь','перейди','вернись','подожди','наведи','измерь','сравни','скачай'];
 const vy=['вы','вас','вам','вами','ваш','ваша','ваше','ваши','вашего','вашей','вашему','вашим','ваших','вашу'];
 const vyImperatives=['нажмите','выберите','откройте','закройте','введите','сохраните','загрузите','посмотрите','проверьте','используйте','укажите','запустите','остановите','отмените','измените','удалите','добавьте','перейдите','вернитесь','подождите'];
 return setting==='vy'
  ?[{label:'ты pronoun',pattern:words(ty,'letters'),use:'address the student as «вы»'},{label:'ты imperative',pattern:words(tyImperatives,'letters'),use:'use the вы form (-те)'},
    {label:'capitalised Вы inside a sentence',pattern:/(?<=[\p{L}\p{N},;:)»—–-][ \u00a0]+)(?:Вы|Вас|Вам|Вами|Ваш\p{L}*)(?![\p{L}\p{N}])/u,use:'write «вы» in lower case (software and textbook norm)'}]
  :[{label:'вы pronoun',pattern:words(vy,'letters'),use:'address the student as «ты»'},{label:'вы imperative',pattern:words(vyImperatives,'letters'),use:'use the ты form'}];
}
const chineseRegister=(setting:Registers['zh']):Pattern[]=>setting==='ni'
 ?[{label:'您',pattern:/您/u,use:'address the student as 你'}]
 :[{label:'你',pattern:/你/u,use:'address the student as 您'}];

/** The profile of one language under a register choice (REGISTER by default). */
export function profileFor(id:ProfileId,registers:Registers=REGISTER):LocaleProfile{
 switch(id){
  case 'ja':return {
   id,name:'Japanese',script:new RegExp(JA_LETTER,'u'),boundary:'none',caseFold:null,
   // A question may end in か。 without ？, so ? is not counted; ・ joins transliterated names.
   glyphs:glyphsWith({'·':{marks:['·','・'],extraAllowed:true}}),
   pairs:[pair('「','」'),pair('『','』'),pair('（','）'),PARENS],
   forbiddenMarks:[{mark:'"',use:'「 」'},{mark:'“',use:'「 」'},{mark:'”',use:'「 」'}],
   typography:cjkTypography(JA_LETTER,'、。：；？！'),
   register:{setting:registers.ja,patterns:japaneseRegister(registers.ja)},
   claims:[/公式(?:の)?翻訳|CLEA(?:の|による)(?:公式)?翻訳/u],
   lengthBand:[.3,1],pluralCategories:['other'],kanaInSentences:true,
  };
  case 'zh-Hans':case 'zh-Hant':{
   const hans=id==='zh-Hans';
   return {
    id,name:hans?'Simplified Chinese':'Traditional Chinese',script:new RegExp(HAN,'u'),boundary:'none',caseFold:null,
    // The Chinese dash is —— (one mark); · also separates transliterated names (埃德温·哈勃).
    glyphs:glyphsWith({'—':{marks:['——','—']},'·':{marks:['·'],extraAllowed:true}},[{marks:['?','？']}]),
    pairs:hans?[CURLY,pair('《','》'),pair('（','）'),PARENS]:[pair('「','」'),pair('『','』'),pair('《','》'),pair('（','）'),PARENS],
    forbiddenMarks:hans?[{mark:'"',use:'“ ”'},{mark:'「',use:'“'},{mark:'」',use:'”'},{mark:'『',use:'‘'},{mark:'』',use:'’'}]:[{mark:'"',use:'「 」'},{mark:'“',use:'「'},{mark:'”',use:'」'}],
    typography:cjkTypography(HAN,'，。、：；？！'),
    register:{setting:registers.zh,patterns:chineseRegister(registers.zh)},
    claims:[hans?/官方翻译|CLEA(?:的)?(?:官方)?翻译/u:/官方翻譯|CLEA(?:的)?(?:官方)?翻譯/u],
    lengthBand:[.3,1],pluralCategories:['other'],
    otherScript:hans?{label:'Traditional',characters:TRADITIONAL_ONLY}:{label:'Simplified',characters:SIMPLIFIED_ONLY},
   };
  }
  case 'hi':return {
   id,name:'Hindi',script:/\p{sc=Deva}/u,boundary:'letters-marks',caseFold:null,
   glyphs:glyphsWith({},[{marks:['?']}]),
   pairs:[CURLY,PARENS],
   forbiddenMarks:[{mark:'"',use:'“ ”'}],
   typography:[
    {label:'full stop after Devanagari',pattern:/(?<=\p{sc=Deva})\.(?=[\s"”»)]|$)/u,use:'end the sentence with ।'},
    {label:'vertical bar as a danda',pattern:/(?<=\p{sc=Deva}[ \u00a0]?)\|/u,use:'use ।'},
    {label:'space before ।',pattern:/[ \u00a0]+।/u,use:'write । after the last word'},
   ],
   register:{setting:registers.hi,patterns:hindiRegister(registers.hi)},
   claims:[/आधिकारिक अनुवाद|CLEA (?:का|के|की|द्वारा) अनुवाद/u],
   lengthBand:[.7,1.7],pluralCategories:['one','other'],joinerScript:/\p{sc=Deva}/u,
  };
  case 'ru':return {
   id,name:'Russian',script:/\p{sc=Cyrl}/u,boundary:'letters',caseFold:'ru',
   // Russian adds a dash where English has none (Телескоп — инструмент…).
   glyphs:glyphsWith({'—':{marks:['—'],extraAllowed:true}},[{marks:['?']}]),
   pairs:[pair('«','»'),pair('„','“'),PARENS],
   forbiddenMarks:[{mark:'"',use:'«» (inner „“)'},{mark:'”',use:'«» (inner „“)'}],
   typography:[
    {label:'unspaced em dash',pattern:/[\p{L}\p{N}]—|—[\p{L}\p{N}]/u,use:'write « — » with spaces'},
    {label:'hyphen as a dash',pattern:/ - /u,use:'use « — »'},
    {label:'е for ё',pattern:words(['еще','ее','нее'],'letters'),use:'write ё (ещё, её, неё) as the interface always does'},
    {label:'Latin and Cyrillic letters in one word',pattern:/\p{sc=Cyrl}\p{sc=Latn}|\p{sc=Latn}\p{sc=Cyrl}/u,use:'retype the word in one script'},
   ],
   register:{setting:registers.ru,patterns:russianRegister(registers.ru)},
   claims:[/официальн\p{L}* перевод|перевод\p{L}* (?:от )?CLEA/iu],
   lengthBand:[.8,1.8],pluralCategories:['one','few','many','other'],
  };
 }
}
export const PROFILES:Readonly<Record<ProfileId,LocaleProfile>>=Object.freeze(Object.fromEntries(PROFILE_IDS.map(id=>[id,profileFor(id)])) as Record<ProfileId,LocaleProfile>);
