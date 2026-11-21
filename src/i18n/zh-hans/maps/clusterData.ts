import type {CLUSTER_DATA_MESSAGES_EN} from '../../../clusterdata/ClusterDataMessages';
import type {Translation} from '../../maps';
/** Front ZH4: Simplified Chinese (zh-Hans) for the cluster data dialogs' web text. A web adaptation by OpenVireo, not CLEA's; VIREO's own
 * captions are translated through vireo() (originals.json). */
export const CLUSTER_DATA_ZH_HANS:Translation<typeof CLUSTER_DATA_MESSAGES_EN>=Object.freeze({
 menuNote:'VIREO在其测光、赫罗图和全部仪器模式中显示“文件 › 星团数据...”；本站没有模式，所以它始终都在。',
 groupsDisabled:'“列表类型”和“排序方式”在VIREO中是讲师（编辑模式）设置；没有编辑模式时，列表是学生用的查找列表，按赤经排序。',
 useTelescopeOff:'“使用望远镜坐标”需要圆顶打开且跟踪开启，就像VIREO需要望远镜驱动开启一样。',
 loading:'正在载入星团数据…',loadError:'无法载入星团数据。',
 unavailableCaption:'星团数据',
 tileReason:Object.freeze({
  polar:'此处无法生成这份列表：离天极这么近时，VIREO围绕中心的矩形会发生折叠，本站没有复现这种情况。请把中心稍微移离天极。',
  regions:'此处无法生成这份列表：该矩形覆盖的星表分区超过100个，多于VIREO保留的数量。请使用更小的直径。',
  budget:'此处无法生成这份列表：该矩形包含的星表记录比本站一次能读取的更多。请使用更小的直径。',
  'band-end':'此处无法生成这份列表：在这个中心，VIREO会读到星表文件末尾之外并报错停止。',
  plan:'此处无法生成这份列表：某个星表分块不在预期的位置。',
 }),
 tileFetch:'无法载入此视场所需的星表分块。请检查网络连接后重试。',
 reportNoteTiles:'这份列表是VIREO对完整导星星表（Guide Star Catalog，从本站的星表分块读取）在对话框所设中心和直径处的查询，并按极限星等筛选。位置和星等来自星表；只有已发布的16个星团附有注释。',
 spectral:'无法显示这份列表：此视场中某个光谱代码没有还原出的文字。',
 editModeColumns:'编辑模式：VIREO还会列出每个星团的主序拐点颜色、距离、距离模数和年龄；这些星表数值未在本站发布，因此只显示E(B−V)。',
 saveListUnavailable:'此处无法使用“保存列表”：VIREO会写出完整的102字节星团记录，其中包含本站未发布的星表数值。',
 noSelection:'请先选择一行星团（左键点击）。',
 reportNote:'这份列表是VIREO对已发布星团视场在对话框所设中心和直径处的查询（已离线核对，结果恰为已发布的恒星），并按极限星等筛选。',
 emptyField:'此视场中没有恒星亮到极限星等。在上面的提示框之后，VIREO仍会打开其报告，显示“0 Stars”（0颗恒星）以及上一次查询的各行；本站不显示列表。',
 emptyUnknown:'此视场中没有已发布的恒星亮到极限星等。VIREO可能一颗也没列出，也可能回答“视场中未找到恒星！”，这取决于本站未发布的星表恒星，因此不显示列表。',
 listModal:'网页改编：VIREO把这份列表显示为对话框旁的独立窗口；这里则在对话框上方打开。',
 listNote:'双击一行（或点击“获取所选数据”）即可将其复制到“星团数据参数”；右键点击选中的行可使用目标列表项。',
 printNote:'网页改编：列表的打印预览；VIREO在编辑模式下横向打印，其他情况下纵向打印。',
});
