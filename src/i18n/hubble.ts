import {t,type Translate,type PlainMessageKey} from './index';
import type {HubbleDerivedRow,HubbleAnalysisResult,RecipeId} from '../core/hubbleAnalysis';
/** English strings below are immutable scientific CSV diagnostics. Translate
 * only their UI projection; never mutate the core result or operator claims. */
export const issueKeys:Readonly<Record<string,PlainMessageKey>>=Object.freeze({
 "Saved measurement is missing.":'hubble.issue.missingMeasurement',
 "Stellar line alignment is excluded from Hubble distances and velocity.":'hubble.issue.stellar',
 "Repeated acquisitions of the same galaxy are not independent Hubble targets. Keep one measurement per acquired target.":'hubble.issue.repeatTarget',
 "Velocity is outside the supported Single range.":'hubble.issue.velocityRange',
 "Add an object label.":'hubble.issue.missingObject',
 "Enter a finite decimal velocity.":'hubble.issue.invalidVelocity',
 "Add the velocity source.":'hubble.issue.missingVelocitySource',
 "Enter a finite apparent V magnitude.":'hubble.issue.invalidMagnitude',
 "Add the apparent magnitude source.":'hubble.issue.missingMagnitudeSource',
 "Choose a recipe.":'hubble.issue.missingRecipe',
 "Identify one of the 13 VIREO targets for M = −21.4.":'hubble.issue.missingTarget',
 "Magnitude or v/D exceeds the supported Number range.":'hubble.issue.distanceRange',
});
export const summaryKeys:Readonly<Record<string,PlainMessageKey>>=Object.freeze({
 "Choose a recipe to calculate distances and a summary.":'hubble.summary.noRecipe',
 "Add measurements, documented inputs, or the original workbook example.":'hubble.summary.empty',
 "Complete every row before calculating the summary. No rows are silently excluded.":'hubble.summary.incomplete',
 "Add at least two complete rows to display the origin fit (web interface requirement).":'hubble.summary.tooFew',
 "Unweighted mean(v/D). Scatter only: the workbook stores no fitted trendline.":'hubble.summary.mean',
 "Unweighted linear least squares through (0, 0). Manual-based mathematical adaptation.":'hubble.summary.origin',
 "The summary exceeds the supported Number range. No result is reported.":'hubble.summary.range',
});
const plain=(key:PlainMessageKey,translate:Translate)=>translate(key);
export function rowIssues(row:HubbleDerivedRow,translate:Translate=t):string{return row.issues.map(text=>{
 const key=Object.hasOwn(issueKeys,text)?issueKeys[text]:null;if(key)return plain(key,translate);
 if(row.acquiredTargetId&&text===`This acquisition is bound to VIREO target ${row.acquiredTargetId}.`)return translate('hubble.issue.boundTarget',{target:row.acquiredTargetId});
 return translate('hubble.unknownStatus');
}).join(' ');}
export function summaryMessage(result:HubbleAnalysisResult,translate:Translate=t):string{return plain(Object.hasOwn(summaryKeys,result.message)?summaryKeys[result.message]:'hubble.unknownStatus',translate);}
export function recipeLabel(id:RecipeId,translate:Translate=t){return translate(id==='workbook'?'hubble.recipe.workbook':'hubble.recipe.vireo');}
export function velocitySource(row:HubbleDerivedRow,translate:Translate=t){
 if(row.kind!=='measurement')return row.velocitySource;
 const match=/^(Stellar alignment measurement|Saved measurement) (\d+)(?: · v = c z)?$/.exec(row.velocitySource);
 return match?translate(match[1]==='Saved measurement'?'hubble.source.measured':'hubble.source.stellar',{id:match[2]}):row.velocitySource;
}
