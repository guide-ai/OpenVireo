import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';
// Existing Vite/Rolldown parser; no new dependency or source execution.
// @ts-expect-error Development audit is a plain JS script, not application code.
import {auditUi} from '../../scripts/audit-ui-messages.mjs';
import en from './en.json';
import receipts from './scientific-literals.json';
import {t,createI18n,locale,type MessageKey} from './index';
import {documentMessages} from './html';
const root=path.resolve(import.meta.dirname,'../..'),names=(s:string)=>[...new Set([...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))].sort();
describe('P01 complete authored presentation catalog and interpolation contract',()=>{
 it('covers every catalog placeholder and rejects missing values without interpreting inserted text',()=>{
  const render=t as(key:MessageKey,values?:Record<string,string|number>)=>string;
  for(const[key,text]of Object.entries(en)){const fields=names(text),values=Object.fromEntries(fields.map(n=>[n,`<b>{${n}}</b> σ`]));const expected=text.replace(/\{(\w+)\}/g,(_,n)=>values[n]);expect(render(key as MessageKey,values)).toBe(expected);for(const field of fields){const missing={...values};delete missing[field];expect(()=>render(key as MessageKey,missing)).toThrow('Missing message parameter');}}
  expect(()=>render('missing.key' as MessageKey)).toThrow();
 });
 it('checks generated key/parameter types against the authoritative English catalog',()=>{
  const expected=Object.entries(en).map(([key,value])=>`  ${JSON.stringify(key)}: ${names(value).length?names(value).map(n=>JSON.stringify(n)).join(' | '):'never'};`).join('\n');
  expect(readFileSync(new URL('./params.generated.ts',import.meta.url),'utf8')).toBe(`// Generated from en.json by scripts/generate-message-types.mjs; checked by tests.\nexport interface MessageParameters {\n${expected}\n}\n`);
 });
 it('admits explicit isolated future locales only with identical complete keys and placeholder names',()=>{
  const alternate={...en,'sky.pointed':'[test] {target}'};const a=createI18n(alternate,'de-DE');alternate['sky.pointed']='mutated';expect(a.t('sky.pointed',{target:'<b>{target}</b>'})).toBe('[test] <b>{target}</b>');expect(t('sky.pointed',{target:'M82'})).toBe('Telescope centered on M82.');expect(locale).toBe('en-US');expect(a.formatNumber(1234.5)).toBe('1.234,5');expect(a.fixed(1.005,2)).toBe('1,00');expect(a.scientific(1e-10,7,true)).toBe('1e-10');
  for(const bad of [{...en,extra:'extra'},{...en,'sky.pointed':'{wrong}'},{...en,'sky.pointed':5}])expect(()=>createI18n(bad as typeof en,'en-US')).toThrow();const missing={...en};delete(missing as Partial<typeof en>)['sky.pointed'];expect(()=>createI18n(missing,'en-US')).toThrow();
 });
 it('keeps all remaining direct render sites confined to reviewed scientific/source-identity tokens',()=>{
  // 120: Front S adds src/SpectrumEngineControls.tsx (measuring engine Zoom, ◀ / ▶ and readout) and src/SpectralRangeDialog.tsx (TSpecRangeDlg); their strings come from src/SpectrumEngineMessages.ts and the recovered literals in src/core/spectralRange.ts.
  // 118 (Front H's 116 + Front L2's 2): Front L2 adds src/LssRegion.tsx and src/observatory/RouteSpectrumSave.tsx; their strings come from the catalog, the recovered TLSSRgnDlg literals (core/lssRegion.ts) or ObservatoryMessages.ts.
  // 116 (Front M's 105 + Front P's 9 + Front H's 2): Front H adds src/help/{HelpMenus,SpectralLineTable}.tsx (main/radio Help menus, Exit Observatory reminder, Spectral Line Table); their strings come from src/help/HelpMessages.ts, the module's own message object or recovered literals in src/help/mainHelp.ts.
  // 114 (with Front M's 105): Front P adds src/polish/{AboutDialog,WebPrintPreview,PrintSkyImage,ResultsEditorsNav,TerminateSlewBox,CameraFieldSize,PopupMenu,QuestionBox,ClusterGuideNavButton}.tsx; their strings come from src/polish/PolishMessages.ts or recovered core literals. The retired #spectrometer preview drops its "K" unit site.
  // 105 (with Front O2's 92 and Front V2's 97): Front M adds src/multispec/{MultiSpecControl,MultiSpecDisplay,MultiSpecFieldOverlay,MultiSpecList,MultiSpecInstrument,MultiSpecObservatory,MultiSpecObjectX,MultiSpecLazy}.tsx; their strings come from the catalog (multispec.*) or recovered core literals (core/multiSpecFormat.ts MULTISPEC_MESSAGES).
  // 97: Front V2 adds src/clusters/{CleaHelp,ClusterPrintPreview,PossibleMemberWindow,HrPrint,ClusterListWindow}.tsx (cluster HR help viewer, print preview, Possible Cluster Member, HR Print, Clusters for Study); their strings come from src/clusters/ClusterHrMessages.ts or recovered core literals. (95 before Front O2 merged; 97 with it)
  // 92: Front O2 adds src/observatory/{ObservatoryFileMenu,QsoListWindow}.tsx; their strings come from src/observatory/QsoListMessages.ts, FieldInfoMessages.ts or recovered core literals.
  // 90: Front O adds src/observatory/{FieldInfoListWindow,FieldInformationMenu,CatalogObjectDialog,EditModeFieldLayer,NakedEyeDomeSky,FrontOLazy}.tsx; their strings come from src/observatory/FieldInfoMessages.ts or recovered core literals.
  // 84: ObjectXSpectrum.tsx (Front F, E08 spectrometer branch); its strings come from src/objectx/ObjectXMessages.ts.
  // 83: variables/VariableStarsRoute.tsx and variables/LightCurveSvg.tsx (Front V) add the variable-star route and light-curve plot; their strings come from src/variables/VariableStarMessages.ts or recovered core literals.
  // 81: ObjectXLab.tsx and ObjectXLabGuide.tsx (Front X) add the E08 route and guide; their strings come from src/objectx/ObjectXMessages.ts.
  // 79: the UI redesign adds components/ThemeSwitch.tsx, components/ResearchNotes.tsx and components/PortalHeader.tsx; their strings come from AppShellMessages.ts or the catalog (no new receipts).
  // 76: CameraControl.tsx (Front C) adds the CCD camera window; its strings come from src/camera/CameraMessages.ts.
  // 75: ObjectXMeasure.tsx (Front X) adds the E08 measuring tool; its strings come from src/objectx/ObjectXMessages.ts.
  // 74: LssLabGuide.tsx adds the E02 guide; it renders only catalog messages and counts.
  // 73: LssSurvey.tsx, LssAcquisition.tsx and LssMeasurement.tsx add the E02 survey route; they render only catalog messages and data fields, so the receipt map is unchanged.
  // 70: Front B adds eight optical observatory views under src/observatory (their strings come from ObservatoryMessages.ts or recovered core literals). 62: OwnObservationResults.tsx adds the phase-1 own results card (61 added ClassificationLineTable.tsx and ClassificationLabGuide.tsx; 59 included PleiadesLabGuide.tsx); it renders only catalog messages, data fields and an em dash, so the reviewed literal receipt map remains unchanged.
  const audit=auditUi(root);expect(audit.files.length).toBe(120);const actual=new Map<string,number>();for(const s of audit.sites){const key=JSON.stringify([s.file,s.kind,s.value]);actual.set(key,(actual.get(key)??0)+1);}
  const expected=new Map(receipts.map(r=>[JSON.stringify([r.file,r.kind,r.value]),r.count]));expect(actual).toEqual(expected);expect(receipts.every(r=>r.reason.length>30)).toBe(true);
 });
 it('sources browser title/description from the same English catalog and escapes them as text',()=>{
  const html=readFileSync(path.join(root,'index.html'),'utf8'),served=documentMessages(html);expect(served).toContain(`<title>${en['app.documentTitle']}</title>`);expect(served).toContain(`content="${en['app.description']}"`);expect(served).not.toContain('__OPENVIREO_');expect(html).toContain('<html lang="en">');
 });
});
// TypeScript checks the required interpolation names; never executed.
function staticTypeChecks(){
 t('sky.pointed',{target:'M82'});
 // @ts-expect-error Required interpolation cannot be omitted.
 t('sky.pointed');
 // @ts-expect-error Misspelt interpolation name must fail compilation.
 t('sky.pointed',{traget:'M82'});
 // @ts-expect-error Unknown keys do not silently fall back to raw English.
 t('missing.key');
}
void staticTypeChecks;
