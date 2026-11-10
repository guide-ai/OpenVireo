import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {findHelpTopic,foldHelpText,helpLinkTarget,helpTopicBody,helpTopicBodyText,parseHelpList,parseHelpListText} from '../core/cleaHelp';
import {foldAsciiCase,searchRadioHotListRows} from '../core/radioHotListSearch';
import {displayColumns,graphemes} from '../core/textColumns';
import {HELP_FILES,helpFile} from './helpFiles';
import {HelpTranslationError} from './helpTranslation';
import {REMINDER_SELECT,reminderBoxText,reminderBoxTextOf} from './mainHelp';
import {UNICODE_HELP,fixtureHelpSet} from '../../tests/fixtures/help-unicode';

// Front SC7 (docs/I18N.md, "Script groundwork: Unicode help (SC7)"): the stand-in help sets in Japanese, Devanagari and Cyrillic
// script (tests/fixtures/help-unicode) read by the viewer's text parsers, with the structure rules a translated help set must keep
// (src/help/helpTranslation.test.ts runs them over the registered languages) and the script rules of SC7.
const original=(key:string)=>new Uint8Array(readFileSync(new URL(`../../public${HELP_FILES[key].path}`,import.meta.url)));
const headers=(text:string)=>text.split(/\r?\n/).map((l,i)=>l.length>1&&l[0]==='*'&&l.at(-1)==='*'?i:-1).filter(i=>i>=0);
function sectionOf(text:string,title:string):number{
 const lines=text.split(/\r?\n/),key=foldAsciiCase(title.replace(/^ +/,''));
 return headers(lines.join('\n')).indexOf(lines.findIndex(l=>l.includes('*')&&foldAsciiCase(l).includes(key)));
}
const latin1=(b:Uint8Array)=>new TextDecoder('latin1').decode(b);

for(const F of UNICODE_HELP)describe(`the ${F.id} stand-in help set (${F.tag})`,()=>{
 const set=fixtureHelpSet(F),text=(key:string)=>F.modules[key].text;
 it('loads through the production check, and refuses a file it does not translate',async()=>{
  expect(await set.load(HELP_FILES['CAMHLP.LST'])).toBe(text('CAMHLP.LST'));
  await expect(set.load(HELP_FILES['OBSRVHLP.TXT'])).rejects.toBeInstanceOf(HelpTranslationError);
  for(const key of Object.keys(F.modules)){expect(text(key).normalize('NFC')).toBe(text(key));expect(text(key)).not.toMatch(/[\r\t]/);expect(text(key)).toMatch(/[^\u0000-ÿ]/);}
 });
 it('has the original index\'s rows, kinds and file tokens, with titles within 65 display columns',()=>{
  const e=parseHelpList(original('CAMHLP.LST')),s=parseHelpListText(text('CAMHLP.LST'));
  expect(s.map(r=>[r.kind,r.file])).toEqual(e.map(r=>[r.kind,r.file]));
  for(const r of s){expect(displayColumns(r.title)).toBeLessThanOrEqual(65);expect(r.title).not.toMatch(/[\u0000-\u001f]/);}
  // Each title is whole: a cut would have shortened the quoted text of its LST line.
  const quoted=text('CAMHLP.LST').split('\n').filter(Boolean).map(l=>l.slice(1,l.indexOf("'",1)));
  for(const r of s)if(r.kind==='topic')expect(quoted).toContain(r.title.trim());
 });
 it('opens every CAMHLP.TXT topic at the same section, with its Related Topics line and links resolving to the same rows',()=>{
  const e=parseHelpList(original('CAMHLP.LST')),s=parseHelpListText(text('CAMHLP.LST'));
  let opened=0;
  e.forEach((r,i)=>{
   if(r.kind!=='topic'||helpFile(r.file)?.name!=='CAMHLP.TXT')return;
   expect(sectionOf(text('CAMHLP.TXT'),s[i].title),s[i].title).toBe(sectionOf(latin1(original('CAMHLP.TXT')),r.title));
   const eb=helpTopicBody(original('CAMHLP.TXT'),r.title)!,sb=helpTopicBodyText(text('CAMHLP.TXT'),s[i].title,F.related)!;
   expect(sb,s[i].title).not.toBeNull();
   expect(sb.relatedIndex>=0,s[i].title).toBe(eb.relatedIndex>=0);
   const targets=(rows:typeof e,body:typeof eb,fold:(t:string)=>string)=>body.rows.map((_,b)=>helpLinkTarget(rows,body,b,false,fold)).filter(t=>t!==null);
   expect(targets(s,sb,foldHelpText),s[i].title).toEqual(targets(e,eb,foldAsciiCase));
   for(const row of sb.rows)expect(displayColumns(row),row).toBeLessThanOrEqual(76);// '  ' + 72 columns + '  '
   opened++;
  });
  expect(opened).toBe(9);
  expect(headers(text('CAMHLP.TXT')).length).toBe(headers(latin1(original('CAMHLP.TXT'))).length);
 });
 it('wraps the over-long lines of a section on whole clusters and keeps every character',()=>{
  const src=text('CAMHLP.TXT').split('\n'),h=headers(text('CAMHLP.TXT')),title=src[h[3]].slice(2,-2),section=src.slice(h[3]+1,h[4]);
  expect(section.some(l=>displayColumns(l)>72)).toBe(true);
  const body=helpTopicBodyText(text('CAMHLP.TXT'),title,F.related)!,strip=(t:string)=>t.replace(/ /g,'');
  expect(body.rows.length).toBeGreaterThan(section.length+2);
  expect(strip(body.rows.join(''))).toBe(strip(section.join('')));
  const clusters=new Set(graphemes(text('CAMHLP.TXT')));
  for(const r of body.rows)for(const g of graphemes(r))expect(clusters.has(g)||g===' ',g).toBe(true);
 });
 it('finds topics and text through the per-script fold',()=>{
  const s=parseHelpListText(text('CAMHLP.LST')),topic=s.findIndex(r=>r.file!==''&&r.kind==='topic');
  const typed=foldHelpText(s[topic].title.trim());
  expect(findHelpTopic(s,typed,false,0,foldHelpText)).toEqual({kind:'hit',index:topic});
  const body=helpTopicBodyText(text('CAMHLP.TXT'),s[topic].title,F.related)!;
  const word=graphemes(body.rows[1].trim()).slice(0,3).join('');
  expect(searchRadioHotListRows(body.rows,word,false,0,foldHelpText)).toMatchObject({kind:'hit'});
 });
 it('makes the reminder box from its text, with the original\'s line count',()=>{
  const box=reminderBoxTextOf(text('REMINDER.OBS'),REMINDER_SELECT);
  expect(box.split('\r\n').length).toBe(reminderBoxText(original('REMINDER.OBS')).split('\r\n').length);
  expect(box.startsWith(text('REMINDER.OBS').split('\n')[0])).toBe(true);
 });
});

