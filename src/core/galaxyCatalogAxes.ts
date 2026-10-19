import {galaxyInstrumentMagnitude} from './galaxyCalibration';
import type {NativeGalaxy} from './pinnedGalaxyField';
/**0x53b94c,0x5943d4,0x599324 and0x55ea94. Supplied axes or the
 * observed zero/zero morphology0 branch only; RA-fraction cases stay closed.
 * The zero-minor substitution is Extended/Number, never narrowed to Single. */
export function galaxyCatalogAxes(g:NativeGalaxy){
 const major=Math.fround(g.majorArcminutes),minor=Math.fround(g.minorArcminutes);
 if(!Number.isFinite(major)||!Number.isFinite(minor)||major<0||minor<0)throw Error('Invalid galaxy axes.');
 if(major>0&&minor>0)return Object.freeze({major,minor,ratio:minor/major,fallback:false});
 if(major!==0||minor!==0||g.morphology!==0)throw Error('Unsupported galaxy axis fallback.');
 return Object.freeze({major:.5,minor:.5*.6,ratio:.6,fallback:true});
}
export function catalogGalaxyMagnitude(g:NativeGalaxy){
 const axes=galaxyCatalogAxes(g);
 if(!axes.fallback)return galaxyInstrumentMagnitude({apparentMagnitude:g.magnitude,majorArcminutes:g.majorArcminutes,minorArcminutes:g.minorArcminutes});
 const apparentMagnitude=Math.fround(g.magnitude),area=((Math.PI*axes.major)*axes.minor)/4,magnitude=Math.log10(area)*2.5+apparentMagnitude;
 if(!Number.isFinite(magnitude))throw Error('Invalid galaxy magnitude.');
 return Object.freeze({magnitude,area,apparentMagnitude,majorArcminutes:axes.major,minorArcminutes:axes.minor});
}
