/** Front WebKit QA (2026-10-31): Playwright's WebKit (the Linux port in the official container) reports a download's suggested
 * name with every space replaced by '_' ("QSO Data.TXT" arrives as "QSO_Data.TXT"); the page asked for the name with spaces, which
 * Chromium and Firefox report as is. Expected names go through this so the comparison stays exact in every engine. */
export const downloadedName=(name:string,browserName:string)=>browserName==='webkit'?name.replace(/ /g,'_'):name;
