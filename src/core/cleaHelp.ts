/** The shared CLEA help viewer as pure data (Front V2, docs/CLUSTER-HR-TOOLS.md). Static reading of CLEA_VEO.exe
 * (SHA-256 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c), research analysis/front-v2-cluster-hr/
 * RECOVERY-help.md; nothing executed or emulated.
 * - HelpList load 0x493264 + line parser 0x493138 + quoted-token reader 0x4867fc → `parseHelpList`;
 * - THelpLstDlg "Select Help Topic" 0x493708 / Find Topic 0x493a30 + 0x493c10 / Read 0x493dc8 → `findHelpTopic`,
 *   `readHelpRow`;
 * - THelpWin FormActivate 0x59f174 + section seek 0x59f84c + wrapper 0x487550/0x4875d8 → `helpTopicBody`;
 *   links 0x5a020c → `helpLinkTarget`; Back 0x5a030c / FormShow 0x59f108 → `helpHistory*`; Print Topic 0x59fe44 →
 *   `helpPrintPage`; Search Text 0x59f9fc reuses `searchRadioHotListRows` (the same TGetSrchStrDlg algorithm).
 * Text is Latin-1 (the help files are ASCII); case folding is ASCII A–Z only (LowerCase/UpperCase).
 * Front SC7 [W] (docs/I18N.md, "Script groundwork: Unicode help (SC7)"): a translated help file is Unicode text, read by the
 * `…Text` functions over the same string cores. Their limits count display columns (core/textColumns.ts), which equal the
 * character count of Latin-1 text, so VIREO's files, read as bytes, and the Latin-1 translations keep their exact results;
 * only a translation's over-long line wraps without a space (`wrapHelpText`). */
import {foldAsciiCase} from './radioHotListSearch';
import {takeQuotedToken} from './nativeTextFile';
import {codePointColumns,cutColumns,displayColumns,graphemes} from './textColumns';

export type HelpRowKind='heading'|'topic'|'separator';
/** One HelpList record: the displayed title (indent included) and token 2 (`begin` for a heading, the topic file name for
 * a topic, '' for a separator). */
export type HelpRow=Readonly<{kind:HelpRowKind;title:string;file:string}>;
export type HelpListFailure='size'|'line';
export class HelpListError extends Error{
 constructor(readonly code:HelpListFailure,readonly line?:number){super(`Help list: ${code}${line===undefined?'':` (line ${line})`}`);this.name='HelpListError';}
}
/** Readln into ShortString[80] (0x493264), rec+0x00 title ShortString[65], rec+0x42 file ShortString[71] (0x493138). */
export const HELP_LIST_LIMITS=Object.freeze({line:80,title:65,file:71,bytes:65536});
/** THelpWin wrap width (0x487550 call from FormActivate). */
export const HELP_WRAP_WIDTH=72;

const latin1=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return s;};
/** Text-file lines as Readln returns them: CRLF or LF ends a line; a final line break adds no empty line. */
function splitLines(text:string):string[]{
 const lines=text.split(/\r?\n/);
 if(lines.length>0&&lines[lines.length-1]==='')lines.pop();
 return lines;
}
const textLines=(bytes:Uint8Array)=>splitLines(latin1(bytes));
/** 0x4867fc with the delimiter ' ' (0x493192, 0x4931c7): the shared port. */
const quotedToken=(line:string)=>takeQuotedToken(line,' ');
/** HelpList load (0x493264) for an LST file. Rows follow the native order: `begin` adds a separator unless the previous
 * row is one, then the heading `indent + '-' + title + '-'` and two more indent spaces; `end` removes two indent spaces
 * and adds a separator unless the previous row is one; any other token 2 is a topic `indent + title` in that file.
 * WEB: a blank line (absent from the approved files; its native token result is not traced) is refused as `line`. The
 * native exception path deletes the invalid list file (DeleteFileA at 0x4935e1); the web never deletes anything. */
export function parseHelpList(bytes:Uint8Array):readonly HelpRow[]{
 if(!(bytes instanceof Uint8Array)||bytes.length>HELP_LIST_LIMITS.bytes)throw new HelpListError('size');
 return helpListRows(textLines(bytes));
}
/** Front SC7: `parseHelpList` for a translated LST as Unicode text (at most 65536 UTF-16 units). The 80-character line and the
 * 65- and 71-character fields are cut at whole grapheme clusters within that many display columns. */
