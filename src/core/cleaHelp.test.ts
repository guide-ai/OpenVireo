import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {HelpListError,findHelpTopic,foldHelpText,foldLatin1Accents,helpBackEnabled,helpHistoryBack,helpHistoryOpen,helpLinkTarget,helpNotFoundText,
 helpPrintPage,helpTopicBody,helpTopicBodyText,helpTopicCaption,parseHelpList,parseHelpListText,readHelpRow,wrapHelpLine,wrapHelpText} from './cleaHelp';
import {displayColumns,graphemes} from './textColumns';
import {HELP_FILES,helpFile} from '../help/helpFiles';
import {parseSpectralLineList,parseSpectralLineListText,spectralLineHelp,spectralLineHelpText} from '../help/spectralLines';
import {REMINDER_SELECT,reminderBoxText,reminderBoxTextOf} from '../help/mainHelp';
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
  // Front ES-HELP: `tr` reaches only the lab-table suffix; the title prefix stays VIREO's English.
  const seen:string[]=[],tr=(l:string)=>{seen.push(l);return `«${l}»`;};
  const shown=helpPrintPage('D','C',[],tr);
  expect(seen).toEqual(['     Laboratory Table Number (Not Recorded)']);
  expect(shown[0].text).toBe('D«     Laboratory Table Number (Not Recorded)»');expect(shown[2].text).toBe('CLEA Exercise "VIREO - The VIRtual Educational Observatory" - ');
 });
});

