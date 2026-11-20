import type {ENGINE_VIEW_EN} from '../../../SpectrumEngineMessages';
import type {Translation} from '../../maps';
/** Front JA2: Japanese (ja) for the measuring engine's web strings (zoom window, pan and readout). A web adaptation by OpenVireo, not CLEA's. */
export const ENGINE_VIEW_JA:Translation<typeof ENGINE_VIEW_EN>=Object.freeze({
 panLeft:'ウィンドウを左へ100 Å移動',
 panRight:'ウィンドウを右へ100 Å移動',
 readoutEmpty:'プロット上をドラッグするか、プロットにフォーカスを置いて矢印キーを使うと、波長を読み取れます。',
 nearest:'最も近い比較線',
 nearestNone:'カーソルから100 Å以内に比較線はありません。',
 nearestFound:(label:string,shifted:string)=>`最も近い比較線：${label}（${shifted} Å）。`,
 plotHelp:'スペクトルのプロットです。ドラッグするか矢印キーを使うと、カーソルを動かせます。右クリックするかNキーを押すと、最も近い比較線を表示します。',
 window:(min:string,max:string)=>`ウィンドウ${min}–${max} Å`,
 fullViewNote:'「全体表示」と「H / K表示」はWeb版のプリセットです。「ズーム」と矢印は通常の表示に適用されます。',
 note:'VIREOと同様に、「ズーム」は読み込んだスペクトルの先頭から100 Å刻みでウィンドウを選び、その前にzの操作をベースに取り込みます（「中心を合わせる」と同じです）。矢印はウィンドウを100 Åずつ移動し、端を100 Å未満だけ越えることがあります。読み取り値に表示されるのは、カーソル位置の観測波長と、プロット軸上のカーソルの高さであり、スペクトルの値ではありません。',
});
