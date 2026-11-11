/** Front FR0 (plan analysis/front-plans/front-i18n-fr.md §4): French on-screen typography as one pure, idempotent fixer. The
 * translation batches write ordinary spaces and may write straight quotes or apostrophes; this rewrites them, and the `fr` lint
 * profile reports every string it would still change (so the fixer and the lint can never disagree). It writes characters, never
 * escapes: src/i18n/fr/fr.test.ts's fix mode puts them literally into fr.json, originals.json and the map sources
 * (scripts/check-i18n-dist.mjs reads map literals as written; an escape cost Portuguese a core marker, PT-REL).
 *
 * What it does (§4.1): a narrow no-break space (U+202F) before ; : ! ? and inside « », replacing an ordinary space or U+00A0;
 * the typographic apostrophe ’ between two letters; straight "…" pairs and top-level “…” into « … » (inner “ ” kept inside « »);
 * U+202F between thousands. What it never touches (§4.2): VIREO English glosses in brackets (an ASCII span opening with a capital
 * or a digit and holding no French elision: «(RA:)», «(Observer's Notebook)», «(Save As...)»), {placeholders} and the lint's «A1»
 * samples, URLs and ?lang=, times, ratios and paths («12:30:45», «1:2», «C:\»), a ? or ! not followed by a space, the end or a
 * closer, a mark right after another or after ( or [, and the key «touche ?». No `\b` or `\w`: Unicode classes only. */
