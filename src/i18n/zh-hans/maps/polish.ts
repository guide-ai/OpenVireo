import type {BundledHotListFailure} from '../../../io/bundledHotList';
import type {POLISH_MESSAGES_EN} from '../../../polish/PolishMessages';
import type {Translation} from '../../maps';

const FILE_REASONS:Readonly<Record<BundledHotListFailure,string>>=Object.freeze({download:'无法下载',size:'的大小与记录的大小不符',sha256:'与记录的SHA-256不符'});

/** Front ZH0–ZH1: Simplified Chinese (zh-Hans) for the polish texts (About box, credits, results editors, guides). A web adaptation by OpenVireo, not CLEA's. */
export const POLISH_ZH_HANS:Translation<typeof POLISH_MESSAGES_EN>=Object.freeze({
 spectrometerIndex:Object.freeze({
  title:'在哪里获取光谱',
  intro:'VIREO的光谱仪要在天文台里使用，并让望远镜指向一个目标。在OpenVireo中，每个实验都有各自经过验证的光谱仪路径：',
  routesTitle:'光谱仪路径',
  routes:Object.freeze([
   Object.freeze({label:'星表恒星曝光',help:'受支持的星表恒星的光谱，可保存和打印。'}),
   Object.freeze({label:'星系曝光',help:'Hubble.HTL中的13个星系（哈勃定律）。'}),
   Object.freeze({label:'LSS巡天',help:'9个LSS视场中的星系光谱。'}),
   Object.freeze({label:'天体X',help:'天体X各目标的光谱。'}),
   Object.freeze({label:'多目标光谱仪',help:'天文台中的多目标光谱仪卡片，用于内置的实验视场（天体X实验中也可使用）。'}),
   Object.freeze({label:'光谱分析器',help:'测量谱线位移并记录红移。'}),
   Object.freeze({label:'分类',help:'对照标准星光谱为恒星光谱分类。'}),
  ]),
  retired:'在获取功能出现之前，本页曾显示预备光源轮廓（M82、Coma1、Coma2）的预览。它已于2026-10-29停用，由上述路径取代。',
 }),
 clusterGuide:Object.freeze({nav:'星团赫罗图指南'}),
 multiSpecPrint:Object.freeze({unavailable:'无法使用“打印选择视场”（Print Selection Field）：此处没有显示多目标光谱仪视场。'}),
 infoListPrint:Object.freeze({
  note:'VIREO列表页面的打印预览：日期和时间（此处采用你的浏览器的格式）、实验台编号行（本站不记录）、学生姓名行（留空：这里没有登录）、窗口标题和列表各行，使用Courier字体。行距和缩进沿用VIREO的页面；不复现打印机的度量。VIREO的打印作业标题不会打印在页面上。',
 }),
 siteInfo:Object.freeze({
  note:'在VIREO中，这个列表窗口在显示站点信息时会隐藏“搜索”、“保存文本”和“编辑”菜单，因此只提供“打印”和“关闭”。',
  printNote:'网页改编：VIREO会在打印机上把列表各行打印在共用的页眉之下；这里打印的是日期、标题和列表各行。',
 }),
 hotListEdit:Object.freeze({
  note:'“编辑”、“删除”和“撤销”会更改共用的目标列表，与“原版目标列表”编辑器一样；“撤销”只会撤销在此处最近一次的“编辑”或“删除”。',
  deleteNote:'网页改编：该行会从共用列表中移除；“撤销”会把它放回文件中原来的位置（VIREO按赤经重新插入）。',
 }),
 hotListPopup:Object.freeze({
  note:'“编辑”、“删除”和“撤销”位于本页的“原版目标列表”编辑器中。',
 }),
 cameraFieldSize:Object.freeze({
  note:'针对当前应用的望远镜，与VIREO在相机打开时显示的一致（此处保留两位小数）。',
 }),
 terminateSlew:Object.freeze({
  note:'网页改编：VIREO在提问期间会暂停转动；这里在你回答之前望远镜会继续转动（如果它先到达，提问会关闭）。“是”会让它停在当前位置；“否”会让它继续转动。',
 }),
 comparison:Object.freeze({
  clear:'清除比较光谱',none:'无（已清除）',
  note:'VIREO的“比较光谱 › 清除”：它会从图和表中移除比较谱线。再选择一个列表即可重新显示。清除状态不会保存；已保存的探究保留所选的列表。',
 }),
 results:Object.freeze({
  help:'VIREO的“工具 › 结果编辑器”。“观测结果”会在光谱分析器中打开你的观测结果；“脉冲星结果”会在脉冲星分析中打开已保存的脉冲星测量。',
 }),
 pulsarPrint:Object.freeze({
  note:'VIREO的“打印窗口”（PrintScreen1Click 0x56d9d8，Front RE5）会先打印自己的页眉和数据参数，再打印窗口图像。与VIREO一样，打开它会把所有面板切换为垂直光标模式，面板按VIREO的打印颜色打印（白色背景，黑色坐标轴、标签和曲线；光标保留各自的颜色）。横向打印时会写上“（屏幕图像打印在下一页）”，并把图像放在第2页。网页改编：页面方向在此选择（VIREO采用打印机的设置），日期取自浏览器，实验台编号和学生姓名显示为“（未记录）”（没有登录），图像是网页面板，而不是VIREO的窗口图像。',
  orientation:'页面方向',portrait:'纵向',landscape:'横向',
 }),
 wedgePrint:Object.freeze({
  note:'网页改编：VIREO的“打印”会把配色方案设为与“彩色打印”选项相反（scheme := Env+0x2e8d XOR 1，0x580fba–0x580fc3），因此除非勾选该选项（编译时默认关闭；光学模拟选项），否则以黑白打印。此处的打印遵循该选项，并使用浏览器的打印机版面。所选内容的高亮不会打印。',
 }),
 printSky:Object.freeze({
  note:'VIREO会打印页眉（日期和时间，此处采用你的浏览器的格式；仅在记录了实验台编号时才打印实验台编号；然后是学生姓名行，这里留空，因为OpenVireo没有登录）、反色并按1.5倍缩放的天空图像，以及页脚（视场中心、视场大小、望远镜和仪器）。网页改编：由浏览器排版页面，并按当前显示的样子打印视图。',
  noInstrument:'（OpenVireo的望远镜视图中未选择仪器）',
 }),
 about:Object.freeze({
  nativeNote:'VIREO的“关于”对话框，文字取自原程序（不含其标志）。本窗口的其余部分介绍这个网页重建版。',
  siteTitle:'本站',
  site:'OpenVireo是对Project CLEA的VIREO的免费、非商业网页重建，向所有人开放，依据VIREO复原的行为和原版数据文件在浏览器中重新构建。它不是CLEA的程序，也不声称与其等同；网页改编之处都会在出现的地方标明。',
  worksTitle:'可用功能',
  works:Object.freeze([
   'VIREO的七个实验都有引导式的网页路径：哈勃定律（13个星系）、大尺度结构、恒星分类、昴星团测光（24颗恒星）、星团赫罗图、脉冲星，以及探寻天体X。',
   '光学天文台：圆顶、望远镜、寻星镜和望远镜视图、可选地平限制的转动、目标列表、站点和日期、星表和视场信息、变星列表和类星体列表。',
   '仪器：针对实验目标的光谱仪和光度计、CCD相机和红外相机（实时查询星表）、多目标光谱仪（用于内置的实验视场和天体X实验），以及带接收机和脉冲星分析的射电望远镜。',
   '分析：光谱测量和分类、哈勃拟合和昴星团拟合、LSS楔形图、你的观测结果，以及已保存的探究。',
  ]),
  privacyTitle:'隐私',
  privacy:Object.freeze([
   '没有Cookie，也没有账号：OpenVireo从不询问你的姓名、电子邮件地址或密码。',
   '你的探究、选项和结果只保存在你的电脑上：存放在此浏览器自己的存储中，或你选择下载的文件中。不会上传任何内容。',
   '访问只做汇总统计，且不使用Cookie（Cloudflare Web Analytics）。与任何网站托管方一样，Cloudflare会收到每次请求的技术数据（例如你的IP地址），以便提供页面。',
   'CCD相机和红外相机的实时星表查询只会把视场的天球坐标和半径发送给CDS/VizieR（或其某个官方镜像）。你的浏览器直接连接该服务器，因此与任何网站一样，它能看到你的IP地址。',
   '外部链接（HST图像档案、帮助 › 网站）只有在你点击时才会在新标签页中打开，且不会随之发送任何内容。',
  ]),
  creditsTitle:'致谢',
  credits:Object.freeze([
   'Project CLEA，Gettysburg College：VIREO及其数据文件的原作者。由美国国家科学基金会（National Science Foundation）和Gettysburg College提供支持。',
   '脉冲星数据：很可能源自ATNF脉冲星星表（Manchester, Hobbs, Teoh & Hobbs 2005）；这一来源并不确定。',
   '相机星表：CDS/VizieR（doi:10.26093/cds/vizier）；NOMAD（Zacharias等，2004）；USNO-B1.0（Monet等，2003）；经由NOMAD提供的2MASS（Skrutskie等，2006）。',
   '星场：随VIREO提供的导星星表（Guide Star Catalog）的有限子集。',
  ]),
 }),
 print:Object.freeze({
  title:'打印预览',button:'打印…',close:'关闭',error:'此浏览器不支持打印。',
  missing:'没有可打印的内容：当前没有显示图像。',
 }),
 pulsarsHtl:Object.freeze({
  button:'载入内置的Pulsars.HTL',
  note:'网页改编：VIREO的脉冲星列表Pulsars.HTL（8颗脉冲星）以逐字节相同的形式内置于本站；在VIREO中，你要用“载入目标列表...”从它所在的文件夹打开。载入会替换当前的目标列表，“载入目标列表...”也是如此。',
  error:(code:BundledHotListFailure)=>`内置的Pulsars.HTL${FILE_REASONS[code]}；当前的目标列表保持不变。`,
 }),
});