export function parseHelpListText(text:string):readonly HelpRow[]{
 if(typeof text!=='string'||text.length>HELP_LIST_LIMITS.bytes)throw new HelpListError('size');
 return helpListRows(splitLines(text));
}
function helpListRows(lines:readonly string[]):readonly HelpRow[]{
 const rows:HelpRow[]=[];let indent='',separated=true;
 lines.forEach((raw,n)=>{
  const line=cutColumns(raw,HELP_LIST_LIMITS.line);
  if(line.trim()==='')throw new HelpListError('line',n+1);
  const [first,rest]=quotedToken(line),[second]=quotedToken(rest);
  const title=cutColumns(first,HELP_LIST_LIMITS.title),file=cutColumns(second,HELP_LIST_LIMITS.file),key=foldAsciiCase(file);
  if(key==='end'){
   indent=indent.slice(0,Math.max(0,indent.length-2));
   if(!separated){rows.push(Object.freeze({kind:'separator',title:'',file:''}));separated=true;}
   return;
  }
  if(key==='begin'){
   if(!separated)rows.push(Object.freeze({kind:'separator',title:'',file:''}));
   rows.push(Object.freeze({kind:'heading',title:cutColumns(indent+'-'+title+'-',HELP_LIST_LIMITS.title),file}));
   indent+='  ';
  }else rows.push(Object.freeze({kind:'topic',title:cutColumns(indent+title,HELP_LIST_LIMITS.title),file}));
  separated=false;
 });
 return Object.freeze(rows);
}

/** 0x493c10 normalisation: leading and trailing spaces removed, ASCII-lowercased unless matchCase. Null for an all-space
 * text: the native routine then reads through a nil string (an access violation, not ported). */
function topicKey(text:string,matchCase:boolean,fold:(text:string)=>string=foldAsciiCase):string|null{
 const t=text.replace(/^ +| +$/g,'');
 if(t==='')return null;
 return matchCase?t:fold(t);
}
/** WEB (Front ES-HELP) [W]: the fold of the Spanish translation's search. VIREO's own rule (`foldAsciiCase`) lowercases A-Z only;
 * for the Latin-1 translation the web folds every Latin-1 letter's case and ignores accents and the diaeresis ("orbita" finds
 * "Órbita"), but keeps ñ a letter of its own. Not VIREO behaviour: the original view keeps `foldAsciiCase`. */
export function foldLatin1Accents(text:string):string{
 if(typeof text!=='string')throw new TypeError('Invalid search text');
 return text.replace(/[ñÑ]/g,'\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\u0001/g,'ñ');
}
const MARK=/^\p{M}$/u,LATIN=/^\p{Script=Latin}$/u;
/** WEB (Front SC7) [W]: the search fold of every translated help set, per script, applied to the query and the rows when "Match
 * case" is off (a substring search, with no word segmentation). On text that holds only characters up to U+00FF it equals
 * `foldLatin1Accents`, so the Spanish and Portuguese search is unchanged (src/core/cleaHelp.test.ts checks every such character
 * and both help sets):
 * - Latin: as `foldLatin1Accents`: a Latin letter's combining diacritics (U+0300–U+036F) are dropped, ñ is kept, case folded;
 * - full-width and half-width forms (U+3000, U+FF01–U+FFEE) take their NFKC form: ＡＢＣ finds ABC, ｶﾞ finds ガ;
 * - other scripts keep their marks (Cyrillic й, Devanagari vowel signs) and are compared in NFC; case is folded only where the
 *   script has case (Cyrillic, Greek, embedded Latin), and ё is read as е;
 * - Japanese katakana is read as hiragana (テレスコープ finds てれすこーぷ);
 * - Devanagari: the nukta (U+093C, also inside क़…य़, which NFC keeps decomposed) and ZWJ/ZWNJ are ignored.
 * The text is composed (NFC) first, so a decomposed ñ stays ñ. Han characters are compared as they are (no Simplified/Traditional
 * conversion). Not VIREO behaviour: the original view keeps
 * `foldAsciiCase`. */
export function foldHelpText(text:string):string{
 if(typeof text!=='string')throw new TypeError('Invalid search text');
 const decomposed=text.normalize('NFC').replace(/[ñÑ]/g,'\u0001').replace(/[\u3000\uff01-\uffee]+/g,r=>r.normalize('NFKC')).normalize('NFD');
 let out='',latin=false;
 for(const c of decomposed){
  if(MARK.test(c)){if(!(latin&&c>='\u0300'&&c<='\u036f'))out+=c;continue;}
  latin=LATIN.test(c);out+=c;
 }
 return out.normalize('NFC').toLowerCase().replace(/ё/g,'е').replace(/[\u30a1-\u30f6\u30fd\u30fe]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60))
  .replace(/[\u093c\u200c\u200d]/g,'').replace(/\u0001/g,'ñ');
}
export type HelpFindResult=Readonly<{kind:'hit';index:number}|{kind:'miss'}|{kind:'blank'}>;
/** Find Topic / link lookup 0x493c10: the first row from `start` whose trimmed (folded) title EQUALS the trimmed (folded)
 * query; no wrap. `blank`: an all-space query, where VIREO raises an access violation (WEB: nothing happens). */
