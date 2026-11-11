/** Front SC4 (plan analysis/front-plans/front-i18n-scripts.md §6): one LocaleProfile per planned language. The values are
 * the plan's first proposal [R]/[I]; each language's XX0 sub-front calibrates them on its first batch (length bands above
 * all) and adds its glossary. */
import {SIMPLIFIED_ONLY,TRADITIONAL_ONLY} from './hanVariants';
import type {PluralCategory} from '../plural';
import {wordSource,type Boundary,type GlyphClass,type LocaleProfile,type MarkPair,type PairedPattern,type Pattern} from './rules';
/** How each language addresses the student. DECIDED by the user on 2026-11-09 (AGENTS.md; plan §13 Q1–Q3, §14): Japanese
 * polite です/ます, Hindi आप, Russian lower-case «вы», Chinese (zh-Hans and zh-Hant) 你. The alternatives stay expressible
 * (plain だ/である, तुम, «ты», 您) so the fixtures prove each register pattern both ways; profileFor builds the patterns
 * from these values. */
export type Registers=Readonly<{ja:'desu-masu'|'plain';hi:'aap'|'tum';ru:'vy'|'ty';zh:'ni'|'nin';es:'tu'|'usted';pt:'voce'|'tu'}>;
/** Front SC9: Spanish tú (decision 6, 2026-11-09), with usted as the expressible alternative. Front PT0: Brazilian Portuguese
 * addresses the student as «você» (AGENTS.md, 2026-11-09: each language follows the Spanish rules; plan front-i18n-pt-br.md §3.1);
 * «tu» stays expressible for the fixtures. */
export const REGISTER:Registers={ja:'desu-masu',hi:'aap',ru:'vy',zh:'ni',es:'tu',pt:'voce'};
export type ProfileId='ja'|'hi'|'zh-Hans'|'zh-Hant'|'ru'|'es-419'|'pt-BR';
export const PROFILE_IDS:readonly ProfileId[]=['ja','hi','zh-Hans','zh-Hant','ru','es-419','pt-BR'];

const words=(list:readonly string[],boundary:Boundary,flags='iu')=>new RegExp(list.map(w=>wordSource(w.normalize('NFC'),boundary)).join('|'),flags);
/** VIREO's own `...` (43 originals, 22 en.json strings) and `…` count as one ellipsis; Japanese and Chinese also write `……`. */
const ELLIPSIS:GlyphClass={marks:['...','…']},CJK_ELLIPSIS:GlyphClass={marks:['……','...','…']};
const BASE_GLYPHS:readonly GlyphClass[]=['›','…','↗','▸','·','—','–','×','✳'].map(m=>m==='…'?ELLIPSIS:{marks:[m]});
const glyphsWith=(changes:Readonly<Record<string,GlyphClass>>,extra:readonly GlyphClass[]=[])=>[...BASE_GLYPHS.map(c=>changes[c.marks[c.marks.length-1]]??c),...extra];
const pair=(open:string,close:string,english=false):MarkPair=>english?{open,close,english}:{open,close};
const PARENS=pair('(',')',true),CURLY=pair('“','”',true);

