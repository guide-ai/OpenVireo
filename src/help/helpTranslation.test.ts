import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {HelpListError,foldLatin1Accents,helpLinkTarget,helpTopicBody,helpTopicBodyText,parseHelpList,parseHelpListText} from '../core/cleaHelp';
import {displayColumns} from '../core/textColumns';
import {foldAsciiCase} from '../core/radioHotListSearch';
import {parseSpectralLineList,parseSpectralLineListText,spectralLineHelp,spectralLineHelpText} from './spectralLines';
import {reminderBoxText,reminderBoxTextOf} from './mainHelp';
import {HELP_FILES,helpFile} from './helpFiles';
import glossary from '../i18n/es/glossary.json';
import ptGlossary from '../i18n/pt-br/glossary.json';
import {HelpTranslationError,helpTranslationText} from './helpTranslation';
import {LANGUAGES,type LanguageEntry} from '../i18n/languages';
import {PROFILES} from '../i18n/lint/profiles';

// Front ES-HELP: the Spanish web adaptation of VIREO's help files (src/i18n/es/help) against the bundled originals. Front PT-HELP:
// the same structure checks run for every registered language whose registry entry has `help` (Spanish, then Brazilian
// Portuguese in src/i18n/pt-br/help), each with its own related-topics marker; the Spanish titles are kept.
type Module={language:string;sourceName:string;sourceSha256:string;text:string};
const modules=import.meta.glob<Module>('../i18n/*/help/*.ts',{eager:true});
const latin1=(s:string)=>Uint8Array.from(s,c=>c.charCodeAt(0));
const original=(key:string)=>new Uint8Array(readFileSync(new URL(`../../public${HELP_FILES[key].path}`,import.meta.url)));
const LST=Object.keys(HELP_FILES).filter(k=>k.endsWith('.LST'));
const TXT=Object.keys(HELP_FILES).filter(k=>k.endsWith('.TXT'));
const REFUSED=['HUBHLP.LST','LSSHLP.LST'];
const usable=LST.filter(k=>!REFUSED.includes(k));
const headers=(text:string)=>text.split(/\r?\n/).map((l,i)=>l.length>1&&l[0]==='*'&&l.at(-1)==='*'?i:-1).filter(i=>i>=0);
/** The index (among the file's `*...*` headers) of the section a title opens (core/cleaHelp.ts helpTopicBody's seek), or -1. */
function sectionOf(file:Uint8Array|string,title:string):number{
 const lines=(typeof file==='string'?file:new TextDecoder('latin1').decode(file)).split(/\r?\n/),key=foldAsciiCase(title.replace(/^ +/,''));
 const at=lines.findIndex(l=>l.includes('*')&&foldAsciiCase(l).includes(key));
 return headers(lines.join('\n')).indexOf(at);
}
/** The languages that translate the help files, with the describe title each keeps (Spanish: ES-HELP's). */
const HELP_LANGUAGES=LANGUAGES.filter((l):l is LanguageEntry&{help:{related:string}}=>!!l.help);
const TITLES:Readonly<Record<string,string>>={'es-419':'the Spanish help files (Front ES-HELP)','pt-BR':'the Brazilian Portuguese help files (Front PT-HELP)'};
/** Front SC7: the help sets written in Latin-1 (any script may be, now; these two are, by their own rule). */
const LATIN1_HELP=['es-419','pt-BR'];
it('Front PT-HELP: Spanish and Brazilian Portuguese translate the help files, each with its own marker',()=>{
 expect(HELP_LANGUAGES.map(l=>[l.tag,l.help.related])).toEqual([['es-419','TEMAS RELACIONADOS'],['pt-BR','TÓPICOS RELACIONADOS']]);
 for(const l of HELP_LANGUAGES)expect(TITLES[l.tag],l.tag).toBeDefined();
});