export function findHelpTopic(rows:readonly HelpRow[],query:string,matchCase:boolean,start=0,fold:(text:string)=>string=foldAsciiCase):HelpFindResult{
 if(!Number.isInteger(start)||start<0)throw new RangeError('Invalid start');
 const q=topicKey(query,matchCase,fold);
 if(q===null)return Object.freeze({kind:'blank'});
 for(let i=start;i<rows.length;i++)if(rows[i].title!==''&&topicKey(rows[i].title,matchCase,fold)===q)return Object.freeze({kind:'hit',index:i});
 return Object.freeze({kind:'miss'});
}
/** Find Topic / Search Text miss box text (0x493c10 / 0x59f9fc): the query as typed between quotes. */
export const helpNotFoundText=(query:string)=>`"${query}" Not Found.`;

export type HelpReadResult=Readonly<{kind:'topic';index:number}|{kind:'separator'}|{kind:'heading';message:string}>;
/** Read/Print Topic or double-click 0x493dc8 on row `index`: a separator beeps; a heading answers with
 * `Select a Topic Under "<title without indent>"` (caption `Topic Heading`); a topic is chosen. */
export function readHelpRow(rows:readonly HelpRow[],index:number):HelpReadResult|null{
 if(!Number.isInteger(index)||index<0||index>=rows.length)return null;
 const row=rows[index];
 if(row.kind==='separator')return Object.freeze({kind:'separator'});
 if(row.kind==='heading')return Object.freeze({kind:'heading',message:`Select a Topic Under "${row.title.replace(/^ +/,'')}"`});
 return Object.freeze({kind:'topic',index});
}

/** Word wrapper 0x487550/0x4875d8: a text no longer than the width is the last piece; otherwise the piece ends after the
 * last space at or before the width; when that space is exactly at the width, the following run of spaces is dropped.
 * A longer line with no space before the width has no native guard (the scan reads before the string): refused. */
export function wrapHelpLine(text:string,width=HELP_WRAP_WIDTH):readonly string[]{
 const out:string[]=[];let s=text;
 for(;;){
  if(s.length<=width){out.push(s);return Object.freeze(out);}
  let p=width;while(p>0&&s[p-1]!==' ')p--;
  if(p===0)throw new RangeError('Help line without a space before the wrap width');
  const piece=s.slice(0,p);
  if(p===width){while(p<s.length&&s[p-1]===' ')p++;p--;}
  out.push(piece);s=s.slice(p);
 }
}
/** Kinsoku (Japanese and Chinese line-breaking rules, simplified): no line starts with a closing mark, a small kana, the
 * prolonged sound mark or a Devanagari danda, and none ends with an opening mark. */
