import type {OBSERVATION_METADATA_EN} from '../../../ObservationMetadataMessages';
import type {Translation} from '../../maps';
/** Front RU1: Russian (ru) for the Observational Data values of loaded and acquired spectra. A web adaptation by OpenVireo, not CLEA's. */
export const OBSERVATION_METADATA_RU:Translation<typeof OBSERVATION_METADATA_EN>=Object.freeze({
 empty:'(пусто)',
 note:'Как и в VIREO, спектр, загруженный из файла, берёт идентификатор объекта из имени файла, время — из последнего изменения файла (здесь переведено в JD по UTC), а положение — из наведения телескопа в заголовке файла; фотометрия и красное смещение остаются пустыми, а пустое поле означает, что значение неизвестно. У спектра, классифицированного прямо по экспозиции, нет времени файла, поэтому его JD остаётся пустым.',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · П. в. ${ra||'—'} · Скл. ${dec||'—'}`,
});
