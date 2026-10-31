import recovered from '../../docs/CAMERA-INFORMATION-PROVENANCE.json';
import {delphiFixed} from './variableStars';
/** Read-only compiled fallback information;never inferred from a loaded image,
 * instrument selection,instructor file or historical acquisition. */
export type CameraKind='ccd'|'ir';
export type CameraInformation=Readonly<{kind:CameraKind;detector:string;width:number;height:number;pixelWidthMicrons:number;pixelHeightMicrons:number;readNoiseElectronsPerPixel:number;darkNoiseElectronsPerPixelSecond:number;biasElectronsPerPixel:number;adBits:number;wellDepthElectrons:number;cooling:'thermoelectric'|'liquidNitrogen'}>;
function record(kind:CameraKind):CameraInformation{const r=recovered.records.find(r=>r.kind===kind);if(!r)throw new Error('Missing compiled camera information');return Object.freeze({kind,detector:r.detector,width:r.width,height:r.height,pixelWidthMicrons:r.pixelWidthMicrons,pixelHeightMicrons:r.pixelHeightMicrons,readNoiseElectronsPerPixel:r.readNoiseElectronsPerPixel,darkNoiseElectronsPerPixelSecond:r.darkNoiseElectronsPerPixelSecond,biasElectronsPerPixel:r.biasElectronsPerPixel,adBits:r.adBits,wellDepthElectrons:r.wellDepthElectrons,cooling:r.coolingFlag===0?'thermoelectric':'liquidNitrogen'});}
const defaults=Object.freeze({ccd:record('ccd'),ir:record('ir')});
export function compiledCameraInformation(kind:unknown):CameraInformation{if(kind!=='ccd'&&kind!=='ir')throw new Error('Unsupported compiled camera kind');return defaults[kind];}
/** Front R4b (analysis/front-r4/C-parameters-camera-list.md §3 C5; TCCDCam 0x512d53–0x512f48, literals 0x512fa8–0x5130ec;
 * TIRCam 0x514d83–0x514f63, literals 0x514fd8–0x51511c): the nine ListBox lines of the TInfoListForm1 Information window, in
 * order. F1 = FloatToStrF ffFixed,18,1; the bias is an Integer field printed with F1. Static reading; nothing executed. */
export const CAMERA_INFORMATION_CAPTIONS=Object.freeze({ccd:'CCD Camera Parameters',ir:'IR Camera Parameters'});
export function cameraInformationLines(kind:CameraKind):readonly string[]{
 const r=compiledCameraInformation(kind),f1=(v:number)=>delphiFixed(v,1);
 return Object.freeze([
  `Detector: ${r.detector}`,
  `Image Size (pixels): ${r.width} x ${r.height}`,
  `Pixel Size (microns): ${f1(r.pixelWidthMicrons)} x ${f1(r.pixelHeightMicrons)}`,
  `Read Noise (electrons/pixel): ${f1(r.readNoiseElectronsPerPixel)}`,
  `Dark Noise (electrons/pixel/sec): ${f1(r.darkNoiseElectronsPerPixelSecond)}`,
  `Bias (electrons/pixel): ${f1(r.biasElectronsPerPixel)}`,
  `AD Depth (bits): ${r.adBits}`,
  `Well Depth (electrons): ${r.wellDepthElectrons}`,
  `Cooling: ${r.cooling==='liquidNitrogen'?'Liquid Nitrogen':'Thermoelectric'}`,
 ]);
}
