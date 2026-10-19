import {decimal} from './decimal';
export {decimal} from './decimal';
import {measurementGalaxyTarget} from './galaxyIdentity';
import examples from '../../data/hubble/workbook-examples.json';
import targets from '../../data/sky/hubble.json';
import { distanceFromMagnitude, fitHubbleThroughOrigin, meanIndividualHubble } from './hubbleDistance';
import { hubbleVelocity } from './hubbleVelocity';
import type { Measurement } from './spectrum';

export const MAX_HUBBLE_ROWS=200;
export const HUBBLE_SOURCES={
  workbook:{name:'Hubble Data.xls · Sheet1!C2:J16',sha256:'09ac2e0bd4499e4a4796cf64981b3958d264f92b710b1ac9e3324340054fc7ed'},
  vireo:{name:'Vireo Manual.pdf · Hubble exercise, 13 designated targets',sha256:'72e6ed38efdc6cd566649385d47da3e366c56771295ef8b9dc339ccce964ea11'},
  student:{name:'The Hubble Redshift Distance Relation · 24 Nov 2008, pp. 11–12',sha256:'9b3a7808f7afc63bf93ea10eb8a1f9a4ac3f4f0cff9d70db48985ea5cfada357'},
} as const;
export const HUBBLE_RECIPES={
  workbook:{label:'Distributed workbook · M = −21.0 · mean(v/D)',absoluteV:-21,method:'worksheet-mean-individual',sources:['workbook']},
  vireo:{label:'VIREO targets + student manual · M = −21.4 · fit through zero',absoluteV:-21.4,method:'student-manual-origin-linear',sources:['vireo','student']},
} as const;
export type RecipeId=keyof typeof HUBBLE_RECIPES;
export const HUBBLE_TARGETS=Object.freeze(targets.map(({id,label})=>Object.freeze({id,label})));
type Draft={apparentVText:string;magnitudeSource:string;targetId:string};
export type HubbleInput=Readonly<{kind:'workbook-example';worksheetRow:number}|
  ({kind:'measurement';measurementId:number}&Draft)|
  ({kind:'manual';object:string;velocityText:string;velocitySource:string}&Draft)>;
export type HubbleRow=Readonly<{id:number;input:HubbleInput}>;
export type HubbleWorkspace=Readonly<{recipeId:''|RecipeId;rows:readonly HubbleRow[]}>;
export const EMPTY_HUBBLE:HubbleWorkspace=Object.freeze({recipeId:'',rows:Object.freeze([])});
const emptyDraft=()=>({apparentVText:'',magnitudeSource:'',targetId:''});
export function newManualRow(id:number):HubbleRow {return {id,input:{kind:'manual',object:'',velocityText:'',velocitySource:'',...emptyDraft()}};}
export function measurementHubbleRow(id:number,measurementId:number):HubbleRow {return {id,input:{kind:'measurement',measurementId,...emptyDraft()}};}
export function workbookExampleRows():readonly HubbleRow[] {return examples.rows.map(r=>({id:r.worksheetRow-1,input:{kind:'workbook-example',worksheetRow:r.worksheetRow}}));}

function bad():never {throw new Error('Invalid Hubble workspace');}
function obj(value:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))bad();
  const r=value as Record<string,unknown>;
  if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))bad();return r;
}
function string(value:unknown,max:number):string {if(typeof value!=='string'||value.length>max)bad();return value;}
function positiveId(value:unknown):number {if(typeof value!=='number'||!Number.isSafeInteger(value)||value<=0||value>=Number.MAX_SAFE_INTEGER)bad();return value;}
/** Portable inputs only. Cached results, unknown versions/fields, dangling links,
 * duplicate examples/measurements and mixtures of examples with working data fail.
 * Incomplete numeric drafts remain valid session data, but cannot yield a result. */
