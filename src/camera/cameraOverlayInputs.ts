/** Front C6: the CCD overlay of one exposure from the telescope field the sky view loaded (observatory/telescopeField.ts). It asks
 * io/skyField.ts for that same field (a cache hit, or the shared build), so the overlay uses the field VIREO would have painted:
 * the loaded anchor, telescope and Object X mask. A masked or unbuildable field leaves the exposure without the overlay, with the
 * reason (cameraOverlaySource.ts); an abort rejects with AbortError. */
import {cameraOverlaySource,type CameraOverlayReason} from '../core/cameraOverlaySource';
import {cameraPreparationReference} from '../core/cameraPreparation';
import type {OpticalIndex} from '../core/opticalTelescope';
import type {Pointing} from '../core/sky';
import type {TelescopeFieldLoad} from '../observatory/telescopeField';

export type CameraOverlayStatus='run'|'off'|CameraOverlayReason;
export type CameraOverlayInputs=Readonly<{status:CameraOverlayStatus;red:Uint8Array|null}>;
/** The telescope view ignores the finder limit (io/skyField.ts keyOf); any value builds the same field. */
const UNUSED_FINDER_LIMIT=11.5;

export async function cameraOverlayInputs(load:TelescopeFieldLoad|null,pointing:Pointing,opticalIndex:OpticalIndex,signal?:AbortSignal):Promise<CameraOverlayInputs>{
 const no=(status:CameraOverlayStatus)=>Object.freeze({status,red:null});
 signal?.throwIfAborted();
 if(!load||load.telescope!==opticalIndex)return no('no-load');
 let field;
 try{
  const {loadSkyField}=await import('../io/skyField');
  field=await loadSkyField({view:'telescope',anchor:load.anchor,telescope:load.telescope,hidden:load.hidden,currentJd:load.currentJd,finderMagnitudeLimit:UNUSED_FINDER_LIMIT,...(signal?{signal}:{})});
 }catch(e){if(signal?.aborted)throw e;return no('field');}
 if(field.status!=='ready')return no(field.reason==='object-x-hidden'||field.reason==='object-x-unreadable'?'object-x':'field');
 const {widthArcminutes,heightArcminutes}=cameraPreparationReference('ccd',opticalIndex);
 const source=cameraOverlaySource({anchor:field.anchor,galaxyIds:field.population.galaxies.map(g=>g.id),galaxyRed:field.galaxyRed??null,unpaintedGalaxies:field.unpaintedGalaxies??0},pointing,widthArcminutes,heightArcminutes);
 return source.status==='ready'?Object.freeze({status:'run',red:source.red}):no(source.status==='off'?'off':source.reason);
}
