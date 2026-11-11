// Front RT7 (docs/I18N.md "RTL groundwork: the RTL walk (RT7)"): what the walks under the dev-only right-to-left pseudo-locale qps-rtl
// find and leave for a later front, shared by tests/scripts/rtl.scripts.ts (home, the routes, menus, dialogs, help and the tour) and
// tests/scripts/walks.scripts.ts (the deep per-exercise walks). Each site names the problem it produces (the check's own wording), the
// file that must change, the front that owns the fix and why it is not fixed here; the walks then list where (walk, width, step) it
// is expected. An expected problem that stops appearing fails its walk, so a fix is noticed and its entry removed.
//
// Owners: RT8, catalog text (Latin tokens, literal numbers, dates and signs a translation keeps inside a right-to-left sentence: a
// lint rule for right-to-left catalogs, or a {param}, which t() isolates); RT12, data and numbers rendered straight into elements,
// English composed from pieces, and plot text (plan § 3.2: a small LTR wrapper, `dir="ltr"` on the cell, an island in rtl.css,
// plotText or keepInsideSvg at each site); RT13, help under RTL (VIREO's English help rows have no lang="en" while no translated
// help exists, so they run right to left); RT14, layout of long words at 320 px shared with the Russian front's entries. "artifact":
// produced by qps-rtl itself, not by a real translation (it is kept so the walk still notices any other problem at that step).

export type RtlOwner='RT8'|'RT12'|'RT13'|'RT14'|'artifact';
export type RtlSite=Readonly<{problem:RegExp;file:string;owner:RtlOwner;why:string;
 /** Within 2 px of the check's threshold with a font file that may differ between this machine and CI: tolerated, not required. */
 fontDependent?:true}>;
const num=String.raw`[-+−]?[\d.,]+`;
const node=(text:string,where:string)=>new RegExp(String.raw`^bidi node: “${text}” in ${where}$`);
const run=(text:string,where:string)=>new RegExp(String.raw`^bidi run: “${text}” in ${where}$`);

const NUMBERS='RT12: a number, coordinate or code rendered straight into an element is drawn by the right-to-left paragraph (a sign or a unit moves to the other end, coordinate fields reverse); plan § 3.2 fixes each site with an LTR wrapper or an island.';
const COMPOSED='RT12: English or data joined from pieces outside t() and vireo(), so no isolate keeps its pieces in order.';
const CATALOG='RT8: the English catalog text holds this literal (a number, date, sign or a Latin token with an ellipsis), and qps-rtl keeps it in Latin, as a translation would: inside a right-to-left sentence it is drawn out of order ("…ID", "01-06-2009", "1–1−"). A {param} (isolated by t()) or the right-to-left lint must handle it.';
const HELP='RT13: VIREO\'s English help rows are shown untagged while no translated help exists for the page language (src/clusters/CleaHelp.tsx textLang is "en" only in the original view), so they run right to left; RT13 tags or islands them.';
const PLOT_FONT='RT12: the svg text is Latin, but its primary font under ar is Noto Sans Arabic (the first installed face of the ar stack), whose ascent and descent (2.112 em) make the text box taller than the glyphs; the box crosses the plot\'s edge while the ink stays inside.';
const PADDING='artifact: a map function\'s English result is padded by pseudoMark (src/i18n/pseudo.ts) with an unbreakable run of “·”, which Noto Sans Arabic draws wider than DejaVu; the run does not fit at 320 px. A real translation has no padding.';

