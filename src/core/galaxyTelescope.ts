import mayall from '../../data/hubble/mayall-provenance.json';
import proof from '../../data/hubble/kpno09-galaxy-provenance.json';
import {JournalError,type JournalState} from './exposureJournal';
export const KPNO09_GALAXY_PROOF_SHA256='3e45415e61cb61faafde7a3abceb97d1390ae0d836a3e680816727e0b4b72cf6';
export function galaxyTelescopeIndex(s:JournalState):0|1|2{
 if(mayall.galaxies.some(r=>s?.policy===r.policyId))return 2;
 if(proof.records.some(r=>s?.policy===r.policyId))return 1;
 if(proof.records.some(r=>s?.policy===`openclea-pinned-galaxy-${r.id}-v1`))return 0;
 throw new JournalError('phase');
}
