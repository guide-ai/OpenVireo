import {decodeSessionNumber as number} from './sessionNumber';
import type {ClockDriveWorkspace} from './clockDrive';
import type {SiteClockWorkspace} from './siteClock';
import catalog from '../../data/sky/catalog.json';
import {GALAXY_TARGETS,knownGalaxyTarget} from './galaxyIdentity';
import {validatePointing,type FieldMode,type Pointing} from './sky';
import type {JournalState} from './exposureJournal';
export const OBSERVING_EDITION=Object.freeze({program:'VIREO',version:'1.504',binarySHA256:'781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c'});
export const OBSERVING_SKY_POLICY='OpenVireo-stopped-observing-workspace-v8';
export const OBSERVING_ACCESS_POLICY='OpenVireo-stopped-observing-workspace-v7';
export const OBSERVING_DRIVE_POLICY='OpenVireo-stopped-observing-workspace-v6';
export const OBSERVING_CLOCK_POLICY='OpenVireo-stopped-observing-workspace-v5';
export const OBSERVING_MAYALL_POLICY='OpenVireo-stopped-observing-workspace-v4';
export const OBSERVING_GALAXY_POLICY='OpenVireo-stopped-observing-workspace-v3';
export const OBSERVING_OPTICAL_POLICY='OpenVireo-stopped-observing-workspace-v2';
export const OBSERVING_POLICY='OpenVireo-stopped-observing-workspace-v1';
export const LIVE_GALAXY_IDS=['36747','36773','54876']as const;
export type LiveGalaxyId=typeof LIVE_GALAXY_IDS[number];
/** Cached-pan targets (corbor-cached-provenance.json), 0.4 m banks only; carried by the v24 analysis-session wrapper. */
export const CACHED_GALAXY_IDS=['54875','54891']as const;
export type CachedGalaxyId=typeof CACHED_GALAXY_IDS[number];
export function isCachedGalaxyId(id:unknown):id is CachedGalaxyId{return typeof id==='string'&&(CACHED_GALAXY_IDS as readonly string[]).includes(id);}
/** Pegasus targets (fresh NGC 7501 and its cached NGC 7499/7503 views), 0.4 m banks only; carried by the v25 wrapper. */
export const PEGASUS_GALAXY_IDS=['NGC 7499','NGC 7501','NGC 7503']as const;
export type PegasusGalaxyId=typeof PEGASUS_GALAXY_IDS[number];
export function isPegasusGalaxyId(id:unknown):id is PegasusGalaxyId{return typeof id==='string'&&(PEGASUS_GALAXY_IDS as readonly string[]).includes(id);}
export type ExposureWorkspace=Readonly<{state:JournalState|null;seedText:string}>;
export type ObservatoryWorkspace=Readonly<{domeOpen:boolean;mode:FieldMode;selectedId:string;pointing:Pointing;raText:string;decText:string;hasPointed:boolean;galaxyTargetId:string}>;
export type ObservingWorkspace=Readonly<{sky09?:ExposureWorkspace;sky4m?:ExposureWorkspace;operationalAccess?:true;clockDrive?:ClockDriveWorkspace;siteClock?:SiteClockWorkspace;context:ObservatoryWorkspace;sky:ExposureWorkspace;star:ExposureWorkspace;star09?:ExposureWorkspace;star4m?:ExposureWorkspace;galaxies4m?:Readonly<Record<LiveGalaxyId,ExposureWorkspace>>;galaxies09?:Readonly<Record<LiveGalaxyId,ExposureWorkspace>>;galaxies:Readonly<Record<LiveGalaxyId,ExposureWorkspace>>;cachedGalaxies?:Readonly<Record<CachedGalaxyId,ExposureWorkspace>>;pegasusGalaxies?:Readonly<Record<PegasusGalaxyId,ExposureWorkspace>>}>;
/** Whether the context or a cached bank uses a cached-pan target (so the session must be the v24 wrapper). */
export function observingUsesCachedGalaxies(w:Pick<ObservingWorkspace,'context'|'cachedGalaxies'>):boolean{
 return isCachedGalaxyId(w.context.galaxyTargetId)||CACHED_GALAXY_IDS.some(id=>w.context.selectedId===id+'-acquisition')||!!w.cachedGalaxies&&CACHED_GALAXY_IDS.some(id=>w.cachedGalaxies![id].state!==null||w.cachedGalaxies![id].seedText!=='1');
}
/** Whether the context or a Pegasus bank uses a Pegasus target (so the session must be the v25 wrapper). */
export function observingUsesPegasusGalaxies(w:Pick<ObservingWorkspace,'context'|'pegasusGalaxies'>):boolean{
 return isPegasusGalaxyId(w.context.galaxyTargetId)||PEGASUS_GALAXY_IDS.some(id=>w.context.selectedId===id+'-acquisition')||!!w.pegasusGalaxies&&PEGASUS_GALAXY_IDS.some(id=>w.pegasusGalaxies![id].state!==null||w.pegasusGalaxies![id].seedText!=='1');
}
export const emptyExposureWorkspace=():ExposureWorkspace=>Object.freeze({state:null,seedText:'1'});
const ids=new Set([...catalog.map(o=>o.id),'N0000.DAT@14428',...GALAXY_TARGETS.map(o=>o.id+'-acquisition')]);
export function workspaceRecord(value:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw new Error('Invalid observing workspace');return value as Record<string,unknown>;
}
export function seedDraft(value:unknown):string{if(typeof value!=='string'||value.length>80)throw new Error('Invalid seed draft');return value;}
/** These are unapplied UI drafts, never substituted for the valid pointing. */
function coordinateDraft(value:unknown):string{const text=seedDraft(value);if(text!==''&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))throw new Error('Invalid coordinate draft');return text;}
export function readObservatoryWorkspace(value:unknown):ObservatoryWorkspace{
 const r=workspaceRecord(value,['domeOpen','mode','selectedId','pointing','raText','decText','hasPointed','galaxyTargetId']),p=workspaceRecord(r.pointing,['ra','dec']);
 if(typeof r.domeOpen!=='boolean'||typeof r.hasPointed!=='boolean'||(r.mode!=='finder'&&r.mode!=='telescope')||typeof r.selectedId!=='string'||!ids.has(r.selectedId)||!knownGalaxyTarget(r.galaxyTargetId))throw new Error('Unsupported observing context');
 return Object.freeze({domeOpen:r.domeOpen,mode:r.mode,selectedId:r.selectedId,pointing:Object.freeze(validatePointing(number(p.ra),number(p.dec))),raText:coordinateDraft(r.raText),decText:coordinateDraft(r.decText),hasPointed:r.hasPointed,galaxyTargetId:r.galaxyTargetId});
}
