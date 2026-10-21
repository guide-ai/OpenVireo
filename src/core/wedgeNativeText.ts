/** Original VIREO captions and message literals for the LSS wedge route, decoded
 * statically from CLEA_VEO.exe (SHA256 781bc970…c52c54c) literal pools and the
 * TWedgePlot/TWdgPltOptsForm1 DFM resources. They are source evidence and stay
 * verbatim (not translated); "&" accelerators are removed for display. */
export const WEDGE_NATIVE_TEXT=Object.freeze({
 windowCaption:'LSS Wedge Plot',// DFM TWedgePlot.Caption; also 0x581060
 menuPlotData:'Plot Data',menuOptions:'Options...',// DFM PlotData1/Options1
 noDataToPlot:'No data to plot',// 0x581070
 pointsPlotted:'Points Plotted: ',// 0x582158
 optionsCaption:'Wedge Plot Options',gridType:'Grid Type',gridItems:Object.freeze(['Velocity','Red Shift (Z)','No Grid']),
 plottedPoints:'Plotted Points',size:'Size',style:'Style',styleItems:Object.freeze(['Open','Filled']),
 autoPlotGroup:'Auto Plot Parameters',autoPlotOn:'Auto Plot On',ok:'OK',cancel:'Cancel',
 extensionText:'LSS observation files must be in text format.',extensionCaption:'TXT Files Only',// 0x5895e8/0x589618
 notLoadedText:'Data was not loaded.',notLoadedCaption:'No Data Loaded',// 0x589684/0x589674
 loadedCaption:'Saved Data Loaded',// 0x589660
 loadedText:(name:string)=>'Saved observations file "'+name+'" loaded.',// 0x589630 + name + 0x589654
 headerText:(name:string)=>'File '+name+' does not contain LSS redshift data!',headerCaption:'No Data Loaded!',// 0x57c318/0x57c328/0x57c350
 accessText:(name:string)=>'Cannot access results file '+name,accessCaption:'File Error!',// 0x57c2bc/0x57c2e4
 retainText:'Do you want to add the file data to your current data?\r\n\r\n"Yes" - Add to current data.\r\n"No" - Clear current data.',retainCaption:'Retain Current Data?',// 0x57c374/0x57c3e8
 deleteText:'Are you SURE you want to delete your current data?',deleteCaption:'Confirm Deletion!',// 0x57c414/0x57c400
 yes:'Yes',no:'No',
});
