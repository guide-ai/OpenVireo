import{projectResource}from'./projectMetadata';
import {photometerTelescopeTargets,type PhotometerTelescopeIndex} from './photometerTelescope';
import {LEGACY_PHOTOMETER_APERTURES} from './photometerAperture';
import packetSource from '../../data/photometry/integration-provenance.json';
const packet=projectResource(packetSource);

import {buildPinnedPleiadesUbvField,type PhotometerFilter} from './photometerUbvField';
import {PLEIADES_PHOTOMETER_TARGETS,isPhotometerTarget,isTiledPhotometerTarget,type PleiadesFieldKind} from './photometerField';
import {poissonDraw,randomDraw} from './acquisition';
import {MAX_PHOTOMETER_COUNT} from './photometryReduction';
export const PHOTOMETER_INTEGRATION_SHA256='b11fcc556da1011dc89b0c6e66c143d0f9fae3f6de653538daa4a4e38cf2fab0';
export const PHOTOMETER_SECONDS=Object.freeze(packet.native.seconds),PHOTOMETER_REPEATS=Object.freeze(packet.native.integrations);
export const MAX_PHOTOMETER_CALLBACKS_PER_READING=packet.browserPolicy.maximumCallbacksPerReading;
export const PHOTOMETER_CALLBACK_MS=packet.native.timerIntervalMS,MAX_PHOTOMETER_GAP_MS=packet.browserPolicy.maximumCallbackGapMS,MAX_PHOTOMETER_CALLBACKS=packet.browserPolicy.maximumCallbacksPerSession;
export const TIMED_PHOTOMETER_POLICY='OpenVireo-Pleiades-timed-observing-v4';
export type PhotometerTiming=Readonly<{secondsPerIntegration:number;integrations:number}>;
export const LEGACY_PHOTOMETER_TIMING=Object.freeze({secondsPerIntegration:.1,integrations:1});
export class PhotometerIntegrationError extends Error{constructor(readonly code:'settings'|'phase'|'limit'|'counts'){super(`Photometer integration: ${code}`);this.name='PhotometerIntegrationError';}}
export function photometerTiming(secondsPerIntegration:number,integrations:number):PhotometerTiming{if(!PHOTOMETER_SECONDS.includes(secondsPerIntegration)||!PHOTOMETER_REPEATS.includes(integrations))throw new PhotometerIntegrationError('settings');return Object.freeze({secondsPerIntegration,integrations});}
export function requiredPhotometerCallbacks(t:PhotometerTiming){photometerTiming(t.secondsPerIntegration,t.integrations);return t.secondsPerIntegration*1000/PHOTOMETER_CALLBACK_MS*t.integrations;}
const brand:unique symbol=Symbol('pinned-photometer-integration');
export type PhotometerIntegration=Readonly<{[brand]:true;timing:PhotometerTiming;kind:PleiadesFieldKind;filter:PhotometerFilter;targetId:string;telescopeIndex?:PhotometerTelescopeIndex;apertureSelector?:number;initialSeed:number;seed:number;callbacks:number;sourceCount:number;skyCount:number;totalPhotonCount:number;draws:number;nativeBaseCountSum:number;periodCounts:readonly number[];periodCount:number}>;
// Native source+sky amplitudes are prepared before callback draws; this memo is not a native dynamic cache or an admission of
// arbitrary pointing/seeing/calibration. Front P2: with five filters and apertures 5..150 the Pleiades configurations
// (48 × 2 × 5 × 146 = 70,080) no longer fit a fixed map, so this cache keeps the earlier size (2 pointings × U/B/V × 5/10/15
// per admitted target) and drops its oldest entry; a dropped configuration is rebuilt when needed.
export const MAX_PHOTOMETER_CONFIGURATIONS=(PLEIADES_PHOTOMETER_TARGETS.length+photometerTelescopeTargets(1).length+photometerTelescopeTargets(2).length)*2*3*LEGACY_PHOTOMETER_APERTURES.length;
const configurations=new Map<string,ReturnType<typeof buildPinnedPleiadesUbvField>>();
/** G3 review 1 L5: tiled configurations are not Pleiades-sized; they live in their own bounded cache (oldest out) and are
 * rebuilt from the registered frame when needed, so any number of telescope pointings can be integrated. */
