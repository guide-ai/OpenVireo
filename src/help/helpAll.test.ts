import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {HelpListError,helpTopicBody,parseHelpList} from '../core/cleaHelp';
import {HELP_FILES,helpFile} from './helpFiles';
import witness from './helpAll.witness.json';

// Witness: research analysis/front-h-help/tools/help_all_witness.py (SHA-256 pinned below), a second implementation of the
// same static reading of CLEA_VEO.exe applied to every bundled index. It checks the port, not the reading.
const bytes=(name:string)=>new Uint8Array(readFileSync(new URL(`../../public${helpFile(name)!.path}`,import.meta.url)));
type Topic={index:number;file:string;txt?:string;found?:boolean;lines?:number;relatedLine?:number;bodySha256?:string};
const lists=witness.lists as Record<string,{rows:string[];topics:Topic[]}>;
/** The indexes VIREO opens (RECOVERY.md §1–2); the six others are leftovers no VIREO form opens. */
const SHOWN=['CAMHLP.LST','CLASSHLP.LST','HRANALHLP.LST','MEASHLP.LST','MLTSPHLP.LST','OBSRVHLP.LST','PHOTOHLP.LST','PLSANHLP.LST','PLSLSHLP.LST','PULSRHLP.LST','SPECHLP.LST','SPLSTHLP.LST','VARTYPEHLP.LST','VIRMNHLP.LST','WDGPLTHLP.LST'];
const ORPHANS=['ASTRMHLP.LST','HUBHLP.LST','LSSHLP.LST','OBJXHLP.LST','OBXMNHLP.LST','TOOLSHLP.LST'];

describe('every bundled VIREO help index (Front H)',()=>{
 it('is covered by the pinned witness',()=>{
  expect(witness.source.toolSha256).toBe('5a14541043f716172be770ebfd9d935c4996d69c00e7c1681fac7ebf50e1cb86');
  expect(Object.keys(lists).sort()).toEqual([...SHOWN,...ORPHANS].sort());
 });
 // HUBHLP.LST and LSSHLP.LST contain blank lines, which the web parser refuses (the native token result of a blank line is
 // not traced; the witness skips them). VIREO never opens either file.
 it('refuses the blank lines of HUBHLP.LST and LSSHLP.LST',()=>{
  for(const n of ['HUBHLP.LST','LSSHLP.LST'])expect(()=>parseHelpList(bytes(n))).toThrow(HelpListError);
 });
 for(const name of [...SHOWN,...ORPHANS].filter(n=>n!=='HUBHLP.LST'&&n!=='LSSHLP.LST'))it(`${name}: rows and topic bodies equal the witness`,()=>{
  const rows=parseHelpList(bytes(name)),w=lists[name];
  expect(rows.map(r=>r.title)).toEqual(w.rows);
  for(const t of w.topics){
   const file=helpFile(rows[t.index].file);
   if(t.txt==='missing'){expect(file).toBeNull();continue;}
   const body=helpTopicBody(bytes(file!.name),rows[t.index].title)!;
   expect(body.rows).toHaveLength(t.lines!);expect(body.relatedIndex).toBe(t.relatedLine);
   expect(createHash('sha256').update(Buffer.from(body.rows.join('\n'),'latin1')).digest('hex')).toBe(t.bodySha256);
  }
 });
 it('opens every topic of the shown indexes; the orphan indexes name only files absent from CLEA_Vireo.zip',()=>{
  for(const n of SHOWN)expect(lists[n].topics.every(t=>t.found===true)).toBe(true);
  for(const n of ORPHANS)expect(lists[n].topics.every(t=>t.txt==='missing')).toBe(true);
  expect(HELP_FILES['MLTSPHLP.LST'].bytes).toBe(0);expect(parseHelpList(bytes('MLTSPHLP.LST'))).toEqual([]);
 });
 it('names no Object X target: no ObjectX.HTL object ID appears in any shown help text',()=>{
  const htl=new Uint8Array(readFileSync(new URL('../../public/original/hotlists/ObjectX.HTL',import.meta.url)));
  // The ID is the first field of each record (ASCII up to the first padding); take every printable run of 6+ characters.
  const ids=new Set((new TextDecoder('latin1').decode(htl).match(/[ -~]{6,}/g)??[]).map(s=>s.trim().split(/ {2,}/)[0]).filter(s=>/^[A-Z0-9][A-Z0-9 +.-]{4,}$/.test(s)));
  expect(ids.size).toBeGreaterThan(3);
  const texts=Object.values(HELP_FILES).filter(f=>/\.(TXT|OBS|PLS)$/.test(f.name)&&f.bytes>0).map(f=>new TextDecoder('latin1').decode(bytes(f.name)));
  for(const id of ids)for(const t of texts)expect(t.includes(id),id).toBe(false);
 });
});
