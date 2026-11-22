import type {HELP_VIEWER_EN} from '../../../help/HelpViewerMessages';
import type {Translation} from '../../maps';
/** Front ZH-HELP: Simplified Chinese (zh-Hans) for the help viewer’s language switch and the Spectral Line Table window. A web adaptation
 * by OpenVireo, not CLEA’s (VIREO’s missing-file box is spectralLines.ts SPECTRAL_LINE_MISSING_LITERALS, through vireo()). */
export const HELP_VIEWER_ZH_HANS:Translation<typeof HELP_VIEWER_EN>=Object.freeze({
 translationLabel:'翻译：OpenVireo的网页改编译文（不是CLEA的文本）',
 originalLabel:'原文：VIREO的英文原文，原样显示',
 viewOriginal:'查看原文（英文）',
 viewTranslation:'查看译文',
 translationError:'无法载入翻译后的帮助，或它与翻译所依据的原文件不一致，因此显示的是VIREO的英文原版帮助。',
 helpAdaptationTranslation:(list:string)=>`这是OpenVireo对VIREO自带帮助的翻译（其索引${list}以及索引所指向的文本文件；属于网页改编，不是CLEA的文本），显示在VIREO帮助查看器的网页版中。窗口大小、字体和系统提示音没有复现。`,
 linkNoteTranslation:'双击译文中“相关主题：”行下面的标题，或选中后按Enter键，即可打开该主题。那里的空白行在这里不会有任何反应（VIREO会因此报错并停止）。',
 searchFoldNote:'在译文中搜索时，全角和半角、拉丁字母的重音符号以及大小写都不加区分（网页改编）；不能按拼音读音查找汉字。原文视图中保留的VIREO自带搜索，只忽略A到Z的大小写。',
 spectralLines:Object.freeze({
  listCaption:'谱线',
  rows:'谱线',helpRows:'谱线帮助文本',close:'关闭',
  loading:'正在载入VIREO的谱线列表…',
  error:'VIREO的谱线文件（SPECLNS.LNL、SPECLNS.TXT）无法载入，或与记录的大小和SHA-256不符。',
  retry:'重试',ok:'确定',
  note:'VIREO的谱线列表（SPECLNS.LNL）。双击一条谱线，或按Enter键，即可从SPECLNS.TXT中阅读它的帮助。与VIREO一样，帮助是按谱线的名称查找的，因此有些谱线（例如靠后的He I谱线）显示的是第一条同名谱线的段落。单击一次（或按一下方向键），分类光标就会移到该谱线上，位置是显示中最近的像素列；列表随后选中最接近该列的谱线，这与VIREO相同（因此在完整视图中，选择Fe I 4143.878会选中He I 4143.76）。方向键遵循同样的规则，所以下方向键无法从He I 4143.76移到Fe I 4143.88；使用End键或Home键，或点击更靠后的谱线，才能越过它。',
  cursorAt:(wl:string)=>`光标 @：${wl} Å（VIREO显示的是光标所在像素列的波长，而不是该谱线自身的波长）。`,
  cursorOutside:'该谱线在显示范围之外，因此不绘制光标（在VIREO中，光标读数会被清除，或指向右边缘之外）。',
  textErrorCaption:'帮助文件错误',
  textError:(file:string)=>`VIREO的谱线帮助文件（${file}）无法载入，或与记录的大小和SHA-256不符。谱线列表保持打开，请再试一次该谱线。`,
 }),
});
