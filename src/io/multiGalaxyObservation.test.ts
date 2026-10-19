import {hubbleVelocityCsv} from '../core/hubbleVelocity';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {createGalaxyObservation} from './galaxyObservation';
import {createGalaxyExposure,activateGalaxy,startGalaxy,tickGalaxy,pauseGalaxy} from '../core/galaxyExposure';
import {serializeAnalysisSession,readAnalysisSession} from './analysisSession';
import {createMeasurement,INITIAL_CONTROL,measurementCsv} from '../core/spectrum';
import {analyzeHubble,readHubbleWorkspace} from '../core/hubbleAnalysis';
import {distanceFromMagnitude,fitHubbleThroughOrigin} from '../core/hubbleDistance';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
it('binds three manual measurements to distinct acquired targets and restores the original-fit inputs',async()=>{
 const ids=['36773','36747','54876'],magnitudes=['15.8','15.6','16.0'],positions=[49,51,68];
 const acquisitions=await Promise.all(ids.map(id=>createGalaxyObservation(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(1,id))),1000)))));
 const control={...INITIAL_CONTROL,step:.001};
 const rows=acquisitions.map((p,i)=>createMeasurement(i+1,'Same edited label',p.name,p.sha256,{...control,position:positions[i]},'GLXYLNS.LST',{kind:p.kind,acquisitionId:p.acquisitionId,targetId:p.targetId}));
 const hubble={recipeId:'vireo' as const,rows:rows.map((m,i)=>({id:i+1,input:{kind:'measurement' as const,measurementId:m.id,apparentVText:magnitudes[i],magnitudeSource:'Original CLEA_GLX.DAT documented input',targetId:ids[i]}}))};
 const result=analyzeHubble(hubble,rows);expect(result.rows.every(r=>r.issues.length===0)).toBe(true);expect(result.rows.map(r=>r.acquiredTargetId)).toEqual(ids);
 const expected=fitHubbleThroughOrigin(rows.map((r,i)=>({distanceMpc:distanceFromMagnitude(Number(magnitudes[i]),-21.4).megaparsecs,velocityKmS:Math.fround(299792.458*r.zFloat32)}))).slopeKmSPerMpc;expect(result.value).toBe(expected);
 const saved=await serializeAnalysisSession({observation:acquisitions[2],acquisitions,rows,control,stepInput:'.001',reference:'galaxy',wide:false,object:'Edited',hubble});
 const read=(s:string)=>readAnalysisSession(new File([s],'multiple.json'));const restored=await read(saved);expect(restored.rows).toEqual(rows);expect(restored.hubble).toEqual(hubble);expect(restored.acquisitions!.map(a=>a.state.exposure)).toEqual(acquisitions.map(a=>a.state.exposure));expect(analyzeHubble(restored.hubble,restored.rows).value).toBe(expected);expect(measurementCsv(rows)).toContain('acquired_target_id');expect(hubbleVelocityCsv(rows)).toContain('acquired_target_id');for(const r of rows)expect(hubbleVelocityCsv(rows)).toContain(r.origin!.acquisitionId);expect(measurementCsv(rows).split('\r\n')[1]).toMatch(/^4,/);
 for(const change of [(v:any)=>v.measurements[2].origin.targetId='36773',(v:any)=>delete v.measurements[2].origin.targetId,(v:any)=>v.acquisitions[2].journal.policy=v.acquisitions[0].journal.policy,(v:any)=>v.hubble.rows[2].input.targetId='36773']){const x=JSON.parse(saved);change(x);await expect(read(JSON.stringify(x))).rejects.toThrow();}
 // Legacy36773 journals and origin tags retain their original meaning.
 const legacy=JSON.parse(saved);delete legacy.measurements[0].origin.targetId;expect((await read(JSON.stringify(legacy))).rows[0].origin).toEqual({kind:'catalog-galaxy-acquisition',acquisitionId:rows[0].origin!.acquisitionId});
 const repeated={...hubble,rows:[hubble.rows[0],{...hubble.rows[0],id:4,input:{...hubble.rows[0].input,measurementId:4}}]};const row4=createMeasurement(4,'Another label',acquisitions[0].name,acquisitions[0].sha256,{...control,position:20},'GLXYLNS.LST',rows[0].origin);readHubbleWorkspace(repeated,[...rows,row4]);expect(analyzeHubble(repeated,[...rows,row4]).value).toBeUndefined();expect(analyzeHubble(repeated,[...rows,row4]).rows[0].issues.join()).toContain('not independent');
});
