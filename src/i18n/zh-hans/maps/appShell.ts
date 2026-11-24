import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front ZH0: Simplified Chinese (zh-Hans) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_ZH_HANS:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'颜色主题',system:'跟随系统',light:'浅色',dark:'深色'}),
 navGroups:Object.freeze({optical:'光学天文台',radio:'射电天文台',analysis:'分析',files:'文件',guides:'实验指南'}),
 backupHelpSummary:'备份包含的内容',
 toolsMenu:'菜单',
 skipToContent:'跳到正文',
 pageBar:Object.freeze({label:'探究、语言和帮助',more:'更多',moreName:'更多探究操作'}),
 companion:Object.freeze({label:'指南的当前步骤',stepOf:(n:number,total:number)=>`第${n}步，共${total}步`,actions:'指南操作',show:'指给我看',details:'步骤详情',full:'完整指南',hide:'隐藏',hideName:'隐藏此指南',notYet:'该控件还没有出现在屏幕上；完成前面的某个操作后它才会出现。你所在的页面是对的。',allDone:'所有步骤都已完成。',
  restart:'重新开始实验',restartTitle:'要重新开始这个实验吗？',restartWhat:'网站会重新载入，并在第一步打开本指南。',
  restartLost:'所有未保存的内容都会丢失：这个实验的工作，以及此标签页中其他工具的工作。',
  restartSave:'如需保留，请先取消，然后选择“保存探究”。',restartConfirm:'重新开始',restartCancel:'取消'}),
 firstLook:Object.freeze({name:'初步观察',dome:'打开圆顶',point:'选择M82，并将望远镜指向它',look:'在望远镜视图中查看它',
  spectrum:'打开它的光谱',spectrumDetail:'VIREO资源库中只有部分天体有光谱；M82有。这是VIREO原版资源库中的光谱，不是新的观测。',
  closing:'你已完成初步观察。选择一个实验，继续深入。',start:'跟着指南走（约3分钟）',help:'进行初步观察'}),
 recovery:Object.freeze({
  updatedTitle:'OpenVireo已发布新版本',
  updated:'此页面打开期间网站已更新，因此网站的这一部分无法载入。',
  errorTitle:'OpenVireo的这一部分因出错而停止',
  error:'刷新页面通常可以解决。如果再次发生，请记下你在此之前做了什么。',
  kept:'网站的其余部分以及你在此标签页中的其他工作都还在。',
  saveFirst:'请先保存探究，再刷新页面，以使用最新版本继续。',
  saveHow:'刷新页面以继续。你之前用“保存探究”保存的工作，之后可以用“恢复探究（JSON）”恢复。',
  save:'保存探究',
  reload:'刷新页面',
 }),
});
