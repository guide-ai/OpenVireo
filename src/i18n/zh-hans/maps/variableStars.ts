import type {VARIABLE_STARS_EN} from '../../../variables/VariableStarMessages';
import type {Translation} from '../../maps';
/** Front ZH4: Simplified Chinese (zh-Hans) for the variable-star page's web text (the header menu name came with Front ZH0). A web adaptation
 * by OpenVireo, not CLEA's; VIREO's own captions (Variable Star Data, Simulated Light Curve, their menus and the print lines) are translated
 * through vireo() (originals.json). Chinese has one plural form, so no plural() call is needed. */
const grouped=(n:number)=>n.toLocaleString('en-US');
export const VARIABLE_STARS_ZH_HANS:Translation<typeof VARIABLE_STARS_EN>=Object.freeze({
 nav:'变星',
 title:'变星与光变曲线',
 scope:'在VIREO变星星表（CLEA_VStrs.dat，31,147条记录）中查找一颗恒星，读取其星表数据，并显示VIREO为它模拟的光变曲线。',
 adaptation:'网页改编：在VIREO中，这些数据属于讲师途径（编辑模式）：在“星表天体”框中输入GCVS，或在望远镜控制面板中依次选择“视场信息 › 变星 › 获取所选数据”。在本站开启编辑模式（“光学模拟选项”）后，这两种方式都可以使用；本页还允许任何人直接搜索星表。“变星数据”和“模拟光变曲线”窗口遵循原版。',
 guideTitle:'如何使用此工具',
 guide:[
  '输入恒星名称的一部分（例如“del Cep”或“RR Lyr”），或选择一种变光类型，然后按某一行的“打开”。',
  '“变星数据”窗口列出星表数值：位置、类型、极大星等、极小星等（或在左括号之后给出振幅）、星表历元（VIREO把它画作极大亮度，尽管食双星的星表给出的是极小）、周期、上升时间（M-m/D）和光谱。',
  '选择“数据 › 显示光变曲线”，即可看到1.5个周期的模拟光变曲线。无论类型如何，VIREO都把星表历元画作极大亮度（相位0）。',
  '使用“数据 › 保存文本 › 按显示内容”把列表下载为文本文件，或使用“打印”将其打印。',
 ],
 guideModel:'关于这条曲线：VIREO对每种类型都画出同一种造父变星形状的曲线，仅由星表中的极大星等、极小星等、周期和M-m/D构建（星表未给出时取50%）。它没有噪声，也不是观测结果。食双星和不规则变星实际上并不是这个样子。',
 loading:'正在载入变星星表…',
 loadError:'无法载入随附的变星星表，或其与记录的大小和SHA-256不一致。请刷新页面重试。',
 searchTitle:'查找变星',
 nameLabel:'星名包含',
 typeLabel:'变光类型',
 allTypes:'所有类型',
 typeOption:(type:string,count:number)=>`${type||'（空白）'} — ${grouped(count)}`,
 results:(shown:number,total:number)=>total===0?'没有匹配的记录。':shown<total?`在${grouped(total)}条匹配的记录中，按星表（赤经）顺序显示前${shown}条。请缩小搜索范围以查看其他记录。`:`共${grouped(total)}条匹配的记录。`,
 columns:['GCVS ID','类型','赤经（h）','赤纬（°）','极大','极小／振幅','周期（天）',''],
 open:'打开',
 openLabel:(name:string)=>`打开${name}`,
 noPeriod:'—',
 listTypeCodesNote:'在VIREO中，这个菜单项只切换它自己的勾选标记；没有其他任何功能读取它。',
 saveAdaptation:'网页改编：文本通过你的浏览器下载（列表每行一行文字，使用Windows换行符），而不是通过“保存”对话框。',
 riseDefaultedNote:'这条记录没有M-m/D值。打开其光变曲线时，已像VIREO一样在内存中把它设为50%，因此列表现在显示0.50。',
 curveLabel:(name:string)=>`${name}的模拟光变曲线：星等随相位的变化，从星表历元起1.5个周期。`,
 unavailable:Object.freeze({
  'period-zero':'没有曲线：这条记录没有周期（0天）。VIREO会除以周期，并在画完坐标轴后因浮点错误而停止，因此不绘制任何曲线点。',
  'zero-decline-fraction':'没有曲线：M-m/D为100%，因此曲线下降部分的长度为零，VIREO在绘制它之前会因浮点错误而停止。',
  'axis-range-zero':'没有光变曲线窗口：最亮和最暗的坐标轴界限相等，VIREO在显示窗口之前会除以它们的差值。',
  'magnitude-system-empty':'星等系统的文字为空：VIREO在画完星等轴后会报错并停止绘制，因此不绘制相位轴和曲线。',
  'non-finite':'没有曲线：这条记录中有一个值超出了模型所能计算的范围。',
 }),
 curveAdaptation:'该图保留了VIREO的布局、颜色和像素位置；字体有所不同。',
 printTitle:(caption:string)=>`打印——${caption}`,
 printHelp:'VIREO印在纸上的内容的打印预览：日期和时间（此处采用你浏览器的格式）、实验台编号行、在VIREO中输入的学生和实验行（本站没有，因此用占位文字代替）、列表各行，以及光变曲线的图。页面布局和字体未复现。VIREO的打印任务标题不会打印在页面上。',
 printCurveLayout:(monochrome:boolean)=>`光变曲线页面按此处所选的方向遵循VIREO的打印件（VIREO使用打印机的方向）：纵向时，图接在同一页上；横向时，VIREO会加上“（屏幕图像打印在下一页）”，并把图打印在第2页。${monochrome?'“彩色打印”已关闭，因此图以白底黑色打印。':'“彩色打印”已开启，因此图以屏幕上的颜色打印。'}VIREO把图画在标题行之上；这里则把它放在标题行下方。`,
 printOrientation:'页面方向',
 portrait:'纵向',
 landscape:'横向',
 printStudentPlaceholder:'［在VIREO中输入的学生和实验文字：本站未还原］',
 printButton:'打印…',
 printClose:'关闭预览',
 printError:'此浏览器窗口无法打印。',
});
