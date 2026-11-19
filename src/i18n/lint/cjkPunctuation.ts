/** Front JA0 (plan analysis/front-plans/front-i18n-ja.md §1.2 #1, §4.2): Japanese and Chinese on-screen punctuation as one pure,
 * idempotent fixer, as frenchSpacing.ts is for French. Translation batches type ASCII punctuation, spaces and straight quotes next
 * to CJK text by habit; this rewrites them, and the `ja` lint profile reports every string it would still change (so the fixer and
 * the lint can never disagree). It writes characters, never escapes: src/i18n/ja/ja.test.ts's fix mode puts them literally into
 * ja.json, originals.json and the map sources through frenchSpacing.ts's fixSourceLiterals.
 *
 * Written for every CJK language (a style names the language's letters, comma and quotes): Japanese 、 and 「」, Traditional
 * Chinese ， and 「」, Simplified Chinese ， and “ ”.
 *
 * What it does, in order:
 * 1. Straight "…" pairs into the style's quotes (the inner pair inside an open quote), and, where the style's quotes are 「」, top-level
 *    “…” pairs too. An odd number of straight quotes, or a VIREO `fragment|` original (`quotes:false`), is left alone.
 * 2. An ASCII ( ) pair into （ ） when either bracket touches CJK text (spaces between them ignored); a lone bracket only when it
 *    touches CJK directly.
 * 3. ASCII , . : ; ? ! right after a CJK letter, a closing full-width bracket or quote, or ？ ！ into the style's full-width mark.
 *    Never VIREO's `...` (the ellipsis), a `.` before a Latin letter or digit (a file extension: «.SSP»), `:` before `/`, or `?lang=`.
 * 4. Spaces (U+0020, U+00A0) next to a full-width mark or bracket, and between a CJK letter and a Latin letter, a digit, a
 *    {placeholder} or a template value, removed (the scripts style sheet of src/theme adds the visual gap with `text-autospace`).
 * Never touched: {placeholders}, URLs, `?lang=` values, line breaks, a space next to a URL, text between two Latin characters
 * («12 km/s», «Enter» stays as typed) and every glyph other than the marks above (› ↗ ▸ · — – × ✳). No `\b` or `\w`. */
import type {TypographyChange} from './frenchSpacing';
export type CjkStyle=Readonly<{
 /** One letter of the language, as a regular expression character class source. */
 letter:string;
 /** The full-width comma that replaces `,` (、 Japanese, ， Chinese). */
 comma:string;
 /** The quotes that replace straight "…" pairs, and the inner pair inside them. */
 quotes:readonly [string,string];innerQuotes:readonly [string,string];
}>;
export const JAPANESE_STYLE:CjkStyle=Object.freeze<CjkStyle>({letter:'[\\p{sc=Han}\\p{sc=Hira}\\p{sc=Kana}\\u30fc]',comma:'、',quotes:['「','」'],innerQuotes:['『','』']});
export const SIMPLIFIED_CHINESE_STYLE:CjkStyle=Object.freeze<CjkStyle>({letter:'\\p{sc=Han}',comma:'，',quotes:['“','”'],innerQuotes:['‘','’']});
export const TRADITIONAL_CHINESE_STYLE:CjkStyle=Object.freeze<CjkStyle>({letter:'\\p{sc=Han}',comma:'，',quotes:['「','」'],innerQuotes:['『','』']});
export type CjkPunctuationOptions=Readonly<{
 /** Turn straight "…" pairs into the style's quotes (off for a VIREO `fragment|` original, which another piece closes). Default true. */
 quotes?:boolean;
 /** Characters standing for a value (a template's ${…}): next to CJK text they lose their spaces, like a {placeholder}. */
 valueMarks?:RegExp;
}>;
const SPACE=/[  ]/u;
/** Spans kept as they are: placeholders, URLs, ?lang= values and VIREO's `...`. */
const URL_SPAN=/https?:\/\/[^\s」』）)、。]+/gu,KEPT=new RegExp(`\\{[\\p{L}\\p{N}_]+\\}|${URL_SPAN.source}|\\?lang=[\\p{L}\\p{N}-]*|\\.\\.\\.`,'gu');
const FULL_MARKS='、。，．：；？！（）〈〉《》【】〔〕';
const ASCII_MARK:Readonly<Record<string,string>>={'.':'。',':':'：',';':'；','?':'？','!':'！'};

