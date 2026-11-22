import type {VARIABLE_STARS_EN} from '../../../variables/VariableStarMessages';
import type {Translation} from '../../maps';
/** Front ZT2: Traditional Chinese (zh-Hant, Taiwan) for the variable-star page's web text (the header menu name came with Front ZT0), adapted from the reviewed zh-Hans with the English as the source. A web adaptation
 * by OpenVireo, not CLEA's; VIREO's own captions (Variable Star Data, Simulated Light Curve, their menus and the print lines) are translated
 * through vireo() (originals.json). Chinese has one plural form, so no plural() call is needed. */
const grouped=(n:number)=>n.toLocaleString('en-US');
export const VARIABLE_STARS_ZH_HANT:Translation<typeof VARIABLE_STARS_EN>=Object.freeze({
 nav:'變星',
 title:'變星與光變曲線',
 scope:'在VIREO變星星表（CLEA_VStrs.dat，31,147筆記錄）中尋找一顆恆星，讀取其星表資料，並顯示VIREO為它模擬的光變曲線。',
 adaptation:'網頁改編：在VIREO中，這些資料屬於講師途徑（編輯模式）：在「星表天體」方塊中輸入GCVS，或在望遠鏡控制面板中依序選擇「視野資訊 › 變星 › 取得所選資料」。在本站開啟編輯模式（「光學模擬選項」）後，這兩種方式都可以使用；本頁還允許任何人直接搜尋星表。「變星資料」和「模擬光變曲線」視窗遵循原版。',
 guideTitle:'如何使用此工具',
 guide:[
  '輸入恆星名稱的一部分（例如「del Cep」或「RR Lyr」），或選擇一種變光類型，然後按某一列的「開啟」。',
  '「變星資料」視窗列出星表數值：位置、類型、極大星等、極小星等（或在左括號之後給出振幅）、星表曆元（VIREO把它畫作極大亮度，儘管食雙星的星表給出的是極小）、週期、上升時間（M-m/D）和光譜。',
  '選擇「資料 › 顯示光變曲線」，即可看到1.5個週期的模擬光變曲線。無論類型為何，VIREO都把星表曆元畫作極大亮度（相位0）。',
  '使用「資料 › 儲存文字 › 依顯示內容」把清單下載為文字檔案，或使用「列印」將其列印。',
 ],
 guideModel:'關於這條曲線：VIREO對每種類型都畫出同一種造父變星形狀的曲線，僅由星表中的極大星等、極小星等、週期和M-m/D建構（星表未給出時取50%）。它沒有雜訊，也不是觀測結果。食雙星和不規則變星實際上並不是這個樣子。',
 loading:'正在載入變星星表……',
 loadError:'無法載入隨附的變星星表，或其與記錄的大小和SHA-256不一致。請重新整理頁面再試一次。',
 searchTitle:'尋找變星',
 nameLabel:'星名包含',
 typeLabel:'變光類型',
 allTypes:'所有類型',
 typeOption:(type:string,count:number)=>`${type||'（空白）'} — ${grouped(count)}`,
 results:(shown:number,total:number)=>total===0?'沒有符合的記錄。':shown<total?`在${grouped(total)}筆符合的記錄中，按星表（赤經）順序顯示前${shown}筆。縮小搜尋範圍以查看其他記錄。`:`共${grouped(total)}筆符合的記錄。`,
 columns:['GCVS ID','類型','赤經（h）','赤緯（°）','極大','極小／振幅','週期（天）',''],
 open:'開啟',
 openLabel:(name:string)=>`開啟${name}`,
 noPeriod:'—',
 listTypeCodesNote:'在VIREO中，這個選單項目只切換它自己的勾選標記；沒有其他任何功能讀取它。',
 saveAdaptation:'網頁改編：文字透過你的瀏覽器下載（清單每列一行文字，使用Windows換行字元），而不是透過「儲存」對話方塊。',
 riseDefaultedNote:'這筆記錄沒有M-m/D值。開啟其光變曲線時，已像VIREO一樣在記憶體中把它設為50%，因此清單現在顯示0.50。',
 curveLabel:(name:string)=>`${name}的模擬光變曲線：星等隨相位的變化，從星表曆元起1.5個週期。`,
 unavailable:Object.freeze({
  'period-zero':'沒有曲線：這筆記錄沒有週期（0天）。VIREO會除以週期，並在畫完座標軸後因浮點錯誤而停止，因此不繪製任何曲線點。',
  'zero-decline-fraction':'沒有曲線：M-m/D為100%，因此曲線下降部分的長度為零，VIREO在繪製它之前會因浮點錯誤而停止。',
  'axis-range-zero':'沒有光變曲線視窗：最亮和最暗的座標軸界限相等，VIREO在顯示視窗之前會除以它們的差值。',
  'magnitude-system-empty':'星等系統的文字為空：VIREO在畫完星等軸後會報錯並停止繪製，因此不繪製相位軸和曲線。',
  'non-finite':'沒有曲線：這筆記錄中有一個值超出了模型所能計算的範圍。',
 }),
 curveAdaptation:'此圖保留了VIREO的版面配置、顏色和像素位置；字型有所不同。',
 printTitle:(caption:string)=>`列印——${caption}`,
 printHelp:'VIREO印在紙上的內容的列印預覽：日期和時間（此處採用你瀏覽器的格式）、實驗檯編號列、在VIREO中輸入的學生和實驗列（本站沒有，因此用預留文字代替）、清單各列，以及光變曲線的圖。頁面版面配置和字型未重現。VIREO的列印工作標題不會列印在頁面上。',
 printCurveLayout:(monochrome:boolean)=>`光變曲線頁面按此處所選的方向遵循VIREO的列印內容（VIREO使用印表機的方向）：直向時，圖接在同一頁上；橫向時，VIREO會加上「（螢幕影像列印在下一頁）」，並把圖列印在第2頁。${monochrome?'「彩色列印」已關閉，因此圖以白底黑色列印。':'「彩色列印」已開啟，因此圖以螢幕上的顏色列印。'}VIREO會把圖疊畫在標題列上；這裡則把它放在標題列下方。`,
 printOrientation:'頁面方向',
 portrait:'直向',
 landscape:'橫向',
 printStudentPlaceholder:'［在VIREO中輸入的學生和實驗文字：本站未復原］',
 printButton:'列印…',
 printClose:'關閉預覽',
 printError:'此瀏覽器視窗無法列印。',
});
