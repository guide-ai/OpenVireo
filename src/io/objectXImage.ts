// E08 Object X camera images: the FITS bytes the lab writes for an image (same writer and context as the camera's Save image)
// and, for an exposure whose catalogue came from a bundled static extract, an offline replay of the whole image from its
// recipe (review 2 M3). The replay mirrors CameraControl: the recovered query reference and route, the bounded VOTable reader
// and selection, then the composer, all through the camera Worker's pure core. Live-catalogue exposures cannot be replayed
// offline (the response is not stored), and callers label them so.
import {compiledCameraQueryReference} from '../core/cameraQueryReference';
import {vizierRouteForCamera} from '../core/vizierNomad';
import {cameraCatalogReference} from '../core/cameraCatalogReference';
import {writeCameraFits,type CameraFitsContext} from '../core/fitsWriter';
import type {CameraExposure,CameraExposureRecipe,CameraExtraSource} from '../core/cameraExposure';
import {exposureFromWorker,handleCameraWorkerRequest,type CameraWorkerState} from '../camera/cameraWorkerCore';
import {loadCameraCatalog,type CameraCatalogOptions,type CameraCatalogSource} from './cameraCatalog';
import {cameraRegionRecord,cameraRegionSelection} from '../core/cameraRegion';

export function objectXFitsBytes(exposure:CameraExposure,jd:number,catalogName:string,source:Pick<CameraCatalogSource,'mode'|'sha256'|'extractId'|'url'>):Uint8Array{
 const context:CameraFitsContext={jd,filterName:cameraCatalogReference(exposure.recipe.camera,exposure.recipe.filterPosition).filter,catalogName,
  source:{mode:source.mode,sha256:source.sha256,extractId:source.extractId,url:source.url}};
 return writeCameraFits(exposure,context);
}
export type StaticReplay=Readonly<{ok:true;fits:Uint8Array;catalogSha256:string;extractId:string|null}>|Readonly<{ok:false;reason:string}>;
/** Recomposes a static-catalogue exposure and returns the FITS bytes the lab would have written. */
/** Front C6: `fieldAnchor` is the exposure's region centre (cameraRegion.ts); null replays an exposure made before C6 with the whole
 * sky. Object X static exposures are all near ObjectX.HTL positions, where the field is masked, so they have no overlay. */
export async function replayStaticExposure(recipe:CameraExposureRecipe,jd:number,extras:readonly CameraExtraSource[],options:CameraCatalogOptions={},fieldAnchor:Readonly<{ra:number;dec:number}>|null=null):Promise<StaticReplay>{
 const reference=compiledCameraQueryReference('ccd',recipe.opticalIndex,recipe.filterPosition,{centerRAHours:recipe.centerRaHours,centerDecDegrees:recipe.centerDecDegrees,selectionMagnitudeLimit:21.5,suppliedDateDouble:jd,dateBias:0});
 const route=vizierRouteForCamera('ccd',recipe.filterPosition);
 const loaded=await loadCameraCatalog({catalog:route.catalog,raHours:recipe.centerRaHours,decDegrees:recipe.centerDecDegrees,radiusDegrees:reference.searchRadiusDegrees},'static',options);
 if(!loaded.ok)return {ok:false,reason:loaded.failure};
 const state:CameraWorkerState={selection:null};
 const parsed=handleCameraWorkerRequest(state,{type:'parse',bytes:loaded.bytes,context:{catalog:route.catalog,band:route.band,epochOffsetYears:reference.epochOffsetYears,queryBrightMagnitude:reference.queryBrightMagnitude,queryFaintMagnitude:reference.queryFaintMagnitude},magnitudeLimit:reference.selectionMagnitudeLimit,...(fieldAnchor?{bounds:cameraRegionSelection(cameraRegionRecord(fieldAnchor),reference.selectionMagnitudeLimit)}:{})}).reply;
 if(parsed.type!=='parsed'||!parsed.ok)return {ok:false,reason:'catalog'};
 const composed=handleCameraWorkerRequest(state,{type:'compose',recipe,extras}).reply;
 if(composed.type!=='composed'||!composed.ok)return {ok:false,reason:'preparation'};
 return {ok:true,fits:objectXFitsBytes(exposureFromWorker(composed.exposure),jd,route.catalogName,loaded.source),catalogSha256:loaded.source.sha256,extractId:loaded.source.extractId};
}
