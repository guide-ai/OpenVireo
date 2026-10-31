import{describe,it,expect}from'vitest';import{compiledCameraInformation,cameraInformationLines}from'./cameraInformation';
describe('native camera Information with explicit compiled-default authority',()=>{
 it('pins every CCD field to its recovered constructor declaration and original units',()=>{expect(compiledCameraInformation('ccd')).toEqual({kind:'ccd',detector:'Site CH350 003B Back-Illuminated',width:1024,height:1024,pixelWidthMicrons:24,pixelHeightMicrons:24,readNoiseElectronsPerPixel:5,darkNoiseElectronsPerPixelSecond:2,biasElectronsPerPixel:1000,adBits:16,wellDepthElectrons:320000,cooling:'thermoelectric'});});
 it('retains the IR Single dark-noise value and the actual native32-bit setting without substituting a plausible detector',()=>{expect(compiledCameraInformation('ir')).toEqual({kind:'ir',detector:'CLEA_IR1',width:512,height:512,pixelWidthMicrons:40,pixelHeightMicrons:40,readNoiseElectronsPerPixel:53,darkNoiseElectronsPerPixelSecond:0.699999988079071,biasElectronsPerPixel:1000,adBits:32,wellDepthElectrons:250000,cooling:'liquidNitrogen'});const b=new ArrayBuffer(4),v=new DataView(b);v.setFloat32(0,compiledCameraInformation('ir').darkNoiseElectronsPerPixelSecond);expect(v.getUint32(0)).toBe(0x3f333333);});
 it('exposes immutable independent records and rejects foreign identities rather than choosing a default',()=>{const ccd=compiledCameraInformation('ccd'),ir=compiledCameraInformation('ir');expect(Object.isFrozen(ccd)).toBe(true);expect(Object.isFrozen(ir)).toBe(true);expect(Reflect.set(ccd,'width',512)).toBe(false);expect(Reflect.set(ir,'detector','imported claim')).toBe(false);expect(ccd.width).toBe(1024);expect(ir.detector).toBe('CLEA_IR1');for(const bad of[null,undefined,'CCD','IR',0,'filename.fits',{},'__proto__'])expect(()=>compiledCameraInformation(bad)).toThrow();});
});

// Front R4b (dossier C §3 C5): the native Information lines, exact literals.
describe('camera Information lines (C5)',()=>{
 it('CCD and IR',()=>{
  expect(cameraInformationLines('ccd')).toEqual(['Detector: Site CH350 003B Back-Illuminated','Image Size (pixels): 1024 x 1024','Pixel Size (microns): 24.0 x 24.0',
   'Read Noise (electrons/pixel): 5.0','Dark Noise (electrons/pixel/sec): 2.0','Bias (electrons/pixel): 1000.0','AD Depth (bits): 16','Well Depth (electrons): 320000','Cooling: Thermoelectric']);
  expect(cameraInformationLines('ir')).toEqual(['Detector: CLEA_IR1','Image Size (pixels): 512 x 512','Pixel Size (microns): 40.0 x 40.0',
   'Read Noise (electrons/pixel): 53.0','Dark Noise (electrons/pixel/sec): 0.7','Bias (electrons/pixel): 1000.0','AD Depth (bits): 32','Well Depth (electrons): 250000','Cooling: Liquid Nitrogen']);
 });
});