const NO_START=new Set([...'、。，．・：；？！ー）」』】〕〉》｝］〙〗〟’”ゝゞヽヾ々〻ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ゠〜～।॥,.:;?!)]}%']);
const NO_END=new Set([...'（「『【〔〈《｛［〘〖〝‘“([{']);
const wide=(g:string|undefined)=>g!==undefined&&codePointColumns(g.codePointAt(0)!)===2;
/** WEB (Front SC7) [W]: `wrapHelpLine` for a translated line, in display columns over grapheme clusters, never refusing. A
 * piece ends at the last break opportunity within the width: after a space (VIREO's rule, with its run of spaces dropped when
 * the space ends exactly at the width), or between two clusters either of which is East Asian Wide (Japanese and Chinese break
 * between characters) unless kinsoku forbids it. With none, the line breaks at the last cluster that fits (a long Devanagari or
 * Russian word, a CJK run that kinsoku pins), moving back while kinsoku forbids it. When no space ends a piece and the cluster
 * just past the width is a space, the piece ends before it and the run of spaces is dropped (VIREO's rule for a space at the
 * width; review). A cluster wider than the width is a piece of its own. On Latin-1 text that `wrapHelpLine` wraps, the result is
 * the same (only lines it refuses can differ). Linear in the line's clusters. */
export function wrapHelpText(text:string,width=HELP_WRAP_WIDTH):readonly string[]{
 if(!Number.isInteger(width)||width<2)throw new RangeError('Invalid wrap width');
 const out:string[]=[],g=graphemes(text),cols=g.map(displayColumns);
 let left=cols.reduce((a,b)=>a+b,0),s=0;
 for(;;){
  if(left<=width||g.length-s<=1){out.push(g.slice(s).join(''));return Object.freeze(out);}
  let k=s,n=0;while(k<g.length&&n+cols[k]<=width){n+=cols[k];k++;}
  if(k===s){k=s+1;n=cols[s];}
  let p=k;
  for(;p>s;p--){
   if(g[p-1]===' ')break;
   if(g[p]!==' '&&(wide(g[p-1])||wide(g[p]))&&!NO_START.has(g[p])&&!NO_END.has(g[p-1]))break;
  }
  let end:number,rest:number;
  if(p>s&&g[p-1]===' '){
   end=rest=p;
   if(p===k&&n===width){while(rest<g.length&&g[rest-1]===' ')rest++;rest--;}
  }else if(g[k]===' '&&!NO_END.has(g[k-1])){
   end=rest=k;while(rest<g.length&&g[rest]===' ')rest++;
   if(rest===g.length)rest--;
  }else{
   if(p===s){p=k;while(p>s+1&&(NO_START.has(g[p])||NO_END.has(g[p-1])))p--;}
   end=rest=p;
  }
  out.push(g.slice(s,end).join(''));
  for(;s<rest;s++)left-=cols[s];
 }
}

export type HelpTopicBody=Readonly<{rows:readonly string[];relatedIndex:number}>;
/** THelpWin FormActivate 0x59f174 with the section seek 0x59f84c. `title` is the row title (its leading spaces are removed
 * and it is lower-cased for the seek). If the first line is empty or does not start with `*` the whole file is the topic;
 * otherwise the topic starts after the first line that contains `*` and, lower-cased, contains the title; it ends before
 * the next line that starts and ends with `*`. Rows: ' ', then '  ' + line + '  ' (lines over 72 characters wrapped piece by
 * piece), then ' '. `relatedIndex` is the last unwrapped row whose upper-case text contains RELATED TOPICS, else −1. Null:
 * no header names the topic (`Topic Not Found`). */
export function helpTopicBody(txt:Uint8Array,title:string,relatedMarker='RELATED TOPICS'):HelpTopicBody|null{
 if(!(txt instanceof Uint8Array)||txt.length>HELP_LIST_LIMITS.bytes*4)throw new HelpListError('size');
 return topicBody(textLines(txt),title,relatedMarker,wrapHelpLine);
}
/** Front SC7: `helpTopicBody` for a translated text file as Unicode text (at most 262144 UTF-16 units): the seek is the same, a
 * line over 72 display columns is wrapped by `wrapHelpText` (never refused), and `relatedMarker` is the language's own. */
