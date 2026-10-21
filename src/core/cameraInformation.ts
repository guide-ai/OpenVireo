import recovered from '../../docs/CAMERA-INFORMATION-PROVENANCE.json';
/** Read-only compiled fallback information;never inferred from a loaded image,
 * instrument selection,instructor file or historical acquisition. */
export type CameraKind='ccd'|'ir';
export type CameraInformation=Readonly<{kind:CameraKind;detector:string;width:number;height:number;pixelWidthMicrons:number;pixelHeightMicrons:number;readNoiseElectronsPerPixel:number;darkNoiseElectronsPerPixelSecond:number;biasElectronsPerPixel:number;adBits:number;wellDepthElectrons:number;cooling:'thermoelectric'|'liquidNitrogen'}>;
function record(kind:CameraKind):CameraInformation{const r=recovered.records.find(r=>r.kind===kind);if(!r)throw new Error('Missing compiled camera information');return Object.freeze({kind,detector:r.detector,width:r.width,height:r.height,pixelWidthMicrons:r.pixelWidthMicrons,pixelHeightMicrons:r.pixelHeightMicrons,readNoiseElectronsPerPixel:r.readNoiseElectronsPerPixel,darkNoiseElectronsPerPixelSecond:r.darkNoiseElectronsPerPixelSecond,biasElectronsPerPixel:r.biasElectronsPerPixel,adBits:r.adBits,wellDepthElectrons:r.wellDepthElectrons,cooling:r.coolingFlag===0?'thermoelectric':'liquidNitrogen'});}
const defaults=Object.freeze({ccd:record('ccd'),ir:record('ir')});
export function compiledCameraInformation(kind:unknown):CameraInformation{if(kind!=='ccd'&&kind!=='ir')throw new Error('Unsupported compiled camera kind');return defaults[kind];}
