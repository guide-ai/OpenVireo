/** Linear tag scans for the VizieR VOTable reader (web adaptation [W], security review of 2026-11-14).
 * Each function returns exactly the matches of the regular expression named in its comment, but finds them with indexOf and a
 * cursor that only moves forward. The expressions themselves rescan the rest of the text for every opening tag that has no `>`
 * or no closing tag after it, so a hostile response within the size limit (millions of `<TR>` and no `</TR>`) took time
 * quadratic in its length. markupScan.test.ts checks the equivalence against those expressions on generated text.
 * Names are upper-case ASCII letters, as the VOTable elements read here are. Pure; no parsing beyond the tag boundaries. */

const wordAt=(text:string,at:number)=>at<text.length&&/\w/.test(text[at]);

/** The first match of `<NAME\b[^>]*>` at or after `from`, as [start, index after its `>`], or null. A candidate with no `>`
 * after it means no later candidate has one either, so the scan ends there. */
function findOpen(text:string,name:string,from:number):readonly [number,number]|null {
 const open='<'+name;
 for(let at=text.indexOf(open,from);at>=0;at=text.indexOf(open,at+1)){
  const after=at+open.length;
  if(wordAt(text,after))continue;// `\b`: <TABLEDATA> is not a <TABLE> tag
  const end=text.indexOf('>',after);
  return end<0?null:[at,end+1];
 }
 return null;
}

/** Every match of `<(?:A|B|…)\b[^>]*>` (global), in order, as the matched text. */
export function* openTags(text:string,...names:string[]):Generator<string> {
 const found=names.map(name=>findOpen(text,name,0));
 for(let pos=0;;){
  let best:readonly [number,number]|null=null;
  for(let i=0;i<names.length;i++){
   // A match that starts before the cursor lies inside the tag just returned; look again from the cursor.
   if(found[i]&&found[i]![0]<pos)found[i]=findOpen(text,names[i],pos);
   const f=found[i];if(f&&(!best||f[0]<best[0]))best=f;
  }
  if(!best)return;
  yield text.slice(best[0],best[1]);pos=best[1];
 }
}

/** Capture 1 of every match of `<NAME\b[^>]*>([\s\S]*?)<\/NAME>` (global), in order. */
export function* elementBodies(text:string,name:string):Generator<string> {
 const close=`</${name}>`;
 for(let pos=0;;){
  const open=findOpen(text,name,pos);if(!open)return;
  // No closing tag after this opening tag means none after any later one.
  const end=text.indexOf(close,open[1]);if(end<0)return;
  yield text.slice(open[1],end);pos=end+close.length;
 }
}

/** Capture 1 of the first match of `<NAME>([\s\S]*?)<\/NAME>` (a bare opening tag), or null. */
export function firstBareElementBody(text:string,name:string):string|null {
 const open=`<${name}>`,start=text.indexOf(open);if(start<0)return null;
 const end=text.indexOf(`</${name}>`,start+open.length);
 return end<0?null:text.slice(start+open.length,end);
}

/** Capture 1 (or '' where it did not take part) of every match of `<NAME\b[^>]*\/>|<NAME\b[^>]*>([\s\S]*?)<\/NAME>`
 * (global), in order: a self-closing tag is an empty cell. Unlike elementBodies, a self-closing tag can still match after the
 * last closing tag, so the scan goes on once no closing tag is left. */
export function* cellBodies(text:string,name:string):Generator<string> {
 const close=`</${name}>`;let closes=true;
 for(let pos=0;;){
  const open=findOpen(text,name,pos);if(!open)return;
  if(text[open[1]-2]==='/'){yield '';pos=open[1];continue;}
  const end=closes?text.indexOf(close,open[1]):-1;
  // Every candidate inside this opening tag ends at the same `>` and fails the same way; continue after it.
  if(end<0){closes=false;pos=open[1];continue;}
  yield text.slice(open[1],end);pos=end+close.length;
 }
}
