import type {RADIO_SAVE_MESSAGES_EN} from '../../../components/RadioRecordSaveMessages';
import type {Translation} from '../../maps';
/** Front ZH5: Simplified Chinese (zh-Hans) for the receiver's Record Save dialog (R-RX15). A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_RECORD_SAVE_ZH_HANS:Translation<typeof RADIO_SAVE_MESSAGES_EN>=Object.freeze({
 'radioSave.scope':'接收数据由此接收机模拟生成，仅保存在此标签页中，作为“脉冲星分析”的当前脉冲星数据。它不是观测结果。“保存探究”会把它与你的测量行一并保存；接收机窗口本身不会被保存。当“记录”询问未保存的数据时，选择“是”会打开网页版保存，只有读回副本并确认一致后，才把接收数据标记为已写入；结束问题中的“是”打开的是同类经过验证的网页版保存，“脉冲星分析”载入问题中的“是”也一样，之后要载入的接收数据需在另一步骤中选择。在“脉冲星分析”中，“将接收数据保存为.PLR（已验证）…”同样只在读回一致后才把接收数据标记为已写入，而“将接收数据下载为.PLR…”不会改变接收数据的写入状态。',
 'radioSave.yes.reason':'选择“是”会打开这份接收数据的网页版保存，而不是原版的“保存”对话框：随后你在浏览器中选择一个文件，只有读回后确认完全一致的副本，才会把接收数据标记为已写入。“是”本身不选择、不写入，也不清除任何内容。',
 'radioSave.yes.webDefault':'网页默认按钮：“取消”（原版默认为“是”）。',
 'radioSave.yes.unsupported.insecure-context':'“是”（保存）不可用：此页面不是安全上下文，而浏览器的文件API需要安全上下文。“否”和“取消”照常可用；仍可在“脉冲星分析”中下载“.PLR”副本，但这会让接收数据保持未保存。',
 'radioSave.yes.unsupported.no-api':'“是”（保存）不可用：此浏览器不提供可写文件的保存文件选择器（showSaveFilePicker和createWritable）。“否”和“取消”照常可用；仍可在“脉冲星分析”中下载“.PLR”副本，但这会让接收数据保持未保存。',
 'radioSave.yes.webDefaultUnsupported':'网页默认按钮：“取消”（原版默认的“是”会执行保存，而此浏览器在这里无法保存）。',
 'radioSave.heading':'先保存接收数据（带验证的网页版保存）',
 'radioSave.intro':'由“记录”问题中的“是”打开。这不是原版的“保存”对话框。从这里不会清除或启用任何内容：验证过的副本生成后，仍会出现清除问题；“返回”会回到“记录”问题，在那里选择“否”会进入清除问题，选择“取消”则保留数据并关闭“记录”。',
 'radioSave.back':'返回问题',
 'radioSave.pendingNote':'尝试进行期间，“选择”和“返回”不起作用。隐藏“射电望远镜”页面或开始项目操作会使其停止。',
 'radioSave.refusal.not-ready':'保存未开始，也没有选择文件：“脉冲星分析”正在读取文件，已有接收数据持有数据，或另一次保存尝试仍在结束中。请在它结束后重试。',
 'radioSave.fail.abandoned':'保存尝试已停止，因为“射电望远镜”页面被隐藏，或开始了项目操作。所选文件可能已经被创建、清空，或被部分或完整写入；OpenVireo无法恢复它，也没有把接收数据标记为已写入。文件流关闭后，“选择”和“返回”即可再次使用。',
 'radioSave.busy':'正在结束已停止的尝试：等待其文件流关闭……',
 'radioSave.status.opened':'已打开“保存”对话框。尚未选择文件；没有清除任何内容。',
 'radioSave.status.back':'已回到“记录”问题。“保存”对话框没有把接收数据标记为已写入；在其中选择的文件可能已经被创建、清空或更改。',
 'radioSave.erase.verified':'网页说明：这份接收数据的验证副本已保存为“{file}”（读回{bytes}字节，确认一致），接收数据已被标记为已写入。选择“确定”仍会把它从内存中清除，以便进行新的接收；选择“取消”则保留它并关闭“记录”。此后OpenVireo不会监视该文件。',
 'radioSave.erase.webDefault':'此处的网页默认按钮：“取消”，因为这个问题是在保存结束后才打开的（原版默认为“确定”）。',
});
