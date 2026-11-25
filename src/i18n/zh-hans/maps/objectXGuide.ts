import type {OBJECT_X_GUIDE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front ZH6: Simplified Chinese (zh-Hans) for the E08 guide. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through vireo() (originals.json). The observatory controls it quotes are the Chinese of the observatory's own buttons (sky.coordinates: 输入坐标, sky.pointCoordinates: 指向坐标, sky.view › sky.telescope: 视场 › 望远镜 · 15′, motion.selected: 转动到所选天体). No string names or describes a particular target. */
export const OBJECT_X_GUIDE_ZH_HANS:Translation<typeof OBJECT_X_GUIDE_EN>=Object.freeze({
 eyebrow:'实验E08指南',title:'探寻天体X',
 intro:'你只会得到一个标识符和坐标。用仪器判断它是哪一类天体，然后揭晓它的身份。这些步骤会随着你的操作更新；揭晓之前，不会对你的答案做任何评判。',
 why:'给你的坐标处是哪一类天体？在揭晓它的身份之前，你将用天文台的仪器作出判断。',
 counts:(done,total,images)=>`共${total}步，已完成${done}步 · 你的天体的图像${images}张`,
 done:'（已完成）',todo:'（待完成）',
 steps:Object.freeze({
  target:['获取你的天体','在天体X页面输入你的ID，然后选择或随机获得一个天体代码。'],
  clock:['设置日期和时间','设置天文台时钟；原版实验从2009-06-01 04:00 UT开始。'],
  list:['建立小行星列表','设置时钟时会建立该日期可观测的小行星列表，你的图像会包含这些小行星；只有更改了轨道文件或极限星等之后，才需要重新建立。'],
  image:['拍摄视场','将坐标复制到天文台，打开圆顶，打开“输入坐标”，点击“指向坐标”（不是“转动到所选天体”），选择“视场 › 望远镜 · 15′”，开启跟踪，然后拍摄一张CCD图像（不用滤光片、曝光2分钟，更容易看到暗弱的天体）。'],
  repeat:['稍后再拍一次','30–60分钟后，对同一视场再拍一张图像：在天体X页面输入较晚的时间并点击“设置天文台时钟”，然后回到天文台。快速移动的天体在长时间曝光中会留下一小段轨迹。在之后的夜晚，设置时钟时会按新日期重新建立小行星列表，而快速移动的近地小行星（每天超过2°）已经离开了视场：请在它最初的位置附近寻找。'],
  measure:['比较两张图像','对两张图像进行闪视比较。如果有天体移动了，就在两张图像上分别测量，得到它的速率和方向。太阳系之外的天体不会移动。'],
  classify:['判断它是什么','如果没有天体移动，就用射电望远镜寻找脉冲，并采集一条光谱（天体X页面上的光谱仪或多目标光谱仪），用来分辨恒星、星系和类星体；你可以把它保存为.SSP文件并进行分类。'],
  describe:['描述你的证据','写下你用每种仪器看到的情况。'],
  reveal:['揭晓身份','揭晓这个天体，并与你的答案对照。'],
  save:['保存你的探究','使用工具栏中的“保存探究”；也请保留你的图像的FITS文件。'],
 }),
 progress:'你的进度',go:'前往天体X',goObservatory:'前往天文台',
 close:'关闭天体X指南',return:'返回',
});
