/** The shared CLEA help viewer as pure data (Front V2, docs/CLUSTER-HR-TOOLS.md). Static reading of CLEA_VEO.exe
 * (SHA-256 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c), research analysis/front-v2-cluster-hr/
 * RECOVERY-help.md; nothing executed or emulated.
 * - HelpList load 0x493264 + line parser 0x493138 + quoted-token reader 0x4867fc → `parseHelpList`;
 * - THelpLstDlg "Select Help Topic" 0x493708 / Find Topic 0x493a30 + 0x493c10 / Read 0x493dc8 → `findHelpTopic`,
 *   `readHelpRow`;
 * - THelpWin FormActivate 0x59f174 + section seek 0x59f84c + wrapper 0x487550/0x4875d8 → `helpTopicBody`;
 *   links 0x5a020c → `helpLinkTarget`; Back 0x5a030c / FormShow 0x59f108 → `helpHistory*`; Print Topic 0x59fe44 →
 *   `helpPrintPage`; Search Text 0x59f9fc reuses `searchRadioHotListRows` (the same TGetSrchStrDlg algorithm).
 * Text is Latin-1 (the help files are ASCII); case folding is ASCII A–Z only (LowerCase/UpperCase). */
import {foldAsciiCase} from './radioHotListSearch';

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
function textLines(bytes:Uint8Array):string[]{
 const lines=latin1(bytes).split(/\r?\n/);
 if(lines.length>0&&lines[lines.length-1]==='')lines.pop();
 return lines;
}
/** 0x4867fc: skip leading spaces; the first remaining character is the quote; the token runs to the next occurrence of
 * that character (or to the end); the token, the closing quote and one more character are removed from the line. */
function quotedToken(line:string):[token:string,rest:string]{
 let i=0;while(i<line.length&&line.charCodeAt(i)===0x20)i++;
 if(i>=line.length)return ['',''];
 const quote=line[i],end=line.indexOf(quote,i+1);
 return end<0?[line.slice(i+1),'']:[line.slice(i+1,end),line.slice(end+2)];
}
/** HelpList load (0x493264) for an LST file. Rows follow the native order: `begin` adds a separator unless the previous
 * row is one, then the heading `indent + '-' + title + '-'` and two more indent spaces; `end` removes two indent spaces
 * and adds a separator unless the previous row is one; any other token 2 is a topic `indent + title` in that file.
 * WEB: a blank line (absent from the approved files; its native token result is not traced) is refused as `line`. The
 * native exception path deletes the invalid list file (DeleteFileA at 0x4935e1); the web never deletes anything. */
export function parseHelpList(bytes:Uint8Array):readonly HelpRow[]{
 if(!(bytes instanceof Uint8Array)||bytes.length>HELP_LIST_LIMITS.bytes)throw new HelpListError('size');
 const rows:HelpRow[]=[];let indent='',separated=true;
 textLines(bytes).forEach((raw,n)=>{
  const line=raw.slice(0,HELP_LIST_LIMITS.line);
  if(line.trim()==='')throw new HelpListError('line',n+1);
  const [first,rest]=quotedToken(line),[second]=quotedToken(rest);
  const title=first.slice(0,HELP_LIST_LIMITS.title),file=second.slice(0,HELP_LIST_LIMITS.file),key=foldAsciiCase(file);
  if(key==='end'){
   indent=indent.slice(0,Math.max(0,indent.length-2));
   if(!separated){rows.push(Object.freeze({kind:'separator',title:'',file:''}));separated=true;}
   return;
  }
  if(key==='begin'){
   if(!separated)rows.push(Object.freeze({kind:'separator',title:'',file:''}));
   rows.push(Object.freeze({kind:'heading',title:(indent+'-'+title+'-').slice(0,HELP_LIST_LIMITS.title),file}));
   indent+='  ';
  }else rows.push(Object.freeze({kind:'topic',title:(indent+title).slice(0,HELP_LIST_LIMITS.title),file}));
  separated=false;
 });
 return Object.freeze(rows);
}