// Japanese and Chinese typography: full-width punctuation in running text, no half-width or full-width look-alikes, and no
// manual space between CJK and Latin text, digits or a placeholder. Nothing sets `text-autospace` yet: SC3's CSS is to add
// it for :lang(ja) and :lang(zh); the rule holds either way (spacing belongs to the style sheet, not to the strings).
// VIREO's `...` after a CJK character is allowed: it is the ellipsis, counted with … and …… by the glyph rule.
function cjkTypography(cjk:string,fullWidth:string):Pattern[]{
 return [
  {label:'ASCII punctuation after a CJK character',pattern:new RegExp(`(?<=${cjk})(?:[,:;?!]|\\.(?!\\.\\.))`,'u'),use:`use the full-width form (${fullWidth})`},
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
  // Plain endings: だ, past た (not ました/でした), dictionary forms in る う く ぐ つ ぬ ぶ む す (not ます/です), adjectives
  // and ない in い (not ください), volitional う (not ましょう/でしょう).
  ?[{label:'plain-form sentence end',pattern:/(?:だ|(?<![まで]し)た|る|(?<!ょ)う|[くぐつぬぶむ]|(?<![まで])す|(?<!くださ)い)(?=。)/u,use:'end sentences in the polite です/ます form'},pronoun]
  :[{label:'polite sentence end',pattern:/(?:です|ます|ました|ません|でした|でしょう|ください)(?=。)/u,use:'end sentences in the plain form'},pronoun];
}
function hindiRegister(setting:Registers['hi']):Pattern[]{
 const tum=['तू','तुम','तुम्हारा','तुम्हारी','तुम्हारे','तुम्हें','तुमको','तुमसे','तेरा','तेरी','तेरे','तुझे','तुझको'];
 const tumImperatives=['करो','देखो','चुनो','खोलो','लिखो','सहेजो','रखो','भरो','पढ़ो','जाँचो','बदलो','डालो','मापो','रोको','जोड़ो','सुनो','बोलो','खोजो','ढूँढो','ढूंढो','गिनो','छोड़ो','रुको','समझो','सोचो','पहचानो','निकालो','भेजो','खींचो','नापो','तौलो','उठो','बैठो','मिलो'];
 // Any word ending in -ाओ is a तुम imperative (दबाओ, घुमाओ, बताओ, चलाओ, लगाओ…).
 const aoWord=/(?<![\p{L}\p{M}\p{N}])\p{sc=Deva}+ाओ(?![\p{L}\p{M}\p{N}])/u;
 const aap=['आप','आपका','आपकी','आपके','आपको','आपने','आपसे'];
 const aapImperatives=['कीजिए','करिए','देखिए','चुनिए','खोलिए','दबाइए','लिखिए','रखिए','बताइए','सहेजिए','चलाइए','हटाइए','भरिए','पढ़िए','जाँचिए','बदलिए','घुमाइए','सुनिए','भेजिए'];
 return setting==='aap'
  ?[{label:'तुम/तू pronoun',pattern:words(tum,'letters-marks'),use:'address the student as आप'},{label:'तुम imperative',pattern:words(tumImperatives,'letters-marks'),use:'use the आप form (-इए, -एँ)'},{label:'तुम imperative in -ाओ',pattern:aoWord,use:'use the आप form (-इए, -एँ)'}]
  :[{label:'आप pronoun',pattern:words(aap,'letters-marks'),use:'address the student as तुम'},{label:'आप imperative',pattern:words(aapImperatives,'letters-marks'),use:'use the तुम form (-ओ)'}];
}
function russianRegister(setting:Registers['ru']):Pattern[]{
 const ty=['ты','тебя','тебе','тобой','тобою','твой','твоя','твоё','твое','твои','твоего','твоей','твоему','твоим','твоими','твоих','твою','твоём','твоем'];
 // Singular imperatives of the verbs this interface uses; the вы form adds -те (поверни → поверните).
 const verbs=['нажми','выбери','открой','закрой','введи','сохрани','загрузи','посмотри','проверь','используй','укажи','запусти','останови','отмени','измени','удали','добавь','перейди','вернись','подожди','наведи','измерь','сравни','скачай',
  'поверни','запиши','включи','выключи','начни','продолжи','повтори','вычисли','построй','найди','отметь','установи','задай','определи','прочитай','сделай','перемести','обнови','щёлкни','щелкни','выдели','вставь','скопируй','распечатай','закончи','заверши','оцени','рассчитай','проведи','оставь','отправь','наблюдай','направь','сними','настрой','запомни'];
 const vyForms=['Вы','Вас','Вам','Вами','Ваш','Ваша','Ваше','Ваши','Вашего','Вашей','Вашему','Вашем','Вашим','Вашими','Ваших','Вашу'];
 const vy=vyForms.map(w=>w.toLowerCase());
 const vyImperatives=verbs.map(v=>v.endsWith('сь')?`${v.slice(0,-2)}тесь`:`${v}те`);
 return setting==='vy'
  ?[{label:'ты pronoun',pattern:words(ty,'letters'),use:'address the student as «вы»'},{label:'ты imperative',pattern:words(verbs,'letters'),use:'use the вы form (-те)'},
    // Mid-sentence (after a word, digit or , ; : ) » or a dash), exact forms only: «в Вашингтоне» is not a pronoun.
    {label:'capitalised Вы inside a sentence',pattern:new RegExp(`(?<=[\\p{L}\\p{N},;:)»—–-][ \\u00a0]+)(?:${vyForms.join('|')})(?![\\p{L}\\p{N}])`,'u'),use:'write «вы» in lower case (software and textbook norm)'}]
  :[{label:'вы pronoun',pattern:words(vy,'letters'),use:'address the student as «ты»'},{label:'вы imperative',pattern:words(vyImperatives,'letters'),use:'use the ты form'}];
}
const chineseRegister=(setting:Registers['zh']):Pattern[]=>setting==='ni'
 ?[{label:'您',pattern:/您/u,use:'address the student as 你'}]
 :[{label:'你',pattern:/你/u,use:'address the student as 您'}];

// Front PT0 (plan front-i18n-pt-br.md §3.4): Brazilian Portuguese. Words are matched with letter boundaries and Portuguese case
// folding; a European form, a pre-1990 spelling, a European accent and a Spanish word left from the Spanish reference (the
// translation batches see it as meaning context) are errors whatever the glossary says.
const PT_EUROPEAN=['ecrã','ecrãs','ficheiro','ficheiros','utilizador','utilizadores','utilizadora','utilizadoras','rato','ratos','telemóvel','telemóveis','definições','palavra-passe','palavras-passe',
 'aceder','acede','acedem','aceda','acedido','equipa','equipas','facto','factos','contacto','contactos','receção','registo','registos','registar','hiperligação','hiperligações','descarregar','descarregue','premir','sítio','sítios',
 'acção','acções','direcção','direcções','selecção','selecções','objecto','objectos','actual','actuais','exacto','exacta','exactos','exactas','óptimo','óptima','actualizar','actualização','actualizado','factor','factores','projecto','projectos','correcto','correcta','directo','directa',
 'protão','protões','neutrão','neutrões','electrão','electrões','eletrão','eletrões'];
const PT_SPANISH=['usted','ustedes','también','pantalla','pantallas','ventana','ventanas','botón','botones','archivo','archivos','cúmulo','cúmulos','estrella','estrellas','configuración','medición','mediciones','púlsar','púlsares','una','del','con','el','pero','muy','hacer','haz','elige'];
/** Front PT0 review: English left in a Latin-script translation (the `leftover-english` rule reads a script, so it cannot see it):
 * English function words that are no Portuguese word, outside brackets and quotes (VIREO's English names in brackets keep them). */
const PT_ENGLISH=['the','and','with','your','you','this','that','from','is','are','not','will','which','when','only','it','of','to','be','was','were','has','have','its'];
/** Outside brackets (a VIREO English gloss, «Fator de criação do campo (Field Creation Factor)») and “ ” quotes. */
const outsideGlosses=(r:RegExp)=>new RegExp(`(?:${r.source})(?![^(]*\\))(?![^“]*”)`,r.flags);
const PT_TU=['tu','teu','tua','teus','tuas','contigo','vós','vosso','vossa','vossos','vossas','te'];
/** Commands of the verbs this interface uses: the tu-imperative (= third person, «Salva») and the você one (subjunctive, «Salve»). */
const PT_TU_COMMANDS=['Clica','Escolhe','Abre','Salva','Seleciona','Digita','Carrega','Fecha','Verifica','Usa','Mede','Aponta','Espera','Olha','Vê','Faz','Põe','Pressiona','Liga','Desliga','Guarda','Começa','Marca','Ativa','Lê','Escreve','Define','Volta','Recarrega','Restaura','Baixa','Tenta','Segue','Deixa'];
const PT_VOCE_COMMANDS=['Clique','Escolha','Abra','Salve','Selecione','Digite','Carregue','Feche','Verifique','Use','Meça','Aponte','Espere','Olhe','Veja','Faça','Ponha','Pressione','Ligue','Desligue','Guarde','Comece','Marque','Ative','Leia','Escreva','Defina','Volte','Recarregue','Restaure','Baixe','Tente','Siga','Deixe'];
/** An English sentence that starts with a bare imperative (no third-person -s): the command the Portuguese must give as você. */
const EN_COMMAND=/^(?:click|choose|open|save|select|type|enter|load|close|check|use|measure|point|wait|look|see|do|make|put|press|turn|switch|keep|start|begin|mark|activate|read|write|set|go|pick|tick|untick|reload|restore|download|try|note|follow|leave)(?![\p{L}\p{N}])/iu;
const startOf=(list:readonly string[])=>new RegExp(`^(?:${list.join('|')})(?![\\p{L}\\p{N}])`,'u');
function portugueseRegister(setting:Registers['pt']):{patterns:Pattern[];paired:PairedPattern[]}{
 return setting==='voce'
  ?{patterns:[{label:'tu pronoun',pattern:words(PT_TU,'letters'),use:'address the student as «você» (seu, sua, você)'},
    {label:'enclitic -te',pattern:/(?<=\p{L})-te(?![\p{L}\p{N}])/u,use:'address the student as «você» (o, lhe, a você)'},
    {label:'formal address',pattern:/(?<![\p{L}\p{N}])(?:o senhor|a senhora|os senhores|as senhoras)(?![\p{L}\p{N}])/iu,use:'address the student as «você»'}],
   paired:[{label:'tu-imperative',pattern:startOf(PT_TU_COMMANDS),english:EN_COMMAND,use:'use the você command (Clique, Escolha, Abra, Salve…)'}]}
  :{patterns:[{label:'você',pattern:words(['você','vocês'],'letters'),use:'address the student as «tu»'}],
   paired:[{label:'você-imperative',pattern:startOf(PT_VOCE_COMMANDS),english:EN_COMMAND,use:'use the tu command (Clica, Escolhe, Abre, Salva…)'}]};
}

/** The profile of one language under a register choice (REGISTER by default). */
export function profileFor(id:ProfileId,registers:Registers=REGISTER):LocaleProfile{
 switch(id){
  case 'ja':return {
   id,name:'Japanese',script:new RegExp(JA_LETTER,'u'),boundary:'none',caseFold:null,
   // A question may end in か。 without ？, so ? is not counted; ・ joins transliterated names.
   glyphs:glyphsWith({'…':CJK_ELLIPSIS,'·':{marks:['·','・'],extraAllowed:true}}),
   pairs:[pair('「','」'),pair('『','』'),pair('（','）'),PARENS],
   forbiddenMarks:[{mark:'"',use:'「 」'},{mark:'“',use:'「 」'},{mark:'”',use:'「 」'}],
   typography:cjkTypography(JA_LETTER,'、。：；？！'),
   register:{setting:registers.ja,patterns:japaneseRegister(registers.ja)},
   // A claim, never its denial: 非公式翻訳, 公式翻訳ではありません and CLEAによる翻訳ではありません pass.
   claims:[/(?<!非)公式(?:の)?翻訳(?!では(?:ありません|ない))|CLEA(?:の|による)(?:公式)?翻訳(?!では(?:ありません|ない))/u],
   lengthBand:[.3,1],pluralCategories:['other'],kanaInSentences:true,
  };
  case 'zh-Hans':case 'zh-Hant':{
   const hans=id==='zh-Hans';
   return {
    id,name:hans?'Simplified Chinese':'Traditional Chinese',script:new RegExp(HAN,'u'),boundary:'none',caseFold:null,
    // The Chinese dash is —— (one mark); · also separates transliterated names (埃德温·哈勃).
    glyphs:glyphsWith({'…':CJK_ELLIPSIS,'—':{marks:['——','—']},'·':{marks:['·'],extraAllowed:true}},[{marks:['?','？']}]),
    pairs:hans?[CURLY,pair('《','》'),pair('（','）'),PARENS]:[pair('「','」'),pair('『','』'),pair('《','》'),pair('（','）'),PARENS],
    forbiddenMarks:hans?[{mark:'"',use:'“ ”'},{mark:'「',use:'“'},{mark:'」',use:'”'},{mark:'『',use:'‘'},{mark:'』',use:'’'}]:[{mark:'"',use:'「 」'},{mark:'“',use:'「'},{mark:'”',use:'」'}],
    typography:cjkTypography(HAN,'，。、：；？！'),
    register:{setting:registers.zh,patterns:chineseRegister(registers.zh)},
    // 非官方翻译 (unofficial) and 不是…翻译 (is not) pass.
    claims:[hans?/(?<!非|不是|不是CLEA的?)官方翻译|(?<!不是)CLEA(?:的)?(?:官方)?翻译/u:/(?<!非|不是|不是CLEA的?)官方翻譯|(?<!不是)CLEA(?:的)?(?:官方)?翻譯/u],
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
    // An abbreviation keeps its full stop (डॉ. हबल, प्रो., श्री.).
    {label:'full stop after Devanagari',pattern:/(?<=\p{sc=Deva})(?<!(?:^|[^\p{L}\p{M}])(?:डॉ|प्रो|श्री|सं|पृ|क्र|मि))\.(?=[\s"”»)]|$)/u,use:'end the sentence with ।'},
    {label:'vertical bar as a danda',pattern:/(?<=\p{sc=Deva}[ \u00a0]?)\|/u,use:'use ।'},
    {label:'space before ।',pattern:/[ \u00a0]+।/u,use:'write । after the last word'},
   ],
   register:{setting:registers.hi,patterns:hindiRegister(registers.hi)},
   // गैर-आधिकारिक (unofficial) and a denial with नहीं pass.
   claims:[/(?<!गैर[- ]?)आधिकारिक अनुवाद(?![ \u00a0]*नहीं)|CLEA (?:का|के|की|द्वारा) (?:आधिकारिक )?अनुवाद(?![ \u00a0]*नहीं)/u],
   // Natural Hindi is short in grapheme clusters (दोनों दूरबीनों को भेजिए। is 0.54 of its English), hence the low floor.
   lengthBand:[.45,1.2],pluralCategories:['one','other'],joinerScript:/\p{sc=Deva}/u,
  };
  case 'pt-BR':{
   const reg=portugueseRegister(registers.pt);
   return {
    id,name:'Brazilian Portuguese',script:null,boundary:'letters',caseFold:'pt-BR',
    glyphs:glyphsWith({},[{marks:['?']}]),
    pairs:[CURLY,PARENS],
    forbiddenMarks:[{mark:'"',use:'“ ”'}],
    typography:[
     // « » are not Brazilian quotes; the lint's own sample placeholders «A1» are set aside.
     {label:'guillemets',pattern:/«(?!A\p{N}+»)|(?<!«A\p{N}+)»/u,use:'“ ” (inner ‘ ’)'},
     {label:'European Portuguese word',pattern:outsideGlosses(words(PT_EUROPEAN,'letters')),use:'the Brazilian form (tela, arquivo, usuário, mouse, celular, configurações, senha, acessar, equipe, fato, contato, registro, baixar, pressionar, site; ação, objeto, atual, exato)'},
     {label:'European accent',pattern:/(?<![\p{L}\p{N}])(?:astronómic|fenómen|quilómetr|electrónic|eletrónic|económic|atómic|anónim|sinónim|espectrómetr|fotómetr|cronómetr|génio)\p{L}*/iu,use:'the Brazilian accent (astronômico, fenômeno, quilômetro, eletrônico, espectrômetro, fotômetro, gênio)'},
     {label:'«estar a» + infinitive',pattern:/(?<![\p{L}\p{N}])est(?:á|ão|ava|avam|ou|amos|ar|eja|ejam)[  ]+a[  ]+\p{L}+[aei]r(?![\p{L}\p{N}])/iu,use:'the gerund («está medindo»)'},
     {label:'«A» + infinitive as a progress label',pattern:/^A[  ]+(?!partir|seguir)\p{L}+[aei]r(?![\p{L}\p{N}])/u,use:'the gerund («Carregando…»)'},
     {label:'Spanish word',pattern:words(PT_SPANISH,'letters'),use:'the Portuguese word (você, também, tela, janela, botão, arquivo, aglomerado, estrela, configuração, medição, pulsar…); translate from the English, not the Spanish'},
     // «los»/«las» only as words: Portuguese writes them as enclitics after a hyphen («salvá-las», «abri-los»).
     {label:'Spanish article',pattern:/(?<![\p{L}\p{N}-])(?:los|las)(?![\p{L}\p{N}-])/iu,use:'os / as'},
     {label:'Spanish character',pattern:/[ñ¿¡]/u,use:'Portuguese has no ñ, ¿ or ¡'},
     {label:'English word',pattern:outsideGlosses(words(PT_ENGLISH,'letters')),use:'translate it (a VIREO English name goes in brackets after its Portuguese)'},
     // Front PT-REL (user decision of 2026-11-10): Portuguese separates thousands with a narrow no-break space on screen
     // («24 000», U+202F), never en-US's comma; the decimal point stays (decision 4, the digits rule). An ordinary space could
     // break the number across lines. Front PT-SEO: U+00A0 fails too, now that the help files may hold U+202F (SC7's Unicode help;
     // PULSRANL.TXT used U+00A0 until then), so the screen has one separator.
     {label:'comma between thousands',pattern:/(?<![\p{L}\p{N}.,])\p{N}{1,3}(?:,\p{N}{3})+(?!\p{N})/u,use:'a narrow no-break space (U+202F): «24 000»'},
     {label:'ordinary space between thousands',pattern:/(?<![\p{L}\p{N}.,])\p{N}{1,3}(?:[ \u00a0]\p{N}{3})+(?![\p{L}\p{N}])/u,use:'a narrow no-break space (U+202F): «24 000», not a space or U+00A0'},
     // Sentence case: three capitalised words in a row (articles and prepositions between them allowed), outside brackets.
     {label:'title case',pattern:/(?<![\p{L}\p{N}])\p{Lu}\p{Ll}+(?:[  ]+(?:(?:d[aeo]s?|e|em|para|por|com)[  ]+)?\p{Lu}\p{Ll}+){2,}(?![^(]*\))/u,use:'sentence case (only the first word and names capitalised)'},
    ],
    register:{setting:registers.pt,patterns:reg.patterns,paired:reg.paired},
    // A claim, never its denial: «não é uma tradução oficial», «tradução não oficial» and «não é do CLEA» pass.
    claims:[/(?<!não é (?:uma |a )?)(?<!não )(?:tradução|versão) oficial/iu,/(?<!não é (?:uma |a )?)tradução d[oa] (?:Project )?CLEA/iu,/(?:tradução|texto|versão) é d[oa] (?:Project )?CLEA/iu],
    // First proposal (plan §3.4), calibrated on PT0's shell batch (docs/I18N.md, PT0).
    lengthBand:[.7,1.6],pluralCategories:['one','many','other'],optionalPluralCategories:OPTIONAL_PLURAL_CATEGORIES.pt,
   };
  }
  case 'ru':return {
   id,name:'Russian',script:/\p{sc=Cyrl}/u,boundary:'letters',caseFold:'ru',
   // Russian adds a dash where English has none (Телескоп — инструмент…).
   glyphs:glyphsWith({'—':{marks:['—'],extraAllowed:true}},[{marks:['?']}]),
   pairs:[pair('«','»'),pair('„','“'),PARENS],
   forbiddenMarks:[{mark:'"',use:'«» (inner „“)'},{mark:'”',use:'«» (inner „“)'}],
   typography:[
    // A range between numbers (1990—2000) is not a dash between words.
    {label:'unspaced em dash',pattern:/(?<=\p{L})—|—(?=\p{L})|(?<=\p{N})—(?!\p{N})|(?<!\p{N})—(?=\p{N})/u,use:'write « — » with spaces'},
    {label:'hyphen as a dash',pattern:/ - /u,use:'use « — »'},
    {label:'е for ё',pattern:words(['еще','ее','нее'],'letters'),use:'write ё (ещё, её, неё) as the interface always does'},
    {label:'Latin and Cyrillic letters in one word',pattern:/\p{sc=Cyrl}\p{sc=Latn}|\p{sc=Latn}\p{sc=Cyrl}/u,use:'retype the word in one script'},
   ],
   register:{setting:registers.ru,patterns:russianRegister(registers.ru)},
   // неофициальный (unofficial), не официальный and не является… pass.
   claims:[/(?<!не|не[ \u00a0]|не является[ \u00a0])официальн\p{L}* перевод|(?<!не[ \u00a0]|не является[ \u00a0])перевод\p{L}* (?:от )?CLEA/iu],
   lengthBand:[.8,1.8],pluralCategories:['one','few','many','other'],
  };
  case 'es-419':return spanishProfile(registers.es);
 }
}
/** Plural categories a key may leave out (they fall back to `other`), for the Latin-script languages to come: Spanish,
 * Portuguese and French select `many` only for exact millions. */
export const OPTIONAL_PLURAL_CATEGORIES:Readonly<Record<string,readonly PluralCategory[]>>={es:['many'],pt:['many'],fr:['many']};
/** Front SC9: the Spanish (es-419) profile, moved from the hand-coded checks of src/i18n/es/es.test.ts (ES1–ES-REL), which
 * now only loads its files and runs the framework with this profile. Each value reproduces the old check or is stricter
 * (docs/I18N.md, "the Spanish lints on the framework (SC9)"). The glossary (terms, names, forbidden words with voseo and the
 * usted imperatives), identical.json and lint-allowed.json stay data in src/i18n/es/. */
export const SPANISH_VIREO_PULSAR_NAMES=/(?<![\p{L}\p{N}])(?:Access Pulsar List|Plot Pulsar Positions|Pulsar (?:Analysis|Parameters|List|Identification))(?![\p{L}\p{N}])/gu;
/** ES5: a closer that ends a question or exclamation follows a letter, digit, bracket, quote, … or a {param}, and is followed by
 * a space, bracket, quote, punctuation or the end; a bare ? (a key, «?lang=») is not a closer. */
const SPANISH_CLOSE_AFTER=/[\p{L}\d)»”…}]/u,SPANISH_CLOSE_BEFORE=/[\s)»”.,;:]|$/;
function spanishRegister(setting:Registers['es']):Pattern[]{
 return setting==='tu'
  // es.test.ts's /\b(usted|ustedes)\b/iu, kept with its ASCII word edges (JavaScript's \b), so «ustedés» or «ñusted» still
  // fail as they did; the glossary's forbidden words add usted, vosotros and the usted and voseo imperatives with Unicode edges.
  ?[{label:'usted pronoun',pattern:/(?<![A-Za-z0-9_])usted(?:es)?(?![A-Za-z0-9_])/iu,use:'address the student as tú (decision 6)'}]
  :[{label:'tú pronoun',pattern:words(['tú','ti','contigo','tu','tus','tuyo','tuya','tuyos','tuyas'],'letters'),use:'address the student as usted'}];
}
function spanishProfile(setting:Registers['es']):LocaleProfile{
 return {
  id:'es-419',name:'Spanish',script:null,boundary:'letters',caseFold:'es',
  // As es.test.ts: each mark counted on its own (… is not merged with VIREO's ..., so a … that becomes ... still fails).
  glyphs:['›','…','↗','▸','·','—','–','×','✳'].map(m=>({marks:[m]})),
  pairs:[{open:'¿',close:'?',closeAfter:SPANISH_CLOSE_AFTER,closeBefore:SPANISH_CLOSE_BEFORE},{open:'¡',close:'!',closeAfter:SPANISH_CLOSE_AFTER,closeBefore:SPANISH_CLOSE_BEFORE}],
  // Spanish writes both “ ” and « » (and VIREO's own " in quoted file formats), so no quote mark is forbidden.
  forbiddenMarks:[],
  // New with SC9 (the catalog had none): ¿ and ¡ are written against the first word.
  typography:[{label:'space after ¿ or ¡',pattern:/[¿¡][ \u00a0]/u,use:'write ¿ and ¡ against the first word'}],
  register:{setting,patterns:spanishRegister(setting)},
  claims:[/traducci[oó]n (oficial|de CLEA)/iu],
  lengthBand:[.7,1.6],pluralCategories:['one','many','other'],optionalPluralCategories:OPTIONAL_PLURAL_CATEGORIES.es,
  forbiddenSetAside:SPANISH_VIREO_PULSAR_NAMES,
 };
}
export const PROFILES:Readonly<Record<ProfileId,LocaleProfile>>=Object.freeze(Object.fromEntries(PROFILE_IDS.map(id=>[id,profileFor(id)])) as Record<ProfileId,LocaleProfile>);

