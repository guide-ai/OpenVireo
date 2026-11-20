import type {NAKED_EYE_MESSAGES_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front ZH1: Simplified Chinese (zh-Hans) for the naked-eye sky through the open dome (Naked Eye Star). A web adaptation by OpenVireo, not CLEA's. */
export const NAKED_EYE_ZH_HANS:Translation<typeof NAKED_EYE_MESSAGES_EN>=Object.freeze({
 eyebrow:'VIREO · 圆顶已打开',title:'肉眼可见的天空',
 help:'通过打开的圆顶，你用肉眼能看到的亮星（V ≤ 5.5），按VIREO的绘制方式呈现：约31°宽、40°高，以望远镜所指方向、地平线之上45°为中心。右键点击一颗星（或用方向键移动光标后按Enter）即可查看它的数据。',
 skyLabel:'透过圆顶看到的肉眼可见天空。右键点击一颗星，或用方向键和Enter，即可打开“肉眼可见恒星”。',
 loading:'正在载入肉眼可见恒星文件…',
 fileError:'无法载入肉眼可见恒星文件（NkdEye.dat），或其与记录的大小和SHA-256不符。',
 caption:(site:string,utc:string,count:number)=>`${site} · ${utc} UT（圆顶打开的时刻；关闭后重新打开圆顶即可重绘）· 视野内共${count}颗星。`,
 adaptation:'网页改编：星星按VIREO的亮度等级绘制为圆盘，而不是它的星点精灵图，圆顶的活门也不绘制。位置、可见区域（包括VIREO的一个怪异之处：朝南时，中线以西一点的许多星会被丢掉）以及右键点击拾取，都与原版一致。',
 showAtCursor:'显示光标处的星',
 tapAdaptation:'面向触摸屏的网页改编：点按天空移动光标（+），再按“显示光标处的星”。仅点按不会打开该星，因为在VIREO中左键单击什么也不会发生。',
 magNote:'与VIREO一样，可以输入V星等，但不会保存任何内容。',
});
