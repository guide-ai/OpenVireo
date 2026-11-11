/** A small CSS reader for this project's flat sheets, shared by the typography checks of src/theme/scripts.test.ts (Front SC3) and
 * src/theme/rtl.test.ts (Front RT5). Test support only: no component imports it. */
export type Rule=Readonly<{file:string;media:string;selectors:readonly string[];decls:ReadonlyMap<string,string>}>;
/** Splits at top-level commas (outside parentheses and quotes). */
export function splitTop(text:string):string[]{
 const out:string[]=[];let depth=0,quote='',cur='';
 for(const c of text){
  if(quote){cur+=c;if(c===quote)quote='';continue;}
  if(c==='"'||c==="'"){quote=c;cur+=c;continue;}
  if(c==='(')depth++;else if(c===')')depth--;
  if(c===','&&depth===0){out.push(cur.trim());cur='';}else cur+=c;
 }
 if(cur.trim())out.push(cur.trim());
 return out;
}
/** Style rules, possibly inside @media blocks; comments removed. */
export function rules(file:string,css:string):Rule[]{
 const out:Rule[]=[],media:string[]=[];let buf='';
 const text=css.replace(/\/\*[\s\S]*?\*\//g,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='{'){
   const head=buf.trim();buf='';
   if(head.startsWith('@')){media.push(head);continue;}
   const end=text.indexOf('}',i),body=text.slice(i+1,end);i=end;
   const decls=new Map<string,string>();
   for(const d of body.split(';')){const at=d.indexOf(':');if(at>0)decls.set(d.slice(0,at).trim(),d.slice(at+1).trim());}
   out.push({file,media:media.join(' '),selectors:splitTop(head),decls});
  }else if(c==='}'){media.pop();buf='';}
  else buf+=c;
 }
 return out;
}
export const unquote=(s:string)=>s.replace(/^["']|["']$/g,'');
export const families=(value:string)=>splitTop(value).map(unquote);
export const GENERIC=new Set(['serif','sans-serif','monospace','cursive','fantasy','system-ui','math','emoji','fangsong']);
/** The English list with the script fallback inserted before the first of system-ui and the generic families (appended when
 * there is none), as the theme's two typography sheets must declare it for the languages with a script stack. */
export function withScript(english:string):string{
 const list=splitTop(english),mono=/mono|courier|consolas|cascadia/i.test(english),fallback=mono?'var(--ov-font-script-mono)':'var(--ov-font-script)';
 const at=list.findIndex(f=>GENERIC.has(unquote(f)));
 if(at<0)list.push(fallback);else list.splice(at,0,fallback);
 return list.join(',');
}