/** 0x493c10 normalisation: leading and trailing spaces removed, ASCII-lowercased unless matchCase. Null for an all-space
 * text: the native routine then reads through a nil string (an access violation, not ported). */
function topicKey(text:string,matchCase:boolean):string|null{
 const t=text.replace(/^ +| +$/g,'');
 if(t==='')return null;
 return matchCase?t:foldAsciiCase(t);
}
export type HelpFindResult=Readonly<{kind:'hit';index:number}|{kind:'miss'}|{kind:'blank'}>;
/** Find Topic / link lookup 0x493c10: the first row from `start` whose trimmed (folded) title EQUALS the trimmed (folded)
 * query; no wrap. `blank`: an all-space query, where VIREO raises an access violation (WEB: nothing happens). */
export function findHelpTopic(rows:readonly HelpRow[],query:string,matchCase:boolean,start=0):HelpFindResult{
 if(!Number.isInteger(start)||start<0)throw new RangeError('Invalid start');
 const q=topicKey(query,matchCase);
 if(q===null)return Object.freeze({kind:'blank'});
 for(let i=start;i<rows.length;i++)if(rows[i].title!==''&&topicKey(rows[i].title,matchCase)===q)return Object.freeze({kind:'hit',index:i});
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

export type HelpTopicBody=Readonly<{rows:readonly string[];relatedIndex:number}>;
/** THelpWin FormActivate 0x59f174 with the section seek 0x59f84c. `title` is the row title (its leading spaces are removed
 * and it is lower-cased for the seek). If the first line is empty or does not start with `*` the whole file is the topic;
 * otherwise the topic starts after the first line that contains `*` and, lower-cased, contains the title; it ends before
 * the next line that starts and ends with `*`. Rows: ' ', then '  ' + line + '  ' (lines over 72 characters wrapped piece by
 * piece), then ' '. `relatedIndex` is the last unwrapped row whose upper-case text contains RELATED TOPICS, else −1. Null:
 * no header names the topic (`Topic Not Found`). */
export function helpTopicBody(txt:Uint8Array,title:string):HelpTopicBody|null{
 if(!(txt instanceof Uint8Array)||txt.length>HELP_LIST_LIMITS.bytes*4)throw new HelpListError('size');
 const lines=textLines(txt),key=foldAsciiCase(title.replace(/^ +/,''));
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
  if(s.length>HELP_WRAP_WIDTH){for(const piece of wrapHelpLine(s))rows.push(`  ${piece}  `);}
  else{rows.push(`  ${s}  `);if(s.toUpperCase().includes('RELATED TOPICS'))relatedIndex=rows.length-1;}
 }
 rows.push(' ');
 return Object.freeze({rows:Object.freeze(rows),relatedIndex});
}
/** Topic window caption (0x59f174): `Help - ` + the title without its leading spaces. */
export const helpTopicCaption=(title:string)=>`Help - ${title.replace(/^ +/,'')}`;

/** ListBox1DblClick 0x5a020c: only rows after the Related Topics row (all rows when there is none) are tested, by exact
 * trimmed title over the whole list. Returns the row index to open, or null (no match, or a blank row: VIREO raises an
 * access violation there; WEB: nothing happens). */
export function helpLinkTarget(rows:readonly HelpRow[],body:HelpTopicBody,bodyRow:number,matchCase:boolean):number|null{
 if(!Number.isInteger(bodyRow)||bodyRow<=body.relatedIndex||bodyRow>=body.rows.length)return null;
 const r=findHelpTopic(rows,body.rows[bodyRow],matchCase,0);
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
export function helpPrintPage(dateText:string,caption:string,rows:readonly string[]):readonly HelpPrintLine[]{
 const line=(kind:HelpPrintLine['kind'],text:string|null,indent:boolean)=>Object.freeze({kind,text,indent});
 return Object.freeze([
  line('date',dateText+HELP_PRINT_LAB_SUFFIX,false),
  line('students',null,false),
  line('title',HELP_PRINT_TITLE_PREFIX,true),
  line('caption',caption,true),
  ...rows.map(r=>line('row',r,true)),
 ]);
}
