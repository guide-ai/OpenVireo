import type {FIELD_READ_DETAILS_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front ZH1: Simplified Chinese (zh-Hans) for the readable details of the catalogue tile and field read results. A web adaptation by OpenVireo, not CLEA's. */
export const FIELD_READ_DETAILS_ZH_HANS:Translation<typeof FIELD_READ_DETAILS_EN>=Object.freeze({
 'field-tiles':Object.freeze({
  fetch:'有一个星表分块未能送达',
  integrity:'有一个星表分块与其记录的大小和SHA-256不符',
  index:'无法读取星表索引，或其与本站不匹配',
  budget:'此视场同时需要的星表分块数，超过了本站在内存中保留的数量',
  'missing-tile':'本站请求了错误的星表分块（请报告此问题）',
 } as Record<string,string>),
 'field-unreadable':Object.freeze({
  'band-end':'VIREO读取此视场时会越过其星表某个赤纬带的末尾，引发输入/输出错误，并留下不完整的星列表。本站改为不显示视场［网页改编］。',
  regions:'VIREO会发出警告“视场包含的区域过多！”并保留前100个区域；本站不复现这一行为［网页改编］。',
  budget:'此视场包含的星表记录，多于本站在一个赤纬带中一次读取的数量［网页限制］。',
  plan:'本站读取了它所规划的星表分块之外的内容（请报告此问题）。',
  source:'内置的某个星表文件格式不符合预期（请报告此问题）。',
  input:'此指向不是有效的天球位置。',
  evidence:'视场引擎发现其记录前后不一致（请报告此问题）。',
 } as Record<string,string>),
});
