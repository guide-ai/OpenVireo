import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {HelpListError,findHelpTopic,helpBackEnabled,helpHistoryBack,helpHistoryOpen,helpLinkTarget,helpNotFoundText,helpPrintPage,
 helpTopicBody,helpTopicCaption,parseHelpList,readHelpRow,wrapHelpLine} from './cleaHelp';
import {searchRadioHotListRows} from './radioHotListSearch';
import witness from './cleaHelp.witness.json';
import manifest from '../../docs/LOCAL-RESOURCES.json';
import {BUNDLED_CLUSTER_HELP_LIST,BUNDLED_CLUSTER_HELP_TEXT,BundledClusterHelpError,fetchBundledClusterHelp} from '../io/bundledClusterHelp';

// Witness: research analysis/front-v2-cluster-hr/tools/help_witness.py (SHA-256 pinned in cleaHelp.witness.json). It is a
// second implementation of the same static reading of CLEA_VEO.exe, so it checks the port, not the reading.
const read=(name:string)=>new Uint8Array(readFileSync(new URL(`../../public/original/cluster-help/${name}`,import.meta.url)));
const LST=read('HRAnalHlp.LST'),TXT=read('HRAnalHlp.TXT');
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const enc=(s:string)=>Uint8Array.from(s,c=>c.charCodeAt(0));
const rows=parseHelpList(LST);
type Topic={index:number;display:string;file:string;found?:boolean;lines?:number;relatedLine?:number;links?:[number,string,number][]};
const topics=witness.topics as Topic[];

describe('bundled HRAnalHlp files (approval 2026-10-28)',()=>{
 it('are the manifested byte-exact files the witness read',()=>{
  expect(witness.source.witnessSha256).toBe('64fb755f0bf7fa5d257e92ecb982f9849158bab39ea53cef7d594a379e073a9e');
  for(const [bytes,id] of [[LST,BUNDLED_CLUSTER_HELP_LIST],[TXT,BUNDLED_CLUSTER_HELP_TEXT]] as const){
   expect(bytes.length).toBe(id.bytes);expect(sha(bytes)).toBe(id.sha256);
   expect(manifest.files).toContainEqual({path:'public'+id.path,bytes:id.bytes,sha256:id.sha256});
  }
  expect(sha(LST)).toBe(witness.source.lstSHA256);expect(sha(TXT)).toBe(witness.source.txtSHA256);
 });
 it('fetches only verified bytes and reports failures by type',async()=>{
  const ok=(b:Uint8Array)=>(async()=>new Response(b.slice()))as unknown as typeof fetch;
  await expect(fetchBundledClusterHelp(ok(LST),new AbortController().signal,BUNDLED_CLUSTER_HELP_LIST)).resolves.toEqual(LST);
  const bad=LST.slice();bad[0]^=1;
  await expect(fetchBundledClusterHelp(ok(bad),new AbortController().signal,BUNDLED_CLUSTER_HELP_LIST)).rejects.toEqual(new BundledClusterHelpError('sha256'));
  await expect(fetchBundledClusterHelp(ok(LST.slice(1)),new AbortController().signal,BUNDLED_CLUSTER_HELP_LIST)).rejects.toEqual(new BundledClusterHelpError('size'));
  const abort=new AbortController();abort.abort();
  await expect(fetchBundledClusterHelp(ok(LST),abort.signal,BUNDLED_CLUSTER_HELP_LIST)).rejects.toMatchObject({name:'AbortError'});
 });
});

