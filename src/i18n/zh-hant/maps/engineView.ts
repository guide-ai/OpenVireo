import type {ENGINE_VIEW_EN} from '../../../SpectrumEngineMessages';
import type {Translation} from '../../maps';
/** Front ZT1: Traditional Chinese (zh-Hant, Taiwan) for the measuring engine's web strings (zoom window, pan and readout), adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's. */
export const ENGINE_VIEW_ZH_HANT:Translation<typeof ENGINE_VIEW_EN>=Object.freeze({
 panLeft:'將視窗向左平移100 Å',
 panRight:'將視窗向右平移100 Å',
 readoutEmpty:'在圖中拖曳，或聚焦圖後使用方向鍵，即可讀取波長。',
 nearest:'最近的比較譜線',
 nearestNone:'游標100 Å範圍內沒有比較譜線。',
 nearestFound:(label:string,shifted:string)=>`最近的比較譜線：${label}，位於${shifted} Å。`,
 plotHelp:'光譜圖。拖曳或使用方向鍵移動游標；按一下滑鼠右鍵或按N鍵可檢視最近的比較譜線。',
 window:(min:string,max:string)=>`視窗${min}–${max} Å`,
 fullViewNote:'「完整檢視」和「H / K檢視」是網頁預設；「縮放」和方向鍵作用於一般檢視。',
 note:'與VIREO一樣，「縮放」從已載入光譜的起點開始，以100 Å為步長選擇視窗，並先把z控制項併入其基準（與「重新置中控制項」相同）；方向鍵每次將視窗移動100 Å，並可能越過光譜兩端，但越過不足100 Å；讀數顯示的是游標所在位置的觀測波長和游標在圖軸上的高度，而不是光譜的值。',
});