export const MAX_TILED_PHOTOMETER_CONFIGURATIONS=256;
const tiledConfigurations=new Map<string,ReturnType<typeof buildPinnedPleiadesUbvField>>();
function configuration(kind:PleiadesFieldKind,filter:PhotometerFilter,targetId:string,apertureSelector=10,telescopeIndex:PhotometerTelescopeIndex=0){if(!isPhotometerTarget(targetId)&&!isTiledPhotometerTarget(targetId))throw new PhotometerIntegrationError('settings');const key=`${kind}:${filter}:${targetId}:${apertureSelector}:${telescopeIndex}`,old=configurations.get(key)??tiledConfigurations.get(key);if(old)return old;const c=buildPinnedPleiadesUbvField(kind,filter,targetId,apertureSelector,telescopeIndex);
 if(isTiledPhotometerTarget(targetId)){tiledConfigurations.set(key,c);while(tiledConfigurations.size>MAX_TILED_PHOTOMETER_CONFIGURATIONS)tiledConfigurations.delete(tiledConfigurations.keys().next().value!);return c;}
 configurations.set(key,c);while(configurations.size>MAX_PHOTOMETER_CONFIGURATIONS)configurations.delete(configurations.keys().next().value!);return c;}
export function createPhotometerIntegration(timing:PhotometerTiming,kind:PleiadesFieldKind,filter:PhotometerFilter,targetId:string,seed:number,apertureSelector=10,telescopeIndex:PhotometerTelescopeIndex=0):PhotometerIntegration{const t=photometerTiming(timing.secondsPerIntegration,timing.integrations);randomDraw(seed);configuration(kind,filter,targetId,apertureSelector,telescopeIndex);return Object.freeze({[brand]:true as const,timing:t,kind,filter,targetId,...(telescopeIndex!==0?{telescopeIndex}:{}),...(apertureSelector!==10?{apertureSelector}:{}),initialSeed:seed,seed,callbacks:0,sourceCount:0,skyCount:0,totalPhotonCount:0,draws:0,nativeBaseCountSum:0,periodCounts:Object.freeze([]),periodCount:0});}
/** Exact executed-callback fold. No elapsed wall time is converted to photons;
 * integer nominal duration is a browser policy,not native x87 threshold proof. */
export function advancePhotometerIntegration(s:PhotometerIntegration,callbacks:number):PhotometerIntegration{
 if(s?.[brand]!==true)throw new PhotometerIntegrationError('phase');const required=requiredPhotometerCallbacks(s.timing);
 if(!Number.isSafeInteger(callbacks)||callbacks<1||callbacks>MAX_PHOTOMETER_CALLBACKS_PER_READING||callbacks>required-s.callbacks)throw new PhotometerIntegrationError('limit');
 const c=configuration(s.kind,s.filter,s.targetId,s.apertureSelector??10,s.telescopeIndex??0),perPeriod=s.timing.secondsPerIntegration*1000/PHOTOMETER_CALLBACK_MS;let seed=s.seed,sourceCount=s.sourceCount,skyCount=s.skyCount,draws=s.draws,periodCount=s.periodCount;const periodCounts=[...s.periodCounts];
 for(let i=1;i<=callbacks;i++){const source=poissonDraw(c.sourceMean,seed),sky=poissonDraw(c.skyMean,source.seed);seed=sky.seed;sourceCount+=source.value;skyCount+=sky.value;draws+=source.draws+sky.draws;periodCount+=source.value+sky.value;if(sourceCount+skyCount>MAX_PHOTOMETER_COUNT||periodCount>MAX_PHOTOMETER_COUNT)throw new PhotometerIntegrationError('counts');if((s.callbacks+i)%perPeriod===0){periodCounts.push(periodCount);periodCount=0;}}
 return Object.freeze({...s,seed,callbacks:s.callbacks+callbacks,sourceCount,skyCount,totalPhotonCount:sourceCount+skyCount,draws,nativeBaseCountSum:(s.callbacks+callbacks)*packet.native.basePhotonsPerCallback,periodCounts:Object.freeze(periodCounts),periodCount});
}
/** Resource preflight before any replay draw;adjacent callback records can be
 * compacted but cannot hide unbounded replay cost. Legacy complete=one draw pair. */
export function photometerReplayCallbacks(events:readonly {type:string;callbacks?:number}[]){let count=0;for(const e of events){if(e?.type==='advance'){const n=e.callbacks;if(typeof n!=='number'||!Number.isSafeInteger(n)||n<1||n>MAX_PHOTOMETER_CALLBACKS_PER_READING)throw new PhotometerIntegrationError('limit');count+=n;}else if(e?.type==='complete')count++;if(count>MAX_PHOTOMETER_CALLBACKS)throw new PhotometerIntegrationError('limit');}return count;}

/** Pure browser-clock admission,independent of React and photon sampling.
 * Whole monotonic milliseconds;hidden release wins over an unavailable clock. */
export function admitPhotometerCallback(lastMS:number,nowMS:number,hidden:boolean):'advance'|'stop'|'release'{if(hidden)return 'release';if(!Number.isSafeInteger(lastMS)||!Number.isSafeInteger(nowMS)||lastMS<0||nowMS<lastMS||nowMS-lastMS>MAX_PHOTOMETER_GAP_MS)return 'stop';return 'advance';}
