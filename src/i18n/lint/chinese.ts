/** Front ZH1 (plan analysis/front-plans/front-i18n-zh.md §4.3, §9): the Chinese profiles' typographyCheck, as japanese.ts is
 * Japanese's: what Front JA0's CJK punctuation fixer (cjkPunctuation.ts) would still change in the variant's style, and each Han
 * character outside the variant's standard character set: GB2312's 6,763 hanzi for Simplified Chinese, Big5's 13,060 standard
 * hanzi for Traditional (Taiwan). A character outside the set is a Japanese form (図 対 駅…), a rare variant or the other script's
 * form, all of which a model leaves by habit; lint-allowed.json may accept one in one string with a reason. The sets are built on
 * first use by decoding every double-byte code of the runtime's own WHATWG decoders, as scripts/han-variants.mjs does (GBK rows
 * 0xB0–0xF7; Big5 0xA440–0xC67E and 0xC940–0xF9D5, the HKSCS extensions left out): nothing is downloaded or bundled. */
import {cjkPunctuationFindings,SIMPLIFIED_CHINESE_STYLE,TRADITIONAL_CHINESE_STYLE,type CjkStyle} from './cjkPunctuation';

type Variant='zh-Hans'|'zh-Hant';
const sets:Partial<Record<Variant,ReadonlySet<string>>>={};
const decode=(encoding:string,leads:readonly (readonly [number,number])[],trails:readonly (readonly [number,number])[])=>{
 const decoder=new TextDecoder(encoding,{fatal:true}),out=new Set<string>();
 for(const [lo,hi] of leads)for(let lead=lo;lead<=hi;lead++)for(const [tlo,thi] of trails)for(let trail=tlo;trail<=thi;trail++){
  try{const c=decoder.decode(new Uint8Array([lead,trail]));if(/^\p{sc=Han}$/u.test(c))out.add(c);}catch{/* an unassigned code */}
 }
 return out;
};
/** The Han characters of the variant's standard set: GB2312 (zh-Hans) or Big5's standard ranges (zh-Hant). */
export function chineseHanzi(variant:Variant):ReadonlySet<string>{
 return sets[variant]??=variant==='zh-Hans'?decode('gbk',[[0xb0,0xf7]],[[0xa1,0xfe]]):decode('big5',[[0xa4,0xc6],[0xc9,0xf9]],[[0x40,0x7e],[0xa1,0xfe]]);
}
const STYLE:Readonly<Record<Variant,CjkStyle>>={'zh-Hans':SIMPLIFIED_CHINESE_STYLE,'zh-Hant':TRADITIONAL_CHINESE_STYLE};
const SET_NAME:Readonly<Record<Variant,string>>={'zh-Hans':'GB2312','zh-Hant':'Big5'};
export const fixCommand=(variant:Variant)=>`env -u CI OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/${variant.toLowerCase()}/${variant.toLowerCase()}.test.ts`;
const HAN=/\p{sc=Han}/gu;
/** The Chinese profiles' typographyCheck: what the CJK punctuation fixer would still change in the variant's style, and each Han
 * character outside the variant's set (match: the character, so lint-allowed.json can accept it in one string with a reason). */
export function chineseTypographyFindings(variant:Variant){
 return (text:string)=>{
  const known=chineseHanzi(variant);
  return [
   ...cjkPunctuationFindings(text,STYLE[variant],fixCommand(variant)),
   ...[...new Set(text.match(HAN)??[])].filter(c=>!known.has(c)).map(c=>({label:`Han character outside ${SET_NAME[variant]} (a Japanese, rare or other-script form)`,match:c,use:'write the standard character of this variant'})),
  ];
 };
}