describe('HelpList load 0x493264 / 0x493138 / 0x4867fc',()=>{
 it('gives the 18 rows of the witness, in order, with their kinds',()=>{
  expect(rows.map(r=>r.title)).toEqual(topics.map(t=>t.display));
  expect(rows.map(r=>r.file)).toEqual(topics.map(t=>t.file));
  expect(rows.map(r=>r.kind[0]).join('')).toBe('htttshttshttttstts');
 });
 it('follows the token, indent, separator and length rules on synthetic lists',()=>{
  const r=parseHelpList(enc(`  "A" "begin"\r\n'B'x'f.txt'\r\n"C" "END"\r\n"C" "end"\r\n"${'x'.repeat(70)}" "f"\r\n`));
  // token 2 of `'B'x'f.txt'`: the character after the closing quote is dropped, so the next token starts at `'f.txt'`.
  expect(r).toEqual([{kind:'heading',title:'-A-',file:'begin'},{kind:'topic',title:'  B',file:'f.txt'},{kind:'separator',title:'',file:''},
   {kind:'topic',title:'x'.repeat(65),file:'f'}]);
  expect(()=>parseHelpList(enc('"A" "f"\r\n\r\n"B" "f"\r\n'))).toThrow(new HelpListError('line',2));
  expect(()=>parseHelpList(new Uint8Array(65537))).toThrow(HelpListError);
 });
});

describe('Select Help Topic 0x493708 / 0x493c10 / 0x493dc8',()=>{
 it('finds a topic by exact trimmed title, case-folded unless Match case, from the start index, without wrap',()=>{
  expect(findHelpTopic(rows,'  fit zero-age main sequence ',false)).toEqual({kind:'hit',index:7});
  expect(findHelpTopic(rows,'fit zero-age main sequence',true)).toEqual({kind:'miss'});
  expect(findHelpTopic(rows,'Fit Zero-Age',false)).toEqual({kind:'miss'});// not a substring search
  expect(findHelpTopic(rows,'-load/plot data-',false)).toEqual({kind:'hit',index:0});
  expect(findHelpTopic(rows,'load/plot data',false)).toEqual({kind:'miss'});
  expect(findHelpTopic(rows,'Fit Zero-Age Main Sequence',false,8)).toEqual({kind:'miss'});
  expect(findHelpTopic(rows,'   ',false)).toEqual({kind:'blank'});
  expect(helpNotFoundText('Zams')).toBe('"Zams" Not Found.');
 });
 it('reads a topic, beeps on a separator and names the heading without its indent',()=>{
  expect(readHelpRow(rows,7)).toEqual({kind:'topic',index:7});
  expect(readHelpRow(rows,4)).toEqual({kind:'separator'});
  expect(readHelpRow(rows,9)).toEqual({kind:'heading',message:'Select a Topic Under "-Display/Fit Isochrone-"'});
  expect(readHelpRow(rows,-1)).toBeNull();expect(readHelpRow(rows,18)).toBeNull();
 });
});

