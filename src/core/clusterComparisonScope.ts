import type {ClusterSelectionWorkspace} from './clusterSelection';
import type {ClusterDatabaseWorkspace} from './clusterDatabase';
import type {ClusterComparisonWorkspace,ClusterNotebook} from './clusterComparison';
/** Typed scope transformations take owner-validated inputs. They preserve the owners' invariants without importing scientific payloads into the application shell. */
export function legacyClusterNotebook(legacy:ClusterDatabaseWorkspace):ClusterNotebook{return Object.freeze({draft:legacy.draft,draftReddeningSource:legacy.draftReddeningSource==='catalog-m67'?'catalog':'manual',fit:legacy.fit?Object.freeze({parameters:legacy.fit.parameters,reddeningSource:legacy.fit.reddeningSource==='catalog-m67'?'catalog' as const:'manual' as const}):null});}
export function comparisonHasLegacyScope(w:ClusterComparisonWorkspace):boolean{return(w.pendingId===''||w.pendingId==='m67')&&(w.activeId===null?Object.keys(w.notebooks).length===0:w.activeId==='m67'&&Object.keys(w.notebooks).length===1&&!!w.notebooks.m67);}
export function legacyScopeFromComparison(w:ClusterComparisonWorkspace):ClusterDatabaseWorkspace{
 if(!comparisonHasLegacyScope(w))throw new Error('Comparison needs the full scope');const b=w.notebooks.m67;return Object.freeze({pendingId:w.pendingId as ''|'m67',loaded:w.activeId==='m67',draft:b?.draft??null,draftReddeningSource:b?.draftReddeningSource==='catalog'?'catalog-m67':'manual',fit:b?.fit?Object.freeze({parameters:b.fit.parameters,reddeningSource:b.fit.reddeningSource==='catalog'?'catalog-m67' as const:'manual' as const}):null});
}
/** Restore only the represented M67 scope;other dataset notebooks/drafts survive old19. */
export function mergeLegacyClusterComparison(current:ClusterComparisonWorkspace,legacy:ClusterDatabaseWorkspace):ClusterComparisonWorkspace{
 const notebooks={...current.notebooks};if(legacy.loaded)notebooks.m67=legacyClusterNotebook(legacy);else delete notebooks.m67;
 const activeId=legacy.loaded?'m67':current.activeId==='m67'?null:current.activeId,pendingId=legacy.pendingId==='m67'?'m67':current.pendingId!=='m67'?current.pendingId:'';
 return Object.freeze({pendingId,activeId,notebooks:Object.freeze(notebooks)});
}

/** Old19represents the whole M67source scope;its fits cannot inherit newer exclusions. Other dataset scopes survive. */
export function mergeLegacyClusterSelection(current:ClusterSelectionWorkspace,legacy:ClusterDatabaseWorkspace):ClusterSelectionWorkspace{const excluded={...current.excluded},picked={...current.picked};delete excluded.m67;delete picked.m67;return Object.freeze({comparison:mergeLegacyClusterComparison(current.comparison,legacy),excluded:Object.freeze(excluded),picked:Object.freeze(picked)});}
