import {describe,it,expect} from 'vitest';
import path from 'node:path';
// @ts-expect-error Development audit is a plain JS script, not application code.
import {auditOriginals} from '../../scripts/audit-ui-messages.mjs';
import receipts from './vireo-literals.json';
const root=path.resolve(import.meta.dirname,'../..');
describe('Front ES0: every on-screen VIREO literal outside vireo() has a receipt (docs/I18N.md)',()=>{
 it('matches the receipts exactly, so a new unwrapped site or a newly wrapped one updates src/i18n/vireo-literals.json',()=>{
  const audit=auditOriginals(root),actual=new Map<string,number>();
  for(const s of [...audit.sites,...audit.modules.map((m:{file:string;kind:string})=>({...m,value:'*'}))]){const key=JSON.stringify([s.file,s.kind,s.value]);actual.set(key,(actual.get(key)??0)+1);}
  expect(actual).toEqual(new Map(receipts.map(r=>[JSON.stringify([r.file,r.kind,r.value]),r.count])));
  // Front ES-REL (plan §7): no `pending-translation` receipt is left; every site is translated or receipted as correctly English.
  expect(receipts.filter(r=>!/^(?:native text mirrored in a file|identifier|translated in pieces)\b/.test(r.reason))).toEqual([]);
 });
});
