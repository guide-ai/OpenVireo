/** Front V2 English strings for the cluster HR tools (self-contained, like VariableStarMessages). Captions, menu items and
 * message-box texts marked "VIREO" are copied from CLEA_VEO.exe (research analysis/front-v2-cluster-hr/); everything else is
 * web text. */
export const CLUSTER_HR_EN=Object.freeze({
 // Help (shared CLEA help viewer: THelpLstDlg / THelpWin)
 help:'Help',
 helpLoading:'Loading the VIREO help files…',
 helpLoadError:'The bundled VIREO help files could not be loaded or did not match their recorded size and SHA-256. Try again.',
 helpRetry:'Try again',
 helpAdaptation:'VIREO\'s own help (HRAnalHlp.TXT through its index HRAnalHlp.LST), shown in a web version of VIREO\'s help viewer. Window sizes, fonts and the system beep are not reproduced.',
 topicListCaption:'Select Help Topic',// VIREO
 topicsMenu:'Topics',// VIREO
 findTopic:'Find Topic...',// VIREO
 readTopic:'Read/Print Topic...',// VIREO
 closeTopics:'Close Help Topics',// VIREO
 topicMenu:'Topic',// VIREO
 printTopic:'Print Topic...',// VIREO
 searchText:'Search Text...',// VIREO
 showTopics:'Show Help Topics...',// VIREO
 closeTopic:'Close Topic Window',// VIREO
 back:'Back',// VIREO
 findTopicCaption:'Find Help Topic',// VIREO
 findItemCaption:'Find Help Item',// VIREO
 notFoundCaption:'String Not Found',// VIREO
 headingCaption:'Topic Heading',// VIREO
 topicNotFoundCaption:'Topic Not Found',// VIREO
 topicNotFound:(title:string)=>`Help Topic: ${title}\r\n\r\nHelp on this topic is not available at this time.`,// VIREO
 separatorNote:'No topic on this line (VIREO beeps here).',
 linkNote:'Double-click or press Enter on a title under "Related Topics" to open it. A blank line there does nothing here; VIREO stops with an error on it.',
 searchQuery:'Text to find',
 matchCase:'Match case',
 fromTop:'From top',
 fromCursor:'From cursor',
 cancel:'Cancel',
 ok:'OK',
 topicRows:'Help topics',
 topicText:'Topic text',
 // print preview (shared)
 printTitle:(caption:string)=>`Print — ${caption}`,
 printButton:'Print…',
 printClose:'Close preview',
 printError:'Printing is not available in this browser window.',
 printPlaceholder:'[student and lab text entered in VIREO: not recovered on this site]',
 helpPrintNote:'Print preview of what VIREO prints for a help topic: the date and time (here in your browser\'s format), the laboratory-table line, the student lines entered in VIREO (a placeholder here), the CLEA exercise title, the window caption and the topic rows. VIREO prints them on one page and drops rows that do not fit; page layout and fonts are not reproduced.',
});
export type ClusterHrMessages=typeof CLUSTER_HR_EN;
