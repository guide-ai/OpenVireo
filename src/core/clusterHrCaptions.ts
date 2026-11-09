/** Front ES7: VIREO's own captions, menu items and message-box pieces for the cluster HR windows (help viewer, Possible Cluster
 * Member, HR Print, Select Cluster Data and Display/Print Data), copied from CLEA_VEO.exe (research analysis/front-v2-cluster-hr/).
 * They stay byte-exact here; a render site opts in to the Spanish with `vireo(CLUSTER_HR_CAPTIONS.x)` (docs/I18N.md). The
 * `…Head`/`…Tail` pieces surround a run-time value (a file name, a topic title) in one message. */
export const CLUSTER_HR_CAPTIONS=Object.freeze({
 // Help viewer (THelpLstDlg / THelpWin)
 topicFileCaption:'Help Not Available',// THelpWin 0x59f297
 topicFileMissingHead:'Cannot Access Help File ',topicFileMissingTail:'\r\n\r\nFile Not Found!',
 topicListCaption:'Select Help Topic',topicsMenu:'Topics',findTopic:'Find Topic...',readTopic:'Read/Print Topic...',closeTopics:'Close Help Topics',
 topicMenu:'Topic',printTopic:'Print Topic...',searchText:'Search Text...',showTopics:'Show Help Topics...',closeTopic:'Close Topic Window',back:'Back',
 findTopicCaption:'Find Help Topic',findItemCaption:'Find Help Item',notFoundCaption:'String Not Found',headingCaption:'Topic Heading',
 topicNotFoundCaption:'Topic Not Found',topicNotFoundHead:'Help Topic: ',topicNotFoundTail:'\r\n\r\nHelp on this topic is not available at this time.',
 // Possible Cluster Member (TClstrStrForm1)
 memberItemMenu:'Item',memberAddHotList:'Add to Hot List',memberRemove:'Remove from HR Diagram',memberExit:'Exit',
 memberName:'Cluster Name:',memberId:'ID #:',memberRa:'RA:',memberDec:'Dec:',memberV:'V:',memberBmV:'B-V:',memberUmB:'U-B:',memberSp:'Spectral Type:',
 // HR Print (File › Print) and the Select Cluster Data / Display/Print Data windows
 hrPrint:'Print',
 selectCluster:'Select Cluster Data...',displayData:'Display/Print Data',
 // THRDisplayForm1 menu items (DFM, research analysis/claude-audit-2026-10-26/veo-forms.json): File › Load/Plot and Tools › View/Print
 // Parameters, the headings of the observation HR tool's sections and of the database route's parameter report.
 loadPlot:'Load/Plot',viewPrintParameters:'View/Print Parameters',
 listMenu:'List',searchItem:'Search...',printItem:'Print...',saveList:'Save List...',closeItem:'Close',
 commaDelimit:'Comma Delimit',information:'Information',yes:'Yes',no:'No'});
