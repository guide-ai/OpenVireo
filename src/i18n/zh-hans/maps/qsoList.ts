import {HST_ARCHIVE} from '../../../core/observatoryMenuLiterals';
import type {QSO_LIST_MESSAGES_EN} from '../../../observatory/QsoListMessages';
import type {Translation} from '../../maps';
/** Front ZH1: Simplified Chinese (zh-Hans) for the QSO List and the HST Image Archive item. A web adaptation by OpenVireo, not CLEA's. */
export const QSO_LIST_ZH_HANS:Translation<typeof QSO_LIST_MESSAGES_EN>=Object.freeze({
 virtualObservatoryLabel:'虚拟天文台（讲师，VIREO）',
 virtualObservatoryAdaptation:'网页改编：在VIREO中，这个默认关闭的讲师选项会启用“运行实验 › 虚拟天文台（所有仪器）”，也就是学生可以使用“文件 › QSO列表”的模式。在这里，它只在讲师模式（演示模式的网页形式，无需密码）下才会打开；默认关闭，页面不会保存它（只有“保存更新”会把它写入你自行保管的选项文件），“退出”会将其关闭，它唯一的作用是显示“文件 › QSO列表”。',
 sortDisabled:'与VIREO一样，“排序选项”仅在编辑模式下可用；没有它时，列表按星等排序。',
 limitLabel:'星等极限，V',
 withheld:'靠近天体X目标的行不会列出，这样列表就无法揭示尚未揭晓的天体X目标是什么（网页规则；VIREO只在其虚拟天文台模式下，或在天体X实验期间的编辑模式下显示此列表）。',
 editModeColumns:'编辑模式的列：Z是星表红移；括号中的B−V和U−B是指定的平均颜色。此列表中没有任何实验目标。',
 noActivate:'与VIREO一样，双击某一行不会有任何作用；用“选择”将QSO添加到目标列表。',
 csvDisabled:'VIREO中此列表的“逗号分隔”已停用。',
 modeless:'观测时，列表会保持打开；要更改星等极限或排序，再次选择“文件 › QSO列表”。',
 printStudent:'网页改编：未开启编辑模式时，VIREO会在日期下方打印实验台编号和学生姓名；本站两者都不记录，因此打印VIREO的“（未记录）”，不打印姓名。',
 fileError:(reason:string)=>`网页改编：内置副本${reason}。`,
 fileReasons:Object.freeze({download:'无法下载',size:'大小与记录的不一致',sha256:'与记录的SHA-256不符'}),
 objectXUnavailable:'无法显示QSO列表：未能载入天体X目标的位置，没有这些位置，列表就可能揭示尚未揭晓的目标。',
 loading:'正在载入QSO星表…',
 noSelection:'先选择一行QSO。',
 hst:Object.freeze({
  newTab:'（外部网站，在新标签页中打开）',
  note:`网页改编：VIREO曾在浏览器窗口中打开${HST_ARCHIVE.defaultUrl}（VIREO“文件选项”（File Options）中的“${HST_ARCHIVE.optionsLabel}”）。该页面已不存在；此链接会打开它在hubblesite.org上的当前对应页面，NASA现将其作为哈勃图像库（Hubble Images）提供。链接不会发送任何数据。`,
 }),
});
