import{describe,expect,it}from'vitest';
import path from'node:path';
// Existing development audit used by src/i18n/coverage.test.ts; no source execution.
// @ts-expect-error Development audit is a plain JS script, not application code.
import{auditUi}from'../../scripts/audit-ui-messages.mjs';
const root=path.resolve(import.meta.dirname,'../..');
describe('LSS wedge components are prepared for i18n',()=>{
 it('render no authored literal outside WedgeMessages/WedgeNativeText',()=>{
  const audit=auditUi(root) as{files:string[];sites:{file:string;kind:string;value:string}[]};
  const mine=audit.files.filter(f=>/src[\\/]components[\\/]Wedge[^\\/]*\.tsx$/.test(f));
  expect(mine.sort()).toEqual(['src/components/WedgeLab.tsx','src/components/WedgeOptionsDialog.tsx','src/components/WedgePlotSvg.tsx']);
  expect(audit.sites.filter(s=>mine.includes(s.file))).toEqual([]);
 });
});
