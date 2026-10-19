import proof from '../../data/observatory/star-drift-provenance.json';
import {verifiedStarConfiguration,STAR_TARGET} from './starExposure';
import type {StarTelescopeIndex} from './starTelescope';
import {cropNativeFrame} from './detectorRaster';
import {selectCatalogObject} from './objectSelection';
import {roundNearestEven} from './numericPolicy';
import {slitPixelLevel} from './photons';
import {nativeObjectSlitFraction,SlitThroughputError} from './slitThroughput';
import {validatePointing,hourDifference,type Pointing} from './sky';
export const STAR_DRIFT_PROOF_SHA256='8c0ca3c03ac53f3bbc5c07eb1c54fd241f5e36cbe61adbc791e9b195394b6af6',STAR_DRIFT_POLICY=proof.policy;
const nearRound=(n:number)=>Math.abs(Math.abs(n)%1-.5)<=proof.browserPolicy.maximumRoundGuardEPS*Number.EPSILON*Math.max(1,Math.abs(n));
/** Native cache-hit branch only. The fixed original cache is reconstructed,
 * never alleged to be a recovered runtime cache. No photons/means/RNG change. */
export function inspectStarDrift(pointing:Pointing,index:StarTelescopeIndex){
 validatePointing(pointing.ra,pointing.dec);
 if(pointing.dec!==STAR_TARGET.dec)return {status:'unsupported-declination' as const};
 const c=verifiedStarConfiguration(index),f=c.scene.frame,displacement=hourDifference(pointing.ra,f.center.ra)*Math.cos(pointing.dec*Math.PI/180)*f.width*15/f.fieldDegrees;
 const left=f.width/2-156-displacement,top=f.height/2-156,query=f.width/2-displacement,maximum=f.width-312;
 const edgeGuard=proof.browserPolicy.maximumRoundGuardEPS*Number.EPSILON*Math.max(1,maximum);
 if(left < -edgeGuard||left > maximum+edgeGuard)return {status:'cache-boundary' as const};
 if(left<=edgeGuard||maximum-left<=edgeGuard||nearRound(left)||nearRound(query))return {status:'precision-required' as const};
 const cropLeft=roundNearestEven(left),queryX=roundNearestEven(query),image=cropNativeFrame(c.cachedRaster,{left:cropLeft,top,right:cropLeft+312,bottom:top+312});
 const selected=selectCatalogObject(c.scene,queryX,468);
 if(selected.kind!=='none'&&selected.kind!=='star')throw new Error('Unsupported cached stellar selection');
 const target=selected.kind==='star'?c.field.stars[selected.star.index]:null,pixelLevel=target?slitPixelLevel(image):0;
 try{
  const fraction=target?nativeObjectSlitFraction({objectPresent:true,objectType:0,pixelLevel,object:{raHours:target.ra,decDegrees:target.dec},pointing:{raHours:pointing.ra,decDegrees:pointing.dec}}):0;
  return {status:'ready' as const,image,cropLeft,queryX,selectedId:target?.id??null,pixelLevel,fraction};
 }catch(error){if(error instanceof SlitThroughputError&&error.code==='precision-required')return {status:'precision-required' as const};throw error;}
}
