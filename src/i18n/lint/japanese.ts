/** Front JA0 (plan analysis/front-plans/front-i18n-ja.md §1.2 #2, §3): the Japanese style rules the `ja` profile adds to the SC4
 * groundwork. Word lists, not morphology: they catch what translation models do most often (kanji for auxiliaries and formal nouns,
 * over-polite forms, katakana loans without the long vowel, Chinese characters), and the independent reviewer remains the real check.
 *
 * - Kana-preferred words (the Japanese government's 公用文 usage): auxiliaries, formal nouns and conjunctions in kana.
 * - Over-polite forms (させていただく, でございます, いただけますでしょうか).
 * - The katakana long vowel of -er/-or/-ar loans (decided by the coordinator, 2026-11-19: ブラウザー, フォルダー, フィルター), only
 *   where the word ends (followed by no katakana or ー: モニタリング is another word).
 * - Han characters outside what Japanese encodes (JIS X 0208 with the Windows-31J extensions): a Chinese form left by a model (图,
 *   设, 显, 时, 间…). The set is built on first use by decoding every double-byte Shift_JIS code with the runtime's own ICU
 *   (`TextDecoder('shift_jis')`): nothing is downloaded or bundled. No `\b` or `\w`: Unicode classes only. */
import type {Pattern} from './rules';
import {cjkPunctuationFindings,JAPANESE_STYLE} from './cjkPunctuation';

const NOT_AFTER_HAN='(?<!\\p{sc=Han})';
/** [pattern source, kana form] for words written in kana in Japanese interface text. A formal noun (事, 時, 様) is matched only
 * where no kanji precedes it, so a compound (記事, 同時, 同様) passes. */
const KANA_PREFERRED:readonly (readonly [string,string])[]=[
 ['下さい','ください'],['出来(?=[るまなれたずてよ])','できる'],['(?<=[てで])頂(?=[きくけい])','いただく'],['(?<=[てで])戴(?=[きくけい])','いただく'],
 [`${NOT_AFTER_HAN}致(?=し|す)`,'いたす'],[`${NOT_AFTER_HAN}為(?=[にのだ])`,'ため'],[`${NOT_AFTER_HAN}事(?=[がをはもにで])`,'こと'],[`${NOT_AFTER_HAN}様(?=[にな])`,'よう'],
 ['(?<=\\p{sc=Hira})時(?=[にはのも、])','とき'],['又は','または'],['及び','および'],['但し','ただし'],['是非','ぜひ'],['宜しく','よろしく'],
 ['予め','あらかじめ'],['殆ど','ほとんど'],['何故','なぜ'],[`${NOT_AFTER_HAN}有(?=[るりればっ])`,'ある'],[`${NOT_AFTER_HAN}無(?=[いくかけ])`,'ない'],
 ['(?<=[てで])居(?=[るまな])','いる'],['迄','まで'],['貰','もらう'],['(?:解|判)(?=[るりらっ])','わかる'],['(?<=\\p{sc=Hira})物(?=[でがはをもに])','もの'],
 ['(?<=\\p{sc=Hira})所(?=[でがはをもに])','ところ'],
];
export const KANA_PREFERRED_PATTERNS:readonly Pattern[]=KANA_PREFERRED.map(([source,kana])=>({label:'kanji for a word Japanese writes in kana',pattern:new RegExp(source,'u'),use:`write «${kana}» (公用文 usage)`}));
/** -er/-or/-ar loans that take the long vowel (Microsoft Japanese style since 2008, the 1991 Cabinet notice). */
export const LONG_VOWEL_LOANS:readonly string[]=['ブラウザ','フォルダ','フィルタ','パラメータ','コンピュータ','ユーザ','メータ','プリンタ','エディタ','センサ','モニタ','サーバ','ヘッダ','フッタ',
 'カウンタ','ポインタ','スキャナ','コントローラ','マネージャ','ドライバ','レーダ','ジェネレータ','インジケータ','セレクタ','ビューア','プロジェクタ','コンバータ','アダプタ','エクスプローラ','ディテクタ','レジスタ','バッファ','プレーヤ','ローダ','パーサ','クリエータ','ナビゲータ','トリガ'];
export const LONG_VOWEL_PATTERN:Pattern={label:'katakana loan without its long vowel',pattern:new RegExp(`(?:${LONG_VOWEL_LOANS.join('|')})(?![ー\\p{sc=Kana}])`,'u'),use:'end the -er/-or/-ar loan with ー (ブラウザー, フォルダー, フィルター)'};
export const OVER_POLITE_PATTERNS:readonly Pattern[]=[
 {label:'over-polite form',pattern:/させて(?:いただ|頂)|いただけますでしょうか|でございま|して参ります|させてもらいま/u,use:'plain です/ます (保存します, ご確認ください)'},
];

let kanji:ReadonlySet<string>|undefined;
/** The Han characters Japanese encodes: every double-byte Shift_JIS (Windows-31J) code that decodes to a Han character. */
export function japaneseKanji():ReadonlySet<string>{
 if(kanji)return kanji;
 const decoder=new TextDecoder('shift_jis',{fatal:true}),out=new Set<string>();
 for(let lead=0x81;lead<=0xfc;lead++){
  if(lead>0x9f&&lead<0xe0)continue;
  for(let trail=0x40;trail<=0xfc;trail++){if(trail===0x7f)continue;try{const c=decoder.decode(new Uint8Array([lead,trail]));if(/^\p{sc=Han}$/u.test(c))out.add(c);}catch{/* an unassigned code */}}
 }
 return kanji=out;
}
const HAN=/\p{sc=Han}/gu;
export const JA_FIX_COMMAND='env -u CI OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/ja/ja.test.ts';
/** The `ja` profile's typographyCheck: what the CJK punctuation fixer would still change, and each Han character Japanese does not
 * encode (match: the character, so lint-allowed.json can accept it in one string with a reason). */
export function japaneseTypographyFindings(text:string){
 const known=japaneseKanji();
 return [
  ...cjkPunctuationFindings(text,JAPANESE_STYLE,JA_FIX_COMMAND),
  ...[...new Set(text.match(HAN)??[])].filter(c=>!known.has(c)).map(c=>({label:'Han character outside Japanese (JIS X 0208 / Windows-31J), likely Chinese',match:c,use:'write the Japanese character or word'})),
 ];
}
