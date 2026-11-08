import {describe,expect,it} from 'vitest';
import {WEB_HELP,webHelpTopic} from './webHelp';

const topics=WEB_HELP.groups.flatMap(g=>g.topics);
const text=(id:string)=>{const t=webHelpTopic(id);return [t.title,...t.blocks.flatMap(b=>b.kind==='p'?[b.text]:b.kind==='map'?b.rows.flat():b.items)].join('\n');};

describe('Front WebHelp: OpenVireo help topics',()=>{
 it('has unique topic ids, non-empty topics and resolvable related links',()=>{
  expect(topics.length).toBeGreaterThan(5);
  expect(new Set(topics.map(t=>t.id)).size).toBe(topics.length);
  for(const t of topics){
   expect(t.title.length).toBeGreaterThan(2);expect(t.blocks.length).toBeGreaterThan(0);
   for(const r of t.related){expect(r).not.toBe(t.id);expect(()=>webHelpTopic(r)).not.toThrow();}
  }
  expect(()=>webHelpTopic('missing')).toThrow(RangeError);
 });
 it('describes the web site, not the Windows program: desktop-only steps appear only in the VIREO-to-web table',()=>{
  const desktop=/Log In|Run Exercise|NumLock|MouseKeys|DS9|Excel|Alt key|\.FIT\b/;
  for(const t of topics)if(t.id!=='from-vireo')expect(text(t.id),t.id).not.toMatch(desktop);
  const map=webHelpTopic('from-vireo').blocks.find(b=>b.kind==='map');
  expect(map&&map.kind==='map'&&map.rows.length).toBeGreaterThan(5);
 });
});
