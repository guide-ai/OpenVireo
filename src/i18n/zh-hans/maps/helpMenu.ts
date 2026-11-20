import type {HELP_MENU_EN} from '../../../help/HelpMessages';
import type {Translation} from '../../maps';
/** Front ZH0: Simplified Chinese (zh-Hans) for OpenVireo's own text in the Help menus. VIREO's menu captions (Help, Topics..., Websites…)
 * are originals (originals.json). A web adaptation by OpenVireo, not CLEA's. */
export const HELP_MENU_ZH_HANS:Translation<typeof HELP_MENU_EN>=Object.freeze({
 newTab:'（在新标签页中打开）',
 noEquivalent:(original:string)=>`——VIREO曾打开${original}。该网站已不存在，也没有对应的页面，因此不提供链接。`,
 websitesNote:'VIREO在新的浏览器窗口中打开这些页面。在这里，只有你点击时它们才会在新标签页中打开，并且不会发送任何数据。VIREO的两个地址已不存在：2MASS（xena.harvard.edu）会打开IRSA（NASA/IPAC）上2MASS的当前页面，NVO（www.us-vo.org）会打开其后继者的页面：NASA的NAVO（NASA天文虚拟天文台）。',
 reminderLoading:'正在载入VIREO的提醒…',
 reminderError:'无法载入VIREO的提醒文件（Reminder.obs），或它与记录的大小和SHA-256不符。',
 ok:'确定',cancel:'取消',close:'关闭',yes:'是',no:'否',
 menuName:Object.freeze({main:'天文台帮助菜单',radio:'射电望远镜帮助菜单'}),
 radioOff:'VIREO的射电帮助菜单（主题...、关于本实验...）位于射电望远镜控制面板上，打开望远镜电源后该面板会出现。',
 reminderErrorQuestion:'此时VIREO会改为询问：',
 exitDone:'你已完成实验。网页无法自行关闭：请先保存你的工作，准备好后再关闭此浏览器标签页。',
 siteAbout:'关于OpenVireo与隐私',
 webTopics:'帮助主题…',
 tour:'查看网站导览',
 shortcutKey:'?',
 buttonNames:Object.freeze({
  'OBSRVHLP.LST':'望远镜控制帮助','PHOTOHLP.LST':'光度计帮助','CAMHLP.LST':'相机帮助','SPECHLP.LST':'光谱仪帮助',
  'CLASSHLP.LST':'光谱分类帮助','MEASHLP.LST':'光谱测量帮助','HRANALHLP.LST':'赫罗图帮助','VARTYPEHLP.LST':'变星类型帮助',
  'WDGPLTHLP.LST':'楔形图帮助','PLSANHLP.LST':'脉冲星分析帮助','PLSLSHLP.LST':'脉冲星参数帮助','MLTSPHLP.LST':'多目标光谱仪帮助',
  'SPLSTHLP.LST':'多目标光谱列表帮助',
 }),
 exitNote:'在实验进行期间（即执行“运行实验”（Run Exercise）之后）退出天文台时，VIREO会显示此提醒；否则它只会询问是否退出。OpenVireo没有“登录”（Log In）或“运行实验”步骤，因此天文台始终处于实验进行中。在VIREO中，“确定”（OK）或“是”（Yes）会退出程序，“取消”（Cancel）或“否”（No）则保持打开。',
});
