import type {FieldPopulation} from '../core/fieldEngine';
import type {Pointing} from '../core/sky';
import {nativeFieldCacheHolds} from '../core/fieldCache';

/** G2 review 1 R1: VIREO's loaded field object (0x5b5b30). The Edit Mode layer publishes the field it loaded and drew; the Star
 * Data List (StarList1Click 0x5404e0 → 0x534e18) writes its lines from that same object while the view stays inside the cached
 * area (0x53af28), and builds at the pointing otherwise. */
export type LoadedField=Readonly<{anchor:Pointing;population:FieldPopulation}>;
let loaded:LoadedField|null=null;
export function setLoadedField(f:LoadedField|null){loaded=f;}
export function loadedFieldAt(pointing:Pointing):LoadedField|null{return loaded&&nativeFieldCacheHolds(loaded.anchor,pointing)?loaded:null;}
