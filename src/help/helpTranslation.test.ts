import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {HelpListError,foldLatin1Accents,helpLinkTarget,helpTopicBody,parseHelpList} from '../core/cleaHelp';
import {foldAsciiCase} from '../core/radioHotListSearch';
import {parseSpectralLineList,spectralLineHelp} from './spectralLines';
import {HELP_FILES,helpFile} from './helpFiles';
import {RELATED_MARKER} from './helpTranslation';

// Front ES-HELP: the Spanish web adaptation of VIREO's help files (src/i18n/es/help) against the bundled originals.
type Module={sourceName:string;sourceSha256:string;text:string};
const modules=import.meta.glob<Module>('../i18n/es/help/*.ts',{eager:true});
const es=(key:string):Module=>modules[`../i18n/es/help/${key}.ts`];
const latin1=(s:string)=>Uint8Array.from(s,c=>c.charCodeAt(0));
const original=(key:string)=>new Uint8Array(readFileSync(new URL(`../../public${HELP_FILES[key].path}`,import.meta.url)));
const spanish=(key:string)=>latin1(es(key).text);
const LST=Object.keys(HELP_FILES).filter(k=>k.endsWith('.LST'));
const TXT=Object.keys(HELP_FILES).filter(k=>k.endsWith('.TXT'));
const REFUSED=['HUBHLP.LST','LSSHLP.LST'];
const usable=LST.filter(k=>!REFUSED.includes(k));
const headers=(text:string)=>text.split(/\r?\n/).map((l,i)=>l.length>1&&l[0]==='*'&&l.at(-1)==='*'?i:-1).filter(i=>i>=0);
/** The index (among the file's `*...*` headers) of the section a title opens (core/cleaHelp.ts helpTopicBody's seek), or -1. */
function sectionOf(bytes:Uint8Array,title:string):number{
 const lines=new TextDecoder('latin1').decode(bytes).split(/\r?\n/),key=foldAsciiCase(title.replace(/^ +/,''));
 const at=lines.findIndex(l=>l.includes('*')&&foldAsciiCase(l).includes(key));
 return headers(lines.join('\n')).indexOf(at);
}

