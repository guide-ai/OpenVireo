// Security review of 2026-11-14: the linear scans must return exactly what the regular expressions they replace returned
// (the VizieR reader's contract is unchanged), on well-formed and on broken markup alike. SYNTHETIC text authored here.
import {describe,expect,test} from 'vitest';
import {cellBodies,elementBodies,firstBareElementBody,openTags} from './markupScan';

/** Deterministic generator (mulberry32), so a failure can be reproduced. */
function random(seed:number){return ()=>{seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
const pieces=['<TR>','<TR','</TR>','<TR x="1">','<TR/>','<TRX>','<TD>','<TD','</TD>','<TD/>','<TD a="b"/>','<TD a="b">','<TDX/>','<TD/','>','/','/>','<',
 '<INFO name="a" value="b">','<INFO/>','<INFO','<INFOS>','<PARAM name="Error"/>','<PARAM','<FIELD name="x"/>','<FIELD','<TABLE>','<TABLE id="t">','</TABLE>',
 '<TABLEDATA>','</TABLEDATA>','<TABLEDATA x>','abc',' ','\n','12.5','&amp;'];
/** Narrower vocabularies, so that each scan also meets text where its own tags are frequent. */
const focused=[
 ['<TR>','<TR','</TR>','<TR x="1">','<TR/>','<TRX>','>','abc','<TD>1</TD>'],
 ['<TD>','<TD','</TD>','<TD/>','<TD a="b"/>','<TD a="b">','<TDX/>','<TD/','>','/','12.5'],
 ['<INFO name="a" value="b">','<INFO/>','<INFO','<INFOS>','<PARAM name="Error"/>','<PARAM','<FIELD name="x"/>','<FIELD','>',' '],
 ['<TABLE>','<TABLE id="t">','</TABLE>','<TABLEDATA>','</TABLEDATA>','<TABLEDATA x>','<TABLE','>','abc'],
];
function documents(count:number,seed:number):string[]{
 const next=random(seed),out:string[]=[''];
 for(let i=0;i<count;i++){
  const from=i%2?focused[(i>>1)%focused.length]:pieces;
  let s='';const n=Math.floor(next()*16);for(let k=0;k<n;k++)s+=from[Math.floor(next()*from.length)];out.push(s);
 }
 return out;
}
const first=(text:string,expression:RegExp)=>[...text.matchAll(expression)].map(m=>m[1]??'');
const whole=(text:string,expression:RegExp)=>[...text.matchAll(expression)].map(m=>m[0]);

describe('linear tag scans',()=>{
 const samples=documents(8000,20261114);
 test('openTags gives the matches of <NAME\\b[^>]*>, for one name and for several',()=>{
  for(const s of samples){
   expect([...openTags(s,'INFO')],s).toEqual(whole(s,/<INFO\b[^>]*>/g));
   expect([...openTags(s,'FIELD')],s).toEqual(whole(s,/<FIELD\b[^>]*>/g));
   expect([...openTags(s,'INFO','PARAM')],s).toEqual(whole(s,/<(?:INFO|PARAM)\b[^>]*>/g));
  }
 });
 test('elementBodies gives capture 1 of <NAME\\b[^>]*>([\\s\\S]*?)</NAME>',()=>{
  for(const s of samples){
   expect([...elementBodies(s,'TR')],s).toEqual(first(s,/<TR\b[^>]*>([\s\S]*?)<\/TR>/g));
   expect([...elementBodies(s,'TABLE')],s).toEqual(first(s,/<TABLE\b[^>]*>([\s\S]*?)<\/TABLE>/g));
  }
 });
 test('firstBareElementBody gives capture 1 of the first <NAME>([\\s\\S]*?)</NAME>',()=>{
  for(const s of samples)expect(firstBareElementBody(s,'TABLEDATA'),s).toBe(/<TABLEDATA>([\s\S]*?)<\/TABLEDATA>/.exec(s)?.[1]??null);
 });
 test('cellBodies gives the cells of <NAME\\b[^>]*/>|<NAME\\b[^>]*>([\\s\\S]*?)</NAME>, a self-closing tag being empty',()=>{
  for(const s of samples)expect([...cellBodies(s,'TD')],s).toEqual(first(s,/<TD\b[^>]*\/>|<TD\b[^>]*>([\s\S]*?)<\/TD>/g));
 });
 test('the generated text exercises every branch (matches, tags without ">", openings without a closing tag)',()=>{
  const count=(f:(s:string)=>boolean)=>samples.filter(f).length;
  expect(count(s=>[...elementBodies(s,'TR')].length>1)).toBeGreaterThan(20);
  expect(count(s=>[...cellBodies(s,'TD')].some(c=>c!=='')&&[...cellBodies(s,'TD')].includes(''))).toBeGreaterThan(20);
  expect(count(s=>[...openTags(s,'INFO','PARAM')].length>1)).toBeGreaterThan(20);
  expect(count(s=>s.includes('<TR')&&[...elementBodies(s,'TR')].length===0)).toBeGreaterThan(20);
  expect(count(s=>firstBareElementBody(s,'TABLEDATA')!==null)).toBeGreaterThan(20);
 });
});
