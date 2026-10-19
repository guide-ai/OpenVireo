import {readClusterSelectionWorkspace,validateSelectionSource,type ClusterSelectionWorkspace} from '../core/clusterSelection';
import type {ClusterDatasetId} from '../core/clusterComparison';
import {loadClusterDataset} from './clusterComparison';
/** No imported dataset URL/value cache isaccepted. All represented reference sources verify before commit. */
export async function admitClusterSelection(value:unknown):Promise<ClusterSelectionWorkspace>{const w=readClusterSelectionWorkspace(value);await Promise.all(Object.keys(w.comparison.notebooks).map(async id=>validateSelectionSource(w,await loadClusterDataset(id as ClusterDatasetId))));return w;}
