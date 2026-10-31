/** Front H2: the catalogue target of a galaxy acquisition as RecordZ1Click copies it into the observation record: its RA/Dec
 * (target +0x31/+0x3b) and, in mode 4, its magnitude when below 99 (+0x45, 0x583a40..0x583a6b). */
import {galaxyStateDefinition} from '../core/galaxyDefinitions';
import type {GalaxyObservation} from './galaxyObservation';
export function hubbleObservationTarget(a:GalaxyObservation):Readonly<{id:string;ra:number;dec:number;magnitude:number;vMagnitude:number|null}>{
 const t=galaxyStateDefinition(a.state).target,magnitude=Math.fround(t.magnitude);
 return Object.freeze({id:t.id,ra:t.ra,dec:t.dec,magnitude,vMagnitude:magnitude<99?magnitude:null});
}
