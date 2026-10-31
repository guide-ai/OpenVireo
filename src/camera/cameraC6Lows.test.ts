import {describe,expect,it} from 'vitest';
import {cameraOverlayInputs} from './cameraOverlayInputs';
import {CAMERA_MESSAGES as M} from './CameraMessages';
import {cameraRegionRecord} from '../core/cameraRegion';

describe('Front C6 review lows',()=>{
 it('L3: a telescope change before the sky view reloads is its own reason, not "no field loaded"',async()=>{
  const load={anchor:{ra:15,dec:31},telescope:0 as const,hidden:null,currentJd:()=>2451545};
  expect(await cameraOverlayInputs(load,{ra:15,dec:31},1)).toEqual({status:'telescope',red:null});
  expect(await cameraOverlayInputs(null,{ra:15,dec:31},1)).toEqual({status:'no-load',red:null});
  expect(M.overlay.telescope).toMatch(/previous telescope/);
 });
 it('N3: near the pole the region details say "every RA" and name the pole instead of raw out-of-range bounds',()=>{
  const r=cameraRegionRecord({ra:6,dec:89.9});
  expect(M.region(r)).toMatch(/^RA 15\.6\d{3}–20\.3\d{3} h \(VIREO’s single fold near the pole\), Dec 89\.5250° to the north pole\./);
  const p=cameraRegionRecord({ra:6,dec:90});expect(M.region(p)).toMatch(/^every RA \(near the pole\), Dec 89\.6250° to the north pole\./);
  const s=cameraRegionRecord({ra:6,dec:-89.9});
  expect(M.region(s)).toMatch(/single fold near the pole\), Dec the south pole to -89\.5250°\./);
  const n=cameraRegionRecord({ra:15.3657,dec:31.2219});
  expect(M.region(n)).toMatch(/^RA 15\.\d{4}–15\.\d{4} h, Dec 30\.8469° to 31\.5969°\./);
 });
});
