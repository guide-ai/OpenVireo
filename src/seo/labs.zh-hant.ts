/** Front ZT-REL+SEO [W]: the Traditional Chinese (zh-Hant, Taiwan) texts of the seven lab pages under /zh-hant/labs/ (user decision 8
 * of 2026-11-09 and the Chinese decisions of 2026-11-19, AGENTS.md; plan analysis/front-plans/front-i18n-zh.md §6.3). Adapted from
 * the Simplified Chinese pages (src/seo/labs.zh-hans.ts) with OpenVireo’s English pages as the source, to Taiwan’s standard. Same
 * slugs and order as src/seo/labs.ts; the reader is addressed as 你, following the zh-Hant glossary (src/i18n/zh-hant/glossary.json;
 * «實驗» for a lab, «探究» for an investigation) and the zh-Hant lint profile with its typography (full-width ，。、：；？！（） next to
 * Han, 「」 quotes, no space between Han and Latin text or digits; src/seo/languages.test.ts checks both). The lab names are the app’s
 * own Traditional Chinese names (home.hubble … home.objectX of src/i18n/zh-hant/zh-hant.json). A web adaptation by OpenVireo of its
 * own English pages: never CLEA’s text, and it claims no equivalence with the original program. */
import type {LabText} from './labs.ts';
import type {LabSlug} from './labSlugs.ts';

