import type {HELP_VIEWER_EN} from '../../../help/HelpViewerMessages';
import type {Translation} from '../../maps';
/** Front ZT-HELP: Traditional Chinese (zh-Hant, Taiwan) for the help viewer’s language switch and the Spectral Line Table window, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA’s (VIREO’s missing-file box is spectralLines.ts SPECTRAL_LINE_MISSING_LITERALS, through vireo()). */
export const HELP_VIEWER_ZH_HANT:Translation<typeof HELP_VIEWER_EN>=Object.freeze({
 translationLabel:'翻譯：OpenVireo的網頁改編譯文（不是CLEA的文本）',
 originalLabel:'原文：VIREO的英文原文，原樣顯示',
 viewOriginal:'檢視原文（英文）',
 viewTranslation:'檢視譯文',
 translationError:'無法載入翻譯後的說明，或它與翻譯所依據的原始檔案不一致，因此顯示的是VIREO的英文原版說明。',
 helpAdaptationTranslation:(list:string)=>`這是OpenVireo對VIREO內建說明的翻譯（其索引${list}以及索引所指向的文字檔；屬於網頁改編，不是CLEA的文本），顯示在VIREO說明檢視器的網頁版中。視窗大小、字型和系統提示音沒有重現。`,
 linkNoteTranslation:'在譯文中，按兩下「相關主題：」那一行下面的標題，或選取後按Enter鍵，即可開啟該主題。那裡的空白行在這裡不會有任何反應（在VIREO中則會顯示錯誤並停止）。',
 searchFoldNote:'在譯文中搜尋時，全形和半形、拉丁字母的重音符號以及大小寫都不加區分（網頁改編）；不能用拼音或注音找出漢字，也不能用簡體字找出繁體字。原文檢視中保留的VIREO內建搜尋，只忽略A到Z的大小寫。',
 spectralLines:Object.freeze({
  listCaption:'譜線',
  rows:'譜線',helpRows:'譜線說明文字',close:'關閉',
  loading:'正在載入VIREO的譜線清單……',
  error:'VIREO的譜線檔案（SPECLNS.LNL、SPECLNS.TXT）無法載入，或與記錄的大小和SHA-256不符。',
  retry:'重試',ok:'確定',
  note:'VIREO的譜線清單（SPECLNS.LNL）。按兩下一條譜線，或按Enter鍵，即可從SPECLNS.TXT閱讀它的說明。與VIREO一樣，說明是依譜線的名稱尋找的，因此有些譜線（例如較後面的He I譜線）顯示的是第一條同名譜線的段落。按一下（或按一下方向鍵），分類游標就會移到該譜線上，位置是顯示中最近的像素欄；清單隨後選取最接近該欄的譜線，這與VIREO相同（因此在完整檢視中，選擇Fe I 4143.878會選到He I 4143.76）。方向鍵遵循同樣的規則，所以下方向鍵無法從He I 4143.76移到Fe I 4143.88；使用End鍵或Home鍵，或按一下更後面的譜線，才能越過它。',
  cursorAt:(wl:string)=>`游標 @：${wl} Å（VIREO顯示的是游標所在像素欄的波長，而不是該譜線自身的波長）。`,
  cursorOutside:'該譜線在顯示範圍之外，因此不繪製游標（在VIREO中，游標讀數會被清除，或指向右邊緣之外）。',
  textErrorCaption:'說明檔案錯誤',
  textError:(file:string)=>`VIREO的譜線說明檔案（${file}）無法載入，或與記錄的大小和SHA-256不符。譜線清單保持開啟，請再試一次該譜線。`,
 }),
});
