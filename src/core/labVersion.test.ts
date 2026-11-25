import {describe,it,expect} from 'vitest';
import {HUBBLE_QUICK_GOAL,hubbleLabProgress,type LabArchiveEntry} from './hubbleLab';
import {EMPTY_HUBBLE,measurementHubbleRow,type HubbleWorkspace} from './hubbleAnalysis';
import {createMeasurement} from './spectrum';
import {EMPTY_PLEIADES_EXERCISE_SUMMARY,PLEIADES_QUICK_GOAL,PLEIADES_SAMPLE_TARGETS,pleiadesLabProgress,type PleiadesExerciseSummary} from './pleiadesLab';
import {DEFAULT_LAB_VERSIONS,hubbleGoal,pleiadesGoal} from './labVersion';
import {companionNow,companionQuick} from './guideCompanion';

// Front NEWCOMER NC5 (plan analysis/front-plans/front-newcomer.md §2.5; user decision of 2026-11-24): the quick versions of
// Hubble's law (3 galaxies) and Pleiades photometry (8 stars). Synthetic workflow fixtures, not acquired spectra or answers.
const ids=['36747','36773','54876','54875','54891','NGC 7499','NGC 7501','NGC 7503','36805','NGC 4874','NGC 4889','51976','51975'];
const archive:readonly LabArchiveEntry[]=ids.map((targetId,i)=>({targetId,acquisitionId:(i+1).toString(16).repeat(64),sha256:(i+4).toString(16).padStart(2,'0').repeat(32)}));
const records=archive.map((a,i)=>createMeasurement(i+1,'Edited label','synthetic.sp',a.sha256,{base:0,position:i+1,factor:1,step:.001},'GLXYLNS.LST',{kind:'catalog-galaxy-acquisition',acquisitionId:a.acquisitionId,targetId:a.targetId}));
const workspace=(n:number):HubbleWorkspace=>({recipeId:'vireo',rows:records.slice(0,n).map((m,i)=>{const row=measurementHubbleRow(i+1,m.id);if(row.input.kind!=='measurement')throw Error();return {...row,input:{...row.input,apparentVText:'15',magnitudeSource:'Synthetic source',targetId:ids[i]}};})});
const Q=HUBBLE_QUICK_GOAL;

describe('Front NEWCOMER NC5: the versions',()=>{
 it('quick opens by default; the goals are 3 of 13 galaxies and 8 of 24 stars',()=>{
  expect(DEFAULT_LAB_VERSIONS).toEqual({hubble:'quick',pleiades:'quick'});
  expect([hubbleGoal('quick'),hubbleGoal('full')]).toEqual([3,13]);
  expect([pleiadesGoal('quick'),pleiadesGoal('full')]).toEqual([PLEIADES_QUICK_GOAL,PLEIADES_SAMPLE_TARGETS]);
  expect([PLEIADES_QUICK_GOAL,PLEIADES_SAMPLE_TARGETS]).toEqual([8,24]);
 });
});

