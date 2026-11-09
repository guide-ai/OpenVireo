import en from './en.json' with {type:'json'};
import type {LocaleBundle,MessageKey} from './catalog';
import type {PseudoScriptLanguage} from './locale';
import {PSEUDO_CLOSE,PSEUDO_OPEN,pseudoMap} from './pseudo';
/** Front SC2 [dev server and tests only]: three script-stress pseudo-locales beside `qps` (docs/I18N.md; plan
 * analysis/front-plans/front-i18n-scripts.md §4). Like qps, every catalog, map and vireo() string is wrapped in ⟦…⟧ and map
 * functions have their result marked only (pseudoMark), since it may carry data; `{params}`, `<tag>`-like placeholders, digits,
 * the decimal point, line breaks and leading or trailing spacing are kept. Unlike qps, the English letters are replaced by text
 * in another script, and <html lang> is set to the real tag of that script (src/i18n/locale.ts), so `:lang()` rules apply:
 * - `qps-cjk` (lang `ja`): each ASCII word of n letters becomes ⌈0.6 n⌉ full-width characters (kanji, kana, small kana and ー
 *   inside words, and some Han characters whose glyph depends on the language or that only Chinese uses); spaces next to them
 *   are removed and . , : ? ! ( ) become 。、：？！（）. Stresses width, missing break opportunities, `ch` boxes, line height and
 *   kinsoku.
 * - `qps-deva` (lang `hi`): each word becomes ⌈0.8 n⌉ Devanagari syllables with vowel signs above and below the line, and about
 *   one word in three carries a conjunct that stacks in Noto Sans Devanagari (reph, ट्ट ट्ठ ड्ड ड्ढ stacks, nukta,
 *   candrabindu); `.` becomes `।`. Stresses height and clipping rows; the measured stress is mostly below the line.
 * - `qps-cyrl` (lang `ru`): each word is transliterated to Cyrillic and lengthened by about 25 %, and about one word of eight
 *   letters or more in six becomes one unbreakable word of min(24, 1.7 n) letters. Stresses length, `nowrap`, narrow buttons
 *   and upper-case sites; about 1.45 times the English width, near real Russian.
 * Every transform is pure, deterministic and word-stable (a word always becomes the same text), so specs can compute expected
 * names with it, as the Spanish specs do with `L()`. src/boot.ts uses this module only in an `import.meta.env.DEV` branch, so the
 * production build drops it (scripts/check-i18n-dist.mjs fails on ⟦ anywhere in dist/). No top-level calls: tables are literals. */

/** Protected parts, copied unchanged: `{params}` and `<tag>`-like placeholders. */
const PROTECTED=/(\{\w+\}|<\/?[A-Za-z][\w-]*>)/;
const WORD=/[A-Za-z]+/g;
const DIGIT=/[0-9]/;
/** A deterministic hash of a word, case-folded, so `File`, `file` and `FILE` share their shape. */
function hash(word:string):number{let h=7;for(let i=0;i<word.length;i++)h=(h*31+(word.charCodeAt(i)|32))%2147483647;return h;}
/** Marks a transformed text once; already-marked text is returned unchanged (idempotent). */
function marked(text:string,transform:(plain:string)=>string):string{
 if(!text||(text.startsWith(PSEUDO_OPEN)&&text.endsWith(PSEUDO_CLOSE)))return text;
 return PSEUDO_OPEN+text.split(PROTECTED).map((part,i)=>i%2?part:transform(part)).join('')+PSEUDO_CLOSE;
}
/** Punctuation `c` at `i` of `s` is a decimal point, thousands separator or clock colon: a digit on both sides. */
const numeric=(s:string,i:number)=>DIGIT.test(s[i-1]??'')&&DIGIT.test(s[i+1]??'');

// --- qps-cjk -----------------------------------------------------------------------------------------------------------------
/** Word-initial characters: kanji (some with language-dependent glyphs: 直 骨 角 誤 写 今), kana, and Han characters that only
 * Chinese uses (们 这 说 门 习). A pan-CJK font such as Noto Sans CJK JP covers those too; a Japanese-only font (Meiryo, Yu Gothic
 * type) needs a fallback for them. All in the BMP: one UTF-16 unit each. */
const CJK_START='星光天体観測望遠鏡銀河波長赤方偏移画像表示保存開閉選択設定時間速度距離等級写真分析結果直骨角誤今们这说门习のがをにはでとしたりるスペクトルデタフイ';
/** Inside a word, also small kana and the long-vowel mark, which line-break:strict must not put at the start of a line. */
const CJK_ANY=CJK_START+'ゃゅょっァィゥェォャュョッー';
const CJK_PUNCTUATION:Readonly<Record<string,string>>={'.':'。',',':'、',':':'：','?':'？','!':'！','(':'（',')':'）'};
/** Characters next to which a space is removed: Han, kana, the long-vowel mark and the full-width punctuation above. */
const CJK_CHAR=/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}ー。、：？！（）…]/u;
function cjkWord(word:string):string{
 const n=word.length,k=Math.ceil(.6*n),h=hash(word);let out='';
 for(let i=0;i<k;i++){
  let code=0;for(let j=Math.floor(i*n/k);j<Math.floor((i+1)*n/k);j++)code+=(word.charCodeAt(j)|32)*(j+1);
  const table=i?CJK_ANY:CJK_START;out+=table[(h+code*7+i*13)%table.length];
 }
 return out;
}
function cjkPlain(s:string):string{
 const words=s.replace(/\.\.\./g,'…').replace(WORD,cjkWord);
 return words.replace(/[.,:?!()]/g,(c,at:number)=>numeric(words,at)?c:CJK_PUNCTUATION[c]);
}
/** Removes interior runs of spaces that touch a CJK character; leading and trailing spacing and line breaks stay. */
function cjkSpaces(s:string):string{
 return s.replace(/ +/g,(run,at:number)=>{const before=s[at-1],after=s[at+run.length];if(before===undefined||after===undefined||/\s/.test(before)||/\s/.test(after))return run;return CJK_CHAR.test(before)||CJK_CHAR.test(after)?'':run;});
}
/** `qps-cjk`: full-width text about 1.2 times as wide as the English, with no spaces to break at. */
export function pseudoCjk(text:string):string{
 const out=marked(text,cjkPlain);
 return out===text?out:PSEUDO_OPEN+cjkSpaces(out.slice(PSEUDO_OPEN.length,-PSEUDO_CLOSE.length))+PSEUDO_CLOSE;
}