describe('Help topic window 0x59f174 / 0x59f84c / 0x5a020c / 0x5a030c / 0x59fe44',()=>{
 it('builds every topic body with the witness row count, Related Topics row and link targets',()=>{
  for(const t of topics){
   if(!t.found)continue;
   const body=helpTopicBody(TXT,rows[t.index].title)!;
   expect(body.rows.length,t.display).toBe(t.lines);
   expect(body.relatedIndex,t.display).toBe(t.relatedLine);
   expect(body.rows[0]).toBe(' ');expect(body.rows[body.rows.length-1]).toBe(' ');
   for(const [row,text,target] of t.links??[]){
    expect(body.rows[row].trim()).toBe(text);
    expect(helpLinkTarget(rows,body,row,false),`${t.display} → ${text}`).toBe(target<0?null:target);
   }
  }
  // 22 of the 26 related rows resolve (the witness lists 25 for the 12 topics with a Related Topics row).
  const links=topics.flatMap(t=>t.links??[]);expect(links.filter(l=>l[2]>=0)).toHaveLength(22);
 });
 it('shows the topic text verbatim between two spaces and captions it',()=>{
  const body=helpTopicBody(TXT,rows[7].title)!;
  expect(helpTopicCaption(rows[7].title)).toBe('Help - Fit Zero-Age Main Sequence');
  expect(body.rows.slice(1,-1).every(r=>r.startsWith('  ')&&r.endsWith('  '))).toBe(true);
  expect(body.rows[body.relatedIndex].trim()).toMatch(/^Related Topics/i);
 });
 it('ignores clicks above the Related Topics row and on blank rows; a topic without one tests every row',()=>{
  const body=helpTopicBody(TXT,rows[7].title)!;
  expect(helpLinkTarget(rows,body,body.relatedIndex,false)).toBeNull();
  expect(helpLinkTarget(rows,body,body.rows.length-1,false)).toBeNull();// ' ' (native access violation)
  const last=helpTopicBody(TXT,rows[16].title)!;expect(last.relatedIndex).toBe(-1);
  expect(last.rows.map((_,i)=>helpLinkTarget(rows,last,i,false)).every(x=>x===null)).toBe(true);
 });
 it('takes the whole file when it has no section headers, and reports a missing topic',()=>{
  expect(helpTopicBody(enc('plain\r\ntext\r\n'),'x')).toEqual({rows:[' ','  plain  ','  text  ',' '],relatedIndex:-1});
  expect(helpTopicBody(enc('**A**\r\na\r\n**B**\r\nb\r\n'),'c')).toBeNull();
  expect(helpTopicBody(enc('**Alpha beta**\r\nx\r\nRelated topics:\r\n*y\r\n**Gamma**\r\n'),'  BETA')).toEqual({rows:[' ','  x  ','  Related topics:  ','  *y  ',' '],relatedIndex:2});
 });
 it('wraps lines longer than 72 characters as 0x4875d8 does',()=>{
  const long='a'.repeat(71)+' '+'b'.repeat(10);
  expect(wrapHelpLine(long)).toEqual(['a'.repeat(71)+' ','b'.repeat(10)]);
  expect(wrapHelpLine('a'.repeat(71)+'   b')).toEqual(['a'.repeat(71)+' ','b']);// the space run after column 72 is dropped
  expect(wrapHelpLine('ab '.repeat(30))).toEqual(['ab '.repeat(24),'ab '.repeat(6)]);
  expect(wrapHelpLine('a'.repeat(70)+' b'+'c'.repeat(5))).toEqual(['a'.repeat(70)+' ','b'+'c'.repeat(5)]);// break before the width keeps the rest
  expect(()=>wrapHelpLine('a'.repeat(80))).toThrow(RangeError);
  const body=helpTopicBody(enc(`${'w '.repeat(40)}\r\n`),'x')!;expect(body.rows).toHaveLength(4);
 });
 it('keeps the native history: push unless repeated; Back deletes the entry it returns to',()=>{
  let h=helpHistoryOpen(helpHistoryOpen(helpHistoryOpen([],1),2),3);expect(helpHistoryOpen(h,3)).toBe(h);
  expect(helpBackEnabled(h)).toBe(true);
  let b=helpHistoryBack(h)!;expect(b).toEqual({index:2,history:[1,3]});
  b=helpHistoryBack(b.history)!;expect(b).toEqual({index:1,history:[3]});
  expect(helpBackEnabled(b.history)).toBe(false);expect(helpHistoryBack(b.history)).toBeNull();
  expect(helpHistoryOpen(b.history,6)).toEqual([3,6]);
 });
 it('searches topic text with the shared Find algorithm (rows joined with the next one)',()=>{
  const body=helpTopicBody(TXT,rows[7].title)!;
  const hit=searchRadioHotListRows(body.rows,'slider',false,0);
  expect(hit.kind).toBe('hit');
  if(hit.kind==='hit')expect(body.rows[hit.index].toLowerCase()+' '+(body.rows[hit.index+1]??'').toLowerCase()).toContain('slider');
 });
 it('lays out the Print Topic page body in TextOut order',()=>{
  const page=helpPrintPage('10/28/2026 7:00:00 AM','Help - X',['  a  ']);
  expect(page.map(l=>[l.kind,l.text,l.indent])).toEqual([
   ['date','10/28/2026 7:00:00 AM     Laboratory Table Number (Not Recorded)',false],['students',null,false],
   ['title','CLEA Exercise "VIREO - The VIRtual Educational Observatory" - ',true],['caption','Help - X',true],['row','  a  ',true]]);
 });
});