describe('Front NEWCOMER NC5: Hubble progress at a goal',()=>{
 it('the default goal is the full version, as before',()=>{
  expect(hubbleLabProgress([],[],EMPTY_HUBBLE)).toMatchObject({goal:13,total:13,original:13,next:'acquire'});
  expect(hubbleLabProgress(archive.slice(0,3),records.slice(0,3),workspace(3)).next).toBe('acquire');
 });
 it('one galaxy at a time: an archived unmeasured galaxy is measured before the next acquisition, and acquire lasts below the goal',()=>{
  expect(hubbleLabProgress([],[],EMPTY_HUBBLE,Q)).toMatchObject({goal:3,total:13,next:'acquire'});
  expect(hubbleLabProgress(archive.slice(0,1),[],EMPTY_HUBBLE,Q).next).toBe('measure');
  expect(hubbleLabProgress(archive.slice(0,2),records.slice(0,2),EMPTY_HUBBLE,Q).next).toBe('acquire');
  expect(hubbleLabProgress(archive.slice(0,3),records.slice(0,2),EMPTY_HUBBLE,Q).next).toBe('measure');
  // A fourth archived galaxy is measured too before the dataset (the visitor chose to add it).
  expect(hubbleLabProgress(archive.slice(0,4),records.slice(0,3),workspace(3),Q).next).toBe('measure');
 });
 it('the recipe and the fit are still needed; every row must be complete',()=>{
  const three=[archive.slice(0,3),records.slice(0,3)] as const;
  expect(hubbleLabProgress(...three,EMPTY_HUBBLE,Q).next).toBe('recipe');
  expect(hubbleLabProgress(...three,{...workspace(3),recipeId:'workbook'},Q).next).toBe('recipe');
  expect(hubbleLabProgress(...three,workspace(2),Q)).toMatchObject({inHubble:2,next:'inputs'});
  expect(hubbleLabProgress(...three,workspace(3),Q)).toMatchObject({archived:3,measured:3,inHubble:3,goal:3,next:'interpret'});
  // An extra incomplete row still blocks, as the analysis does.
  const w=workspace(4),row=w.rows[3];if(row.input.kind!=='measurement')throw Error();
  const incomplete={...w,rows:[...w.rows.slice(0,3),{...row,input:{...row.input,magnitudeSource:''}}]};
  expect(hubbleLabProgress(archive.slice(0,4),records.slice(0,4),incomplete,Q)).toMatchObject({inHubble:3,next:'inputs'});
 });
 it('duplicates are not counted, and counts above the goal are not clamped',()=>{
  const w=workspace(3),row=w.rows[0];if(row.input.kind!=='measurement')throw Error();
  const extra={...records[0],id:99},repeated={...w,rows:[...w.rows,{id:99,input:{...row.input,measurementId:99}}]};
  expect(hubbleLabProgress(archive.slice(0,3),[...records.slice(0,3),extra],repeated,Q)).toMatchObject({inHubble:2,duplicateTargets:true,next:'inputs'});
  expect(hubbleLabProgress(archive.slice(0,4),records.slice(0,4),workspace(4),Q)).toMatchObject({archived:4,measured:4,inHubble:4,goal:3,next:'interpret'});
  // The same state in the full version goes back to acquiring the next galaxy.
  expect(hubbleLabProgress(archive.slice(0,4),records.slice(0,4),workspace(4)).next).toBe('acquire');
 });
});

const summary=(colorTargets:number,fit=false):PleiadesExerciseSummary=>({...EMPTY_PLEIADES_EXERCISE_SUMMARY,armed:true,access:'ready',measuredTargets:colorTargets,recordedTargets:colorTargets,colorTargets,fit});
const pleiades=(colorTargets:number,goal?:number,fit=false)=>pleiadesLabProgress({list:true,pointed:true,photometer:summary(colorTargets,fit),goal});

describe('Front NEWCOMER NC5: Pleiades progress at a goal',()=>{
 it('the sample step is done at 8 confirmed B−V in the quick version, at 24 by default',()=>{
  expect(pleiades(7,PLEIADES_QUICK_GOAL)).toMatchObject({next:'sample',goal:8});
  expect(pleiades(8,PLEIADES_QUICK_GOAL).done.sample).toBe(true);
  expect(pleiades(8,PLEIADES_QUICK_GOAL).next).toBe('distance');
  expect(pleiades(8)).toMatchObject({next:'sample',goal:24});
  expect(pleiades(24).done.sample).toBe(true);
 });
 it('counts above the goal are not clamped, and the fit closes the quick version',()=>{
  expect(pleiades(9,PLEIADES_QUICK_GOAL)).toMatchObject({colorTargets:9,goal:8});
  expect(pleiades(9,PLEIADES_QUICK_GOAL,true).next).toBe('save');
  expect(pleiades(9,undefined,true).next).toBe('sample');
 });
});

describe('Front NEWCOMER NC5: the strip reads the version from the progress',()=>{
 it('quick only while a goal below the full one is followed, and only for Hubble and Pleiades',()=>{
  expect(companionQuick({lab:'hubble',progress:hubbleLabProgress([],[],EMPTY_HUBBLE,Q)})).toBe(true);
  expect(companionQuick({lab:'hubble',progress:hubbleLabProgress([],[],EMPTY_HUBBLE)})).toBe(false);
  expect(companionQuick({lab:'pleiades',progress:pleiades(0,PLEIADES_QUICK_GOAL)})).toBe(true);
  expect(companionQuick({lab:'pleiades',progress:pleiades(0)})).toBe(false);
 });
 it('the quick version ends where the full one does: the guide closing state',()=>{
  expect(companionNow({lab:'hubble',progress:hubbleLabProgress(archive.slice(0,3),records.slice(0,3),workspace(3),Q)}).allDone).toBe(true);
  expect(companionNow({lab:'pleiades',progress:pleiades(8,PLEIADES_QUICK_GOAL,true)}).allDone).toBe(true);
 });
});
