// Bundled bounded LSS field packs (data/lss/lss-field-0N.json; user approval of 2026-10-27 in AGENTS.md: bounded N2230/N3000
// subsets for the LSS strip with their read witnesses). Each pack is a separate lazily loaded module chunk, decoded and
// bounds-checked by core/fieldPack.ts before the field engine reads it. Nothing is fetched from elsewhere or persisted.
import {decodeFieldPack,type FieldPack} from '../core/fieldPack';
import type {LssFieldNumber} from '../core/lssFields';
const loaders:Record<LssFieldNumber,()=>Promise<{default:unknown}>>={
 1:()=>import('../../data/lss/lss-field-01.json'),2:()=>import('../../data/lss/lss-field-02.json'),3:()=>import('../../data/lss/lss-field-03.json'),
 4:()=>import('../../data/lss/lss-field-04.json'),5:()=>import('../../data/lss/lss-field-05.json'),6:()=>import('../../data/lss/lss-field-06.json'),
 7:()=>import('../../data/lss/lss-field-07.json'),8:()=>import('../../data/lss/lss-field-08.json'),9:()=>import('../../data/lss/lss-field-09.json'),
};
const cache=new Map<LssFieldNumber,FieldPack>();
export async function loadLssPack(field:LssFieldNumber):Promise<FieldPack>{
 const hit=cache.get(field);if(hit)return hit;
 const pack=decodeFieldPack((await loaders[field]()).default);
 if(pack.id!==`lss-field-0${field}`)throw new RangeError('pack');
 cache.set(field,pack);return pack;
}
