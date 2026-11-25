import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front ZH0: Simplified Chinese (zh-Hans) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_ZH_HANS:Translation<typeof TOUR_EN>=Object.freeze({
 label:'OpenVireo导览',
 progress:(n:number,of:number)=>`第${n}步，共${of}步`,
 next:'下一步',back:'上一步',skip:'跳过导览',done:'开始探索',
 firstLook:'进行初步观察（约3分钟）',chooseLab:'选择实验',
 steps:Object.freeze({
  welcome:Object.freeze({title:'欢迎使用OpenVireo',
   text:'OpenVireo是一个用于天文学实验的虚拟天文台，基于Project CLEA的VIREO在浏览器中重建。这个简短的导览会告诉你各项功能在哪里，用时不到一分钟。'}),
  save:Object.freeze({title:'把你的工作保存为文件',
   text:'在你保存之前，你的工作只存在于此浏览器标签页中。每个页面顶部的“保存探究”会下载一个文件；旁边菜单中的“恢复探究（JSON）”可在以后重新载入它。'}),
  help:Object.freeze({title:'帮助随时都在',
   text:'打开“帮助”查看帮助主题，或在文本框之外的任何位置按下“?”键。你可以在“帮助”菜单中再次查看此导览。'}),
  start:Object.freeze({title:'你想怎样开始？',
   text:'花三分钟对天空进行初步观察，或从七个实验中选择一个；每个实验都有一份指南一路陪伴你。所有页面都在菜单里；在手机上，菜单位于“菜单”按钮后面。'}),
 }),
});
