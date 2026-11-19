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