// --- qps-deva ----------------------------------------------------------------------------------------------------------------
const DEVA_CONSONANTS='कखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह';
/** Vowel signs and marks, alternating above (ि ी े ै ो ौ ं ँ), below (ु ू ृ, nukta) and both. */
const DEVA_SIGNS=['ि','ु','ी','ू','े','ृ','ै','ुं','ो','ूँ','ौ','ृं','ं','ुँ','ँ','़ु'];
/** Tall clusters that stack in Noto Sans Devanagari and occur in real Hindi (गड्ढा, चिट्ठी, बुद्धि, राष्ट्र, ब्रह्म): reph over
 * vertical stacks, nukta, rakar and ya below, vowel signs below and candrabindu (each checked rendered at 110 px). */
const DEVA_TALL=['र्द्धि','क़्र्यूँ','र्ड्ढूँ','ट्ठू','ड्डू','ट्टूँ','ड्ढुं','ष्ट्रैं','ह्मूँ'];
function devaWord(word:string):string{
 const n=word.length,k=Math.ceil(.8*n),h=hash(word),out:string[]=[];
 for(let i=0;i<k;i++){const c=word.charCodeAt(Math.floor(i*n/k))|32;out.push(DEVA_CONSONANTS[(c*3+h+i)%DEVA_CONSONANTS.length]+DEVA_SIGNS[(h+i*5+c)%DEVA_SIGNS.length]);}
 if(h%3===0)out[h%k]=DEVA_TALL[(h>>2)%DEVA_TALL.length];
 return out.join('');
}
function devaPlain(s:string):string{
 const words=s.replace(WORD,devaWord);
 return words.replace(/\.+/g,(run,at:number)=>run.length===1&&!numeric(words,at)?'।':run);
}
/** `qps-deva`: Devanagari with marks above and below the line and a tall conjunct in about one word of three. */
export const pseudoDeva=(text:string):string=>marked(text,devaPlain);

// --- qps-cyrl ----------------------------------------------------------------------------------------------------------------
/** a…z transliterated (q→я, w→ш, x→ж, y→ы). */
const CYRL_LETTERS='абцдефгхийклмнопярстувшжыз';
/** Letters inserted to lengthen a word: ordinary widths, so the stress is length rather than glyph width. */
const CYRL_EXTRA='еиоаыяю';
const CYRL_LONG='достопримечательность';
const CYRL_LONG_MAX=24;
function cyrlWord(word:string):string{
 const n=word.length,extra=Math.round(.25*n),h=hash(word),upper=n>1&&word===word.toUpperCase();
 const cased=(c:string)=>upper?c.toUpperCase():c;let out='';
 for(let j=0;j<n;j++){
  const c=word[j],letter=CYRL_LETTERS[(c.charCodeAt(0)|32)-97];
  out+=c===c.toUpperCase()?letter.toUpperCase():letter;
  if(Math.floor((j+1)*extra/n)>Math.floor(j*extra/n))out+=cased(CYRL_EXTRA[((c.charCodeAt(0)|32)+j)%CYRL_EXTRA.length]);
 }
 if(n>=8&&h%6===0){const length=Math.min(CYRL_LONG_MAX,Math.round(1.7*n));for(let i=h%CYRL_LONG.length;out.length<length;i++)out+=cased(CYRL_LONG[i%CYRL_LONG.length]);}
 return out;
}
/** `qps-cyrl`: Cyrillic about 25 % longer than the English, with an unbreakable word of min(24, 1.7 n) letters in about one word
 * of eight letters or more in six. */
export const pseudoCyrl=(text:string):string=>marked(text,s=>s.replace(WORD,cyrlWord));

/** The string transform of each script-stress pseudo-locale. */
export const PSEUDO_SCRIPT:Readonly<Record<PseudoScriptLanguage,(text:string)=>string>>={'qps-cjk':pseudoCjk,'qps-deva':pseudoDeva,'qps-cyrl':pseudoCyrl};
export const isPseudoScriptLanguage=(language:string):language is PseudoScriptLanguage=>Object.hasOwn(PSEUDO_SCRIPT,language);
/** The bundle of one script-stress pseudo-locale: the whole English catalog transformed, and maps and VIREO originals derived on
 * first use through the same mechanism as qps (src/i18n/registry.ts resolveMessages, src/i18n/vireo.ts). */
export function pseudoScriptBundle(language:PseudoScriptLanguage):LocaleBundle{
 const text=PSEUDO_SCRIPT[language];
 const messages=Object.fromEntries(Object.entries(en).map(([key,value])=>[key,text(value)]))as Record<MessageKey,string>;
 return Object.freeze({language,messages,deriveMap:<T,>(english:T):T=>pseudoMap(english,text),deriveOriginal:text});
}
