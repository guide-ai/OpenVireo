// Front SC7 (docs/I18N.md, "Script groundwork: Unicode help (SC7)"): a test-only stand-in help set in Japanese script, laid out
// as a translated help set in VIREO's own file format (CAMHLP.LST, CAMHLP.TXT, Reminder.obs). Written for the viewer's structure
// and script tests, not reviewed and not a translation; never in the build. Its long lines are deliberate (the viewer wraps them).
export const JA=Object.freeze({
 'CAMHLP.LST':`'ＣＣＤ画像の撮影' 'begin'
'露出時間の設定' 'CamHlp.txt'
'フィルターの設定' 'CamHlp.txt'
'ゲインの設定' 'CamHlp.txt'
'露光の開始' 'CamHlp.txt'
'画像の保存' 'CamHlp.txt'
'画像の解析' 'CamHlp.txt'
'ＣＣＤ画像の撮影' 'end'
'データ機能' 'begin'
'カメラのパラメーター' 'CamHlp.txt'
'データ機能' 'end'
'ユーザーインターフェース' 'begin'
'画像表示' 'CamHlp.txt'
'スライダースイッチ' 'ObsrvHlp.txt'
'ＣＣＤカメラを閉じる' 'CamHlp.txt'
'ユーザーインターフェース' 'end'
`,
 'CAMHLP.TXT':`**露出時間の設定**
カメラの露出時間を設定するには：

    1)  「露出時間」の欄に値（整数または小数）を入力します。

    2)  スライダースイッチを「秒」または「分」に合わせます。

関連項目：
    露光の開始

**フィルターの設定**
フィルターのスライダースイッチでカメラのフィルターを選びます。「NF」の位置はフィルターなしという意味です。

関連項目：
    露光の開始

**ゲインの設定**
ゲインは、記録される画像で１単位になるのに必要な光子の数です。ふつうは先生の指示がない限り１のままにします。

関連項目：
    露光の開始

**露光の開始**
ＣＣＤカメラと赤外線カメラで露光するには：

    1)  露出時間を設定します。

    2)  「スタート」ボタンを押すと、カメラは初期化されてからシャッターを開き、露光を始めます。「カメラの状態」と「露光タイマー」の表示で進み具合がわかります。

    3)  画像がよければ、解析のために保存します（𠮷は代用対のテスト用の字です）。

関連項目：
    露出時間の設定
    フィルターの設定
    ゲインの設定
    画像表示
    画像の保存

**画像の保存**
撮ったばかりの画像を保存するには、カメラの制御パネルのメニューから「File」→「Save Image」を選びます。

関連項目：
    画像の解析

**画像の解析**
ＣＣＤ画像を見たり解析したりするVIREOのモジュールには、位置測定モジュールと画像処理（DS9）モジュールがあります。

関連項目：
    観測所の制御パネルの「Help」メニューにある「Tools」の項目。

**カメラのパラメーター**
検出器の情報とパラメーターを見るには、「File」→「Information...」を選びます。

**画像表示**

**ＣＣＤカメラを閉じる**
ＣＣＤカメラの制御パネルを閉じて望遠鏡の制御パネルに戻るには、メニューから「File」→「Exit CCD Camera」を選びます。

関連項目：
    画像の保存
`,
 'REMINDER.OBS':`CLEAの「仮想教育天文台」ソフトウェアをご利用いただきありがとうございました。勉強になり、楽しんでいただけたなら幸いです。

この実習を本当にすべて終えましたか？
`,
});
