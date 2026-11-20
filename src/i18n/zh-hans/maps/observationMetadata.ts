import type {OBSERVATION_METADATA_EN} from '../../../ObservationMetadataMessages';
import type {Translation} from '../../maps';
/** Front ZH1: Simplified Chinese (zh-Hans) for the Observational Data values of loaded and acquired spectra. A web adaptation by OpenVireo, not CLEA's. */
export const OBSERVATION_METADATA_ZH_HANS:Translation<typeof OBSERVATION_METADATA_EN>=Object.freeze({
 empty:'（空）',
 note:'与VIREO一样，从文件载入的光谱，其天体编号取自文件名，时间取自文件的最后修改时间（此处转换为UTC的JD），位置取自文件头中的望远镜指向；测光和红移保持为空，框为空表示该值未知。直接由曝光分类的光谱没有文件时间，因此其JD保持为空。',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · 赤经${ra||'—'} · 赤纬${dec||'—'}`,
});
