/** Selected supplied-minor branch of0x55ea94–0x55eb49. The historical
 * parameter has the form of mean surface brightness (mag/arcmin²): apparent
 * magnitude plus2.5log10(ellipse area in arcmin²). Its detector calibration
 * remains a separate legacy contract, not a distance or observed count.
 * Number/Math.log10 adapt the original Extended/FYL2X operations.
 * Result FSTP Extended@0x55eb3d, FLD@0x55eb41 returns via x87 ST0.
 */
export class GalaxyCalibrationError extends Error {
  constructor(readonly code:'catalog'|'axis-fallback-required'|'overflow') { super(`Galaxy magnitude contract: ${code}`);this.name='GalaxyCalibrationError'; }
}
export type GalaxyMagnitudeInput=Readonly<{apparentMagnitude:number;majorArcminutes:number;minorArcminutes:number}>;
export type GalaxyMagnitude=Readonly<{magnitude:number;area:number;apparentMagnitude:number;majorArcminutes:number;minorArcminutes:number}>;
const RECOVERED_PI=3.141592653589793; // Number projection of Extended0x55eb50.
export function galaxyInstrumentMagnitude(input:GalaxyMagnitudeInput):GalaxyMagnitude {
  if(!Number.isFinite(input.apparentMagnitude)||!Number.isFinite(input.majorArcminutes)||!Number.isFinite(input.minorArcminutes)||input.majorArcminutes<0||input.minorArcminutes<0)throw new GalaxyCalibrationError('catalog');
  const magnitude=Math.fround(input.apparentMagnitude),major=Math.fround(input.majorArcminutes),minor=Math.fround(input.minorArcminutes);
  if(!Number.isFinite(magnitude)||!Number.isFinite(major)||!Number.isFinite(minor)||major<0||minor<0)throw new GalaxyCalibrationError('catalog');
  // Underflow of a new Number input is a domain error, not an original zero.
  if((major===0&&input.majorArcminutes!==0)||(minor===0&&input.minorArcminutes!==0))throw new GalaxyCalibrationError('catalog');
  // Zero-major substitution is explicit in0x55eabd..0x55eacb. Zero-minor
  // morphology/Frac(1000*DoubleRA) remains outside this contract.
  if(minor===0)throw new GalaxyCalibrationError('axis-fallback-required');
  const preparedMajor=major===0?.5:major;
  const area=((RECOVERED_PI*preparedMajor)*minor)/4;
  const corrected=Math.log10(area)*2.5+magnitude;
  if(!Number.isFinite(area)||area<=0||!Number.isFinite(corrected))throw new GalaxyCalibrationError('overflow');
  return Object.freeze({magnitude:corrected,area,apparentMagnitude:magnitude,majorArcminutes:preparedMajor,minorArcminutes:minor});
}
