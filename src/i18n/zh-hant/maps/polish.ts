import type {BundledHotListFailure} from '../../../io/bundledHotList';
import type {POLISH_MESSAGES_EN} from '../../../polish/PolishMessages';
import type {Translation} from '../../maps';

const FILE_REASONS:Readonly<Record<BundledHotListFailure,string>>=Object.freeze({download:'無法下載',size:'的大小與記錄的大小不符',sha256:'與記錄的SHA-256不符'});

/** Front ZT1: Traditional Chinese (zh-Hant, Taiwan) for the polish texts (About box, credits, results editors, guides), adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's. */
export const POLISH_ZH_HANT:Translation<typeof POLISH_MESSAGES_EN>=Object.freeze({
 spectrometerIndex:Object.freeze({
  title:'在哪裡擷取光譜',
  intro:'VIREO的光譜儀要在天文台裡使用，並讓望遠鏡指向一個目標。在OpenVireo中，每個實驗都有各自經過驗證的光譜儀路徑：',
  routesTitle:'光譜儀路徑',
  routes:Object.freeze([
   Object.freeze({label:'星表恆星曝光',help:'受支援的星表恆星的光譜，可儲存和列印。'}),
   Object.freeze({label:'星系曝光',help:'Hubble.HTL中的13個星系（哈伯定律）。'}),
   Object.freeze({label:'LSS巡天',help:'9個LSS視野中的星系光譜。'}),
   Object.freeze({label:'天體X',help:'天體X各目標的光譜。'}),
   Object.freeze({label:'多目標光譜儀',help:'天文台中的多目標光譜儀卡片，用於內建的實驗視野（天體X實驗中也可使用）。'}),
   Object.freeze({label:'光譜分析器',help:'測量譜線位移並記錄紅移。'}),
   Object.freeze({label:'分類',help:'對照標準星光譜為恆星光譜分類。'}),
  ]),
  retired:'在擷取功能出現之前，本頁曾顯示備用光源輪廓（M82、Coma1、Coma2）的預覽。它已於2026-10-29停用，由上述路徑取代。',
 }),
 clusterGuide:Object.freeze({nav:'星團赫羅圖指南'}),
 multiSpecPrint:Object.freeze({unavailable:'無法使用「列印所選視野」（Print Selection Field）：此處沒有顯示多目標光譜儀視野。'}),
 infoListPrint:Object.freeze({
  note:'VIREO清單頁面的列印預覽：日期和時間（此處採用你的瀏覽器的格式）、實驗檯編號行（本站不記錄）、學生姓名行（留空：這裡沒有登入）、視窗標題和清單各行，使用Courier字型。行距和縮排沿用VIREO的頁面；不重現印表機的度量。VIREO的列印工作標題不會列印在頁面上。',
 }),
 siteInfo:Object.freeze({
  note:'在VIREO中，這個清單視窗在顯示觀測站資訊時會隱藏「搜尋」、「儲存文字」和「編輯」選單，因此只提供「列印」和「關閉」。',
  printNote:'網頁改編：VIREO會在印表機上把清單各行列印在共用的頁首之下；這裡列印的是日期、標題和清單各行。',
 }),
 hotListEdit:Object.freeze({
  note:'「編輯」、「刪除」和「復原」會更改共用的目標清單，與「原版目標清單」編輯器一樣；「復原」只會復原在此處最近一次的「編輯」或「刪除」。',
  deleteNote:'網頁改編：該行會從共用清單中移除；「復原」會把它放回檔案中原來的位置（VIREO按赤經重新插入）。',
 }),
 hotListPopup:Object.freeze({
  note:'「編輯」、「刪除」和「復原」位於本頁的「原版目標清單」編輯器中。',
 }),
 cameraFieldSize:Object.freeze({
  note:'針對目前套用的望遠鏡，與VIREO在相機開啟時顯示的一致（此處保留兩位小數）。',
 }),
 terminateSlew:Object.freeze({
  note:'網頁改編：VIREO在提問期間會暫停轉動；這裡在你回答之前望遠鏡會繼續轉動（如果它先到達，提問會關閉）。「是」會讓它停在目前位置；「否」會讓它繼續轉動。',
 }),
 comparison:Object.freeze({
  clear:'清除比較光譜',none:'無（已清除）',
  note:'VIREO的「比較光譜 › 清除」：它會從圖和表中移除比較譜線。再選擇一個清單即可重新顯示。清除狀態不會儲存；已儲存的探究保留所選的清單。',
 }),
 results:Object.freeze({help:'VIREO的「工具 › 結果編輯器」。「觀測結果」會在光譜分析器中開啟你的觀測結果；「脈衝星結果」會在脈衝星分析中開啟已儲存的脈衝星測量。'}),
 pulsarPrint:Object.freeze({
  note:'VIREO的「列印視窗」（PrintScreen1Click 0x56d9d8，Front RE5）會先列印自己的頁首和資料參數，再列印視窗影像。與VIREO一樣，開啟它會把所有面板切換為垂直游標模式，面板按VIREO的列印顏色列印（白色背景，黑色座標軸、標籤和曲線；游標保留各自的顏色）。橫向列印時會寫上「（螢幕影像列印在下一頁）」，並把影像放在第2頁。網頁改編：頁面方向在此選擇（VIREO採用印表機的設定），日期取自瀏覽器，實驗檯編號和學生姓名顯示為「（未記錄）」（沒有登入），影像是網頁面板，而不是VIREO的視窗影像。',
  orientation:'頁面方向',portrait:'直向',landscape:'橫向',
 }),
 wedgePrint:Object.freeze({
  note:'網頁改編：VIREO的「列印」會把配色方案設為與「彩色列印」選項相反（scheme := Env+0x2e8d XOR 1，0x580fba–0x580fc3），因此除非勾選該選項（編譯時預設關閉；光學模擬選項），否則以黑白列印。此處的列印遵循該選項，並使用瀏覽器的印表機版面。所選內容的醒目提示不會列印。',
 }),
 printSky:Object.freeze({
  note:'VIREO會列印頁首（日期和時間，此處採用你的瀏覽器的格式；僅在記錄了實驗檯編號時才列印實驗檯編號；然後是學生姓名行，這裡留空，因為OpenVireo沒有登入）、反相並按1.5倍縮放的天空影像，以及頁尾（視野中心、視野大小、望遠鏡和儀器）。網頁改編：由瀏覽器排版頁面，並按目前顯示的樣子列印檢視。',
  noInstrument:'（OpenVireo的望遠鏡檢視中未選擇儀器）',
 }),
 about:Object.freeze({
  nativeNote:'VIREO的「關於」對話方塊，文字取自原程式（不含其標誌）。本視窗的其餘部分介紹這個網頁重建版。',
  siteTitle:'本站',
  site:'OpenVireo是對Project CLEA的VIREO的免費、非商業網頁重建，向所有人開放，依據VIREO還原的行為和原版資料檔案在瀏覽器中重新建構。它不是CLEA的程式，也不聲稱與其等同；網頁改編之處都會在出現的地方標明。',
  worksTitle:'可用功能',
  works:Object.freeze([
   'VIREO的七個實驗都有引導式的網頁路徑：哈伯定律（13個星系）、大尺度結構、恆星分類、昴宿星團測光（24顆恆星）、星團赫羅圖、脈衝星，以及探尋天體X。',
   '光學天文台：圓頂、望遠鏡、尋星鏡和望遠鏡檢視、可選地平限制的轉動、目標清單、觀測站和日期、星表和視野資訊、變星清單和類星體清單。',
   '儀器：針對實驗目標的光譜儀和光度計、CCD相機和紅外線相機（即時查詢星表）、多目標光譜儀（用於內建的實驗視野和天體X實驗），以及帶接收機和脈衝星分析的電波望遠鏡。',
   '分析：光譜測量和分類、哈伯擬合和昴宿星團擬合、LSS楔形圖、你的觀測結果，以及已儲存的探究。',
  ]),
  privacyTitle:'隱私',
  privacy:Object.freeze([
   '沒有Cookie，也沒有帳號：OpenVireo從不詢問你的姓名、電子郵件地址或密碼。',
   '你的探究、選項和結果只儲存在你的電腦上：存放在此瀏覽器自己的儲存空間中，或你選擇下載的檔案中。不會上傳任何內容。',
   '造訪只做彙總統計，且不使用Cookie（Cloudflare Web Analytics）。與任何網站代管方一樣，Cloudflare會收到每次請求的技術資料（例如你的IP位址），以便提供頁面。',
   'CCD相機和紅外線相機的即時星表查詢只會把視野的天球座標和半徑傳送給CDS/VizieR（或其某個官方鏡像）。你的瀏覽器直接連線該伺服器，因此與任何網站一樣，它能看到你的IP位址。',
   '外部連結（HST影像檔案庫、說明 › 網站）只有在你按一下時才會在新分頁中開啟，且不會隨之傳送任何內容。',
  ]),
  creditsTitle:'致謝',
  credits:Object.freeze([
   'Project CLEA，Gettysburg College：VIREO及其資料檔案的原作者。由美國國家科學基金會（National Science Foundation）和Gettysburg College提供支持。',
   '脈衝星資料：很可能源自ATNF脈衝星星表（Manchester, Hobbs, Teoh & Hobbs 2005）；這一來源並不確定。',
   '相機星表：CDS/VizieR（doi:10.26093/cds/vizier）；NOMAD（Zacharias等，2004）；USNO-B1.0（Monet等，2003）；經由NOMAD提供的2MASS（Skrutskie等，2006）。',
   '星場：隨VIREO提供的導星星表（Guide Star Catalog）的有限子集。',
  ]),
 }),
 print:Object.freeze({
  title:'列印預覽',button:'列印…',close:'關閉',error:'此瀏覽器不支援列印。',
  missing:'沒有可列印的內容：目前沒有顯示影像。',
 }),
 pulsarsHtl:Object.freeze({
  button:'載入內建的Pulsars.HTL',
  note:'網頁改編：VIREO的脈衝星清單Pulsars.HTL（8顆脈衝星）以逐位元組相同的形式內建於本站；在VIREO中，你要用「載入目標清單...」從它所在的資料夾開啟。載入會取代目前的目標清單，「載入目標清單...」也是如此。',
  error:(code:BundledHotListFailure)=>`內建的Pulsars.HTL${FILE_REASONS[code]}；目前的目標清單保持不變。`,
 }),
});