export function readHubbleWorkspace(value:unknown,measurements:readonly Measurement[]):HubbleWorkspace {
  const w=obj(value,['recipeId','rows']),recipeId=string(w.recipeId,16);
  if(recipeId!==''&&recipeId!=='workbook'&&recipeId!=='vireo')bad();
  if(!Array.isArray(w.rows)||w.rows.length>MAX_HUBBLE_ROWS)bad();
  let last=0;const seen=new Set<string>();let example=false,working=false;
  const rows=w.rows.map(value=>{
    const r=obj(value,['id','input']),id=positiveId(r.id);if(id<=last)bad();last=id;
    if(!r.input||typeof r.input!=='object')bad();const kind=(r.input as {kind:unknown}).kind;
    let input:HubbleInput;
    if(kind==='workbook-example'){
      const i=obj(r.input,['kind','worksheetRow']),worksheetRow=positiveId(i.worksheetRow);
      if(!examples.rows.some(r=>r.worksheetRow===worksheetRow))bad();input={kind,worksheetRow};example=true;
      if(seen.has(`e${worksheetRow}`))bad();seen.add(`e${worksheetRow}`);
    }else if(kind==='measurement'||kind==='manual'){
      const keys=['kind','apparentVText','magnitudeSource','targetId',...(kind==='measurement'?['measurementId']:['object','velocityText','velocitySource'])];
      const i=obj(r.input,keys),draft={apparentVText:string(i.apparentVText,80),magnitudeSource:string(i.magnitudeSource,240),targetId:string(i.targetId,80)};
      if(draft.targetId!==''&&!HUBBLE_TARGETS.some(t=>t.id===draft.targetId))bad();
      if(kind==='measurement'){
        const measurementId=positiveId(i.measurementId);
        if(!measurements.some(r=>r.id===measurementId&&r.origin?.kind!=='catalog-star-acquisition')||seen.has(`m${measurementId}`))bad();seen.add(`m${measurementId}`);
        const linked=measurements.find(r=>r.id===measurementId)!;if(linked.origin?.kind==='catalog-galaxy-acquisition'&&draft.targetId!==''&&draft.targetId!==measurementGalaxyTarget(linked.origin))bad();
        input={kind,measurementId,...draft};
      }else input={kind,object:string(i.object,80),velocityText:string(i.velocityText,80),velocitySource:string(i.velocitySource,240),...draft};
      working=true;
    }else bad();
    return Object.freeze({id,input:Object.freeze(input)});
  });
  if(example&&working)bad();return Object.freeze({recipeId:recipeId as HubbleWorkspace['recipeId'],rows:Object.freeze(rows)});
}
export type HubbleDerivedRow=Readonly<{
  id:number;object:string;kind:HubbleInput['kind'];targetId:string;apparentVText:string;
  magnitudeSource:string;velocitySource:string;velocityPolicy:string;velocityInputText:string;file:string;sha256:string;z:string;zBits:string;acquisitionKind:string;acquisitionId:string;acquiredTargetId:string;
  velocityKmS?:number;apparentV?:number;distanceMpc?:number;individualH?:number;issues:readonly string[];
}>;
export type HubbleAnalysisResult=Readonly<{rows:readonly HubbleDerivedRow[];value?:number;message:string;method:string}>;
export function analyzeHubble(workspace:HubbleWorkspace,measurements:readonly Measurement[]):HubbleAnalysisResult {
  const recipe=workspace.recipeId?HUBBLE_RECIPES[workspace.recipeId]:null;
  const rows=workspace.rows.map(({id,input}):HubbleDerivedRow=>{
    const issues:string[]=[];
    let stellar=false,wrongAcquiredTarget=false;let acquisitionKind='',acquisitionId='',acquiredTargetId='';
    let object='',apparentVText='',magnitudeSource='',velocitySource='',velocityPolicy='',velocityInputText='',targetId='',file='',sha256='',z='',zBits='',velocityKmS:number|undefined;
    if(input.kind==='workbook-example'){
      const e=examples.rows.find(r=>r.worksheetRow===input.worksheetRow)!;
      object=e.object;apparentVText=String(e.apparentV);targetId=e.targetId;z=String(e.zDouble);
      magnitudeSource=`Hubble Data.xls · Sheet1!C${e.worksheetRow}`;velocitySource=`Hubble Data.xls · Sheet1!D${e.worksheetRow} × I2`;
      velocityKmS=e.zDouble*examples.cKmS;velocityInputText=String(velocityKmS);velocityPolicy='Number: original workbook Double z × Double c; no Single narrowing';file=examples.source;sha256=examples.sha256;
    }else{
      ({apparentVText,magnitudeSource,targetId}=input);
      if(input.kind==='measurement'){
        const m=measurements.find(m=>m.id===input.measurementId);
        if(!m)issues.push('Saved measurement is missing.');
        else{
          stellar=m.origin?.kind==='catalog-star-acquisition';if(stellar)issues.push('Stellar line alignment is excluded from Hubble distances and velocity.');
          acquisitionKind=m.origin?.kind??'';acquisitionId=m.origin?.acquisitionId??'';
          acquiredTargetId=measurementGalaxyTarget(m.origin)??'';wrongAcquiredTarget=!!acquiredTargetId&&targetId!==''&&targetId!==acquiredTargetId;if(wrongAcquiredTarget)issues.push(`This acquisition is bound to VIREO target ${acquiredTargetId}.`);
          if(acquiredTargetId&&workspace.rows.filter(r=>r.input.kind==='measurement'&&measurementGalaxyTarget(measurements.find(m=>m.id===(r.input as {measurementId:number}).measurementId)?.origin)===acquiredTargetId).length>1)issues.push('Repeated acquisitions of the same galaxy are not independent Hubble targets. Keep one measurement per acquired target.');
          object=m.object;file=m.file;sha256=m.sha256;z=String(m.zFloat32);zBits=m.zFloat32Hex;
          if(stellar){velocitySource=`Stellar alignment measurement ${m.id}`;velocityPolicy='Excluded from galaxy velocity and distance';}
          else{velocitySource=`Saved measurement ${m.id} · v = c z`;velocityPolicy='Number c × stored Single z → Single velocity; x87 equivalence unvalidated';try{velocityKmS=hubbleVelocity(m.zFloat32).storedKmS;velocityInputText=String(velocityKmS);}catch{issues.push('Velocity is outside the supported Single range.');}}
        }
      }else{
        object=input.object;velocitySource=input.velocitySource;velocityPolicy='Operator-supplied km/s; not independently verified';velocityKmS=decimal(input.velocityText);velocityInputText=input.velocityText;
        if(!object.trim())issues.push('Add an object label.');
        if(velocityKmS===undefined)issues.push('Enter a finite decimal velocity.');
        if(!velocitySource.trim())issues.push('Add the velocity source.');
      }
    }
    const apparentV=decimal(apparentVText);
    if(apparentV===undefined)issues.push('Enter a finite apparent V magnitude.');
    if(!magnitudeSource.trim())issues.push('Add the apparent magnitude source.');
    if(!recipe)issues.push('Choose a recipe.');
    if(workspace.recipeId==='vireo'&&!targetId)issues.push('Identify one of the 13 VIREO targets for M = −21.4.');
    let distanceMpc:number|undefined,individualH:number|undefined;
    if(!stellar&&!wrongAcquiredTarget&&recipe&&apparentV!==undefined&&magnitudeSource.trim()&&(workspace.recipeId!=='vireo'||targetId)){
      try{
        distanceMpc=distanceFromMagnitude(apparentV,recipe.absoluteV).megaparsecs;
        if(velocityKmS!==undefined){individualH=meanIndividualHubble([{distanceMpc,velocityKmS}]).kmSPerMpc;}
      }catch{issues.push('Magnitude or v/D exceeds the supported Number range.');}
    }
    return {id,object,acquisitionKind,acquisitionId,acquiredTargetId,kind:input.kind,targetId,apparentVText,magnitudeSource,velocitySource,velocityPolicy,velocityInputText,file,sha256,z,zBits,velocityKmS,apparentV,distanceMpc,individualH,issues};
  });
  const method=recipe?.method??'';
  if(!recipe)return {rows,method,message:'Choose a recipe to calculate distances and a summary.'};
  if(!rows.length)return {rows,method,message:'Add measurements, documented inputs, or the original workbook example.'};
  if(rows.some(r=>r.issues.length))return {rows,method,message:'Complete every row before calculating the summary. No rows are silently excluded.'};
  if(workspace.recipeId==='vireo'&&rows.length<2)return {rows,method,message:'Add at least two complete rows to display the origin fit (web interface requirement).'};
  try{
    const points=rows.map(r=>({distanceMpc:r.distanceMpc!,velocityKmS:r.velocityKmS!}));
    const value=workspace.recipeId==='workbook'?meanIndividualHubble(points).kmSPerMpc:fitHubbleThroughOrigin(points).slopeKmSPerMpc;
    return {rows,value,method,message:workspace.recipeId==='workbook'?'Unweighted mean(v/D). Scatter only: the workbook stores no fitted trendline.':'Unweighted linear least squares through (0, 0). Manual-based mathematical adaptation.'};
  }catch{return {rows,method,message:'The summary exceeds the supported Number range. No result is reported.'};}
}
function csvCell(value:string|number|undefined):string {
  if(value===undefined)return '';
  let s=String(value);if(typeof value==='string'&&/^[\s\u0000-\u001f]*[=+\-@]/.test(s))s="'"+s;
  return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
}
/** New analysis export, not an original CLEA observation or acquisition. */
export function hubbleAnalysisCsv(workspace:HubbleWorkspace,measurements:readonly Measurement[]):string {
  readHubbleWorkspace(workspace,measurements);
  const result=analyzeHubble(workspace,measurements),recipe=workspace.recipeId?HUBBLE_RECIPES[workspace.recipeId]:null;
  const sources=recipe?.sources.map(key=>{const s=HUBBLE_SOURCES[key];return `${s.name} SHA256 ${s.sha256}`;}).join(' | ')??'';
  const header=['schema','row','origin','object','status','recipe','absolute_M_V','method','recipe_sources','apparent_V','magnitude_source','VIREO_target_claim','z','z_float32_bits','velocity_input_text','velocity_km_s','velocity_source','velocity_policy','input_file','input_sha256','distance_Mpc','individual_v_over_D','summary_km_s_Mpc','summary_status','acquisition_kind','acquisition_id','acquired_target_id'];
  return [header,...result.rows.map(r=>[2,r.id,r.kind,r.object,r.issues.join(' ')||'complete',workspace.recipeId,recipe?.absoluteV,result.method,sources,r.apparentVText,r.magnitudeSource,r.targetId,r.z,r.zBits,r.velocityInputText,r.velocityKmS,r.velocitySource,r.velocityPolicy,r.file,r.sha256,r.issues.length?undefined:r.distanceMpc,r.issues.length?undefined:r.individualH,result.value,result.message,r.acquisitionKind,r.acquisitionId,r.acquiredTargetId])].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