/** `url`: inside a URL, whose neighbouring spaces stay too. */
type Cell={c:string;kept:boolean;url?:boolean};
function cellsOf(text:string):Cell[]{
 const chars=[...text],kept=Array<boolean>(chars.length).fill(false);
 const unitToCp:number[]=[];{let cp=0;for(const c of chars){for(let k=0;k<c.length;k++)unitToCp.push(cp);cp++;}}
 const url=Array<boolean>(chars.length).fill(false);
 const mark=(re:RegExp,mask:boolean[])=>{for(const m of text.matchAll(re)){const a=unitToCp[m.index],b=m.index+m[0].length>=text.length?chars.length:unitToCp[m.index+m[0].length];for(let i=a;i<b;i++)mask[i]=true;}};
 mark(KEPT,kept);mark(URL_SPAN,url);
 return chars.map((c,i)=>url[i]?{c,kept:true,url:true}:{c,kept:kept[i]});
}
const joined=(cells:readonly Cell[])=>cells.map(x=>x.c).join('');

/** The fixed text and every change made, in order. */
export function cjkPunctuation(text:string,style:CjkStyle=JAPANESE_STYLE,options:CjkPunctuationOptions={}):{text:string;changes:TypographyChange[]}{
 const changes:TypographyChange[]=[],letter=new RegExp(`^${style.letter}$`,'u');
 const valueMark=options.valueMarks?new RegExp(`^(?:${options.valueMarks.source})$`,options.valueMarks.flags.replace('g','')):null;
 const isLetter=(c:string|undefined)=>!!c&&letter.test(c);
 const fullMarks=FULL_MARKS+style.quotes.join('')+style.innerQuotes.join('');
 const isFull=(c:string|undefined)=>!!c&&fullMarks.includes(c);
 const closers='）〉》】〔〕'+style.quotes[1]+style.innerQuotes[1]+'？！';
 let cells=cellsOf(text);
 const note=(label:string,at:number,match:string)=>changes.push({label,at,match});
 const context=(i:number)=>cells.slice(Math.max(0,i-2),i+3).map(x=>x.c).join('');
 // 1. Quotes.
 if(options.quotes!==false){
  const straight=cells.flatMap((x,i)=>x.c==='"'&&!x.kept?[i]:[]);
  if(straight.length&&straight.length%2===0){
   let depth=0;const innerPair:boolean[]=[];
   for(let i=0;i<cells.length;i++){const c=cells[i].c;if(c===style.quotes[0])depth++;else if(c===style.quotes[1])depth=Math.max(0,depth-1);
    else if(straight.includes(i)){const n=straight.indexOf(i),open=n%2===0;if(open)innerPair[n>>1]=depth>0;const inner=innerPair[n>>1];
     const pair=inner?style.innerQuotes:style.quotes;note(`${style.quotes.join(' ')} instead of straight quotes`,i,context(i));cells[i]={c:open?pair[0]:pair[1],kept:false};
     if(!inner)depth=open?depth+1:Math.max(0,depth-1);}}
  }
  if(style.quotes[0]!=='“'){
   const curly=cells.flatMap((x,i)=>!x.kept&&(x.c==='“'||x.c==='”')?[i]:[]);
   if(curly.length&&curly.length%2===0&&curly.every((i,n)=>cells[i].c===(n%2===0?'“':'”'))){
    let depth=0;
    for(let i=0;i<cells.length;i++){const c=cells[i].c;
     if(c===style.quotes[0]&&!curly.includes(i))depth++;else if(c===style.quotes[1]&&!curly.includes(i))depth=Math.max(0,depth-1);
     else if(curly.includes(i)){const open=c==='“',pair=depth>(open?0:1)?style.innerQuotes:style.quotes;note(`${style.quotes.join(' ')} instead of “ ”`,i,context(i));cells[i]={c:open?pair[0]:pair[1],kept:false};if(pair===style.quotes)depth=open?depth+1:Math.max(0,depth-1);}}
   }
  }
 }
 // 2. Brackets.
 const near=(i:number,step:1|-1)=>{let j=i+step;while(j>=0&&j<cells.length&&SPACE.test(cells[j].c))j+=step;return cells[j]?.c;};
 const cjkSide=(c:string|undefined)=>isLetter(c)||isFull(c);
 {
  const stack:number[]=[],pairs:[number,number][]=[],lone:number[]=[];
  cells.forEach((x,i)=>{if(x.kept)return;if(x.c==='(')stack.push(i);else if(x.c===')'){const o=stack.pop();if(o===undefined)lone.push(i);else pairs.push([o,i]);}});
  lone.push(...stack);
  for(const [o,c] of pairs)if(cjkSide(near(o,-1))||cjkSide(near(o,1))||cjkSide(near(c,-1))||cjkSide(near(c,1))){
   note('（ ） around or next to CJK text',o,context(o));cells[o]={c:'（',kept:false};cells[c]={c:'）',kept:false};}
  for(const i of lone)if(cjkSide(cells[i-1]?.c)||cjkSide(cells[i+1]?.c)){note('（ ） next to CJK text',i,context(i));cells[i]={c:cells[i].c==='('?'（':'）',kept:false};}
 }
 // 3. Marks after CJK text.
 for(let i=1;i<cells.length;i++){
  const x=cells[i];if(x.kept)continue;
  const before=cells[i-1].c;if(!isLetter(before)&&!closers.includes(before))continue;
  const next=cells[i+1]?.c??'';let to:string|undefined;
  if(x.c===',')to=style.comma;
  else if(x.c==='.')to=/[\p{sc=Latn}\p{N}]/u.test(next)?undefined:'。';
  else if(x.c===':')to=next==='/'?undefined:'：';
  else if(x.c in ASCII_MARK)to=ASCII_MARK[x.c];
  if(to){note(`full-width ${to} after CJK text`,i,context(i));cells[i]={c:to,kept:false};}
 }
 // 4. Spaces. A run of spaces goes when one side is a full-width mark or bracket and the other is no line break or end, or when
 // a CJK letter meets a Latin letter, a digit, a placeholder brace or a template value; never next to a URL.
 const latinSide=(c:string|undefined)=>!!c&&(/[\p{sc=Latn}\p{N}{}]/u.test(c)||!!valueMark?.test(c));
 const out:Cell[]=[];
 for(let i=0;i<cells.length;){
  if(!SPACE.test(cells[i].c)||cells[i].kept){out.push(cells[i]);i++;continue;}
  let j=i;while(j<cells.length&&SPACE.test(cells[j].c)&&!cells[j].kept)j++;
  const a=cells[i-1],b=cells[j];
  const drop=!!a&&!!b&&!a.url&&!b.url&&!/\s/u.test(a.c)&&!/\s/u.test(b.c)&&(isFull(a.c)||isFull(b.c)||isLetter(a.c)&&latinSide(b.c)||latinSide(a.c)&&isLetter(b.c));
  if(drop)note('no space next to CJK text',i,`${a.c}${cells.slice(i,j).map(x=>x.c).join('')}${b.c}`);
  else out.push(...cells.slice(i,j));
  i=j;
 }
 cells=out;
 return {text:joined(cells),changes};
}
/** The fixed text only. */
export const fixCjkPunctuation=(text:string,style:CjkStyle=JAPANESE_STYLE,options?:CjkPunctuationOptions):string=>cjkPunctuation(text,style,options).text;
/** The lint's view (src/i18n/lint/profiles.ts): what the fixer would still change. */
export const cjkPunctuationFindings=(text:string,style:CjkStyle,command:string)=>cjkPunctuation(text,style).changes.map(c=>({label:c.label,match:c.match,use:`run the CJK punctuation fixer (${command})`}));
