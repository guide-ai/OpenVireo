import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {parseSync} from 'rolldown/utils';
import en from './en.json';
import baseline from '../../tests/fixtures/p01-scientific-baseline.json';
import {createI18n,t,type MessageKey} from './index';
import {displayError,errorFor} from './errors';
import {issueKeys,summaryKeys,rowIssues,summaryMessage,velocitySource,recipeLabel} from './hubble';
import {DIAGNOSTIC_ENGLISH,diagnosticError,UNIDENTIFIED_OBJECT} from '../core/diagnostics';
import {createMeasurement,INITIAL_CONTROL,measurementCsv,parseSpectrum} from '../core/spectrum';
import {analyzeHubble,hubbleAnalysisCsv,newManualRow,workbookExampleRows,type HubbleDerivedRow} from '../core/hubbleAnalysis';
import {decimal} from '../core/hubbleAnalysis';
import {serializeAnalysisSession} from '../io/analysisSession';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const markerCatalog=Object.fromEntries(Object.entries(en).map(([k,v])=>[k,'[test locale] '+v]))as typeof en;
const alternate=createI18n(markerCatalog,'de-DE');
const issueRow=(issues:string[],overrides:Partial<HubbleDerivedRow>={}):HubbleDerivedRow=>({id:1,object:'<b>σ</b> {target}',kind:'manual',targetId:'',apparentVText:'',magnitudeSource:'My {source}',velocitySource:'Saved measurement 99 · v = c z',velocityPolicy:'',velocityInputText:'',file:'user σ.sp',sha256:'',z:'',zBits:'',acquisitionKind:'',acquisitionId:'',acquiredTargetId:'',issues,...overrides});
describe('P01 presentation / scientific and operator-data boundary',()=>{
 it('projects every static Hubble issue and summary without translating CSV contracts',()=>{
  const source=readFileSync(new URL('../core/hubbleAnalysis.ts',import.meta.url),'utf8'),ast=parseSync('hubbleAnalysis.ts',source).program,issues:string[]=[],messages:string[]=[];
  function walk(n:any,inMessage=false){if(!n||typeof n!=='object')return;if(n.type==='CallExpression'&&n.callee?.type==='MemberExpression'&&n.callee.object?.name==='issues'&&n.callee.property?.name==='push'&&n.arguments[0]?.type==='Literal')issues.push(n.arguments[0].value);if(n.type==='ConditionalExpression'&&inMessage){walk(n.consequent,true);walk(n.alternate,true);return;}if(inMessage&&n.type==='Literal'&&typeof n.value==='string')messages.push(n.value);for(const[k,v]of Object.entries(n)){if(['loc','comments'].includes(k))continue;const message=inMessage||(n.type==='Property'&&n.key?.name==='message'&&k==='value');if(Array.isArray(v))for(const c of v)walk(c,message);else if(v&&typeof v==='object')walk(v,message);}}
  walk(ast);expect(new Set(issues)).toEqual(new Set(Object.keys(issueKeys)));expect(new Set(messages)).toEqual(new Set(Object.keys(summaryKeys)));
  for(const text of issues){expect(en[issueKeys[text]]).toBe(text);expect(rowIssues(issueRow([text]),alternate.t)).toBe('[test locale] '+text);}
  for(const text of messages){expect(en[summaryKeys[text]]).toBe(text);const result={rows:[],method:'',message:text};expect(summaryMessage(result,alternate.t)).toBe('[test locale] '+text);expect(result.message).toBe(text);}
  expect(rowIssues(issueRow(['This acquisition is bound to VIREO target 36747.'],{acquiredTargetId:'36747'}),alternate.t)).toBe('[test locale] This acquisition is bound to VIREO target 36747.');expect(rowIssues(issueRow(['foreign status']),alternate.t)).toBe('[test locale] '+en['hubble.unknownStatus']);expect(recipeLabel('vireo',alternate.t)).toBe('[test locale] '+en['hubble.recipe.vireo']);
 });
 it('keeps operator claims and source names unchanged even when they resemble generated descriptions',()=>{
  const row=issueRow([]);expect(velocitySource(row,alternate.t)).toBe(row.velocitySource);expect(row.object).toBe('<b>σ</b> {target}');expect(row.magnitudeSource).toBe('My {source}');expect(velocitySource({...row,kind:'measurement'},alternate.t)).toBe('[test locale] Saved measurement 99 · v = c z');expect(velocitySource({...row,kind:'workbook-example',velocitySource:'Hubble Data.xls · Sheet1!D2 × I2'},alternate.t)).toBe('Hubble Data.xls · Sheet1!D2 × I2');
 });
 it('localizes typed authored errors and fails unknown runtime text to a catalogued fallback',()=>{
  expect(DIAGNOSTIC_ENGLISH).toEqual(Object.fromEntries(Object.keys(DIAGNOSTIC_ENGLISH).map(k=>[k,en[k as MessageKey]])));
  const values={line:4},error=diagnosticError('error.decimal',values);values.line=9;expect(error.message).toContain('Line 4');expect(displayError(error,'error.operation',alternate.t)).toBe('[test locale] '+t('error.decimal',{line:4}));expect(displayError(errorFor('spectrum.fileTooLarge'),'error.operation',alternate.t)).toBe('[test locale] '+en['spectrum.fileTooLarge']);expect(displayError(new Error('<b>foreign {target}</b>'),'error.import',alternate.t)).toBe('[test locale] '+en['error.import']);
  try{parseSpectrum('3700 .2\n4000 nope');throw new Error('accepted');}catch(e){expect(displayError(e)).toBe(t('error.decimal',{line:2}));}
 });
 it('keeps six pre-change scientific exports byte-identical under isolated locale formatting',async()=>{
  const m=createMeasurement(1,'Operator <b>σ</b> {target}','retained σ.csv','a'.repeat(64),{base:.015625,position:0,factor:1,step:.001},'GLXYLNS.LST');const row={id:1,input:{kind:'manual' as const,object:'Operator <b>σ</b> {target}',velocityText:'100.5',velocitySource:'Claim {target} σ',apparentVText:'4.5',magnitudeSource:'Source <b>σ</b>',targetId:'36747'}};
  alternate.t('sky.pointed',{target:m.object});expect(alternate.formatNumber(100.5)).toBe('100,5');expect(decimal('100,5')).toBeUndefined();
  const outputs={measurement:measurementCsv([m]),workbook:hubbleAnalysisCsv({recipeId:'workbook',rows:workbookExampleRows()},[]),vireo:hubbleAnalysisCsv({recipeId:'vireo',rows:workbookExampleRows()},[]),manual:hubbleAnalysisCsv({recipeId:'workbook',rows:[row]},[]),incomplete:hubbleAnalysisCsv({recipeId:'workbook',rows:[newManualRow(1)]},[]),session:await serializeAnalysisSession({observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:m.object,rows:[m],hubble:{recipeId:'workbook',rows:[row]}})};
  expect(Object.fromEntries(Object.entries(outputs).map(([k,v])=>[k,sha(v)]))).toEqual(baseline.nodeSHA256);expect(outputs.manual).toContain('100.5');expect(outputs.manual).not.toContain('[test locale]');expect(createMeasurement(2,'','a.sp','a'.repeat(64),m.control,'GLXYLNS.LST').object).toBe(UNIDENTIFIED_OBJECT);
  const result=analyzeHubble({recipeId:'workbook',rows:[newManualRow(1)]},[]);const original=JSON.stringify(result);summaryMessage(result,alternate.t);rowIssues(result.rows[0],alternate.t);expect(JSON.stringify(result)).toBe(original);
 });
 it('keeps every core/IO module independent of the presentation catalog and translator',()=>{
  for(const directory of ['../core/','../io/'])for(const name of readdirSync(new URL(directory,import.meta.url)).filter(n=>n.endsWith('.ts')&&!n.endsWith('.test.ts'))){const source=readFileSync(new URL(directory+name,import.meta.url),'utf8');expect(source,name).not.toMatch(/from\s*['"][^'"]*i18n/);}
 });
});
