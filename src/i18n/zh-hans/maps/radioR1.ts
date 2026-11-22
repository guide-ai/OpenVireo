import type {RADIO_R1_MESSAGES_EN} from '../../../components/RadioR1Messages';
import type {Translation} from '../../maps';
/** Front ZH5: Simplified Chinese (zh-Hans) for the Front R1 radio web texts. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_R1_ZH_HANS:Translation<typeof RADIO_R1_MESSAGES_EN>=Object.freeze({
 saveDataNote:'VIREO的“文件 ▸ 保存已记录的数据...”（SvRcData1Click 0x567f70）执行与脉冲星分析中“保存”相同的保存；存在已记录的数据时可用。在这里它会打开脉冲星分析，由其经过验证的保存写入接收数据（网页改编）。',
 optionEffectsTitle:'VIREO的这些设置有什么作用（按内置值显示，此处不可编辑）：',
 optionEffects:Object.freeze([
  '绘制脉冲星位置（Plot Pulsar Positions，关）：在射电天图上绘制星表中的脉冲星。',
  '写入目标列表文件（Write Hot List File，关）：显示“转动 ▸ 目标列表 ▸ 保存更新后的列表...”。',
  '目标列表精确位置（Exact Pos for Hot List，关）：“将当前项目添加到列表”保存脉冲星的星表位置，而不是当前指向。',
  '声音功能（Sound Features，开）：存在声音设备时，接收机会播放脉冲声音。',
  '测试模式（Test Mode，关）：这是讲师设置；“设置坐标”会让望远镜立即移动。',
  '脉冲星证认（Pulsar Identification，“使用B1950名称”）：用于命名接收机标题、记录头部以及“将当前项目添加到列表”生成的条目。',
  '望远镜类型（Telescope Type，全可动）：只有“仅中天观测”会改变VIREO的行为；阿雷西博没有自己的代码，行为与“全可动”相同。',
 ]),
 findNote:'“查找”会从开头或从所选行之后，搜索每条已存储的行（即“记录”写入的每次测量的原版文本），忽略大小写，不会绕回开头，与VIREO一致。与VIREO一样，它会以小写形式记住你上一次的搜索。网页改编：存储的文本来自本站；它与VIREO的文本可能在文件名末尾（浏览器不提供文件夹）有所不同，偶尔数字的最后一位也会不同。记住的搜索仅在此页面打开期间有效。',
 saveDataOff:'尚未记录任何内容：在分析中有已记录的数据之前，VIREO会让此项保持禁用。',
});
