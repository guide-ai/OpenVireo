import type {SPECTRAL_RANGE_EN} from '../../../SpectralRangeMessages';
import type {Translation} from '../../maps';
/** Front ZH2: Simplified Chinese (zh-Hans) for the spectrometer range's web strings. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions
 * are translated through vireo() (originals.json). */
export const SPECTRAL_RANGE_ZH_HANS:Translation<typeof SPECTRAL_RANGE_EN>=Object.freeze({
 current:(min:string,max:string)=>`光谱仪范围：${min}–${max} Å（600个区间）。`,
 note:'与VIREO一样，“确定”会在新范围上开始一次新的曝光（当前曝光会被丢弃）；“取消”保留原范围，“默认”恢复为3700–4700 Å。在模板覆盖范围之外（低于3510 Å），光源不产生计数，这与VIREO相同。与VIREO一样，这一范围是一项统一设置，由恒星、天空、哈勃星系、LSS、天体X和视场光谱仪这些路径以及“分类”共用；已有的曝光保留其拍摄时的范围[W]，恢复会话文件时，其中的范围会成为当前范围[W]。对话框中的每个范围都可用于这些路径以及多目标光谱仪上的恒星、星系、类星体和天空光谱；若某个星系的光谱未覆盖某个范围，或某个光源在该范围上对望远镜来说过亮，会给出相应提示。天体X只允许使用这样的范围：在这些范围上，每个目标的表现都与在3700–4700 Å时一致[W]。',
 objectXNote:'与VIREO一样，“确定”会在新范围上重新启动光谱仪（未保存的光谱会被丢弃）；“取消”保留原范围，“默认”恢复为3700–4700 Å。这一范围是与其他光谱仪路径共用的同一项设置。在此网页版本中，天体X只允许使用这样的范围：在这些范围上，每个天体X目标都能与在3700–4700 Å时完全一样地观测；其他任何范围对每个目标都给出同样的提示[W]。',
 skyNote:'天空光源与范围无关（VIREO在0x50df64的天空分支和Go 0x50f4da都不读取范围），因此只有600个区间的波长会改变。',
 notWitnessed:'此网页版本中无法在这里使用该光谱范围；请把范围改回3700–4700 Å（“默认”）后再观测。',
 multiSpecRange:(min:string,max:string)=>`多目标光谱仪读取光谱仪范围（${min}–${max} Å），而此网页版本中无法在这里使用该范围；请把它改回3700–4700 Å后再获取光谱。`,
 unavailable:'此网页版本中无法在这个范围上观测这颗恒星。',
 slider:(edge:string)=>`${edge}滑块`,
 locked:'“光谱范围...”已停用：与VIREO一样，“光学模拟选项”（光谱仪标签页）中的“允许用户更改”未勾选。这些选项在讲师模式下可以打开。',
});
