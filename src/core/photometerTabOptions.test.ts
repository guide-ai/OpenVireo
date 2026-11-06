import {describe,expect,it} from 'vitest';
import contract from '../../data/photometry/cluster-comparison-contract.json';
import {CLUSTER_DATASETS} from './clusterComparison';
import {COMPILED_PHOTOMETER_TAB_OPTIONS,PHOTOMETER_TAB_OPTION_CAPTIONS,clusterEbvGateTicks,clusterEbvSliderFree,photometerActivationSky,photometerReadingSliderEnabled,readPhotometerTabOptions} from './photometerTabOptions';
import {createPhotometer,photometerDetectSkyPinnedRefusal,photometerEvent,type PhotometerEvent,type PhotometerState} from './photometer';
import {photometerApertureDomain} from './photometerAperture';
import {photometerSelectedFraction} from './photometerUbvField';
import {OPTION_TABS} from './opticalOptions';

// Front T4 (analysis/front-teacher/t4/RECOVERY.md): Set E(B-V) and Detect Sky. The expectations are the static reading of
// CLEA_VEO.exe 781bc970…c54c (ShowZAMS1Click 0x543a32–0x543a75; TPhotometer.FormActivate 0x4ff94c–0x4ff9ab), not native oracles.
describe('Front T4: the Photometer tab options',()=>{
 it('compiled values, DFM captions and hints (0x5a2a55, 0x5a2af6; DFM 0x20ba78, 0x20b946)',()=>{
  expect(COMPILED_PHOTOMETER_TAB_OPTIONS).toEqual({setEBmV:true,detectSky:false});
  expect(PHOTOMETER_TAB_OPTION_CAPTIONS.setEBmV).toMatchObject({box:'Set E(B-V)',hint:'Set E(B-V) to correct value for ZAMS fitting.',record:'+0x27dc',env:'+0x2e90'});
  expect(PHOTOMETER_TAB_OPTION_CAPTIONS.detectSky).toMatchObject({box:'Detect Sky ',hint:'Auto-detect sky.',record:'+0x27cf',env:'+0x2e83'});
  // The read-only Photometer tab listed both with these compiled states before they became live.
  const tab=OPTION_TABS.find(t=>t.tab==='photometer')!.values;
  expect(tab.find(v=>v.label==='Set E(B-V)')?.text).toBe('checked');expect(tab.find(v=>v.label==='Detect Sky')?.text).toBe('unchecked');
  expect(readPhotometerTabOptions({setEBmV:false,detectSky:true})).toEqual({setEBmV:false,detectSky:true});
  for(const bad of [null,[],{setEBmV:true},{setEBmV:1,detectSky:false},{setEBmV:true,detectSky:false,x:1}])expect(()=>readPhotometerTabOptions(bad)).toThrow(TypeError);
 });

 it('Set E(B-V): the gate sets Round(Single E × 100) and locks the slider in database mode only (0x543a39–0x543a75)',()=>{
  expect(CLUSTER_DATASETS).toHaveLength(16);
  for(const c of contract.clusters){
   const info=CLUSTER_DATASETS.find(d=>d.id===c.id)!;
   expect(clusterEbvGateTicks(true,true,c.catalogEbvSingle),c.id).toBe(info.presetEbvTicks);
   expect(clusterEbvGateTicks(false,true,c.catalogEbvSingle),c.id).toBeNull();
   expect(clusterEbvGateTicks(true,false,c.catalogEbvSingle),c.id).toBeNull();
  }
  // Banker's rounding on the exact Single × 100 product: 0.125 → 12.5 → 12; 0.135 is not exact as a Single (13.5000002…) → 14.
  expect(clusterEbvGateTicks(true,true,0.125)).toBe(12);expect(clusterEbvGateTicks(true,true,0.375)).toBe(38);
  expect(clusterEbvGateTicks(true,true,0.135)).toBe(14);
  expect(clusterEbvSliderFree(true,true)).toBe(false);expect(clusterEbvSliderFree(false,true)).toBe(true);expect(clusterEbvSliderFree(true,false)).toBe(true);
  expect(()=>clusterEbvGateTicks(true,true,Number.NaN)).toThrow(TypeError);
 });

 it('Detect Sky: FormActivate\'s Sky flag and slider (0x4ff94c on, 0x4ff987 off)',()=>{
  // On: Sky exactly when the selected object's fraction is 0, whatever the slider; the slider and its group are disabled.
  for(const slider of [false,true]){
   expect(photometerActivationSky(true,slider,0)).toBe(true);expect(photometerActivationSky(true,slider,0.25)).toBe(false);
  }
  // Off: the slider at Sky, or no light in the aperture.
  expect(photometerActivationSky(false,true,0.25)).toBe(true);expect(photometerActivationSky(false,false,0)).toBe(true);expect(photometerActivationSky(false,false,0.25)).toBe(false);
  expect(photometerReadingSliderEnabled(true)).toBe(false);expect(photometerReadingSliderEnabled(false)).toBe(true);
  expect(()=>photometerActivationSky(true,false,Number.NaN)).toThrow(TypeError);
 });

 it('Detect Sky on a pinned PLEIADES.HTL sky position: Start is refused exactly where the star still lights the aperture [W]',()=>{
  const run=(s:PhotometerState,events:readonly PhotometerEvent[])=>events.reduce(photometerEvent,s);
  const s=run(createPhotometer(11),[{type:'telescope',index:0},{type:'activate'}]);
  expect(s.pointing).toBe('sky');
  const first=photometerApertureDomain().find(a=>photometerSelectedFraction(s.targetId,'sky',a,0)>0)!;
  expect(first).toBeGreaterThan(15);
  expect(photometerDetectSkyPinnedRefusal(run(s,[{type:'aperture',selector:10}]))).toBe(false);
  expect(photometerDetectSkyPinnedRefusal(run(s,[{type:'aperture',selector:first-1}]))).toBe(false);
  expect(photometerDetectSkyPinnedRefusal(run(s,[{type:'aperture',selector:first}]))).toBe(true);
  // The Object position is never refused, nor a released photometer.
  expect(photometerDetectSkyPinnedRefusal(run(s,[{type:'aperture',selector:first},{type:'point',kind:'object'}]))).toBe(false);
  expect(photometerDetectSkyPinnedRefusal(run(s,[{type:'aperture',selector:first},{type:'deactivate'}]))).toBe(false);
 });
});
