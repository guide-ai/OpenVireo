import {describe,it,expect} from 'vitest';
import {hubbleLabProgress,type LabArchiveEntry} from './hubbleLab';
import {EMPTY_HUBBLE,measurementHubbleRow,workbookExampleRows,type HubbleWorkspace} from './hubbleAnalysis';
import {createMeasurement,type Measurement} from './spectrum';
const ids=['36747','36773','54876','54875','54891','NGC 7499','NGC 7501','NGC 7503','36805','NGC 4874','NGC 4889','51976','51975'];
// Synthetic workflow fixtures, not acquired spectra, native replay or answers.
const archive:readonly LabArchiveEntry[]=ids.map((targetId,i)=>({targetId,acquisitionId:(i+1).toString(16).repeat(64),sha256:(i+4).toString(16).padStart(2,'0').repeat(32)}));
const records=archive.map((a,i)=>createMeasurement(i+1,'Edited label','synthetic.sp',a.sha256,{base:0,position:i+1,factor:1,step:.001},'GLXYLNS.LST',{kind:'catalog-galaxy-acquisition',acquisitionId:a.acquisitionId,targetId:a.targetId}));
const workspace=():HubbleWorkspace=>({recipeId:'vireo',rows:records.map((m,i)=>{const row=measurementHubbleRow(i+1,m.id);if(row.input.kind!=='measurement')throw Error();return {...row,input:{...row.input,apparentVText:'15',magnitudeSource:'Synthetic source',targetId:ids[i]}};})});
describe('bounded Hubble lab workflow progress',()=>{
 it('starts empty and counts unique targets rather than repeat snapshots or labels',()=>{
  expect(hubbleLabProgress([],[],EMPTY_HUBBLE)).toMatchObject({archived:0,measured:0,inHubble:0,next:'acquire'});
  expect(hubbleLabProgress([archive[0],archive[0]],[],EMPTY_HUBBLE)).toMatchObject({archived:1,measured:0,next:'acquire'});
  expect(hubbleLabProgress(archive.slice(0,3),[],EMPTY_HUBBLE)).toMatchObject({archived:3,total:13,original:13,next:'acquire'});
  expect(hubbleLabProgress(archive.slice(0,5),[],EMPTY_HUBBLE)).toMatchObject({archived:5,total:13,next:'acquire'});
  expect(hubbleLabProgress(archive,[],EMPTY_HUBBLE)).toMatchObject({archived:13,measured:0,total:13,original:13,next:'measure'});
  expect(hubbleLabProgress(archive,[],EMPTY_HUBBLE).targets.map(t=>t.id)).toEqual(['36773','36747','54876','54875','54891','NGC 7499','NGC 7501','NGC 7503','36805','NGC 4874','NGC 4889','51976','51975']);
 });
 it('requires the archive identity, curve digest and bound target; generic/stellar claims do not count',()=>{
  const generic=createMeasurement(20,'54876','claimed.ssp','a'.repeat(64),{base:0,position:3,factor:1,step:.001},'GLXYLNS.LST');
  const star=createMeasurement(21,'36747','star.sp','b'.repeat(64),{base:0,position:2,factor:1,step:.001},'BALMER.LST',{kind:'catalog-star-acquisition',acquisitionId:'c'.repeat(64)});
  const altered:Measurement[]=[{...records[0],sha256:'f'.repeat(64)},{...records[1],origin:{...records[1].origin!,acquisitionId:'e'.repeat(64)}},{...records[2],origin:{kind:'catalog-galaxy-acquisition',acquisitionId:records[2].origin!.acquisitionId,targetId:'36747'}},generic,star];
  expect(hubbleLabProgress(archive,altered,EMPTY_HUBBLE).measured).toBe(0);
  expect(hubbleLabProgress([],records,EMPTY_HUBBLE).measured).toBe(0);
 });
 it('reaches readiness only with all currently supported sourced rows (a workflow state, not E01 closure) and the manual origin recipe',()=>{
  const w=workspace(),before=JSON.stringify({archive,records,w});
  expect(hubbleLabProgress(archive,records,w)).toMatchObject({archived:13,measured:13,inHubble:13,total:13,next:'interpret'});
  expect(hubbleLabProgress(archive,records,{...w,rows:w.rows.slice(0,5)})).toMatchObject({inHubble:5,next:'inputs'});
  expect(hubbleLabProgress(archive,records,{...w,recipeId:'workbook'}).next).toBe('recipe');
  expect(hubbleLabProgress(archive,records,EMPTY_HUBBLE).next).toBe('recipe');
  expect(hubbleLabProgress(archive,records,{...w,rows:w.rows.slice(0,2)})).toMatchObject({inHubble:2,next:'inputs'});
  expect(JSON.stringify({archive,records,w})).toBe(before);
 });
 it('does not use examples or manual rows as acquired completion',()=>{
  expect(hubbleLabProgress(archive,records,{recipeId:'vireo',rows:workbookExampleRows()}).next).toBe('dataset');
 });
 it('source deletion and repeated targets revoke readiness without deleting measurements',()=>{
  const w=workspace(),row=w.rows[0];if(row.input.kind!=='measurement')throw Error();
  const missing={...w,rows:[{...row,input:{...row.input,magnitudeSource:''}},...w.rows.slice(1)]};
  expect(hubbleLabProgress(archive,records,missing)).toMatchObject({measured:13,inHubble:12,next:'inputs'});
  const extra={...records[0],id:9};
  const repeated={...w,rows:[...w.rows,{id:9,input:{...row.input,measurementId:9}}]};
  expect(hubbleLabProgress(archive,[...records,extra],repeated)).toMatchObject({measured:13,inHubble:12,duplicateTargets:true,next:'inputs'});
 });
 it('retains the original 36773 provenance schema without a targetId',()=>{
  const legacy={...records[1],origin:{kind:'catalog-galaxy-acquisition' as const,acquisitionId:archive[1].acquisitionId}};
  expect(hubbleLabProgress(archive,[legacy],EMPTY_HUBBLE).targets.find(t=>t.id==='36773')?.measured).toBe(true);
 });
});
