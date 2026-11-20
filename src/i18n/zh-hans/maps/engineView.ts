import type {ENGINE_VIEW_EN} from '../../../SpectrumEngineMessages';
import type {Translation} from '../../maps';
/** Front ZH2: Simplified Chinese (zh-Hans) for the measuring engine's web strings (zoom window, pan and readout). A web adaptation by OpenVireo, not CLEA's. */
export const ENGINE_VIEW_ZH_HANS:Translation<typeof ENGINE_VIEW_EN>=Object.freeze({
 panLeft:'将窗口向左平移100 Å',
 panRight:'将窗口向右平移100 Å',
 readoutEmpty:'在图中拖动，或聚焦图后使用方向键，即可读取波长。',
 nearest:'最近的比较谱线',
 nearestNone:'光标100 Å范围内没有比较谱线。',
 nearestFound:(label:string,shifted:string)=>`最近的比较谱线：${label}，位于${shifted} Å。`,
 plotHelp:'光谱图。拖动或使用方向键移动光标；右键点击或按N键可查看最近的比较谱线。',
 window:(min:string,max:string)=>`窗口${min}–${max} Å`,
 fullViewNote:'“完整”和“H/K”视图是网页预设；“缩放”和方向键作用于普通视图。',
 note:'与VIREO一样，“缩放”从已载入光谱的起点开始，以100 Å为步长选择窗口，并先把z控件并入其基准（与“重新居中”相同）；方向键每次将窗口移动100 Å，移出两端的距离可能不足100 Å；读数显示的是光标所在位置的观测波长和光标在图轴上的高度，而不是光谱的值。',
});
