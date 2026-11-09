import {describe,expect,it} from 'vitest';
import {WEB_HELP,webHelpTopic} from './webHelp';

const topics=WEB_HELP.groups.flatMap(g=>g.topics);
const text=(id:string)=>{const t=webHelpTopic(id);return [t.title,...t.blocks.flatMap(b=>b.kind==='p'?[b.text]:b.kind==='map'?b.rows.flat():b.kind==='helpKey'?[b.label]:b.items)].join('\n');};

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

describe('Front WebHelp review 1: the labels the help quotes exist in the UI',()=>{
 it('finds each quoted control label in the English catalog or the message modules',async()=>{
  const {readFileSync,readdirSync,statSync}=await import('node:fs');const path=await import('node:path');
  const root=path.resolve(import.meta.dirname,'..');let ui='';
  const walk=(d:string)=>{for(const f of readdirSync(d)){const q=path.join(d,f);if(statSync(q).isDirectory())walk(q);else if(/(Messages|Literals)?\.(ts|json)$/.test(f)&&!f.endsWith('.test.ts')&&q!==path.join(root,'help','webHelp.ts'))ui+=readFileSync(q,'utf8');}};
  // ES2 review 1: a VIREO menu name is shown through vireoMenuItem(), which drops accelerators and writes VIREO's '...' as '…'.
  // ES2 review 1: a VIREO name on a menu button is shown through vireoMenuItem(), which drops accelerators and ends it with '…'
  // (VIREO's '...' or none, as for 'Site Parameters').
  walk(root);ui=ui.replace(/&/g,'').replace(/\.\.\./g,'…');ui+=[...ui.matchAll(/'([^'\n…]{3,60})'/g)].map(m=>`${m[1]}…`).join('\n');
  for(const label of ['Source code','Report a problem','Open dome','Point telescope','Point to coordinates','Turn tracking on','Use this telescope','Telescope profile to inspect or select','Save investigation','Restore investigation JSON','What a backup includes','Download results text','Download results CSV','Print results','Save image (FITS)','Start exposure','Saved images','Set Date/Time…','Site Information…','Site Parameters…','Request 1.0 Meter Telescope','Request 4.0 Meter Telescope','Continue to next step','Go to the next step','Start pulsar exercise','Save recorded measurements (.CSV)','Set the observatory clock','Optical Simulation Options…','Results Editors','Exit Observatory','Leave','Hubble lab guide','LSS guide','Pulsar guide','Pleiades lab guide','Classification guide','Cluster HR guide'])
   expect(ui,label).toContain(label);
 });
});
