import{it,expect}from'vitest';
import{classificationLabProgress,sameClassificationExerciseSummary,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY,CLASSIFICATION_LAB_COUNTED_STEPS}from'./classificationLab';
import{EMPTY_CLASSIFICATION_WORKSPACE,INITIAL_CLASSIFICATION,readClassificationWorkspace,type ClassificationState,type ClassificationWorkspace}from'./classification';
import{FEATURE_POLICY,type FeatureWorkspace}from'./featureWidth';
// Authored workflow inputs only: the type/reason strings are a learner's trial, never an answer key.
const trial={proposed:'trial type',reason:'trial reasoning'};
const record=(unknownId='u1',line=-1)=>Object.freeze({unknownId,atlasId:'main',pair:0,mode:'bracket' as const,line,...trial,id:1});
const at=(practice:Partial<ClassificationState>,extra:Partial<ClassificationWorkspace>={}):ClassificationWorkspace=>({...EMPTY_CLASSIFICATION_WORKSPACE,practice:{...INITIAL_CLASSIFICATION,...practice},...extra});
const ready={unknownId:'u1',ready:true,compared:false,inspected:false};
it('starts with nothing done and never counts the save instruction',()=>{
 const p=classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY);
 expect(p.done).toEqual({choose:false,compare:false,inspect:false,record:false,save:false});expect(p.next).toBe('choose');expect(p.scope).toBe('practice');
 expect(CLASSIFICATION_LAB_COUNTED_STEPS).toEqual(['choose','compare','inspect','record']);
});
it('marks each step only from its own evidence and binds the view report to the current practice',()=>{
 expect(classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,ready).done.choose).toBe(true);
 expect(classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,{...ready,unknownId:'u2'}).done.choose).toBe(false);
 expect(classificationLabProgress(EMPTY_CLASSIFICATION_WORKSPACE,{...ready,compared:true}).next).toBe('inspect');
 const width:FeatureWorkspace={policy:FEATURE_POLICY,drafts:[],records:[{center:4861,left:4800,leftContinuum:1,right:4920,rightContinuum:1,id:1,unknownId:'u1'}]};
 expect(classificationLabProgress(at({features:width}),ready).done.inspect).toBe(true);
 expect(classificationLabProgress(at({unknownId:'u2',features:width}),{...ready,unknownId:'u2'}).done.inspect).toBe(false);
 const recorded=classificationLabProgress(at({records:[record()]}),ready);
 expect(recorded.done).toMatchObject({choose:true,compare:true,record:true,save:false});expect(recorded.next).toBe('inspect');
});
it('counts Inspect from an explicit choice for this practice or an own record, never from a retained line index',()=>{
 // The persisted marker index is carried across practices; by itself it is not evidence of inspecting this practice.
 expect(classificationLabProgress(at({line:3}),ready).done.inspect).toBe(false);
 expect(classificationLabProgress(at({line:3}),{...ready,inspected:true}).done.inspect).toBe(true);
 expect(classificationLabProgress(at({line:3}),{...ready,unknownId:'u2',inspected:true}).done.inspect).toBe(false);
 expect(classificationLabProgress(at({unknownId:'u2',line:0}),{...ready,unknownId:'u2'}).done.inspect).toBe(false);
 expect(classificationLabProgress(at({line:0}),{...ready,inspected:true}).next).toBe('compare');
 // Own classification records count only with a chosen line and only for their own practice.
 expect(classificationLabProgress(at({records:[record('u1',4)]}),ready).done.inspect).toBe(true);
 expect(classificationLabProgress(at({records:[record('u2',4)]}),ready).done.inspect).toBe(false);
 expect(classificationLabProgress(at({line:4,records:[record('u1',-1)]}),ready).done.inspect).toBe(false);
});
it('derives the steps again after a restore with no temporary compare or inspect report',()=>{
 const report={unknownId:'u7',ready:true,compared:false,inspected:false};
 const restored=readClassificationWorkspace({...EMPTY_CLASSIFICATION_WORKSPACE,practice:{...INITIAL_CLASSIFICATION,unknownId:'u7',line:20,...trial,records:[record('u7')]}},[]);
 const p=classificationLabProgress(restored,report);
 expect(p.done).toMatchObject({choose:true,compare:true,inspect:false,record:true,save:false});expect(p.next).toBe('inspect');expect(p.practiceId).toBe('u7');
 const owned=readClassificationWorkspace({...EMPTY_CLASSIFICATION_WORKSPACE,practice:{...INITIAL_CLASSIFICATION,unknownId:'u7',line:20,...trial,records:[record('u7',20)]}},[]);
 const q=classificationLabProgress(owned,report);
 expect(CLASSIFICATION_LAB_COUNTED_STEPS.every(s=>q.done[s])).toBe(true);expect(q.next).toBe('save');expect(q.done.save).toBe(false);
 expect(classificationLabProgress(owned,EMPTY_CLASSIFICATION_EXERCISE_SUMMARY).done.choose).toBe(false);
});
it('reports an other-source scope and counts no step for acquired or imported work, even with own practice records',()=>{
 const other=at({},{active:'abc'});const p=classificationLabProgress(other,ready);
 expect(p.scope).toBe('other');expect(p.done.choose).toBe(false);expect(p.done.compare).toBe(false);
 const all={...ready,compared:true,inspected:true};
 expect(classificationLabProgress(at({line:3},{active:'abc'}),all).done.inspect).toBe(false);
 const width:FeatureWorkspace={policy:FEATURE_POLICY,drafts:[],records:[{center:4861,left:4800,leftContinuum:1,right:4920,rightContinuum:1,id:1,unknownId:'u1'}]};
 const kept=at({line:4,features:width,records:[record('u1',4)]},{active:'abc'}),q=classificationLabProgress(kept,all);
 expect(q.done).toEqual({choose:false,compare:false,inspect:false,record:false,save:false});expect(q.next).toBe('choose');expect(q.practiceId).toBe('u1');
 // Returning to the practice restores the credit from the same, unchanged records.
 expect(classificationLabProgress({...kept,active:'practice'},ready).done).toMatchObject({choose:true,compare:true,inspect:true,record:true});
});
it('compares summaries field by field',()=>{
 expect(sameClassificationExerciseSummary(ready,{...ready})).toBe(true);for(const k of['unknownId','ready','compared','inspected']as const)expect(sameClassificationExerciseSummary(ready,{...ready,[k]:k==='unknownId'?'u2':!ready[k]})).toBe(false);
});
