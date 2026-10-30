/** Front V2 English strings for the cluster HR tools (self-contained, like VariableStarMessages). Captions, menu items and
 * message-box texts marked "VIREO" are copied from CLEA_VEO.exe (research analysis/front-v2-cluster-hr/); everything else is
 * web text. */
export const CLUSTER_HR_EN=Object.freeze({
 // Help (shared CLEA help viewer: THelpLstDlg / THelpWin)
 help:'Help',
 helpLoading:'Loading the VIREO help files…',
 helpLoadError:'The bundled VIREO help files could not be loaded or did not match their recorded size and SHA-256. Try again.',
 helpRetry:'Try again',
 helpAdaptation:(list:string)=>`VIREO's own help (its index ${list} and the text files it names), shown in a web version of VIREO's help viewer. Window sizes, fonts and the system beep are not reproduced.`,
 topicFileCaption:'Help Not Available',// VIREO (THelpWin 0x59f297)
 topicFileMissing:(file:string)=>`Cannot Access Help File ${file}\r\n\r\nFile Not Found!`,// VIREO (directory part not shown here)
 topicFileErrorCaption:'Help File Error',
 topicFileError:(file:string)=>`The bundled help file ${file} could not be loaded or did not match its recorded size and SHA-256. Try again.`,
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
 // database HR plot (Front V2 M2)
 dbDrawn:(drawn:number,inside:number,outsideDrawn:number,offImage:number)=>`# of Stars: ${drawn} (every included point, as in VIREO). Inside the axes: ${inside}. Outside the axes but still drawn, as VIREO does: ${outsideDrawn}. Outside VIREO's 496 × 506 picture (listed in the values table): ${offImage}.`,
 dbAxes:'The plot uses VIREO\'s fixed HR axes (V 2–18, B−V −0.5 to +2.5) on its 496 × 506 picture. Like VIREO, it does not clip points to the axes: a point outside them is drawn wherever it falls on the picture. All reference values remain in the values table. VIREO has no autoscaling. On narrow screens, scroll the plot horizontally.',
 dbFrameNote:'Recovered native plot (0x542480, 0x542bf4): 28 px per magnitude, 120 px per B−V magnitude, points rounded half to even from the stored Single values, the ZAMS kept only where its nodes are inside the axes (0x543940) and the isochrone not tested. The picture size 496 × 506 comes from the form layout. Fonts and the marker drawing are web choices.',
 outsideImage:'outside VIREO\'s picture',
 ebvGateNote:'VIREO\'s option "Set E(B-V)" (on by default) fixes the E(B−V) slider at this catalogue value whenever the ZAMS is shown for a database cluster (0x543a32). OpenVireo copies the value but lets you edit it.',
 testModeNote:'In VIREO the "Estimated Cluster Distance" line appears only in its Test Mode (option off by default; 0x543f43). OpenVireo shows it when you apply the extinction-corrected distance.',
 // Possible Cluster Member (TClstrStrForm1)
 memberItemMenu:'Item',// VIREO
 memberAddHotList:'Add to Hot List',// VIREO
 memberRemove:'Remove from HR Diagram',// VIREO
 memberExit:'Exit',// VIREO
 memberName:'Cluster Name:',memberId:'ID #:',memberRa:'RA:',memberDec:'Dec:',memberV:'V:',memberBmV:'B-V:',memberUmB:'U-B:',memberSp:'Spectral Type:',// VIREO
 memberNotPublished:'not published',
 memberDataNote:'Loading the star\'s catalogue ID, U−B and spectral type…',
 memberHotListUnavailable:'Add to Hot List is not available here.',
 memberHotListBusy:'The observation hot list is busy (a file is being read). Try again in a moment.',
 memberHotListRaUnsupported:'A right ascension of exactly 24 h cannot be stored in a hot list.',
 memberRemoveNote:'In VIREO, Remove from HR Diagram appears only in its Edit Mode (an instructor setting, off by default). OpenVireo keeps it as your own exclusion, which you can restore.',
 memberRemoved:'Removed from the HR diagram. Restore it with "Restore all excluded points".',
 memberAlreadyRemoved:'This star is already removed from the plot.',
 rightClickNote:'Like VIREO, right-click a star on the plot (or press and hold on a touch screen) to open "Possible Cluster Member". With the keyboard, choose a record below and press "Possible Cluster Member…".',
 memberOpen:'Possible Cluster Member…',
 observationDataUnavailable:'Display/Print Data is not available for your own photometer pairs: VIREO lists recorded observation records here ("Recorded Results"), and these pairs are not such records because the photometer Record writer is not ported. Save and load the observations as a DAT file to see the list.',
 // Front K2.1: observation-mode Display/Print Data (RsltsListForm1)
 recordedResultsNote:'VIREO\'s "Recorded Results" list for the loaded records: a header, then one line per record, each written by VIREO\'s row writer (0x5486a8) with VIREO\'s default options (magnitudes, R and I). VIREO writes this list when it reads the data; here it follows every change of the list (web).',
 recordedResultsBlocked:(row:number,why:string)=>`Display/Print Data cannot list record ${row}: ${why} VIREO would stop with an error here.`,
 recordedResultsBlock:{value:'a stored number is not a finite value.','spectral-code':'its spectral type code cannot be formatted.',text:'its name or remarks contain control characters.'} as Readonly<Record<'value'|'spectral-code'|'text',string>>,
 recordedResultsCsvCaption:'Comma Delimit',
 recordedResultsCsvRefused:'These lines cannot be converted to VIREO\'s comma-delimited form here (for example a "Sky" line, a counts layout the converter does not admit, or an unusual field spelling). Save Text keeps the lines as shown.',
 close:'Close',
 // Front K2.2: observation-mode right click → Observational Data (TObsRsltsDlg1)
 obsRightClickNote:'Like VIREO, right-click a plotted star (or press and hold on a touch screen) to open "Observational Data" for that record; it is marked on the plot until you choose Cancel.',
 obsVelocityNote:'Velocity is shown but not editable here (web). In VIREO, typing a velocity stores it and then checks it against c·Z; with Z = 0, as for every photometer record, it always answers "Velocity Error!".',
 obsEditError:'The remarks or the spectral type cannot be stored as typed (VIREO stores 36 characters of plain text and a spectral type it can read). Nothing was changed.',
 obsBlocked:(why:string)=>`Observational Data cannot show this record: ${why}`,
 obsFpu:'VIREO stops with a floating-point error here: a plotted point lies too far from the click for its 32-bit distance.',
 yes:'Yes',no:'No',
 exclusionEditModeNote:'In VIREO, removing points from the HR diagram is an Edit Mode tool (an instructor setting, off by default); OpenVireo lets you exclude and restore points yourself.',
 // HR Print (0x542f44)
 hrPrint:'Print',// VIREO (File › Print)
 hrPrintCaption:'Color-Magnitude Diagram',// VIREO
 hrPrintNote:'Print preview of VIREO\'s HR printout: the date and time (here in your browser\'s format), the laboratory-table line, the student lines entered in VIREO (a placeholder here), the ZAMS fit values when the ZAMS is shown, the caption, then the diagram. VIREO prints a picture of its whole window; OpenVireo prints its own diagram, in black on white as VIREO does by default. Fonts and page layout are not reproduced.',
 hrPrintOrientation:'VIREO page layout',
 portrait:'Portrait',landscape:'Landscape',
 hrPrintImage:'Color-magnitude diagram, print copy',
 reportPrintNote:'Browser printing of the report lines (a web adaptation). VIREO prints this report from its list window (0x59e4c0) with the date, student lines and caption; that page layout is not reproduced here.',
 // Select Cluster Data (TClstrListForm2) and Display/Print Data (TClstrRptForm1)
 selectCluster:'Select Cluster Data...',// VIREO
 listMenu:'List',searchItem:'Search...',printItem:'Print...',saveList:'Save List...',closeItem:'Close',selectionMenu:'Selection',plotItem:'Plot',// VIREO
 listSearchNote:'In VIREO this Search item is not connected to anything, so it does nothing; Save List stays disabled.',
 listPlotNote:'Plot loads the dataset as "Load selected dataset" does. In VIREO a new Plot also restores removed points; OpenVireo keeps your exclusions for each dataset.',
 listCaptionNote:'VIREO\'s cluster list (CLUSTERS.DAT), with the comments published on this site; the distance and age columns stay hidden as in VIREO\'s student view.',
 noticeCaption:'Information',
 displayData:'Display/Print Data',// VIREO
 detailLoading:'Loading the cluster star details…',
 detailError:'The cluster star details could not be loaded. Try again.',
 reportUnavailable:'This listing needs a spectral type that VIREO cannot format for one of the stars, so it is not shown.',
 reportNote:'VIREO\'s "CLEA Cluster Data" listing (0x534680) for this dataset, sorted by V as the Plot route sorts it. Stars you excluded carry "*" after their ID, as VIREO marks removed stars. Text and CSV files are downloaded through your browser.',
 listPrintNote:'Print preview of VIREO\'s list printout: the date and time (here in your browser\'s format), the laboratory-table line, the student lines entered in VIREO (a placeholder here), the window caption and every list line. VIREO\'s print-job title is not printed on the page. Fonts and page layout are not reproduced.',
 // print preview (shared)
 printTitle:(caption:string)=>`Print — ${caption}`,
 printButton:'Print…',
 printClose:'Close preview',
 printError:'Printing is not available in this browser window.',
 printPlaceholder:'[student and lab text entered in VIREO: not recovered on this site]',
 helpPrintNote:'Print preview of what VIREO prints for a help topic: the date and time (here in your browser\'s format), the laboratory-table line, the student lines entered in VIREO (a placeholder here), the CLEA exercise title, the window caption and the topic rows. VIREO prints them on one page and drops rows that do not fit; page layout and fonts are not reproduced.',
});
export type ClusterHrMessages=typeof CLUSTER_HR_EN;
