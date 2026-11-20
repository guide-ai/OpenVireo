import type {OBJECT_X_MEASURE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front JA6: Japanese (ja) for the E08 position-measuring tool (blink, centroids, plate solution, motion). A web adaptation by
 * OpenVireo, not CLEA's. No string names or describes a particular target. */
export const OBJECT_X_MEASURE_JA:Translation<typeof OBJECT_X_MEASURE_EN>=Object.freeze({
 title:'位置を測定',
 intro:'2枚の画像をブリンク比較して動いたものを見つけ、光源をクリックして測定します。位置天文学的な解を得るには、1枚の画像でカタログ座標のある基準星を3つ以上マークするか、画像のヘッダーに書かれた画像座標を使ってください。',
 adaptation:'Web版の調整：元の実習は、画像を外部のCLEA位置天文学ツールキット（Astrometry Toolkit）に送ります。このツールはそのユーザーガイドに沿っており（8ピクセル以内で最も明るいピクセル、3乗の重み、6つのプレート定数）、移植ではありません。',
 frame:(n,label)=>`画像${n}：${label}`,noFrames:'読み込まれた画像はありません。',
 blinkStart:'ブリンクを開始',blinkStop:'ブリンクを停止',blinkInterval:'ブリンク間隔（ms）',showFrame:'画像を表示',
 roleTarget:'目標',roleReference:'基準星',roleLegend:'次のマーク：',
 refRa:'カタログの赤経（時 分 秒）',refDec:'カタログの赤緯（° ′ ″）',refInvalid:'基準星の赤経を時 分 秒で、赤緯を° ′ ″で入力してください。',
 cursor:(x,y)=>`カーソルのx座標${x}、y座標${y}`,measure:'カーソル位置を測定',viewport:'画像です。矢印キーでカーソルを動かし、Enterキーで測定します',
 keyboardHelp:'矢印キーでカーソルが1ピクセル動きます（Shiftキーを押すと10ピクセル）。Enterキーまたはスペースキーで測定します。',
 rangeLow:'下限カット',rangeHigh:'上限カット',
 rangeNote:'カットは、表示のストレッチと重心の重みの両方を決めます（Web版の既定：下限は空のレベルである画像の中央値、上限は画像の範囲の50 %）。「カーソル位置を測定」で下限カットを超える光源が見つからないときは、下限カットを下げるか、露出時間を長くしてください。',
 blinkAligned:'各画像の最初の2つの基準星で位置を合わせて、ブリンク比較しています。',
 blinkRaw:'未加工の画像をブリンク比較しています（同じ指向を前提としています）。位置を合わせるには、各画像で基準星を2つマークしてください。',
 plateTitle:'位置天文学的な解',plateFrame:(n,refs)=>`画像${n}：基準星${refs}個`,plateNone:(n,refs)=>`画像${n}：基準星${refs}個（3個以上必要です）`,
 plateDegenerate:n=>`画像${n}：基準星がほぼ一直線上にあります。`,plateRms:(rms,scale)=>`rms ${rms}″、スケール${scale}″/ピクセル`,colResidual:'残差（″）',
 table:'測定結果',colFrame:'画像',colRole:'マーク',colX:'x',colY:'y',colRa:'赤経',colDec:'赤緯',colUt:'UT',colMethod:'解',remove:'削除',
 notSolved:'解なし',methodPlate:'プレート定数',methodWcs:'ヘッダーのWCS',
 motion:(rate,pa,arcsec,hours)=>`動き：位置角${pa}°の向きに${rate}″/h（${hours}時間で${arcsec}″）。`,
 motionNone:'動きを求めるには、異なる時刻に撮った2枚の画像で目標を測定してください。',
 errors:Object.freeze({bounds:'カーソルが画像の外にあります。',range:'下限カットは上限カットより小さくしてください。','no-signal':'カーソルの近くに、下限カットを超える光源がありません。',references:'マークが多すぎます。先にいくつか削除してください。',degenerate:'基準星がほぼ一直線上にあります。ほかの星を選んでください。',wcs:'この画像には、使える座標ヘッダーがありません。',time:'2枚の画像の時刻が同じです。'}),
});