export const LAB_TEXT_ZH_HANT:Readonly<Record<LabSlug,LabText>>=Object.freeze({
 hubble:{name:'哈伯定律',
  title:'線上學習哈伯定律的CLEA VIREO實驗 · OpenVireo',
  description:'用虛擬望遠鏡和光譜儀測量星系的紅移，再根據你自己的資料親手擬合哈伯定律。這是CLEA VIREO哈伯定律實驗的免費網頁重建版。',
  heading:'哈伯定律：紅移與距離的關係',
  intro:'將虛擬望遠鏡對準原版VIREO哈伯實驗中的星系，拍攝它們的光譜，並測量譜線移動了多少。你將根據自己的測量繪製哈伯圖，並估算宇宙的膨脹速率。',
  steps:['將望遠鏡逐一對準原版實驗清單中的十三個星系，拍攝每個星系的光譜。','在光譜分析器中對齊鈣K線、鈣H線和G帶，測量每個星系的紅移。','把每個紅移換算成退行速度，並與由星等推算出的星系距離結合起來。','繪製速度與距離的關係圖，親手擬合哈伯關係，並儲存你的探究。'],
  learn:['光譜如何揭示星系的運動。','哈伯常數的意義，以及如何測量它。','天文學家為什麼用標準燭光來估算距離。']},
 'large-scale-structure':{name:'大尺度結構',
  title:'探索宇宙大尺度結構的CLEA VIREO實驗 · OpenVireo',
  description:'對一條天區帶進行巡天，測量大量星系的紅移，並在楔形圖上畫出宇宙網。這是CLEA VIREO大尺度結構實驗的免費網頁重建版。',
  heading:'宇宙的大尺度結構',
  intro:'從九個原版巡天視野中選擇一個，逐一測量星系的紅移，並把它們繪製在楔形圖上。巨牆、纖維狀結構和空洞會在你自己的資料中顯現出來。',
  steps:['選擇一個巡天視野和一台望遠鏡。','拍攝每個星系的光譜，並記錄它的紅移。','把你自己的記錄繪製在赤經–速度楔形圖上。','描述你看到的結構，並儲存你的探究。'],
  learn:['紅移巡天如何在三維空間中繪製宇宙地圖。','什麼是星系團、巨牆、纖維狀結構和空洞。','如何閱讀楔形圖。']},
 'stellar-classification':{name:'恆星分類',
  title:'學習恆星光譜分類的CLEA實驗 · OpenVireo',
  description:'學習恆星的光譜分類：將光譜與標準星比較，標記譜線，測量等值寬度，自己判定光譜型。這是一個CLEA VIREO實驗的免費網頁重建版。',
  heading:'恆星光譜的分類',
  intro:'親自嘗試恆星的光譜分類：載入25條原版練習光譜之一，並將它與標準星的星圖集比較。你根據看到的譜線自己判定它的光譜型；不評分，也不會直接給出答案。',
  steps:['載入一條練習光譜和一套標準光譜星圖集。','將它與相鄰的標準星並排比較，或以差值方式比較。','從譜線表中標記譜線，並測量等值寬度。','記錄你自己判定的光譜型及理由，然後儲存你的探究。'],
  learn:['OBAFGKM光譜序列及其成因。','哪些吸收線標誌著高溫星和低溫星。','如何客觀地將光譜與標準星比較。']},
 pleiades:{name:'昴宿星團測光',
  title:'昴宿星團測光的CLEA VIREO實驗 · OpenVireo',
  description:'用虛擬光度計分別測量昴宿星團中恆星的B、V亮度，並估算這個星團離我們有多遠。這是一個CLEA VIREO實驗的免費網頁重建版。',
  heading:'昴宿星團的光電測光',
  intro:'將望遠鏡對準原版實驗清單中的24顆昴宿星團恆星，用虛擬光度計分別透過B、V濾光片測量每一顆。你將根據自己的讀數繪製星團序列，並估算它的距離。',
  steps:['載入昴宿星團清單，將望遠鏡對準一顆恆星。','透過B、V濾光片測量天空和恆星。','記錄你的讀數，並算出每顆恆星的B−V色指數。','手動擬合主序以估算距離，並儲存你的探究。'],
  learn:['測光如何測量恆星的亮度和顏色。','顏色–星等圖能告訴我們什麼。','主序擬合如何求出星團的距離。']},
 'cluster-hr':{name:'星團赫羅圖',
  title:'繪製星團互動式赫羅圖的CLEA實驗 · OpenVireo',
  description:'繪製星團的互動式赫羅圖，擬合它們的主序，並與你自己測得的昴宿星團資料比較。這是一個CLEA VIREO實驗的免費網頁重建版。',
  heading:'星團的赫羅圖',
  intro:'使用互動式赫羅圖：從資料庫中選取一個參考星團並繪圖，擬合它的主序，再與你在測光實驗中親自測量的昴宿星團恆星比較。',
  steps:['從資料庫中選擇一個參考星團，繪製它的赫羅圖。','擬合它的主序。','繪製你自己測得的昴宿星團B、V測量值。','親自比較這兩條序列。'],
  learn:['赫羅圖（赫茨普龍–羅素圖）是如何建構的。','星團的赫羅圖如何揭示距離和年齡。','為什麼塵埃造成的紅化會使星團在圖中移動。']},
 pulsars:{name:'脈衝星',
  title:'脈衝星電波天文學的CLEA VIREO實驗 · OpenVireo',
  description:'用虛擬電波望遠鏡在兩個頻率上記錄脈衝星的脈衝，並測量它們的週期和色散。這是CLEA VIREO脈衝星實驗的免費網頁重建版。',
  heading:'脈衝星電波天文學',
  intro:'將虛擬電波望遠鏡轉向原版星表中的脈衝星，在兩個電波頻率上記錄它們的脈衝。不同頻率之間的延遲揭示了訊號穿過了多少星際物質。',
  steps:['開始脈衝星實驗，將電波望遠鏡對準一顆脈衝星。','在兩個不同的頻率上記錄它的脈衝。','測量週期以及兩個頻率之間的延遲。','將你的結果與色散量和週期比較，並儲存你的探究。'],
  learn:['什麼是脈衝星，以及它們為什麼會發出脈衝。','色散如何使低頻電波訊號延遲。','色散量如何提示脈衝星的距離。']},
 'object-x':{name:'天體X',
  title:'天體X：辨認神秘天體的CLEA VIREO實驗 · OpenVireo',
  description:'僅憑座標，利用影像、光譜和電波觀測判斷天體X是恆星、星系、類星體、脈衝星還是小行星。這是一個CLEA實驗的免費網頁重建版。',
  heading:'天體X：它是什麼？',
  intro:'你只會得到一個識別碼和座標。利用在不同時間拍攝的CCD影像、光譜和電波望遠鏡，判斷這個天體是恆星、星系、類星體、脈衝星還是小行星。',
  steps:['接收一個只有識別碼和座標的目標；它的身分保持隱藏。','用CCD相機、光譜儀和電波望遠鏡觀測它。','判斷它是哪一類天體，並用你自己的觀測作出論證。','如果是小行星，就在多張影像上測量它的位置，並描述它的運動。'],
  learn:['不同種類的天體在影像、光譜和電波觀測中是什麼樣子。','影像之間的運動如何揭示一個太陽系天體。','如何根據多種證據建構論證。']},
});
