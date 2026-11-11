// Front RT4 (plan analysis/front-plans/front-i18n-rtl.md § 5.2 "ltrRunProblems"; docs/I18N.md "RTL groundwork: the bidi runtime
// (RT4)"): a geometric check of left-to-right text drawn inside right-to-left pages. Every piece of rendered text that must read left
// to right (a number, coordinate, file name, unit or English text) is measured grapheme by grapheme with Range rectangles: on each
// line its characters must be drawn left to right in their logical order. That finds "12.5-" (a minus drawn after its number),
// "45 30 12" (a coordinate reversed), "…Save As" (an ellipsis drawn before its item) and English pieces drawn in reverse order.
// RT7's route walk (tests/scripts/rtl.scripts.ts, with the mirroring and island checks) reuses it. No pixel screenshots.
import type {Page} from '@playwright/test';

/** `isolate`: the content of an isolate (FSI/LRI/RLI … PDI) with no right-to-left letter, the bidi runtime's own output; `node`: a
 * whole text node with no right-to-left letter (a number, coordinate or English text rendered alone); `run`: one word of Latin
 * letters or digits inside a text node that also holds right-to-left letters, from its first to its last letter or digit, with a
 * sign before a leading digit and an ellipsis after a trailing letter ("-12.5", "As…"). Words are checked one by one: between
 * two words in a right-to-left sentence the reading order is right to left, so only a whole node or an isolate says that several
 * words form one left-to-right value. */
export type BidiProblem=Readonly<{kind:'isolate'|'node'|'run';text:string;run:string;where:string}>;
export type BidiOptions=Readonly<{
 /** The subtree to check (default the body). */
 root?:string;
 /** Subtrees not checked. */
 skip?:string;
}>;

/** Text that must read left to right but is drawn out of order, in the visible text of `root`. */
export async function ltrRunProblems(page:Page,options:BidiOptions={}):Promise<BidiProblem[]>{
 return page.evaluate(({root,skip})=>{
  const RTL_LETTER=/(?=\p{L})[\p{sc=Arabic}\p{sc=Hebrew}\p{sc=Syriac}\p{sc=Thaana}\p{sc=Nko}]/u;
  const OPEN='\u2066\u2067\u2068',PDI='\u2069';
  const CONTROL=/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/u;
  // Not placed by order: white space, controls, paired brackets and quotes (mirrored by the bidi algorithm, so drawn correctly on
  // the other side), and the pseudo-locales' markers and padding.
  const UNORDERED=/^(?:\s+|[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]|[()[\]{}<>«»‹›⟦⟧“”‘’"'·])$/u;
  const LETTER_OR_DIGIT=/[\p{L}\p{N}]/u;
  const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
  const problems:{kind:'isolate'|'node'|'run';text:string;run:string;where:string}[]=[];
  const base=document.querySelector(root);if(!base)return [];
  const describe=(el:Element)=>{const id=el.closest('[data-testid]')?.getAttribute('data-testid');return `${el.tagName.toLowerCase()}${el.classList.length?'.'+[...el.classList].join('.'):''}${id?` [${id}]`:''}`;};
  /** The graphemes of node[start,end) with their boxes, in logical order; graphemes that draw nothing are left out. */
  function boxes(node:Text,start:number,end:number){
   const out:{g:string;x:number;y:number;h:number}[]=[];let at=start;
   for(const {segment} of segmenter.segment(node.data.slice(start,end))){
    const from=at;at+=segment.length;if(UNORDERED.test(segment))continue;
    const r=document.createRange();r.setStart(node,from);r.setEnd(node,from+segment.length);
    const rect=[...r.getClientRects()].find(b=>b.width>0&&b.height>0);if(!rect)continue;
    out.push({g:segment,x:rect.left+rect.width/2,y:rect.top+rect.height/2,h:rect.height});
   }
   return out;
  }
  function check(node:Text,start:number,end:number,kind:'isolate'|'node'|'run'){
   const run=node.data.slice(start,end);if(!LETTER_OR_DIGIT.test(run))return;
   const b=boxes(node,start,end);
   for(let i=1;i<b.length;i++){
    const p=b[i-1],q=b[i];if(Math.abs(p.y-q.y)>Math.min(p.h,q.h)/2)continue;// another line
    if(q.x<p.x-1){problems.push({kind,text:node.data.replace(CONTROL,'').slice(0,120),run:run.replace(/[\u2066-\u2069]/gu,''),where:describe(node.parentElement!)});return;}
   }
  }
  const walker=document.createTreeWalker(base,NodeFilter.SHOW_TEXT);
  for(let n=walker.nextNode() as Text|null;n;n=walker.nextNode() as Text|null){
   const parent=n.parentElement;if(!parent||!LETTER_OR_DIGIT.test(n.data))continue;
   if(parent.closest('script,style,noscript,template,option,textarea,title')||(skip&&parent.closest(skip)))continue;
   if(typeof parent.checkVisibility==='function'&&!parent.checkVisibility({visibilityProperty:true,opacityProperty:true}))continue;
   const data=n.data;
   // Outermost isolates and their extent.
   const isolates:[number,number][]=[];
   for(let i=0,depth=0,open=-1;i<data.length;i++){
    if(OPEN.includes(data[i])){if(!depth++)open=i;}
    else if(data[i]===PDI&&depth){if(!--depth)isolates.push([open+1,i]);}
   }
   for(const [s,e] of isolates)if(!RTL_LETTER.test(data.slice(s,e)))check(n,s,e,'isolate');
   if(!RTL_LETTER.test(data)){check(n,0,data.length,'node');continue;}
   // Left-to-right runs outside isolates in a node with right-to-left letters.
   const inside=(i:number)=>isolates.some(([s,e])=>i>=s-1&&i<=e);
   let s=-1;
   const flush=(e:number)=>{
    if(s<0)return;let a=s,z=e;s=-1;
    while(a<z&&!LETTER_OR_DIGIT.test(data[a]))a++;while(z>a&&!LETTER_OR_DIGIT.test(data[z-1]))z--;if(a>=z)return;
    if(/[-+−]/.test(data[a-1]??'')&&/\p{N}/u.test(data[a]))a--;
    if(/\p{L}/u.test(data[z-1])){if(data[z]==='…')z++;else if(data.startsWith('...',z))z+=3;}
    check(n,a,z,'run');
   };
   for(let i=0;i<data.length;i++){if(RTL_LETTER.test(data[i])||inside(i)||/\s/.test(data[i]))flush(i);else if(s<0)s=i;}
   flush(data.length);
  }
  return problems;
 },{root:options.root??'body',skip:options.skip??''});
}
