// E08 Object X camera images: the FITS bytes the lab writes for an image (same writer and context as the camera's Save image)
// and, for an exposure whose catalogue came from a bundled static extract, an offline replay of the whole image from its
// recipe (review 2 M3). The replay mirrors CameraControl: the recovered query reference and route, the bounded VOTable reader
// and selection, then the composer, all through the camera Worker's pure core. Live-catalogue exposures cannot be replayed
// offline (the response is not stored), and callers label them so.
import {compiledCameraQueryReference} from '../core/cameraQueryReference';
import {vizierRouteForCamera} from '../core/vizierNomad';
import {cameraCatalogReference} from '../core/cameraCatalogReference';
import {writeCameraFits,type CameraFitsContext} from '../core/fitsWriter';
import {composeCameraExposure,type CameraExposure,type CameraExposureRecipe,type CameraExtraSource} from '../core/cameraExposure';
import type {VizierSelection} from '../core/vizierNomad';
import type {ObjectXSkipReason} from './objectXInvestigation';
import {exposureFromWorker,handleCameraWorkerRequest,type CameraWorkerState} from '../camera/cameraWorkerCore';
import {loadCameraCatalog,type CameraCatalogOptions,type CameraCatalogSource} from './cameraCatalog';

export function objectXFitsBytes(exposure:CameraExposure,jd:number,catalogName:string,source:Pick<CameraCatalogSource,'mode'|'sha256'|'extractId'|'url'>):Uint8Array{
 const context:CameraFitsContext={jd,filterName:cameraCatalogReference(exposure.recipe.camera,exposure.recipe.filterPosition).filter,catalogName,
  source:{mode:source.mode,sha256:source.sha256,extractId:source.extractId,url:source.url}};
 return writeCameraFits(exposure,context);
}
/** QA1 closure E1: the moving-pair skip reasons of an exposure, recomputed from its recipe and pairs. The composer projects the
 * moving pairs first in its private stream and decides their skips without the catalogue, so an empty selection gives the
 * reasons the exposure had. */
export async function movingPairSkips(e:Readonly<{telescope:0|1|2;filter:number;seconds:number;gain:number;ra:number;dec:number;seed:number}>,extras:readonly CameraExtraSource[]):Promise<readonly ObjectXSkipReason[]>{
 const empty={catalog:null,bounds:null,selectedEntries:[],nativeMinimumMagnitude:25,nativeMaximumMagnitude:-2} as unknown as VizierSelection;
 const x=composeCameraExposure({camera:'ccd',opticalIndex:e.telescope,filterPosition:e.filter,seconds:e.seconds,gain:e.gain,centerRaHours:e.ra,centerDecDegrees:e.dec,seed:e.seed},empty,extras);
 return Object.freeze(x.skipped.map(k=>k.reason));
}
export type StaticReplay=Readonly<{ok:true;fits:Uint8Array;catalogSha256:string;extractId:string|null}>|Readonly<{ok:false;reason:string}>;
/** Recomposes a static-catalogue exposure and returns the FITS bytes the lab would have written. */
export async function replayStaticExposure(recipe:CameraExposureRecipe,jd:number,extras:readonly CameraExtraSource[],options:CameraCatalogOptions={}):Promise<StaticReplay>{
 const reference=compiledCameraQueryReference('ccd',recipe.opticalIndex,recipe.filterPosition,{centerRAHours:recipe.centerRaHours,centerDecDegrees:recipe.centerDecDegrees,selectionMagnitudeLimit:21.5,suppliedDateDouble:jd,dateBias:0});
 const route=vizierRouteForCamera('ccd',recipe.filterPosition);
 const loaded=await loadCameraCatalog({catalog:route.catalog,raHours:recipe.centerRaHours,decDegrees:recipe.centerDecDegrees,radiusDegrees:reference.searchRadiusDegrees},'static',options);
 if(!loaded.ok)return {ok:false,reason:loaded.failure};
 const state:CameraWorkerState={selection:null};
 const parsed=handleCameraWorkerRequest(state,{type:'parse',bytes:loaded.bytes,context:{catalog:route.catalog,band:route.band,epochOffsetYears:reference.epochOffsetYears,queryBrightMagnitude:reference.queryBrightMagnitude,queryFaintMagnitude:reference.queryFaintMagnitude},magnitudeLimit:reference.selectionMagnitudeLimit}).reply;
 if(parsed.type!=='parsed'||!parsed.ok)return {ok:false,reason:'catalog'};
 const composed=handleCameraWorkerRequest(state,{type:'compose',recipe,extras}).reply;
 if(composed.type!=='composed'||!composed.ok)return {ok:false,reason:'preparation'};
 return {ok:true,fits:objectXFitsBytes(exposureFromWorker(composed.exposure),jd,route.catalogName,loaded.source),catalogSha256:loaded.source.sha256,extractId:loaded.source.extractId};
}
