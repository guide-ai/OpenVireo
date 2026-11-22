import type {FINISH_SAVE_MESSAGES_EN} from '../../../components/RadioFinishSaveMessages';
import type {Translation} from '../../maps';
/** Front ZH5: Simplified Chinese (zh-Hans) for the finish question's web Save (R-RX17). A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_FINISH_SAVE_ZH_HANS:Translation<typeof FINISH_SAVE_MESSAGES_EN>=Object.freeze({
 'finishSave.yes.reason':'选择“是”会打开这份接收数据的网页版保存，而不是原版的“保存”对话框：随后你在浏览器中选择一个文件，只有读回后确认完全一致的副本，才会把接收数据标记为已写入，并完成本次结束流程。“是”本身不选择也不写入任何内容。',
 'finishSave.yes.webDefault':'网页默认按钮：“取消”（原版默认为“是”）。',
 'finishSave.yes.unsupported.insecure-context':'“是”（保存）不可用：此页面不是安全上下文，而浏览器的文件API需要安全上下文。“否”和“取消”照常可用；本次结束流程结束后，仍可在“脉冲星分析”中下载“.PLR”副本。',
 'finishSave.yes.unsupported.no-api':'“是”（保存）不可用：此浏览器不提供可写文件的保存文件选择器（showSaveFilePicker和createWritable）。“否”和“取消”照常可用；本次结束流程结束后，仍可在“脉冲星分析”中下载“.PLR”副本。',
 'finishSave.yes.webDefaultUnsupported':'网页默认按钮：“取消”（原版默认的“是”会执行保存，而此浏览器在这里无法保存）。',
 'finishSave.heading':'保存新的接收数据（带验证的网页版保存）',
 'finishSave.intro':'由结束问题中的“是”打开。这不是原版的“保存”对话框。此对话框打开期间，接收数据仍占用着当前脉冲星数据，因此“脉冲星分析”无法载入、保存或下载。只有经过验证的副本才能结束这次流程：随后接收数据仍是当前脉冲星数据，并被标记为已写入（这是当时的一次检查），且不会打开“脉冲星分析”。失败或已取消的尝试会停留在这里，并且可能已经创建或清空了某个文件。“返回”会回到结束问题，在那里选择“否”会打开“脉冲星分析”，选择“取消”则让数据保持未保存。',
 'finishSave.back':'返回结束问题',
 'finishSave.pendingNote':'尝试进行期间，“选择”和“返回”不起作用，接收数据仍占用着脉冲星数据。隐藏“射电望远镜”页面或开始项目操作会使其停止。',
 'finishSave.refusal.not-ready':'保存未开始，也没有选择文件：“脉冲星分析”正在读取文件，接收数据已不再占用脉冲星数据，或另一次保存尝试仍在结束中。请在它结束后重试。',
 'finishSave.fail.abandoned':'保存尝试已停止，因为“射电望远镜”页面被隐藏，或开始了项目操作。所选文件可能已经被创建、清空，或被部分或完整写入；OpenVireo无法恢复它，也没有把接收数据标记为已写入。接收数据仍占用着脉冲星数据。文件流关闭后，“选择”和“返回”即可再次使用。',
 'finishSave.busy':'正在结束已停止的尝试：等待其文件流关闭…',
 'finishSave.status.opened':'已打开“保存”对话框。尚未选择文件；接收数据仍占用着当前脉冲星数据。',
 'finishSave.status.back':'已回到结束问题。“保存”对话框没有把接收数据标记为已写入；在其中选择的文件可能已经被创建、清空或更改。',
 'finishSave.status.verified':'已将验证过的副本保存为“{file}”（读回{bytes}字节，确认一致）。结束流程已完成：接收数据仍是当前脉冲星数据，并在检查时被标记为已写入；这是一个历史结果。未打开“脉冲星分析”。',
 'finishSave.status.unavailable':'“保存”对话框没有打开：接收数据已不再像本次结束流程所预期的那样占用当前脉冲星数据。未选择任何文件；“否”和“取消”仍可回答该问题。',
});