export const RTL_SITES={
 // ---- RT12: numbers and data rendered straight into elements ----
 zValue:{problem:node(num,String.raw`div\.z-value \[z-value\]`),file:'src/SpectrumInstrument.tsx (the z read-out)',owner:'RT12',why:NUMBERS},
 stepFactor:{problem:node('×10?','small'),file:'src/SpectrumInstrument.tsx (the control step buttons’ ×1 and ×10)',owner:'RT12',why:NUMBERS},
 drawsOf:{problem:node(String.raw` / \d+`,'strong'),file:'src/StarExposure.tsx (the draws “— / 765” of .source-summary)',owner:'RT12',why:NUMBERS},
 txtSuffix:{problem:node(String.raw` \(\.TXT\)`,String.raw`button\.secondary-button \[lss-(?:results|region)-txt\]`),file:'src/LssSurvey.tsx (" (.TXT)" appended to the translated button text)',owner:'RT12',why:COMPOSED},
 wedgeData:{problem:new RegExp(String.raw`^bidi node: “.*” in (?:dd \[wedge-details\]|code\.wedge-pre \[wedge-details\]|td \[wedge-row-0\])$`),file:'src/components/WedgeLab.tsx (the selected row’s details and raw line, the wedge table’s cells)',owner:'RT12',why:NUMBERS},
 nativeNumbers:{problem:new RegExp(String.raw`^bidi node: “.*” in (?:output \[native-number-(?:b|dec)\]|samp)$`),file:'src/NativeObservationResults.tsx (the inspected DAT record’s fields and their binary forms)',owner:'RT12',why:NUMBERS},
 pleiadesPercent:{problem:node(String.raw`[-+]?[\d.]+%`,String.raw`dd \[pleiades-percent\]`),file:'src/PleiadesAnalysis.tsx (the confirmed fit’s percentage)',owner:'RT12',why:NUMBERS},
 domainTable:{problem:node('.*','td'),file:'src/PhotometerDomainExplanation.tsx (the Mayall domain table’s cells)',owner:'RT12',why:NUMBERS},
 trialTable:{problem:node('.*','td'),file:'src/NativeClusterAnalysis.tsx (the trial fit’s table rows)',owner:'RT12',why:NUMBERS},
 confirmedModel:{problem:node(String.raw`\[Z=.*\] \(Solar Values\)`,String.raw`dd \[native-confirmed-model\]`),file:'src/NativeClusterAnalysis.tsx (VIREO’s model name in the confirmed fit)',owner:'RT12',why:NUMBERS},
 memberDec:{problem:node('.*',String.raw`output \[cluster-member-dec\]`),file:'src/clusters/PossibleMemberWindow.tsx (the declination)',owner:'RT12',why:NUMBERS},
 listSelection:{problem:node(String.raw`\d+ / \d+`,String.raw`p\.fi-status \[cluster-data-selection\]`),file:'src/observatory/FieldInfoListWindow.tsx (the “n / total” selection status)',owner:'RT12',why:COMPOSED},
 cnhrRow:{problem:node('.*',String.raw`td \[cnhr-row\]`),file:'src/components/ClusterNativeObservationHr.tsx (the plotted pairs’ positions and their binary forms)',owner:'RT12',why:NUMBERS},
 variableResults:{problem:node('.*',String.raw`td \[variable-results\]`),file:'src/variables/VariableStarsRoute.tsx (the GCVS results table: declinations and type codes such as “EA/D:”)',owner:'RT12',why:NUMBERS},
 savedRowsIdentity:{problem:node(String.raw`⟦\d+ \(.*\)⟧`,String.raw`dd \[saved-rows(?:-candidate)?-identity-rows\]`),file:'src/components/PulsarSavedRows.tsx (the identity’s row count, an English sentence)',owner:'RT12',why:COMPOSED},
 pointingDec:{problem:node(num,String.raw`output \[pointing-dec\]`),file:'src/OpenVireo.tsx (the pointing’s declination)',owner:'RT12',why:NUMBERS},
 objectXMeasurements:{problem:node('.*',String.raw`td \[objectx-measurements\]`),file:'src/ObjectXMeasure.tsx (the measured coordinates)',owner:'RT12',why:NUMBERS},
 siteClock:{problem:node('.*',String.raw`dd \[site-clock-local\]`),file:'src/SiteClock.tsx (the local date and time)',owner:'RT12',why:NUMBERS},
 siteLines:{problem:run('.*',String.raw`pre\.(?:ob-native\.)?ob-site-lines \[ob-site-info-(?:lines|print-preview-picture)\]`),file:'src/observatory/SiteDialogs.tsx (Site Information’s lines: a translated label and a coordinate in one LTR island line)',owner:'RT12',why:COMPOSED},
 // ---- RT12: plot text ----
 bvTitle:{problem:/^plot text “\(B-V\)” outside its plot .*\(\d+, \d+, \d+, -[3-6]\)$/,file:'src/core/clusterNativeObservationHr.ts (VIREO’s native frame label, drawn by src/NativeClusterAnalysis.tsx and src/components/ClusterNativeObservationHr.tsx)',owner:'RT12',why:PLOT_FONT},
 objectXTicks:{problem:/^plot text “\d+ Å” outside its plot objectx-spectrum \(\d+, \d+, \d+, -[12]\)$/,file:'src/ObjectXSpectrum.tsx (the end wavelength labels)',owner:'RT12',why:PLOT_FONT,fontDependent:true},
 pulsarName:{problem:/^plot text “.*” outside its plot plr-panel \(\d+, \d+, -[12], \d+\)$/,file:'src/components/PulsarAnalysis.tsx (the recording’s name in the first channel)',owner:'RT12',why:PLOT_FONT,fontDependent:true},
 multiSpecNumber:{problem:/^plot text “3” outside its plot card ms-card \(\d+, \d+, -[3-7], \d+\)$/,file:'src/core/overlayLabels.ts (the Multi-Spec field selection numbers)',owner:'RT12',why:'RT12: the baseline that keeps a selection number inside the field allows for the Latin ascent, not Noto Sans Arabic’s (2–7 px above the field; the same entry is 2 px under qps-cjk).'},
 // ---- RT8: catalog text ----
 // Every Latin run inside a translated sentence the walks met is a literal of the English catalog text or a map leaf (keys such as
 // lab.next.recipe, hubble.sourceLimits, lss.measure.help, class.plotPolicy, sampledDiff.limits, pa.standardHelp, pa.resultHelp,
 // sky.invalidCoordinates, obs.conversion, photo.policy, obsHr.isochrone, pulsarLab.step.point.help, radio.state.item454,
 // radioReceiver.note.silent, radioRoute.clock.utHelp, radioRoute.date.dialog.bounds, radioAccess.site.heading, starExposure.domain,
 // and src/help/webHelp.ts, src/core/pulsarReviewEdit.ts, src/ObjectXLab.tsx); the one composed exception is siteLines above.
 catalogLiteral:{problem:/^bidi run: “.*” in (?!pre\.)/,file:'src/i18n/en.json and the message maps (the key whose English holds the literal; see the comment above)',owner:'RT8',why:CATALOG},
 // ---- RT13: help ----
 helpRows:{problem:/^bidi node: “.*” in li \[(?:[a-z-]+-help-topic-(?:list|text)|spl-rows|spl-help-text)\]$/,file:'src/clusters/CleaHelp.tsx, src/help/SpectralLineTable.tsx (VIREO’s English help and line-table rows)',owner:'RT13',why:HELP},
 reminder:{problem:/^bidi node: “Thank you for using CLEA's[\s\S]*” in p\.help-reminder-text \[exit-reminder-text\]$/,file:'src/help/HelpMenus.tsx (the Exit Observatory reminder, VIREO\'s Reminder.obs)',owner:'RT13',why:HELP},
 // ---- RT14 and artifacts: layout ----
 helpNote:{problem:/^[a-z-]+-help-topics scrolls horizontally$|^layout: [a-z-]+-help-topics scrolls horizontally$/,file:'src/clusters/CleaHelp.tsx (.cluster-hr-note, a map function’s English note)',owner:'artifact',why:PADDING},
 printNote:{problem:/^variable-print-preview scrolls horizontally$/,file:'src/variables/VariableStarsRoute.tsx (.variable-note, a map function’s English note)',owner:'artifact',why:PADDING},
 wedgeStatus:{problem:/^page overflows horizontally \(3[3-5]\d > 320\)$/,file:'src/components/WedgeLab.tsx (.wedge-status, map functions’ English status)',owner:'artifact',why:PADDING},
 brand:{problem:/^header: the brand \(\d+–\d+\) overlaps the Tools button \(\d+–\d+\)$/,file:'src/OpenVireo.tsx (t("app.name") in .portal-brand), src/observatory.css (.portal-brand nowrap beside .tools-toggle)',owner:'artifact',
  why:'artifact: every translation keeps the brand OpenVireo (es, pt-BR and fr do); qps-rtl turns it into 11 Arabic letters at 21 px bold, wider than the room beside Tools (qps-cyrl overlaps too, by 31 px, but no walk checks the overlap there). If a translation ever writes the name in its own script, the phone header needs a brand that shrinks; RT14.'},
} as const satisfies Readonly<Record<string,RtlSite>>;
export type RtlSiteName=keyof typeof RTL_SITES;