// Front SC7 (docs/I18N.md, "Script groundwork: Unicode help (SC7)"): translated help as Unicode text. The byte parsers above and
// their witnesses are unchanged; these check that the text parsers agree with them on Latin-1 text and handle other scripts.
describe('Front SC7: Unicode help text',()=>{
 const originals=Object.values(HELP_FILES).filter(f=>f.bytes>0).map(f=>({f,bytes:new Uint8Array(readFileSync(new URL(`../../public${f.path}`,import.meta.url)))}));
 const text=(b:Uint8Array)=>new TextDecoder('latin1').decode(b);
 it('reads every bundled VIREO original as text exactly as the byte parsers read its bytes',()=>{
  let bodies=0;
  for(const {f,bytes} of originals.filter(o=>o.f.name.toUpperCase().endsWith('.LST'))){
   let list:ReturnType<typeof parseHelpList>;
   try{list=parseHelpList(bytes);}catch(e){expect(()=>parseHelpListText(text(bytes)),f.name).toThrow(HelpListError);expect(e).toBeInstanceOf(HelpListError);continue;}
   expect(parseHelpListText(text(bytes)),f.name).toEqual(list);
   for(const r of list){const t=r.kind==='topic'?helpFile(r.file):null;if(!t)continue;
    const b=new Uint8Array(readFileSync(new URL(`../../public${t.path}`,import.meta.url)));
    expect(helpTopicBodyText(text(b),r.title,'RELATED TOPICS'),`${f.name} ${r.title}`).toEqual(helpTopicBody(b,r.title));bodies++;}
  }
  expect(bodies).toBeGreaterThan(100);
  const lnl=originals.find(o=>o.f.name==='SPECLNS.LNL')!.bytes,sptxt=originals.find(o=>o.f.name==='SPECLNS.TXT')!.bytes;
  const lines=parseSpectralLineList(lnl);expect(parseSpectralLineListText(text(lnl))).toEqual(lines);
  for(const l of lines)expect(spectralLineHelpText(text(sptxt),l.name)).toEqual(spectralLineHelp(sptxt,l.name));
  for(const name of ['Reminder.obs','REMINDER.PLS']){const b=originals.find(o=>o.f.name===name)!.bytes;expect(reminderBoxTextOf(text(b),REMINDER_SELECT)).toBe(reminderBoxText(b));}
 });
 it('folds Latin-1 text exactly as the Spanish and Portuguese search did (foldLatin1Accents)',()=>{
  for(let c=0;c<256;c++){const s=String.fromCharCode(c);expect(foldHelpText(s),`U+${c.toString(16)}`).toBe(foldLatin1Accents(s));}
  const corpus=Object.values(import.meta.glob<{text:string}>('../i18n/{es,pt-br}/help/*.ts',{eager:true})).flatMap(m=>m.text.split('\n'));
  expect(corpus.length).toBeGreaterThan(3000);
  for(const l of corpus)expect(foldHelpText(l)).toBe(foldLatin1Accents(l));
  for(const {bytes} of originals)for(const l of text(bytes).split(/\r?\n/))expect(foldHelpText(l)).toBe(foldLatin1Accents(l));
 });
 it('folds case only where the script has it, width and kana in Japanese, the nukta in Devanagari, and keeps Han as it is',()=>{
  expect(foldHelpText('ＣＣＤカメラを閉じる')).toBe('ccdかめらを閉じる');
  expect(foldHelpText('ｶﾞｲﾄﾞ\u3000ＤＳ９')).toBe('がいど ds9');
  expect(foldHelpText('Съёмка ПЗС-камерой Й')).toBe('съемка пзс-камерой й');
  expect(foldHelpText('Άλφα')).toBe('άλφα');
  expect(foldHelpText('एक्सपोज\u093cर')).toBe('एक्सपोजर');
  expect(foldHelpText('\u0958')).toBe('क');// क\u093c precomposed
  expect(foldHelpText('क\u200dष\u200cत')).toBe('कषत');
  expect(foldHelpText('观测 觀測')).toBe('观测 觀測');
  expect(foldHelpText('Órbita 観測')).toBe('orbita 観測');
  expect(foldHelpText('an\u0303o')).toBe('año');// a decomposed ñ stays ñ
  expect(foldLatin1Accents('an\u0303o')).toBe('ano');// (the ES-HELP fold read it as n)
 });
 it('finds topics and text by substring in any script through the fold',()=>{
  const list=parseHelpListText("'ＣＣＤ画像' 'begin'\n'カメラを閉じる' 'a.txt'\n'Съёмка' 'a.txt'\n'एक्सपोज\u093cर लें' 'a.txt'\n'ＣＣＤ画像' 'end'\n");
  expect(list.map(r=>r.title)).toEqual(['-ＣＣＤ画像-','  カメラを閉じる','  Съёмка','  एक्सपोज\u093cर लें','']);
  expect(findHelpTopic(list,'かめらを閉じる',false,0,foldHelpText)).toEqual({kind:'hit',index:1});
  expect(findHelpTopic(list,'かめらを閉じる',true,0,foldHelpText)).toEqual({kind:'miss'});
  expect(findHelpTopic(list,'СЪЕМКА',false,0,foldHelpText)).toEqual({kind:'hit',index:2});
  expect(findHelpTopic(list,'एक्सपोजर लें',false,0,foldHelpText)).toEqual({kind:'hit',index:3});
  expect(findHelpTopic(list,'-ccd画像-',false,0,foldHelpText)).toEqual({kind:'hit',index:0});
  const rows=['  露光を始めます。カメラの状態  ','  एक्सपोज\u093cर टाइमर  ','  ещё раз  '];
  expect(searchRadioHotListRows(rows,'かめら',false,0,foldHelpText)).toEqual({kind:'hit',index:0});
  expect(searchRadioHotListRows(rows,'状態',false,0,foldHelpText)).toEqual({kind:'hit',index:0});
  expect(searchRadioHotListRows(rows,'जर टा',false,0,foldHelpText)).toEqual({kind:'hit',index:1});
  expect(searchRadioHotListRows(rows,'ЕЩЕ',false,0,foldHelpText)).toEqual({kind:'hit',index:2});
  expect(searchRadioHotListRows(rows,'ЕЩЁ',true,0,foldHelpText)).toEqual({kind:'miss'});
 });
 it('cuts translated titles at 65 display columns on whole clusters, and refuses an over-long text',()=>{
  const [row]=parseHelpListText(`'${'観'.repeat(34)}' 'a.txt'\n`);
  expect(row).toEqual({kind:'topic',title:'観'.repeat(32),file:'a.txt'});
  const [deva]=parseHelpListText(`'${'कि'.repeat(34)}' 'a.txt'\n`);
  expect(deva).toEqual({kind:'topic',title:'कि'.repeat(32),file:'a.txt'});
  const [cut]=parseHelpListText(`'${'観'.repeat(40)}' 'a.txt'\n`);// the 80-column line ends inside the title: no file token
  expect(cut).toEqual({kind:'topic',title:'観'.repeat(32),file:''});
  expect(()=>parseHelpListText('x'.repeat(65537))).toThrow(HelpListError);
  expect(()=>helpTopicBodyText('x'.repeat(262145),'x','R')).toThrow(HelpListError);
 });
 it('wraps translated lines in display columns: as VIREO for Latin-1 text with spaces, between CJK characters with kinsoku, never refusing',()=>{
  let seed=7;const rnd=(n:number)=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%n;};
  for(let i=0;i<2000;i++){
   const words=Array.from({length:1+rnd(30)},()=>'abcdéfñ'.slice(0,1+rnd(7)).repeat(1+rnd(3)));
   const line=words.join(' '.repeat(1+rnd(3)))+' '.repeat(rnd(3)),width=8+rnd(65);
   let vireo:readonly string[]|null=null;try{vireo=wrapHelpLine(line,width);}catch{/* a word longer than the width */}
   if(vireo)expect(wrapHelpText(line,width),JSON.stringify([line,width])).toEqual(vireo);
  }
  // Review: every Latin-1 character (punctuation, controls, NBSP, soft hyphen), leading and trailing space runs, narrow widths.
  let compared=0;
  for(let i=0;i<6000;i++){
   let line=' '.repeat(rnd(3)===0?rnd(5):0);for(let j=rnd(160);j>0;j--)line+=rnd(4)===0?' ':String.fromCharCode(rnd(256));
   const width=2+rnd(80);let vireo:readonly string[]|null=null;try{vireo=wrapHelpLine(line,width);}catch{continue;}
   expect(wrapHelpText(line,width),JSON.stringify([line,width])).toEqual(vireo);compared++;
  }
  expect(compared).toBeGreaterThan(1500);
  // Review: a space just past the width ends the piece (no row of one space); a cluster wider than the width is a row of its own.
  expect(wrapHelpText('क्षत्रिय क्षत्रिय क्षत्रिय',6)).toEqual(['क्षत्रिय','क्षत्रिय','क्षत्रिय']);
  expect(wrapHelpText('あいうえ かきくけ',8)).toEqual(['あいうえ','かきくけ']);
  expect(wrapHelpText('слово  ',5)).toEqual(['слово',' ']);// as VIREO's 'abcd  ' at 5: a trailing run leaves one space
  expect(wrapHelpLine('abcd  ',5)).toEqual(['abcd ',' ']);
  expect(wrapHelpText('\u{1f468}\u200d\u{1f469}\u200d\u{1f467}'.repeat(3),4)).toEqual(Array(3).fill('\u{1f468}\u200d\u{1f469}\u200d\u{1f467}'));
  expect(wrapHelpText('観',2)).toEqual(['観']);expect(wrapHelpText('',72)).toEqual(['']);
  const long='露光を始めます。'.repeat(1500),t0=performance.now();
  expect(wrapHelpText(long).length).toBe(Math.ceil(displayColumns(long)/72));
  expect(performance.now()-t0).toBeLessThan(2000);// linear: ~10 ms here; the quadratic first version took 300 ms
  expect(wrapHelpText('a'.repeat(80))).toEqual(['a'.repeat(72),'a'.repeat(8)]);
  expect(wrapHelpText('あいうえお。かきくけ',10)).toEqual(['あいうえ','お。かきく','け']);
  expect(wrapHelpText('ありがとう「ございます」',10)).toEqual(['ありがとう','「ございま','す」']);
  expect(wrapHelpText('あいうえ「かきくけこ」',10)).toEqual(['あいうえ','「かきくけ','こ」']);// no line ends with 「
  expect(wrapHelpText('𠮷'.repeat(40))).toEqual(['𠮷'.repeat(36),'𠮷'.repeat(4)]);
  expect(wrapHelpText('VIREOのモジュールです',12)).toEqual(['VIREOのモ','ジュールです']);// ュ may not start a line
  expect(wrapHelpText('あいうえ VIREO',10)).toEqual(['あいうえ ','VIREO']);// a Latin word is not split
  const ja='「スタート」ボタンを押すと、カメラは初期化されてからシャッターを開き、露光を始めます。「カメラの状態」と「露光タイマー」の表示で進み具合がわかります。';
  const deva='स्पेक्ट्रोफ\u093cोटोमीट्रिकअंशांकनप्रक्रियासम्बन्धीदिशानिर्देशसंग्रह'.repeat(2);
  for(const s of [ja,deva,'фотоэлектроколориметрическиспектрофотометрическийпреобразователь '.repeat(3)])for(const w of [10,20,72]){
   const pieces=wrapHelpText(s,w);
   expect(pieces.length).toBeGreaterThan(1);
   for(const p of pieces){expect(displayColumns(p)).toBeLessThanOrEqual(w);expect(p.length).toBeGreaterThan(0);}
   for(const p of pieces.slice(1))expect('、。」）ー'.includes(p[0]),p).toBe(false);
   expect(pieces.join('').replace(/ /g,'')).toBe(s.replace(/ /g,''));
   const clusters=new Set(graphemes(s));for(const p of pieces)for(const g of graphemes(p))expect(clusters.has(g),g).toBe(true);
  }
 });
 it('finds a topic and its Related Topics line with each language\'s marker, and wraps its long lines',()=>{
  const ja=`**露光の開始**\n${'露光を始めます。'.repeat(10)}\n関連項目：\n    画像の保存\n**画像の保存**\nx\n`;
  const body=helpTopicBodyText(ja,'  露光の開始','関連項目')!;
  expect(body.rows.slice(1,-1).every(r=>displayColumns(r)<=76)).toBe(true);
  expect(body.rows[body.relatedIndex]).toBe('  関連項目：  ');
  expect(body.rows.at(-2)).toBe('      画像の保存  ');
  const ru=helpTopicBodyText('**Начать экспозицию**\nТекст\nСвязанные темы:\n    Сохранение\n','Начать экспозицию','СВЯЗАННЫЕ ТЕМЫ')!;
  expect(ru.relatedIndex).toBe(2);expect(ru.rows[2]).toBe('  Связанные темы:  ');
  expect(helpTopicBodyText('**Начать**\nx\n','Другое','СВЯЗАННЫЕ ТЕМЫ')).toBeNull();
 });
 it('cuts a translated reminder at 255 and 1023 display columns on whole clusters',()=>{
  const box=reminderBoxTextOf(`${'観'.repeat(200)}\n\n${'ж'.repeat(300)}\n`,'選ぶ');
  expect(box).toBe(`${'観'.repeat(127)}\r\n\r\n${'ж'.repeat(255)}\r\n\r\n選ぶ`);
  // 4 × (254 + 2) columns: the fourth CR LF (one cluster) does not fit, and nothing after it is added.
  expect(reminderBoxTextOf(`${'観'.repeat(127)}\n`.repeat(5),'x')).toBe(`${'観'.repeat(127)}\r\n`.repeat(3)+'観'.repeat(127));
 });
});