describe('the script rules on the stand-ins',()=>{
 const by=(id:string)=>UNICODE_HELP.find(f=>f.id===id)!;
 it('Japanese: half-width and katakana-insensitive search; the CJK line breaks between characters, never before 。、」',()=>{
  const ja=by('ja'),list=parseHelpListText(ja.modules['CAMHLP.LST'].text);
  expect(findHelpTopic(list,'ccdかめらを閉じる',false,0,foldHelpText)).toMatchObject({kind:'hit'});
  const take=helpTopicBodyText(ja.modules['CAMHLP.TXT'].text,'露光の開始',ja.related)!;
  for(const r of take.rows)expect('。、」）ー'.includes(r.trim()[0]??'x'),r).toBe(false);
  expect(searchRadioHotListRows(take.rows,'かめらと',false,0,foldHelpText)).toMatchObject({kind:'hit'});
  expect(searchRadioHotListRows(take.rows,'かめらと',true,0,foldHelpText)).toEqual({kind:'miss'});
  expect(take.rows.some(r=>r.includes('𠮷'))).toBe(true);
 });
 it('Devanagari: the nukta is ignored by the search; a long word breaks on cluster boundaries',()=>{
  const hi=by('hi'),list=parseHelpListText(hi.modules['CAMHLP.LST'].text);
  expect(findHelpTopic(list,'एक्सपोजर लें',false,0,foldHelpText)).toMatchObject({kind:'hit'});
  expect(findHelpTopic(list,'एक्सपोजर लें',true,0,foldHelpText)).toEqual({kind:'miss'});
  const take=helpTopicBodyText(hi.modules['CAMHLP.TXT'].text,'एक्सपोज\u093cर लें',hi.related)!;
  for(const r of take.rows)expect(displayColumns(r)).toBeLessThanOrEqual(76);
 });
 it('Cyrillic: case and ё are folded; the marker matches upper-cased lines',()=>{
  const ru=by('ru'),list=parseHelpListText(ru.modules['CAMHLP.LST'].text);
  expect(findHelpTopic(list,'-СЪЕМКА ПЗС-ИЗОБРАЖЕНИЙ-',false,0,foldHelpText)).toEqual({kind:'hit',index:0});
  const body=helpTopicBodyText(ru.modules['CAMHLP.TXT'].text,'Установка усиления',ru.related)!;
  expect(body.rows[body.relatedIndex].trim()).toBe('Связанные темы:');
  expect(searchRadioHotListRows(body.rows,'ЕЕ ОСТАВЛЯЮТ',false,0,foldHelpText)).toMatchObject({kind:'hit'});
 });
});
