import data from '../../data/sky/catalog.json';
import {GALAXY_TARGETS} from './galaxyIdentity';
import type {SkyObject} from './sky';
export const SUPPORTED_STAR_POINT=Object.freeze({ra:.4987684,dec:.03628});
export type TargetGroupKey='continuity.supportedTarget'|'sky.suggested'|'sky.hubble'|'sky.allTargets';
/** Existing navigation identities; injected display strings do not change source aliases or coordinates. */
export function buildTargetCatalog(labels:{star:string;galaxy:(id:string,label:string)=>string}){
 const supportedStar:SkyObject={id:'N0000.DAT@14428',label:labels.star,sourceLabel:'N0000.DAT@14428',...SUPPORTED_STAR_POINT,image:null,spectrum:null};
 const supportedGalaxies:readonly SkyObject[]=GALAXY_TARGETS.map(g=>({id:`${g.id}-acquisition`,label:labels.galaxy(g.id,g.label),sourceLabel:`${g.id} ${g.label}`,ra:g.ra,dec:g.dec,image:null,spectrum:null}));
 const catalog:readonly SkyObject[]=[...data,supportedStar,...supportedGalaxies];
 const suggestions=['NGC3031','NGC3034','NGC5194','NGC598','NGC4889'];
 const groups:readonly {key:TargetGroupKey;items:readonly SkyObject[]}[]=[
  {key:'continuity.supportedTarget',items:[supportedStar,...supportedGalaxies]},
  {key:'sky.suggested',items:suggestions.map(id=>catalog.find(o=>o.id===id)!)},
  {key:'sky.hubble',items:catalog.filter(o=>o.hotList&&!suggestions.includes(o.id))},
  {key:'sky.allTargets',items:catalog.filter(o=>!o.hotList&&!suggestions.includes(o.id)&&o.id!==supportedStar.id&&!supportedGalaxies.some(g=>g.id===o.id))}
 ];
 return {catalog,supportedStar,supportedGalaxies,groups};
}