describe('the Spanish help files (Front ES-HELP)',()=>{
 it('has a module for each bundled help file, recording the SHA-256 of the original it was translated from',()=>{
  expect(Object.keys(modules).length).toBe(Object.keys(HELP_FILES).length);
  for(const [key,id] of Object.entries(HELP_FILES)){
   expect(es(key),key).toBeDefined();
   expect(es(key).sourceName).toBe(id.name);
   expect(es(key).sourceSha256).toBe(id.sha256);
  }
 });
 it('fits Latin-1 and has no CR or tab',()=>{
  for(const key of Object.keys(HELP_FILES)){
   for(const c of es(key).text)expect(c.charCodeAt(0),`${key} ${c}`).toBeLessThan(256);
   expect(es(key).text,key).not.toMatch(/[\r\t]/);
  }
 });
 it('keeps the two empty indexes empty and the two refused indexes refused, in both languages',()=>{
  for(const k of ['MLTSPHLP.LST','SPLSTHLP.LST']){expect(es(k).text).toBe('');expect(parseHelpList(spanish(k))).toEqual([]);}
  for(const k of REFUSED){expect(()=>parseHelpList(original(k))).toThrow(HelpListError);expect(()=>parseHelpList(spanish(k))).toThrow(HelpListError);}
 });
 for(const key of usable)it(`${key}: same rows, kinds and file tokens as the original; titles fit VIREO's 65 characters`,()=>{
  const e=parseHelpList(original(key)),s=parseHelpList(spanish(key));
  expect(s.length).toBe(e.length);
  e.forEach((r,i)=>{expect(s[i].kind,`row ${i}`).toBe(r.kind);expect(s[i].file,`row ${i}`).toBe(r.file);expect(s[i].title.length,`row ${i}`).toBeLessThan(66);});
 });
 // Every topic row opens, in each language, the section at the same position of its text file; the related-topic links of that
 // section resolve to the same rows of the index.
 for(const key of usable)it(`${key}: each topic opens the section at the same index and its related topics resolve to the same rows`,()=>{
  const e=parseHelpList(original(key)),s=parseHelpList(spanish(key));
  e.forEach((r,i)=>{
   if(r.kind!=='topic')return;
   const file=helpFile(r.file);if(!file)return;
   const ek=file.name.toUpperCase(),eb=original(ek),sb=spanish(ek);
   const ei=sectionOf(eb,r.title),si=sectionOf(sb,s[i].title);
   expect(si,`${key} row ${i} "${s[i].title}"`).toBe(ei);
   const ebody=helpTopicBody(eb,r.title)!,sbody=helpTopicBody(sb,s[i].title,RELATED_MARKER.translation)!;
   expect(sbody,`${key} row ${i}`).not.toBeNull();
   expect(sbody.relatedIndex>=0,`${key} row ${i} related`).toBe(ebody.relatedIndex>=0);
   const targets=(rows:typeof e,body:typeof ebody,fold?:(t:string)=>string)=>body.rows.map((_,b)=>helpLinkTarget(rows,body,b,false,fold)).filter((t):t is number=>t!==null);
   expect(targets(s,sbody),`${key} row ${i} links`).toEqual(targets(e,ebody));
  });
 });
 it('wraps every text line at 72 characters or fewer, as the viewer needs (it cannot wrap a long unbroken line)',()=>{
  for(const key of TXT)for(const l of es(key).text.split('\n'))expect(l.length,`${key}: ${l}`).toBeLessThan(73);
 });
 it('has the same section headers count as the original text',()=>{
  for(const key of TXT)expect(headers(es(key).text).length,key).toBe(headers(new TextDecoder('latin1').decode(original(key))).length);
  expect(headers(es('SPECLNS.TXT').text).length).toBe(headers(new TextDecoder('latin1').decode(original('SPECLNS.TXT'))).length);
 });
 it('keeps the spectral line list and its help in step: same wavelengths and files, each line finding the same section',()=>{
  const e=parseSpectralLineList(original('SPECLNS.LNL')),s=parseSpectralLineList(spanish('SPECLNS.LNL'));
  expect(s.map(l=>[l.wavelength,l.file])).toEqual(e.map(l=>[l.wavelength,l.file]));
  e.forEach((l,i)=>{
   const eh=spectralLineHelp(original('SPECLNS.TXT'),l.name),sh=spectralLineHelp(spanish('SPECLNS.TXT'),s[i].name);
   expect(eh.kind).toBe('topic');expect(sh.kind,s[i].name).toBe('topic');
   expect(sectionOf(spanish('SPECLNS.TXT'),s[i].name)).toBe(sectionOf(original('SPECLNS.TXT'),l.name));
  });
 });
 it('keeps the reminders to the original line count and inside VIREO\'s 255-character lines',()=>{
  for(const k of ['REMINDER.OBS','REMINDER.PLS']){
   const e=new TextDecoder('latin1').decode(original(k)).split(/\r?\n/),s=es(k).text.split('\n');
   expect(s.length).toBe(e.length);for(const l of s)expect(l.length).toBeLessThan(256);
  }
 });
 it('names the English Related Topics marker nowhere in the translation',()=>{
  for(const key of TXT)expect(es(key).text,key).not.toMatch(/related topics/i);
 });
});

describe('the search fold of the translation (a web adaptation)',()=>{
 it('ignores accents and case, but keeps ñ a letter of its own',()=>{
  expect(foldLatin1Accents('Órbita')).toBe('orbita');
  expect(foldLatin1Accents('MÜNCHEN Época')).toBe('munchen epoca');
  expect(foldLatin1Accents('Año')).toBe('año');
  expect(foldLatin1Accents('ÑANDÚ')).toBe('ñandu');
  expect(foldLatin1Accents('Ann')).not.toBe(foldLatin1Accents('Añn'));
 });
 it('leaves VIREO\'s own rule (A to Z only) as it is',()=>{
  expect(foldAsciiCase('Órbita ABC')).toBe('Órbita abc');
 });
});