export function helpTopicBodyText(text:string,title:string,relatedMarker:string):HelpTopicBody|null{
 if(typeof text!=='string'||text.length>HELP_LIST_LIMITS.bytes*4)throw new HelpListError('size');
 return topicBody(splitLines(text),title,relatedMarker,wrapHelpText);
}
function topicBody(lines:readonly string[],title:string,relatedMarker:string,wrap:(line:string)=>readonly string[]):HelpTopicBody|null{
 const key=foldAsciiCase(title.replace(/^ +/,''));
 let i=0;
 if(lines.length>0&&lines[0]!==''&&lines[0][0]==='*'){
  while(i<lines.length&&!(lines[i].includes('*')&&foldAsciiCase(lines[i]).includes(key)))i++;
  if(i===lines.length)return null;
  i++;
 }
 const rows=[' '];let relatedIndex=-1;
 for(;i<lines.length;i++){
  const s=lines[i];
  if(s.length>0&&s[0]==='*'&&s[s.length-1]==='*')break;
  if(displayColumns(s)>HELP_WRAP_WIDTH){for(const piece of wrap(s))rows.push(`  ${piece}  `);}
  else{rows.push(`  ${s}  `);if(s.toUpperCase().includes(relatedMarker))relatedIndex=rows.length-1;}
 }
 rows.push(' ');
 return Object.freeze({rows:Object.freeze(rows),relatedIndex});
}
/** Topic window caption (0x59f174): `Help - ` + the title without its leading spaces. */
export const helpTopicCaption=(title:string)=>`Help - ${title.replace(/^ +/,'')}`;

/** ListBox1DblClick 0x5a020c: only rows after the Related Topics row (all rows when there is none) are tested, by exact
 * trimmed title over the whole list. Returns the row index to open, or null (no match, or a blank row: VIREO raises an
 * access violation there; WEB: nothing happens). */
export function helpLinkTarget(rows:readonly HelpRow[],body:HelpTopicBody,bodyRow:number,matchCase:boolean,fold:(text:string)=>string=foldAsciiCase):number|null{
 if(!Number.isInteger(bodyRow)||bodyRow<=body.relatedIndex||bodyRow>=body.rows.length)return null;
 const r=findHelpTopic(rows,body.rows[bodyRow],matchCase,0,fold);
 return r.kind==='hit'&&rows[r.index].kind==='topic'?r.index:null;
}

/** Topic history (THelpWin +0x56e), as row indexes. Opening pushes unless the last entry is the same topic (FormShow
 * 0x59f108). Back (0x5a030c) returns to the entry before the last and DELETES that entry (not the newest one). */
export type HelpHistory=readonly number[];
export function helpHistoryOpen(history:HelpHistory,index:number):HelpHistory{
 return history.length>0&&history[history.length-1]===index?history:Object.freeze([...history,index]);
}
export const helpBackEnabled=(history:HelpHistory)=>history.length>=2;
export function helpHistoryBack(history:HelpHistory):Readonly<{index:number;history:HelpHistory}>|null{
 if(history.length<2)return null;
 const at=history.length-2;
 return Object.freeze({index:history[at],history:Object.freeze([...history.slice(0,at),...history.slice(at+1)])});
}

/** The print-job / page title literal of Print Topic (0x59fe44), followed by the first student name (env+0x5fa). */
export const HELP_PRINT_TITLE_PREFIX='CLEA Exercise "VIREO - The VIRtual Educational Observatory" - ';
export const HELP_PRINT_LAB_SUFFIX='     Laboratory Table Number (Not Recorded)';
/** Print Topic page body 0x59fe44 in TextOut order, with the unrecovered student strings as `null` (the caller shows a
 * labelled placeholder): date + laboratory line; student name 1 (others only when set); the title text itself; the
 * caption; every row. No NewPage: VIREO prints only what fits on one page. */
export type HelpPrintLine=Readonly<{kind:'date'|'students'|'title'|'caption'|'row';text:string|null;indent:boolean}>;
/** `tr` (Front ES-HELP; the HR, list and light-curve prints do the same) translates the lab-table suffix on screen; the title
 * prefix stays VIREO's English. Defaults to the literal. */
export function helpPrintPage(dateText:string,caption:string,rows:readonly string[],tr:(literal:string)=>string=literal=>literal):readonly HelpPrintLine[]{
 const line=(kind:HelpPrintLine['kind'],text:string|null,indent:boolean)=>Object.freeze({kind,text,indent});
 return Object.freeze([
  line('date',dateText+tr(HELP_PRINT_LAB_SUFFIX),false),
  line('students',null,false),
  line('title',HELP_PRINT_TITLE_PREFIX,true),
  line('caption',caption,true),
  ...rows.map(r=>line('row',r,true)),
 ]);
}