for(const L of HELP_LANGUAGES)describe(TITLES[L.tag],()=>{
 const own=Object.fromEntries(Object.entries(modules).filter(([f])=>f.startsWith(`../i18n/${L.dir}/help/`)));
 const es=(key:string):Module=>own[`../i18n/${L.dir}/help/${key}.ts`];
 // Front SC7: the viewer reads a translation as text (the …Text parsers); `latin1` for the comparison with the byte parsers.
 const spanish=(key:string)=>es(key).text;
 it('has a module for each bundled help file, recording the SHA-256 of the original it was translated from',()=>{
  expect(Object.keys(own).length).toBe(Object.keys(HELP_FILES).length);
  for(const [key,id] of Object.entries(HELP_FILES)){
   expect(es(key),key).toBeDefined();
   expect(es(key).language).toBe(L.tag);// Front SC8
   expect(es(key).sourceName).toBe(id.name);
   expect(es(key).sourceSha256).toBe(id.sha256);
  }
 });
 it('is NFC with no CR or tab (Front SC7), and fits Latin-1 where its language writes Latin-1',()=>{
  for(const key of Object.keys(HELP_FILES)){
   if(LATIN1_HELP.includes(L.tag))for(const c of es(key).text)expect(c.charCodeAt(0),`${key} ${c}`).toBeLessThan(256);
   expect(es(key).text,key).not.toMatch(/[\r\t]/);
   expect(es(key).text.normalize('NFC')===es(key).text,key).toBe(true);
  }
 });
 if(LATIN1_HELP.includes(L.tag))it('Front SC7: the text parsers read it exactly as the byte parsers read its Latin-1 bytes',()=>{
  for(const key of usable){
   const t=parseHelpListText(spanish(key));expect(t,key).toEqual(parseHelpList(latin1(spanish(key))));
   for(const r of t)if(r.kind==='topic'){const f=helpFile(r.file);if(f)expect(helpTopicBodyText(spanish(f.name.toUpperCase()),r.title,L.help.related),`${key} ${r.title}`)
    .toEqual(helpTopicBody(latin1(spanish(f.name.toUpperCase())),r.title,L.help.related));}
  }
  const lines=parseSpectralLineListText(spanish('SPECLNS.LNL'));expect(lines).toEqual(parseSpectralLineList(latin1(spanish('SPECLNS.LNL'))));
  for(const l of lines)expect(spectralLineHelpText(spanish('SPECLNS.TXT'),l.name)).toEqual(spectralLineHelp(latin1(spanish('SPECLNS.TXT')),l.name));
  for(const k of ['REMINDER.OBS','REMINDER.PLS'])expect(reminderBoxTextOf(spanish(k),'Select')).toBe(reminderBoxText(latin1(spanish(k)),'Select'));
 });
 it('keeps the two empty indexes empty and the two refused indexes refused, in both languages',()=>{
  for(const k of ['MLTSPHLP.LST','SPLSTHLP.LST']){expect(es(k).text).toBe('');expect(parseHelpListText(spanish(k))).toEqual([]);}
  for(const k of REFUSED){expect(()=>parseHelpList(original(k))).toThrow(HelpListError);expect(()=>parseHelpListText(spanish(k))).toThrow(HelpListError);}
 });
 for(const key of usable)it(`${key}: same rows, kinds and file tokens as the original; titles fit VIREO's 65 characters (display columns)`,()=>{
  const e=parseHelpList(original(key)),s=parseHelpListText(spanish(key));
  expect(s.length).toBe(e.length);
  e.forEach((r,i)=>{expect(s[i].kind,`row ${i}`).toBe(r.kind);expect(s[i].file,`row ${i}`).toBe(r.file);expect(displayColumns(s[i].title),`row ${i}`).toBeLessThan(66);});
 });
 // Every topic row opens, in each language, the section at the same position of its text file; the related-topic links of that
 // section resolve to the same rows of the index.
 for(const key of usable)it(`${key}: each topic opens the section at the same index and its related topics resolve to the same rows`,()=>{
  const e=parseHelpList(original(key)),s=parseHelpListText(spanish(key));
  e.forEach((r,i)=>{
   if(r.kind!=='topic')return;
   const file=helpFile(r.file);if(!file)return;
   const ek=file.name.toUpperCase(),eb=original(ek),sb=spanish(ek);
   const ei=sectionOf(eb,r.title),si=sectionOf(sb,s[i].title);
   expect(si,`${key} row ${i} "${s[i].title}"`).toBe(ei);
   const ebody=helpTopicBody(eb,r.title)!,sbody=helpTopicBodyText(sb,s[i].title,L.help.related)!;
   expect(sbody,`${key} row ${i}`).not.toBeNull();
   expect(sbody.relatedIndex>=0,`${key} row ${i} related`).toBe(ebody.relatedIndex>=0);
   const targets=(rows:typeof e,body:typeof ebody,fold?:(t:string)=>string)=>body.rows.map((_,b)=>helpLinkTarget(rows,body,b,false,fold)).filter((t):t is number=>t!==null);
   expect(targets(s,sbody),`${key} row ${i} links`).toEqual(targets(e,ebody));
  });
 });
 it('wraps every text line at 72 characters (display columns) or fewer, as VIREO\'s files are',()=>{
  for(const key of TXT)for(const l of es(key).text.split('\n'))expect(displayColumns(l),`${key}: ${l}`).toBeLessThan(73);
 });
 it('has the same section headers count as the original text',()=>{
  for(const key of TXT)expect(headers(es(key).text).length,key).toBe(headers(new TextDecoder('latin1').decode(original(key))).length);
  expect(headers(es('SPECLNS.TXT').text).length).toBe(headers(new TextDecoder('latin1').decode(original('SPECLNS.TXT'))).length);
 });
 it('keeps the spectral line list and its help in step: same wavelengths and files, each line finding the same section',()=>{
  const e=parseSpectralLineList(original('SPECLNS.LNL')),s=parseSpectralLineListText(spanish('SPECLNS.LNL'));
  expect(s.map(l=>[l.wavelength,l.file])).toEqual(e.map(l=>[l.wavelength,l.file]));
  e.forEach((l,i)=>{
   const eh=spectralLineHelp(original('SPECLNS.TXT'),l.name),sh=spectralLineHelpText(spanish('SPECLNS.TXT'),s[i].name);
   expect(eh.kind).toBe('topic');expect(sh.kind,s[i].name).toBe('topic');
   expect(sectionOf(spanish('SPECLNS.TXT'),s[i].name)).toBe(sectionOf(original('SPECLNS.TXT'),l.name));
  });
 });
 it('keeps the reminders to the original line count and inside VIREO\'s 255-character lines',()=>{
  for(const k of ['REMINDER.OBS','REMINDER.PLS']){
   const e=new TextDecoder('latin1').decode(original(k)).split(/\r?\n/),s=es(k).text.split('\n');
   expect(s.length).toBe(e.length);for(const l of s)expect(displayColumns(l)).toBeLessThan(256);
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

describe('the translation loader (review S1)',()=>{
 const id=HELP_FILES['CAMHLP.LST'],ok={language:'es-419',sourceName:id.name,sourceSha256:id.sha256,text:'Año «x»'};
 it('returns the text',()=>{
  expect(helpTranslationText(ok,id,'es-419')).toBe('Año «x»');
 });
 it('refuses a module whose recorded source is another file or another SHA-256',()=>{
  expect(()=>helpTranslationText({...ok,sourceSha256:'0'.repeat(64)},id,'es-419')).toThrow(HelpTranslationError);
  expect(()=>helpTranslationText({...ok,sourceName:'CLASSHLP.LST'},id,'es-419')).toThrow(HelpTranslationError);
 });
 it('Front SC8: refuses a module of another language (each language\'s help set is its own)',()=>{
  expect(()=>helpTranslationText(ok,id,'pt-BR')).toThrow(HelpTranslationError);
  expect(()=>helpTranslationText({...ok,language:undefined as never},id,'es-419')).toThrow(HelpTranslationError);
 });
 it('Front SC7: accepts any script, but refuses a lone surrogate and text that is not NFC',()=>{
  for(const text of ['Tema “x”','ü€','観測 𠮷','एक्सपोज\u093cर','Съёмка'])expect(helpTranslationText({...ok,text},id,'es-419')).toBe(text);
  for(const text of ['a\ud800b','\udc00','x\ud83d','A\u030a','\u0958','e\u0301'])expect(()=>helpTranslationText({...ok,text},id,'es-419'),JSON.stringify(text)).toThrow(HelpTranslationError);
 });
});

// Review S5: the Spanish lints of es.test.ts (glossary.forbidden, usted and voseo) never see the help texts, so they run here over
// every translated help file, with the same Unicode word boundaries. ALLOWED names each permitted word per file, with its reason.
const WORD=(w:string)=>`(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`;
const ALLOWED:Record<string,{words:string[];reason:string}>={
 'PULSRANL.TXT':{words:['abra'],reason:'impersonal subjunctive «cuando se abra el programa», not a usted imperative'},
 'PULSRHLP.TXT':{words:['pulsar'],reason:'VIREO\'s English menu name in parentheses (Radio Pulsar Analysis Tool)'},
 'PULSRLST.TXT':{words:['pulsar'],reason:'VIREO\'s English menu names in parentheses (Find Pulsar..., Pulsar Parameters)'},
 'VIRMNHLP.TXT':{words:['pulsar','móvil'],reason:'VIREO\'s English menu name in parentheses (Radio Pulsar Analysis Tool), and «cursor móvil» (a moving cursor, not a phone)'},
};
describe('the Spanish help texts follow the Spanish lints (review S5)',()=>{
 const es=(key:string):Module=>modules[`../i18n/es/help/${key}.ts`];
 const forbidden=glossary.forbidden as {words?:string[];es?:string;use:string}[];
 for(const key of Object.keys(HELP_FILES))it(`${key}: no forbidden word or pattern, no usted, no voseo`,()=>{
  const text=es(key).text,hits:string[]=[];
  for(const f of forbidden){
   if(f.words){for(const w of f.words)if(new RegExp(WORD(w),'iu').test(text)&&!ALLOWED[key]?.words.includes(w))hits.push(`«${w}», use ${f.use}`);}
   else if(new RegExp(f.es!,'iu').test(text))hits.push(`/${f.es}/, use ${f.use}`);
  }
  expect(hits).toEqual([]);
  expect(text).not.toMatch(/(?<![\p{L}\p{N}])(usted|ustedes|vos)(?![\p{L}\p{N}])/iu);
 });
 it('every allowance is still needed and has a reason',()=>{
  for(const [key,a] of Object.entries(ALLOWED)){expect(a.reason.length,key).toBeGreaterThan(20);for(const w of a.words)expect(new RegExp(WORD(w),'iu').test(es(key).text),`${key} ${w}`).toBe(true);}
 });
});

// Front PT-HELP: the pt-BR profile's errors that read a text on its own (src/i18n/lint/profiles.ts: its typography patterns, the
// você register's patterns) and the pt-BR glossary's `forbidden` patterns, over each paragraph of every Portuguese help text
// (its wrapped lines joined). The rules that need the English pair (the tu-imperative, placeholders, glossary terms) and the
// curly-quote rule do not apply: a help file is Latin-1, so it quotes with VIREO's straight " (helpTranslationBytes refuses “ ”).
// PT_ALLOWED names each permitted hit per file (the matched text), with its reason.
const PT_ALLOWED:Record<string,{matches:string[];reason:string}>={};
describe('the Brazilian Portuguese help texts follow the pt-BR lints',()=>{
 const pt=(key:string):Module=>modules[`../i18n/pt-br/help/${key}.ts`];
 const profile=PROFILES['pt-BR'];
 const patterns=[...profile.typography,...profile.register.patterns,
  ...(ptGlossary.forbidden as {pt:string;use:string}[]).map(f=>({label:'glossary forbidden',pattern:new RegExp(f.pt,'iu'),use:f.use}))];
 const paragraphs=(text:string)=>text.split(/\n[ ]*\n/).map(p=>p.split('\n').map(l=>l.trim()).join(' ').trim()).filter(Boolean);
 const hitsOf=(key:string)=>{
  const out:{label:string;match:string;use:string}[]=[];
  for(const para of paragraphs(pt(key).text))for(const p of patterns){const m=new RegExp(p.pattern.source,p.pattern.flags.replace('g','')).exec(para);if(m)out.push({label:p.label,match:m[0],use:p.use});}
  return out;
 };
 for(const key of Object.keys(HELP_FILES))it(`${key}: no pt-BR lint error (European, Spanish or English word, guillemets, tu, title case)`,()=>{
  expect(hitsOf(key).filter(h=>!PT_ALLOWED[key]?.matches.includes(h.match)).map(h=>`${h.label}: «${h.match}», use ${h.use}`)).toEqual([]);
  expect(pt(key).text).not.toMatch(/[«»]/);
 });
 it('every allowance is still needed and has a reason',()=>{
  for(const [key,a] of Object.entries(PT_ALLOWED)){expect(a.reason.length,key).toBeGreaterThan(20);for(const m of a.matches)expect(hitsOf(key).map(h=>h.match),`${key} ${m}`).toContain(m);}
 });
});
