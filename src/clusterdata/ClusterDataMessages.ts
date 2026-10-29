/** Web texts of Front K (docs/CLUSTER-DATA-DIALOGS.md). Original literals stay in core/clusterDialog.ts. */
export const CLUSTER_DATA_MESSAGES=Object.freeze({
 menuNote:'VIREO shows File › Cluster Data... in its photometry, HR-diagram and all-instruments modes; this site has no modes, so it is always here.',
 groupsDisabled:'Type of Listing and Sort By are instructor (Edit Mode) settings in VIREO; without Edit Mode the list is the student finding list, sorted by RA.',
 useTelescopeOff:'Use Telescope Coordinates needs the dome open and tracking on, as VIREO needs the telescope drive on.',
 loading:'Loading the cluster data…',loadError:'The cluster data could not be loaded.',
 unavailableCaption:'Cluster Data',
 unavailable:'This list cannot be made here: VIREO searches its full Guide Star Catalog around any centre, and only the 16 published cluster fields are on this site. Choose a cluster with File › View/Select Cluster from List (keep its centre and diameter) to see its list.',
 spectral:'This list cannot be shown: a spectral code of this field has no recovered text.',
 editModeColumns:'Edit Mode: VIREO also lists each cluster’s main-sequence turn-off colour, distance, distance modulus and age; those catalogue values are not published on this site, so only E(B−V) is shown.',
 saveListUnavailable:'Save List is not available here: VIREO writes the whole 102-byte cluster records, which include catalogue values this site does not publish.',
 noSelection:'Select a cluster row first (left click).',
 reportNote:'The list is VIREO’s query of the published cluster field at the dialog’s centre and diameter (checked offline to give exactly the published stars), filtered by the magnitude limit.',
 emptyField:'No stars of this field are as bright as the magnitude limit. VIREO answered with the box above and kept its previous list; this site shows no list.',
 emptyUnknown:'No published star of this field is as bright as the magnitude limit. VIREO may have listed none or answered “No Stars Found in Field!”, depending on catalogue stars this site does not publish, so no list is shown.',
 listModal:'Web adaptation: VIREO shows this list as a separate window beside the dialog; here it opens on top of it.',
 listNote:'Double-click a row (or Get Selection Data) to copy it into Cluster Data Parameters; right-click a selected row for the hot-list items.',
 printNote:'Web adaptation: a print preview of the list; VIREO prints landscape in Edit Mode and portrait otherwise.',
});
