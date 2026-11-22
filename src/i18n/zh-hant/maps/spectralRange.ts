import type {SPECTRAL_RANGE_EN} from '../../../SpectralRangeMessages';
import type {Translation} from '../../maps';
/** Front ZT1: Traditional Chinese (zh-Hant, Taiwan) for the spectrometer range's web strings, adapted from the reviewed zh-Hans with the English as the source. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions
 * are translated through vireo() (originals.json). */
export const SPECTRAL_RANGE_ZH_HANT:Translation<typeof SPECTRAL_RANGE_EN>=Object.freeze({
 current:(min:string,max:string)=>`光譜儀範圍：${min}–${max} Å（600個區間）。`,
 note:'與VIREO一樣，「確定」會在新範圍上開始一次新的曝光（目前的曝光會被捨棄）；「取消」保留原範圍，「預設」還原為3700–4700 Å。在範本涵蓋範圍之外（低於3510 Å），天體不產生計數，這與VIREO相同。與VIREO一樣，這一範圍是一項統一設定，由恆星、天空、哈伯星系、LSS、天體X和視野光譜儀這些路徑以及「分類」共用；已有的曝光保留其拍攝時的範圍［W］，還原工作階段檔案時，其中的範圍會成為目前範圍［W］。對話方塊中的每個範圍都可用於這些路徑以及多目標光譜儀上的恆星、星系、類星體和天空光譜；若某個星系的光譜未涵蓋某個範圍，或某個天體在該範圍上對望遠鏡來說過亮，會給出相應提示。天體X只允許使用這樣的範圍：在這些範圍上，每個目標的表現都與在3700–4700 Å時一致［W］。',
 objectXNote:'與VIREO一樣，「確定」會在新範圍上重新啟動光譜儀（未儲存的光譜會被捨棄）；「取消」保留原範圍，「預設」還原為3700–4700 Å。這一範圍是與其他光譜儀路徑共用的同一項設定。在此網頁版本中，天體X只允許使用這樣的範圍：在這些範圍上，每個天體X目標都能與在3700–4700 Å時完全一樣地觀測；其他任何範圍對每個目標都給出同樣的提示［W］。',
 skyNote:'天空光源與範圍無關（VIREO在0x50df64的天空分支和Go 0x50f4da都不讀取範圍），因此只有600個區間的波長會改變。',
 notWitnessed:'此網頁版本中無法在這裡使用該光譜範圍；請把範圍改回3700–4700 Å（「預設」）後再觀測。',
 multiSpecRange:(min:string,max:string)=>`多目標光譜儀讀取光譜儀範圍（${min}–${max} Å），而此網頁版本中無法在這裡使用該範圍；請把它改回3700–4700 Å後再擷取光譜。`,
 unavailable:'此網頁版本中無法在這個範圍上觀測這顆恆星。',
 slider:(edge:string)=>`${edge}滑桿`,
 locked:'「光譜範圍...」已停用：與VIREO一樣，「光學模擬選項」（光譜儀分頁）中的「允許使用者變更」未勾選。這些選項在講師模式下可以開啟。',
});
