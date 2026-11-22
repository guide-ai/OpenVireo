// Front ZT-HELP [W]: OpenVireo's Traditional Chinese (zh-Hant, Taiwan) web adaptation of VIREO's WdgPltHlp.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Traditional Chinese chunk.
export const language='zh-Hant';
export const sourceName='WdgPltHlp.TXT';
export const sourceSha256='01d062eb13b41a197aa6123256a991c5b4b4194b47968d816d60d1302f5fd10e';
export const text=`**繪製資料**
LSS楔形圖工具將紅移資料顯示為二維「楔形圖」。當你用光譜測量工具記錄資料
時，資料點會自動出現在楔形圖上。你也許還能讓小組內其他人測得的資料自動顯
示在你的楔形圖上。

相關主題：
    載入資料
    列印楔形圖
    「楔形圖選項」下的主題
    「自動繪圖」下的主題

**載入資料**
以前儲存的LSS紅移資料可以載入並顯示在楔形圖上。在主選單（而不是楔形圖工
具選單）中選擇「工具」（Tools）->「結果編輯器」（Results Editors）->「觀
測結果」（Observational Results）->「載入已儲存資料」（Load Saved
Data）。載入的資料隨後會出現在楔形圖上。

注意：
    1) 在LSS實驗中載入用於繪圖的資料，必須是從LSS實驗中儲存的。VIREO其他
       實驗的資料不相容。

    2) 先前（舊版）CLEA的LSS實驗的楔形圖資料與VIREO版本不相容。

**列印楔形圖**
要列印楔形圖，在選單中選擇「檔案」（File）->「列印楔形圖...」（Print
Wedge Plot...）。繪圖通常以黑白列印。你會看到顯示切換為黑白，在擷取列印
影像之後又切換回彩色。

**設定格線類型**
你可以把楔形圖上的格線顯示設為速度、紅移「z」參數，或無格線。要設定格線
類型，在楔形圖選單中選擇「檔案」（File）->「選項...」（Options...），然
後在「格線類型」（Grid Type）方塊中做出選擇。

**設定點大小**
要變更LSS楔形圖上所繪點的大小，在楔形圖選單中選擇「檔案」（File）->「選
項...」（Options...），然後在「已繪製的點」（Plotted Points）方塊中選擇
大小。

相關主題：
    設定點樣式

**設定點樣式**
LSS楔形圖上所繪的點可以是空心圓或實心圓。要變更樣式，在楔形圖選單中選擇
「檔案」（File）->「選項」（Options），然後在「已繪製的點」（Plotted
Points）方塊中選擇樣式。

相關主題：
    設定點大小

**開啟／關閉自動繪圖**
要使用LSS自動繪圖功能，必須由你的講師在共用裝置上建立一個小組檔案，讓你
和小組內其他人都能（讀／寫）存取。然後你需要在程式中指定該路徑和檔案，並
設定更新間隔。（見相關的說明主題。）要開啟或關閉自動繪圖功能，在楔形圖選
單中選擇「檔案」（File）->「選項...」（Options...），然後勾選標有「自動
繪圖」（Auto Plot On）的方塊。

相關主題：
    設定自動繪圖檔案名稱／路徑
    設定自動繪圖更新間隔

**設定自動繪圖檔案名稱／路徑**
要設定自動繪圖的檔案名稱和路徑，在楔形圖選單中選擇「檔案」（File）->「選
項...」（Options...）。確認標有「自動繪圖」（Auto Plot On）的方塊已勾
選。然後在相應的方塊中輸入小組繪圖檔案的路徑和檔案名稱。（所需的路徑和檔
案名稱必須由你的講師提供給你。）你也可以用「瀏覽...」（Browse...）按鈕設
定路徑。

相關主題：
    開啟／關閉自動繪圖
    設定自動繪圖更新間隔

**設定自動繪圖更新間隔**
要設定自動繪圖的更新間隔，在楔形圖選單中選擇「檔案」（File）->「選
項...」（Options...）。確認標有「自動繪圖」（Auto Plot On）的方塊已勾
選。然後在相應的方塊中輸入以分鐘為單位的更新間隔。

每當到達更新間隔，你的程式就會存取小組繪圖檔案。你測得的任何新資料都會複
製到小組檔案中，小組內其他人傳送到小組檔案的任何新資料都會複製到你的程式
中，並顯示在你的楔形圖上。所繪點的顏色會表明哪些點是你測量的，哪些是小組
內其他人測量的。

相關主題：
    開啟／關閉自動繪圖
    設定自動繪圖檔案名稱／路徑
`;
