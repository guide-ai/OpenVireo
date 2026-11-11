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
  // Front RT7: two right-to-left readings that are correct and so not checked. A run holding RLM or ALM is a locale's own
  // right-to-left format (ICU writes the Arabic date «10‏/11‏/2026» with RLM after each field, so it reads day first from the right);
  // an unsigned range of two numbers joined by an en dash ("3700–4700", "1992–93") is drawn "4700–3700" and reads from 3700 to 4700
  // right to left (plan § 3.4). A signed range ("−1–1") and a hyphenated date ("2009-06-01", drawn "01-06-2009") are still checked.
  const RTL_FORMAT=/[\u200f\u061c]/u,RANGE=/^\d[\d.,]*–\d[\d.,]*$/u;
  function check(node:Text,start:number,end:number,kind:'isolate'|'node'|'run'){
   const run=node.data.slice(start,end);if(!LETTER_OR_DIGIT.test(run)||RTL_FORMAT.test(run)||(kind==='run'&&RANGE.test(run)))return;
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

/** Front RT7: the left-to-right islands of src/theme/rtl.css § 1, read from the sheet's source (the `:is(…)` list of its first island
 * rule and the numeric-input rule), so a selector added there is checked without a list here. */
export function rtlIslandSelectors(css:string):string[]{
 const body=css.replace(/\/\*[\s\S]*?\*\//g,'');
 const lists=[...body.matchAll(/:root\[dir=rtl\] :is\(([^{}]+)\)\{direction:ltr;unicode-bidi:isolate/g)].map(m=>m[1]);
 if(lists.length<2)throw new Error('rtl.css: the island rules were not found');
 const out:string[]=[];
 for(const list of lists){let depth=0,cur='';for(const ch of list.replace(/\s+/g,'')){if(ch==='('||ch==='[')depth++;if(ch===')'||ch===']')depth--;if(ch===','&&!depth){out.push(cur);cur='';}else cur+=ch;}if(cur)out.push(cur);}
 return out;
}

/** Front RT7 (plan § 5.2 "islandProblems" and "langDirProblems"): in a right-to-left page, every visible element matching an island
 * selector computes `direction:ltr` (an inline style or a more specific rule could undo rtl.css), and every element with a `lang`
 * attribute below the root computes its language's direction (ar, fa, he, ur and their regions right to left; any other left to
 * right). Each problem is "<selector or lang>: <element> computes <direction>". */
export async function islandProblems(page:Page,islands:readonly string[]):Promise<string[]>{
 return page.evaluate(islands=>{
  const out:string[]=[];
  const describe=(el:Element)=>{const id=el.closest('[data-testid]')?.getAttribute('data-testid');const cls=typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\s+/).slice(0,2).join('.'):'';return `${el.tagName.toLowerCase()}${cls}${id?` [${id}]`:''}`;};
  const shown=(el:Element)=>typeof el.checkVisibility!=='function'||el.checkVisibility({visibilityProperty:true});
  const seen=new Set<string>();
  for(const sel of islands)for(const el of document.body.querySelectorAll(sel)){
   if(!shown(el))continue;const d=getComputedStyle(el).direction;
   if(d!=='ltr'){const p=`island ${sel}: ${describe(el)} computes ${d}`;if(!seen.has(p)){seen.add(p);out.push(p);}}
  }
  for(const el of document.body.querySelectorAll('[lang]')){
   if(!shown(el))continue;const lang=el.getAttribute('lang')!,want=/^(?:ar|fa|he|iw|ur)(?:-|$)/i.test(lang)?'rtl':'ltr',d=getComputedStyle(el).direction;
   if(d!==want){const p=`lang=${lang}: ${describe(el)} computes ${d}, not ${want}`;if(!seen.has(p)){seen.add(p);out.push(p);}}
  }
  return out;
 },[...islands]);
}

/** Front RT7 (plan § 5.2 "mirrorProblems"): the page's own chrome is on the mirrored side in a right-to-left page. Checked where it is
 * shown: the fixed sidebar (from 1100 px) touches the right edge and the content is left of it; the page bar's place is right of its
 * tools when they share a row; an open page-bar menu is inside the viewport and aligned with its button's inline end (left) edge,
 * or spans the bar below 600 px; an open dialog's close button is nearer its left edge; the tour card is not on the right of its
 * outline (side `left`, or above or below it). Tolerance 1.5 px. */
export async function mirrorProblems(page:Page):Promise<string[]>{
 return page.evaluate(()=>{
  const out:string[]=[],view=document.documentElement.clientWidth;
  const box=(el:Element|null)=>{if(!el)return null;const r=el.getBoundingClientRect();return r.width&&r.height?r:null;};
  const shown=(el:Element|null)=>!!el&&(typeof el.checkVisibility!=='function'||el.checkVisibility({visibilityProperty:true}))&&!!box(el);
  const side=document.querySelector('.portal-header');
  if(side&&getComputedStyle(side).position==='fixed'){
   const s=box(side)!;if(Math.abs(s.right-view)>1.5)out.push(`sidebar ends at ${Math.round(s.right)}, not at the right edge ${view}`);
   const main=[...document.querySelectorAll('main')].map(box).find(Boolean);if(main&&main.right>s.left+1.5)out.push(`content (${Math.round(main.left)}–${Math.round(main.right)}) reaches under the sidebar at ${Math.round(s.left)}`);
  }
  const place=document.querySelector('.page-bar-place'),tools=document.querySelector('.page-bar-tools');
  if(shown(place)&&shown(tools)){const p=box(place)!,t=box(tools)!;if(p.top<t.bottom&&t.top<p.bottom&&p.left<t.right-1.5)out.push(`page bar: place (${Math.round(p.left)}–${Math.round(p.right)}) is not right of its tools (${Math.round(t.left)}–${Math.round(t.right)})`);}
  for(const list of document.querySelectorAll('.page-bar .fi-menu-list')){
   if(!shown(list))continue;const l=box(list)!,button=list.closest('.fi-menu')?.querySelector(':scope>button'),b=box(button??null);
   const name=list.getAttribute('data-testid')??list.closest('[data-testid]')?.getAttribute('data-testid')??'menu';
   if(l.left<-.5||l.right>view+.5)out.push(`${name} leaves the viewport (${Math.round(l.left)}–${Math.round(l.right)})`);
   if(b&&view>=600&&Math.abs(l.left-b.left)>1.5)out.push(`${name} starts at ${Math.round(l.left)}, not at its button's left edge ${Math.round(b.left)}`);
  }
  for(const d of document.querySelectorAll('dialog[open],[role=dialog][aria-modal=true]')){
   const close=d.querySelector(':scope .dialog-close');if(!shown(close)||!shown(d))continue;
   const r=box(d)!,c=box(close)!;if(c.left-r.left>r.right-c.right+1.5)out.push(`${d.getAttribute('data-testid')??d.className}: close button nearer the right edge`);
  }
  const card=document.querySelector('[data-testid=site-tour-card]'),spot=document.querySelector('[data-testid=site-tour-spot]');
  if(shown(card)&&shown(spot)){const c=box(card)!,s=box(spot)!,sideOf=card!.getAttribute('data-side');
   if(sideOf==='right'||(c.left>=s.right-1.5&&c.top<s.bottom&&s.top<c.bottom))out.push(`tour card right of its outline (side ${sideOf})`);}
  return out;
 });
}
