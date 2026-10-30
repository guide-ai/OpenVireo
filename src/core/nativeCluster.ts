import {pleiadesPoints} from './pleiadesAnalysis';
import type {PhotometerState} from './photometer';
import {NativeClusterError,nativeClusterValues,type NativeClusterParameters,type NativeClusterFit} from './nativeClusterParameters';
// Front D3: everything except the fit confirmation (which needs the Pleiades field data) lives in nativeClusterParameters.ts.
export * from './nativeClusterParameters';
export function confirmNativeCluster(s:PhotometerState,p:NativeClusterParameters):NativeClusterFit{
 const points=pleiadesPoints(s);if(s.phase==='running'||points.length<2)throw new NativeClusterError();return Object.freeze({modulusTicks:p.modulusTicks+0,ebvTicks:p.ebvTicks+0,ageIndex:p.ageIndex+0,modelIndex:p.modelIndex+0,offsetTicks:p.offsetTicks+0,extinctionCorrected:p.extinctionCorrected,interpretation:p.interpretation,...nativeClusterValues(p),points});
}