export const NNBSP='\u202f';
export type TypographyChange=Readonly<{label:string;at:number;match:string}>;
export type FrenchTypographyOptions=Readonly<{
 /** Turn straight "…" pairs into « » (off for a VIREO `fragment|` original, which another piece closes). Default true. */
 quotes?:boolean;
 /** Characters standing for a value (a template's ${…}); they count as a word, never as a space. */
 valueMarks?:RegExp;
}>;
const LETTER=/\p{L}/u;
const SPACE=/[ \u00a0]/u;
/** Spans kept as they are: placeholders, the lint's samples, URLs, ?lang= values and VIREO's English glosses. */
const KEPT=/\{[\p{L}\p{N}_]+\}|«A\p{N}+»|https?:\/\/[^\s»)]+|\?lang=[\p{L}\p{N}-]*|\((?=[A-Z0-9])(?![^)]*(?<![A-Za-z])(?:[CcDdJjLlMmNnSsTt]|[Qq]u)'[A-Za-z])[\x20-\x27\x2a-\x7e]*\)/gu;
const THOUSANDS=/(?<![\p{L}\p{N}.,])\p{N}{1,3}(?:[, \u00a0]\p{N}{3})+(?![\p{L}\p{N}])/gu;
const HIGH=new Set([';',':','!','?']);
const CLOSERS=new Set([')',']','»','”','’','"','…','.',',',';',':','!','?']);

function keptMask(text:string):boolean[]{
 const kept=Array<boolean>(text.length).fill(false);
 for(const m of text.matchAll(KEPT))for(let i=m.index;i<m.index+m[0].length;i++)kept[i]=true;
 return kept;
}
/** The fixed text and every change made, in order (positions in the original text). */
export function frenchTypography(text:string,options:FrenchTypographyOptions={}):{text:string;changes:TypographyChange[]}{
 const changes:TypographyChange[]=[],valueMark=options.valueMarks;
 const isValue=(c:string|undefined)=>!!c&&!!valueMark&&new RegExp(valueMark.source,valueMark.flags.replace('g','')).test(c);
 const wordy=(c:string|undefined)=>!!c&&(LETTER.test(c)||isValue(c));
 const chars=[...text];// code units would split astral characters; positions below are in code points of `chars`
 const src=chars.join('');
 const kept=keptMask(src),keptAt:boolean[]=[];{let u=0;for(const c of chars){keptAt.push(kept[u]);u+=c.length;}}
 const out:string[]=[...chars];
 const note=(label:string,at:number,match:string)=>changes.push({label,at,match});
 // 1. Thousands: commas, ordinary spaces and U+00A0 between digit groups, glosses included («(1 000)»), as the lint's
 // thousands rules read them (a placeholder or URL holds no group).
 const cp=(unit:number)=>[...src.slice(0,unit)].length;
 for(const m of src.matchAll(THOUSANDS)){
  const start=cp(m.index);
  const groups=[...m[0]];let changed=false;
  groups.forEach((c,i)=>{if(c===','||c===' '||c==='\u00a0'){out[start+i]=NNBSP;changed=true;}});
  if(changed)note('thousands',start,m[0]);
 }
 // 2. Apostrophes between letters (or a letter and a value).
 for(let i=0;i<chars.length;i++)if(chars[i]==='\''&&!keptAt[i]&&LETTER.test(chars[i-1]??'')&&wordy(chars[i+1])){out[i]='’';note('typographic apostrophe ’',i,chars.slice(Math.max(0,i-3),i+3).join(''));}
 // 3. Quotes: straight "…" pairs, then top-level “…”, into « ».
 const quoteAt=(i:number,open:boolean,label:string)=>{
  out[i]=open?'«':'»';note(label,i,chars[i]);
  if(open){if(SPACE.test(out[i+1]??''))out[i+1]=NNBSP;else if(i+1<chars.length)out[i]='«'+NNBSP;}
  else{if(SPACE.test(out[i-1]??''))out[i-1]=NNBSP;else if(i>0)out[i]=NNBSP+'»';}
 };
 if(options.quotes!==false){
  const straight=chars.flatMap((c,i)=>c==='"'&&!keptAt[i]?[i]:[]);
  if(straight.length&&straight.length%2===0)straight.forEach((i,n)=>quoteAt(i,n%2===0,'« » instead of straight quotes'));
  let depth=0;const curly:number[]=[];
  for(let i=0;i<chars.length;i++){if(keptAt[i])continue;const c=out[i];
   if(c.startsWith('«'))depth++;else if(c.endsWith('»'))depth=Math.max(0,depth-1);
   else if(depth===0&&(chars[i]==='“'||chars[i]==='”'))curly.push(i);}
  if(curly.length&&curly.length%2===0&&curly.every((i,n)=>chars[i]===(n%2===0?'“':'”')))curly.forEach((i,n)=>quoteAt(i,n%2===0,'« » instead of top-level “ ”'));
 }
 // 4. Guillemets the text already has: U+202F inside.
 for(let i=0;i<chars.length;i++){
  if(keptAt[i]||out[i]!==chars[i])continue;
  if(chars[i]==='«'&&i+1<chars.length&&chars[i+1]!==NNBSP&&chars[i+1]!=='\n'){
   if(SPACE.test(chars[i+1])){if(out[i+1]===chars[i+1]){out[i+1]=NNBSP;note('narrow no-break space inside « »',i,'« ');}}
   else{out[i]='«'+NNBSP;note('narrow no-break space inside « »',i,`«${chars[i+1]}`);}
  }
  if(chars[i]==='»'&&i>0&&chars[i-1]!==NNBSP&&chars[i-1]!=='\n'){
   if(SPACE.test(chars[i-1])){if(out[i-1]===chars[i-1]){out[i-1]=NNBSP;note('narrow no-break space inside « »',i,' »');}}
   else{out[i]=NNBSP+'»';note('narrow no-break space inside « »',i,`${chars[i-1]}»`);}
  }
 }
 // 5. ; : ! ? — a narrow no-break space before, when the mark is punctuation.
 for(let i=1;i<chars.length;i++){
  const c=chars[i];if(!HIGH.has(c)||keptAt[i])continue;
  const next=chars[i+1];
  const terminal=next===undefined||/\s/u.test(next)||CLOSERS.has(next);
  if(!terminal)continue;// ?lang=, https:, 12:30, 1:2, C:\ …
  let j=i-1;const before=chars[j];
  if(before===NNBSP||before==='\n'||HIGH.has(before)||before==='('||before==='[')continue;
  if(SPACE.test(before)){
   const word=chars.slice(Math.max(0,j-6),j).join('');
   if(c==='?'&&/(?<!\p{L})touche$/u.test(word))continue;// the key «?» (la touche ?)
   j--;if(j<0||/\s/u.test(chars[j]))continue;
   if(out[i-1]!==NNBSP){out[i-1]=NNBSP;note('narrow no-break space before ; : ! ?',i,`${chars[j]} ${c}`);}
  }else if(out[i]===c){out[i]=NNBSP+c;note('narrow no-break space before ; : ! ?',i,`${before}${c}`);}
 }
 return {text:out.join(''),changes};
}
/** The fixed text only. */
export const fixFrenchTypography=(text:string,options?:FrenchTypographyOptions):string=>frenchTypography(text,options).text;
/** The bracketed spans the fixer keeps as VIREO English glosses («(RA:)», «(Observer's Notebook)»), brackets included. */
export const frenchGlosses=(text:string):string[]=>[...text.matchAll(KEPT)].map(m=>m[0]).filter(m=>m.startsWith('('));
const spaced=(s:string)=>s.replace(/\s+/gu,' ');
/** The lint's view (src/i18n/lint/profiles.ts, profile fr): what the fixer would still change, thousands left to their own rules.
 * Review (FR0): with the English source, a kept gloss must also be English that the source holds, so ASCII French in brackets that
 * opens with a capital («(Par exemple: 12)») cannot pass as a gloss and escape the fixer. */
export const frenchTypographyFindings=(text:string,english?:string)=>[
 ...frenchTypography(text).changes.filter(c=>c.label!=='thousands').map(c=>({label:c.label,match:c.match,use:'run the French typography fixer (OPENVIREO_FIX_TYPOGRAPHY=1 npx vitest run src/i18n/fr/fr.test.ts)'})),
 ...(english===undefined?[]:frenchGlosses(text).filter(g=>!spaced(english).includes(spaced(g.slice(1,-1)))).map(g=>({label:'bracketed ASCII text that is no English gloss of the source',match:g,use:'only VIREO\'s English from the source stays as written in brackets; write French there (with an accent or a lower-case start the fixer applies)'}))),
];

/** Control characters a quoted literal writes as escapes (a line terminator cannot stand in one). */
const CONTROL_ESCAPES:Readonly<Record<string,string>>={'\n':'\\n','\r':'\\r','\t':'\\t','\b':'\\b','\f':'\\f','\v':'\\v','\u2028':'\\u2028','\u2029':'\\u2029'};
const SIMPLE_ESCAPES:Readonly<Record<string,string>>={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};
/** The value of a quoted literal's body: every JavaScript escape (\n, \t, \uXXXX, \u{…}, \xXX, a line continuation, \' …). */
const decodeEscapes=(raw:string)=>raw.replace(/\\(?:u\{([0-9a-fA-F]{1,6})\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|\r\n|([\s\S]))/gu,
 (_,cp:string|undefined,u4:string|undefined,x2:string|undefined,ch:string|undefined)=>cp??u4??x2?String.fromCodePoint(parseInt((cp??u4??x2)!,16)):ch===undefined||/[\n\r\u2028\u2029]/u.test(ch)?'':SIMPLE_ESCAPES[ch]??ch);
/** The string literals of a TypeScript map source, rewritten by `fix` (single- and double-quoted strings and template literals;
 * a template's ${…} becomes one value mark while it is fixed, and the code inside it is rewritten the same way). Comments, regular expressions, object keys ('KEY.LST':) and
 * import paths are left alone. Pure: returns the new source. */
export function fixSourceLiterals(source:string,fix:(text:string,options:FrenchTypographyOptions)=>string):string{
 let out='',i=0;const n=source.length;
 const prevSignificant=()=>{const m=/[^\s]\s*$/u.exec(out);return m?m[0][0]:'';};
 const nextSignificant=(k:number)=>{while(k<n&&/\s/u.test(source[k]))k++;return source[k]??'';};
 const VALUE='\ue000';
 while(i<n){
  const c=source[i],d=source[i+1];
  if(c==='/'&&d==='/'){const e=source.indexOf('\n',i);const end=e<0?n:e;out+=source.slice(i,end);i=end;continue;}
  if(c==='/'&&d==='*'){const e=source.indexOf('*/',i+2);const end=e<0?n:e+2;out+=source.slice(i,end);i=end;continue;}
  if(c==='/'&&/[(,=:[!&|?{};]|^$/u.test(prevSignificant())){// a regular expression literal
   let k=i+1,cls=false;while(k<n){const x=source[k];if(x==='\\'){k+=2;continue;}if(x==='[')cls=true;else if(x===']')cls=false;else if(x==='/'&&!cls)break;k++;}
   k++;while(k<n&&/[a-z]/u.test(source[k]))k++;out+=source.slice(i,k);i=k;continue;
  }
  if(c==='\''||c==='"'){
   let k=i+1;while(k<n&&source[k]!==c){if(source[k]==='\\')k++;k++;}
   const raw=source.slice(i+1,k),before=prevSignificant(),after=nextSignificant(k+1);
   const isKey=(before==='{'||before===',')&&after===':',isPath=/(?:from|import\()\s*$/u.test(out);
   if(isKey||isPath||/^\.{0,2}\//u.test(raw)){out+=source.slice(i,k+1);i=k+1;continue;}
   const decoded=decodeEscapes(raw);
   const fixed=fix(decoded,{});
   const encoded=fixed.replace(/[\\'"\p{Cc}\u2028\u2029]/gu,x=>x==='\\'?'\\\\':x===c?`\\${c}`:x==='\''||x==='"'?x:CONTROL_ESCAPES[x]??`\\u${x.charCodeAt(0).toString(16).padStart(4,'0')}`);
   out+=c+(fixed===decoded?raw:encoded)+c;i=k+1;continue;
  }
  if(c==='`'){
   const parts:string[]=[],values:string[]=[],valuesRaw:string[]=[];let k=i+1,cur='';
   while(k<n&&source[k]!=='`'){
    if(source[k]==='\\'){
     // A \u, \x, \' or \" escape is seen as its character (and written as one if the literal changes); `, \, $, { and control
     // characters keep their escape.
     const esc=/^\\(?:u\{([0-9a-fA-F]{1,6})\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|(['"]))/u.exec(source.slice(k,k+12));
     const ch=esc?esc[4]??String.fromCodePoint(parseInt(esc[1]??esc[2]??esc[3],16)):'';
     if(esc&&!/[`\\${}\p{Cc}]/u.test(ch)){cur+=ch;k+=esc[0].length;continue;}
     cur+=source.slice(k,k+2);k+=2;continue;
    }
    if(source[k]==='$'&&source[k+1]==='{'){
     let depth=1,e=k+2;while(e<n&&depth>0){if(source[e]==='{')depth++;else if(source[e]==='}')depth--;else if(source[e]==='\''||source[e]==='"'||source[e]==='`'){const q=source[e];e++;while(e<n&&source[e]!==q){if(source[e]==='\\')e++;e++;}}e++;}
     parts.push(cur);cur='';valuesRaw.push(source.slice(k,e));values.push(`\${${fixSourceLiterals(source.slice(k+2,e-1),fix)}}`);k=e;continue;
    }
    cur+=source[k];k++;
   }
   parts.push(cur);
   const joined=parts.join(VALUE),fixed=fix(joined,{valueMarks:new RegExp(VALUE,'u')});
   if(fixed===joined&&values.join('')===valuesRaw.join(''))out+=source.slice(i,k+1);
   else{const pieces=fixed.split(VALUE);out+='`'+pieces.map((p,x)=>p+(values[x]??'')).join('')+'`';}
   i=k+1;continue;
  }
  out+=c;i++;
 }
 return out;
}
