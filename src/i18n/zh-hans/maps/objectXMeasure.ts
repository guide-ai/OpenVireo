import type {OBJECT_X_MEASURE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front ZH6: Simplified Chinese (zh-Hans) for the E08 position-measuring tool (blink, centroids, plate solution, motion). A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through vireo() (originals.json). No string names or describes a particular target. */
export const OBJECT_X_MEASURE_ZH_HANS:Translation<typeof OBJECT_X_MEASURE_EN>=Object.freeze({
 title:'测量位置',
 intro:'对两张图像进行闪视比较，找出移动的天体，再点击光源进行测量。要得到天体测量解，可在一张图像上标记至少三颗带有星表坐标的参考星，也可以使用图像头中写明的图像坐标。',
 adaptation:'网页改编：原版会把图像发送到外部的CLEA天体测量工具包（Astrometry Toolkit）。本工具遵循该工具包的用户指南（8个像素内最亮的像素、立方权重、六个底片常数），并不是它的移植。',
 frame:(n,label)=>`图像${n}：${label}`,noFrames:'尚未载入图像。',
 blinkStart:'开始闪视',blinkStop:'停止闪视',blinkInterval:'闪视间隔（ms）',showFrame:'显示图像',
 roleTarget:'目标',roleReference:'参考星',roleLegend:'下一个标记是',
 refRa:'星表赤经（时 分 秒）',refDec:'星表赤纬（° ′ ″）',refInvalid:'请按时 分 秒输入参考星的赤经，按° ′ ″输入赤纬。',
 cursor:(x,y)=>`光标x ${x}，y ${y}`,measure:'在光标处测量',viewport:'图像；方向键移动光标，Enter键进行测量',
 keyboardHelp:'方向键每次将光标移动一个像素（按住Shift键：十个像素）。按Enter键或空格键进行测量。',
 rangeLow:'下限截值',rangeHigh:'上限截值',
 rangeNote:'截值同时决定显示拉伸和质心权重（网页默认：下限取天光背景水平，即图像中值；上限取图像范围的50%）。如果“在光标处测量”在下限截值以上找不到光源，请降低下限截值，或延长曝光时间。',
 blinkAligned:'已按每张图像的前两颗参考星对齐后闪视。',
 blinkRaw:'正在闪视原始图像（假定指向相同）；要对齐它们，请在每张图像上标记两颗参考星。',
 plateTitle:'天体测量解',plateFrame:(n,refs)=>`图像${n}：${refs}颗参考星`,plateNone:(n,refs)=>`图像${n}：${refs}颗参考星（至少需要3颗）`,
 plateDegenerate:n=>`图像${n}：这些参考星几乎在一条直线上。`,plateRms:(rms,scale)=>`rms ${rms}″，比例尺${scale}″/像素`,colResidual:'残差（″）',
 table:'测量',colFrame:'图像',colRole:'标记',colX:'x',colY:'y',colRa:'赤经',colDec:'赤纬',colUt:'UT',colMethod:'解',remove:'移除',
 notSolved:'未求解',methodPlate:'底片常数',methodWcs:'图像头WCS',
 motion:(rate,pa,arcsec,hours)=>`运动：朝位置角${pa}°方向，速率${rate}″/h（${hours} h内移动${arcsec}″）。`,
 motionNone:'在不同时间拍摄的两张图像上测量目标，即可得到它的运动。',
 errors:Object.freeze({bounds:'光标在图像之外。',range:'下限截值必须低于上限截值。','no-signal':'光标附近没有高于下限截值的光源。',references:'标记过多；请先移除一些。',degenerate:'这些参考星几乎在一条直线上；请选择其他参考星。',wcs:'这张图像没有可用的坐标头。',time:'两张图像的时间相同。'}),
});
